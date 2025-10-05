const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const PenaltyCalculatorService = require('../services/penalty-calculator.service');
const ServiceChargeCalculatorService = require('../services/service-charge-calculator.service');

const router = express.Router();
const penaltyCalculator = new PenaltyCalculatorService();
const serviceChargeCalculator = new ServiceChargeCalculatorService();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * GET /api/admin-calculations
 * Get all calculation configurations (penalty + service charge)
 */
router.get('/', async (req, res) => {
  try {
    console.log(`📊 [${new Date().toISOString()}] Fetching all calculation configs - User: ${req.user.username}`);
    
    const [penaltyConfig, serviceChargeConfig] = await Promise.all([
      penaltyCalculator.getAllPenaltyConfig(),
      serviceChargeCalculator.getAllServiceChargeConfig()
    ]);
    
    res.json({
      success: true,
      message: 'All calculation configurations retrieved successfully',
      data: {
        penalty: penaltyConfig,
        serviceCharge: serviceChargeConfig
      }
    });
  } catch (error) {
    console.error('❌ Error fetching calculation configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calculation configurations',
      error: error.message
    });
  }
});

/**
 * POST /api/admin-calculations/calculate-all
 * Calculate both penalty and service charge for a loan
 */
router.post('/calculate-all', async (req, res) => {
  try {
    const { principalAmount, maturityDate, currentDate } = req.body;
    
    console.log(`🧮 [${new Date().toISOString()}] Calculating all charges - User: ${req.user.username}`);
    console.log('Calculation params:', { principalAmount, maturityDate, currentDate });
    
    if (!principalAmount || !maturityDate) {
      return res.status(400).json({
        success: false,
        message: 'principalAmount and maturityDate are required'
      });
    }
    
    const [penaltyCalculation, serviceChargeCalculation] = await Promise.all([
      penaltyCalculator.calculatePenalty(
        parseFloat(principalAmount),
        new Date(maturityDate),
        currentDate ? new Date(currentDate) : new Date(),
        req.user.id
      ),
      serviceChargeCalculator.calculateServiceCharge(
        parseFloat(principalAmount),
        req.user.id
      )
    ]);
    
    // Calculate total amounts
    const totalCharges = penaltyCalculation.penaltyAmount + serviceChargeCalculation.serviceChargeAmount;
    const totalAmountDue = parseFloat(principalAmount) + totalCharges;
    
    const result = {
      principalAmount: parseFloat(principalAmount),
      penalty: penaltyCalculation,
      serviceCharge: serviceChargeCalculation,
      summary: {
        principalAmount: parseFloat(principalAmount),
        penaltyAmount: penaltyCalculation.penaltyAmount,
        serviceChargeAmount: serviceChargeCalculation.serviceChargeAmount,
        totalCharges: totalCharges,
        totalAmountDue: totalAmountDue
      }
    };
    
    res.json({
      success: true,
      message: 'All charges calculated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error calculating all charges:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating all charges',
      error: error.message
    });
  }
});

/**
 * POST /api/admin-calculations/reset-to-defaults
 * Reset all calculation configurations to default values
 */
