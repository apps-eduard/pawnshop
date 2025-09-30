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
// BRANCHES MANAGEMENT
// =============================================

// Get all branches
router.get('/', async (req, res) => {
  try {
    console.log(`🏢 [${new Date().toISOString()}] Admin fetching branches - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT id, name, code, address, phone, email, manager_name, 
             is_active, created_at, updated_at
      FROM branches
      ORDER BY name ASC
    `);
    
    console.log(`✅ Found ${result.rows.length} branches`);
    
    res.json({
      success: true,
      message: 'Branches retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches'
    });
  }
});

// Create new branch
router.post('/', async (req, res) => {
  try {
    const { name, code, address, phone, email, manager_name, is_active = true } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Admin creating branch: ${name} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO branches (name, code, address, phone, email, manager_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, code, address, phone, email, manager_name, is_active]);
    
    console.log(`✅ Branch created: ${name} (${code})`);
    
    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating branch:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating branch'
    });
  }
});

// Update branch
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, phone, email, manager_name, is_active } = req.body;
    
    console.log(`✏️ [${new Date().toISOString()}] Admin updating branch ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      UPDATE branches 
      SET name = $1, code = $2, address = $3, phone = $4, email = $5, 
          manager_name = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, code, address, phone, email, manager_name, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    console.log(`✅ Branch updated: ${name} (${code})`);
    
    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating branch:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating branch'
    });
  }
});

// Delete branch
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Admin deleting branch ID: ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM branches WHERE id = $1 RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }
    
    console.log(`✅ Branch deleted: ${result.rows[0].name}`);
    
    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting branch:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting branch'
    });
  }
});

module.exports = router;