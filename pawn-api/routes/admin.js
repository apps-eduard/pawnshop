const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// =============================================
// CATEGORIES MANAGEMENT
// =============================================

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    console.log(`📋 [${new Date().toISOString()}] Admin fetching categories - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT id, name, description, interest_rate, is_active, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `);
    
    console.log(`✅ Found ${result.rows.length} categories`);
    
    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Create new category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, interest_rate, is_active = true } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Admin creating category: ${name} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO categories (name, description, interest_rate, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, interest_rate, is_active]);
    
    console.log(`✅ Category created: ${name} (${interest_rate}%)`);
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category'
    });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, interest_rate, is_active } = req.body;
    
    console.log(`✏️ [${new Date().toISOString()}] Admin updating category ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      UPDATE categories 
      SET name = $1, description = $2, interest_rate = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [name, description, interest_rate, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    console.log(`✅ Category updated: ${name} (${interest_rate}%)`);
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category'
    });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Admin deleting category ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    console.log(`✅ Category deleted: ${result.rows[0].name}`);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
});

// =============================================
// LOAN RULES MANAGEMENT
// =============================================

// Get loan rules
router.get('/loan-rules', async (req, res) => {
  try {
    console.log(`⚙️ [${new Date().toISOString()}] Admin fetching loan rules - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT * FROM loan_rules 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    // If no rules exist, return defaults
    const loanRules = result.rows[0] || {
      service_charge_rate: 0.01,
      minimum_service_charge: 5,
      minimum_loan_for_service: 500
    };
    
    console.log(`✅ Loan rules retrieved`);
    
    res.json({
      success: true,
      message: 'Loan rules retrieved successfully',
      data: loanRules
    });
  } catch (error) {
    console.error('❌ Error fetching loan rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching loan rules'
    });
  }
});

// Update loan rules
router.put('/loan-rules', async (req, res) => {
  try {
    const { service_charge_rate, minimum_service_charge, minimum_loan_for_service } = req.body;
    
    console.log(`⚙️ [${new Date().toISOString()}] Admin updating loan rules - User: ${req.user.username}`);
    console.log(`📊 New rules: Rate=${service_charge_rate}, Min=${minimum_service_charge}, Threshold=${minimum_loan_for_service}`);
    
    // Check if rules exist
    const existingResult = await pool.query('SELECT id FROM loan_rules LIMIT 1');
    
    let result;
    if (existingResult.rows.length > 0) {
      // Update existing
      result = await pool.query(`
        UPDATE loan_rules 
        SET service_charge_rate = $1, minimum_service_charge = $2, minimum_loan_for_service = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [service_charge_rate, minimum_service_charge, minimum_loan_for_service, existingResult.rows[0].id]);
    } else {
      // Create new
      result = await pool.query(`
        INSERT INTO loan_rules (service_charge_rate, minimum_service_charge, minimum_loan_for_service)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [service_charge_rate, minimum_service_charge, minimum_loan_for_service]);
    }
    
    console.log(`✅ Loan rules updated successfully`);
    
    res.json({
      success: true,
      message: 'Loan rules updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating loan rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating loan rules'
    });
  }
});

// =============================================
// VOUCHER TYPES MANAGEMENT
// =============================================

// Get all voucher types
router.get('/voucher-types', async (req, res) => {
  try {
    console.log(`🧾 [${new Date().toISOString()}] Admin fetching voucher types - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT id, code, type, description, is_active, created_at, updated_at
      FROM voucher_types
      ORDER BY code ASC
    `);
    
    console.log(`✅ Found ${result.rows.length} voucher types`);
    
    res.json({
      success: true,
      message: 'Voucher types retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching voucher types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching voucher types'
    });
  }
});

// Create voucher type
router.post('/voucher-types', async (req, res) => {
  try {
    const { code, type, description, is_active = true } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Admin creating voucher type: ${code} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO voucher_types (code, type, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [code, type, description, is_active]);
    
    console.log(`✅ Voucher type created: ${code} (${type})`);
    
    res.status(201).json({
      success: true,
      message: 'Voucher type created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating voucher type:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating voucher type'
    });
  }
});

// Update voucher type
router.put('/voucher-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type, description, is_active } = req.body;
    
    console.log(`✏️ [${new Date().toISOString()}] Admin updating voucher type ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      UPDATE voucher_types 
      SET code = $1, type = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [code, type, description, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher type not found'
      });
    }
    
    console.log(`✅ Voucher type updated: ${code} (${type})`);
    
    res.json({
      success: true,
      message: 'Voucher type updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating voucher type:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating voucher type'
    });
  }
});

// Delete voucher type
router.delete('/voucher-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Admin deleting voucher type ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM voucher_types WHERE id = $1 RETURNING code', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher type not found'
      });
    }
    
    console.log(`✅ Voucher type deleted: ${result.rows[0].code}`);
    
    res.json({
      success: true,
      message: 'Voucher type deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting voucher type:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting voucher type'
    });
  }
});

module.exports = router;