router.post('/reset-to-defaults', async (req, res) => {
  try {
    console.log(`🔄 [${new Date().toISOString()}] Resetting calculation configs to defaults - User: ${req.user.username}`);
    
    // Reset penalty configuration
    const penaltyResets = [
      { key: 'monthly_penalty_rate', value: 0.02 },
      { key: 'daily_penalty_threshold_days', value: 3 },
      { key: 'grace_period_days', value: 0 },
      { key: 'penalty_compounding', value: 0 },
      { key: 'max_penalty_multiplier', value: 12 }
    ];
    
    // Reset service charge configuration
    const serviceChargeResets = [
      { key: 'calculation_method', value: 1 },
      { key: 'percentage_rate', value: 0.01 },
      { key: 'fixed_amount', value: 50 },
      { key: 'minimum_service_charge', value: 1 },
      { key: 'maximum_service_charge', value: 1000 }
    ];
    
    // Reset service charge brackets to default
    await pool.query(`
      UPDATE service_charge_brackets SET is_active = FALSE 
      WHERE is_active = TRUE
    `);
    
    await pool.query(`
      INSERT INTO service_charge_brackets (bracket_name, min_amount, max_amount, service_charge, display_order, created_by, updated_by) VALUES
      ('Bracket 1-100', 1, 100, 1, 1, $1, $1),
      ('Bracket 101-200', 101, 200, 2, 2, $1, $1),
      ('Bracket 201-300', 201, 300, 3, 3, $1, $1),
      ('Bracket 301-400', 301, 400, 4, 4, $1, $1),
      ('Bracket 500+', 500, NULL, 5, 5, $1, $1)
      ON CONFLICT (min_amount, max_amount) DO UPDATE SET
          service_charge = EXCLUDED.service_charge,
          bracket_name = EXCLUDED.bracket_name,
          is_active = TRUE,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
    `, [req.user.id]);
    
    // Update penalty configs
    for (const reset of penaltyResets) {
      await penaltyCalculator.updatePenaltyConfig(reset.key, reset.value, req.user.id);
    }
    
    // Update service charge configs
    for (const reset of serviceChargeResets) {
      await serviceChargeCalculator.updateServiceChargeConfig(reset.key, reset.value, req.user.id);
    }
    
    // Clear caches
    penaltyCalculator.clearCache();
    serviceChargeCalculator.clearCache();
    
    res.json({
      success: true,
      message: 'All calculation configurations reset to defaults successfully'
    });
  } catch (error) {
    console.error('❌ Error resetting calculation configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting calculation configurations',
      error: error.message
    });
  }
});

/**
 * GET /api/admin-calculations/summary
 * Get a summary of current calculation settings
 */
router.get('/summary', async (req, res) => {
  try {
    console.log(`📋 [${new Date().toISOString()}] Fetching calculation summary - User: ${req.user.username}`);
    
    const [penaltyConfig, serviceChargeConfig] = await Promise.all([
      penaltyCalculator.getPenaltyConfig(),
      serviceChargeCalculator.getServiceChargeConfig()
    ]);
    
    const summary = {
      penalty: {
        monthlyRate: `${(penaltyConfig.monthly_penalty_rate * 100).toFixed(2)}%`,
        dailyThreshold: `${penaltyConfig.daily_penalty_threshold_days} days`,
        gracePeriod: `${penaltyConfig.grace_period_days} days`,
        compounding: penaltyConfig.penalty_compounding === 1 ? 'Enabled' : 'Disabled',
        maxMultiplier: `${penaltyConfig.max_penalty_multiplier}x`
      },
      serviceCharge: {
        method: serviceChargeConfig.config.calculation_method === 1 ? 'Bracket-based' : 
                serviceChargeConfig.config.calculation_method === 2 ? 'Percentage-based' : 'Fixed amount',
        brackets: serviceChargeConfig.brackets.map(b => ({
          range: `₱${b.min_amount.toLocaleString()}${b.max_amount ? ` - ₱${b.max_amount.toLocaleString()}` : '+'}`,
          charge: `₱${b.service_charge}`
        })),
        percentageRate: `${(serviceChargeConfig.config.percentage_rate * 100).toFixed(2)}%`,
        fixedAmount: `₱${serviceChargeConfig.config.fixed_amount}`,
        limits: {
          minimum: `₱${serviceChargeConfig.config.minimum_service_charge}`,
          maximum: `₱${serviceChargeConfig.config.maximum_service_charge}`
        }
      }
    };
    
    res.json({
      success: true,
      message: 'Calculation summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    console.error('❌ Error fetching calculation summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calculation summary',
      error: error.message
    });
  }
});

module.exports = router;