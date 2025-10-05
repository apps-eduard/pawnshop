const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const ServiceChargeCalculatorService = require('../services/service-charge-calculator.service');

const router = express.Router();
const serviceChargeCalculator = new ServiceChargeCalculatorService();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * GET /api/service-charge-config
 * Get all service charge configuration settings and brackets
 */
router.get('/', async (req, res) => {
  try {
    console.log(`📊 [${new Date().toISOString()}] Fetching service charge config - User: ${req.user.username}`);
    
    const config = await serviceChargeCalculator.getAllServiceChargeConfig();
    
    res.json({
      success: true,
      message: 'Service charge configuration retrieved successfully',
      data: config
    });
  } catch (error) {
    console.error('❌ Error fetching service charge config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service charge configuration',
      error: error.message
    });
  }
});

/**
 * POST /api/service-charge-config/calculate
 * Calculate service charge for given principal amount
 */
router.post('/calculate', async (req, res) => {
  try {
    const { principalAmount } = req.body;
    
    console.log(`🧮 [${new Date().toISOString()}] Calculating service charge - User: ${req.user.username}`);
    console.log('Calculation params:', { principalAmount });
    
    if (!principalAmount) {
      return res.status(400).json({
        success: false,
        message: 'principalAmount is required'
      });
    }
    
    const calculation = await serviceChargeCalculator.calculateServiceCharge(
      parseFloat(principalAmount),
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Service charge calculated successfully',
      data: calculation
    });
  } catch (error) {
    console.error('❌ Error calculating service charge:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating service charge',
      error: error.message
    });
  }
});

/**
 * PUT /api/service-charge-config/:configKey
 * Update a specific service charge configuration setting
 */
router.put('/config/:configKey', async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;
    
    console.log(`🔧 [${new Date().toISOString()}] Updating service charge config ${configKey} = ${configValue} - User: ${req.user.username}`);
    
    if (configValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'configValue is required'
      });
    }
    
    const updatedConfig = await serviceChargeCalculator.updateServiceChargeConfig(
      configKey, 
      parseFloat(configValue), 
      req.user.id
    );
    
    res.json({
      success: true,
      message: `Service charge configuration '${configKey}' updated successfully`,
      data: updatedConfig
    });
  } catch (error) {
    console.error('❌ Error updating service charge config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service charge configuration',
      error: error.message
    });
  }
});

/**
 * POST /api/service-charge-config/brackets
 * Add new service charge bracket
 */
router.post('/brackets', async (req, res) => {
  try {
    const bracketData = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Adding service charge bracket - User: ${req.user.username}`);
    console.log('Bracket data:', bracketData);
    
    const requiredFields = ['bracket_name', 'min_amount', 'service_charge'];
    const missingFields = requiredFields.filter(field => !bracketData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const newBracket = await serviceChargeCalculator.addServiceChargeBracket(
      bracketData, 
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Service charge bracket added successfully',
      data: newBracket
    });
  } catch (error) {
    console.error('❌ Error adding service charge bracket:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding service charge bracket',
      error: error.message
    });
  }
});

/**
 * PUT /api/service-charge-config/brackets/:bracketId
 * Update a specific service charge bracket
 */
router.put('/brackets/:bracketId', async (req, res) => {
  try {
    const { bracketId } = req.params;
    const updates = req.body;
    
    console.log(`🔧 [${new Date().toISOString()}] Updating service charge bracket ${bracketId} - User: ${req.user.username}`);
    console.log('Updates:', updates);
    
    const updatedBracket = await serviceChargeCalculator.updateServiceChargeBracket(
      parseInt(bracketId), 
      updates, 
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Service charge bracket updated successfully',
      data: updatedBracket
    });
  } catch (error) {
    console.error('❌ Error updating service charge bracket:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service charge bracket',
      error: error.message
    });
  }
});

/**
 * DELETE /api/service-charge-config/brackets/:bracketId
 * Deactivate a service charge bracket
 */
router.delete('/brackets/:bracketId', async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deactivating service charge bracket ${bracketId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      UPDATE service_charge_brackets 
      SET is_active = FALSE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, bracketId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service charge bracket not found'
      });
    }
    
    // Clear cache
    serviceChargeCalculator.clearCache();
    
    res.json({
      success: true,
      message: 'Service charge bracket deactivated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deactivating service charge bracket:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating service charge bracket',
      error: error.message
    });
  }
});

/**
 * DELETE /api/service-charge-config/cache
 * Clear service charge configuration cache
 */
router.delete('/cache', async (req, res) => {
  try {
    console.log(`🗑️ [${new Date().toISOString()}] Clearing service charge config cache - User: ${req.user.username}`);
    
    serviceChargeCalculator.clearCache();
    
    res.json({
      success: true,
      message: 'Service charge configuration cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing service charge config cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing service charge configuration cache',
      error: error.message
    });
  }
});

/**
 * GET /api/service-charge-config/calculation-log/:transactionId
 * Get service charge calculation history for a transaction
 */
router.get('/calculation-log/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    console.log(`📜 [${new Date().toISOString()}] Fetching service charge calculation log for transaction ${transactionId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT sccl.*, e.first_name, e.last_name
      FROM service_charge_calculation_log sccl
      LEFT JOIN employees e ON sccl.calculated_by = e.id
      WHERE sccl.transaction_id = $1
      ORDER BY sccl.created_at DESC
    `, [transactionId]);
    
    res.json({
      success: true,
      message: 'Service charge calculation log retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching service charge calculation log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service charge calculation log',
      error: error.message
    });
  }
});

/**
 * POST /api/service-charge-config/bulk-update-brackets
 * Update multiple service charge brackets at once
 */
router.post('/bulk-update-brackets', async (req, res) => {
  try {
    const { brackets } = req.body;
    
    console.log(`🔧 [${new Date().toISOString()}] Bulk updating service charge brackets - User: ${req.user.username}`);
    
    if (!brackets || !Array.isArray(brackets)) {
      return res.status(400).json({
        success: false,
        message: 'brackets array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const bracket of brackets) {
      try {
        const { id, ...updates } = bracket;
        const updatedBracket = await serviceChargeCalculator.updateServiceChargeBracket(
          id, 
          updates, 
          req.user.id
        );
        results.push(updatedBracket);
      } catch (error) {
        errors.push({ bracketId: bracket.id, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `Updated ${results.length} brackets${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        updated: results,
        errors: errors
      }
    });
  } catch (error) {
    console.error('❌ Error bulk updating service charge brackets:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating service charge brackets',
      error: error.message
    });
  }
});

module.exports = router;