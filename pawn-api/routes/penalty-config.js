const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const PenaltyCalculatorService = require('../services/penalty-calculator.service');

const router = express.Router();
const penaltyCalculator = new PenaltyCalculatorService();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * GET /api/penalty-config
 * Get all penalty configuration settings
 */
router.get('/', async (req, res) => {
  try {
    console.log(`📊 [${new Date().toISOString()}] Fetching penalty config - User: ${req.user.username}`);
    
    const config = await penaltyCalculator.getAllPenaltyConfig();
    
    res.json({
      success: true,
      message: 'Penalty configuration retrieved successfully',
      data: config
    });
  } catch (error) {
    console.error('❌ Error fetching penalty config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching penalty configuration',
      error: error.message
    });
  }
});

/**
 * PUT /api/penalty-config/:configKey
 * Update a specific penalty configuration setting
 */
router.put('/:configKey', async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;
    
    console.log(`🔧 [${new Date().toISOString()}] Updating penalty config ${configKey} = ${configValue} - User: ${req.user.username}`);
    
    if (configValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'configValue is required'
      });
    }
    
    const updatedConfig = await penaltyCalculator.updatePenaltyConfig(
      configKey, 
      parseFloat(configValue), 
      req.user.id
    );
    
    res.json({
      success: true,
      message: `Penalty configuration '${configKey}' updated successfully`,
      data: updatedConfig
    });
  } catch (error) {
    console.error('❌ Error updating penalty config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating penalty configuration',
      error: error.message
    });
  }
});

/**
 * POST /api/penalty-config/calculate
 * Calculate penalty for given parameters (testing/preview)
 */
router.post('/calculate', async (req, res) => {
  try {
    const { principalAmount, maturityDate, currentDate } = req.body;
    
    console.log(`🧮 [${new Date().toISOString()}] Calculating penalty - User: ${req.user.username}`);
    console.log('Calculation params:', { principalAmount, maturityDate, currentDate });
    
    if (!principalAmount || !maturityDate) {
      return res.status(400).json({
        success: false,
        message: 'principalAmount and maturityDate are required'
      });
    }
    
    const calculation = await penaltyCalculator.calculatePenalty(
      parseFloat(principalAmount),
      new Date(maturityDate),
      currentDate ? new Date(currentDate) : new Date(),
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Penalty calculated successfully',
      data: calculation
    });
  } catch (error) {
    console.error('❌ Error calculating penalty:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating penalty',
      error: error.message
    });
  }
});

/**
 * POST /api/penalty-config/bulk-update
 * Update multiple penalty configuration settings at once
 */
router.post('/bulk-update', async (req, res) => {
  try {
    const { configs } = req.body;
    
    console.log(`🔧 [${new Date().toISOString()}] Bulk updating penalty configs - User: ${req.user.username}`);
    
    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        message: 'configs array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const config of configs) {
      try {
        const { configKey, configValue } = config;
        const updatedConfig = await penaltyCalculator.updatePenaltyConfig(
          configKey, 
          parseFloat(configValue), 
          req.user.id
        );
        results.push(updatedConfig);
      } catch (error) {
        errors.push({ configKey: config.configKey, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `Updated ${results.length} configurations${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        updated: results,
        errors: errors
      }
    });
  } catch (error) {
    console.error('❌ Error bulk updating penalty config:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating penalty configuration',
      error: error.message
    });
  }
});

/**
 * DELETE /api/penalty-config/cache
 * Clear penalty configuration cache
 */
router.delete('/cache', async (req, res) => {
  try {
    console.log(`🗑️ [${new Date().toISOString()}] Clearing penalty config cache - User: ${req.user.username}`);
    
    penaltyCalculator.clearCache();
    
    res.json({
      success: true,
      message: 'Penalty configuration cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing penalty config cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing penalty configuration cache',
      error: error.message
    });
  }
});

/**
 * GET /api/penalty-config/calculation-log/:transactionId
 * Get penalty calculation history for a transaction
 */
router.get('/calculation-log/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    console.log(`📜 [${new Date().toISOString()}] Fetching penalty calculation log for transaction ${transactionId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pcl.*, e.first_name, e.last_name
      FROM penalty_calculation_log pcl
      LEFT JOIN employees e ON pcl.calculated_by = e.id
      WHERE pcl.transaction_id = $1
      ORDER BY pcl.created_at DESC
    `, [transactionId]);
    
    res.json({
      success: true,
      message: 'Penalty calculation log retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching penalty calculation log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching penalty calculation log',
      error: error.message
    });
  }
});

module.exports = router;