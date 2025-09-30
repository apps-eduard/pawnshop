const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// CITIES MANAGEMENT
// =============================================

// Get all cities
router.get('/cities', async (req, res) => {
  try {
    console.log(`🏙️ [${new Date().toISOString()}] Fetching cities - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT id, name, province, is_active, created_at, updated_at
      FROM cities
      ORDER BY name ASC
    `);
    
    console.log(`✅ Found ${result.rows.length} cities`);
    
    res.json({
      success: true,
      message: 'Cities retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        province: row.province,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities'
    });
  }
});

// Get city by ID
router.get('/cities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT id, name, province, is_active, created_at, updated_at
      FROM cities
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }
    
    const row = result.rows[0];
    res.json({
      success: true,
      message: 'City retrieved successfully',
      data: {
        id: row.id,
        name: row.name,
        province: row.province,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching city:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching city'
    });
  }
});

// Create new city (Admin/Manager only)
router.post('/cities', async (req, res) => {
  if (!['administrator', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or manager access required'
    });
  }

  try {
    const { name, province, isActive = true } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }
    
    console.log(`➕ [${new Date().toISOString()}] Creating city: ${name} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO cities (name, province, is_active)
      VALUES ($1, $2, $3)
      RETURNING id, name, province, is_active, created_at, updated_at
    `, [name, province, isActive]);
    
    const row = result.rows[0];
    
    console.log(`✅ City created: ${name} (ID: ${row.id})`);
    
    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: {
        id: row.id,
        name: row.name,
        province: row.province,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating city:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating city'
    });
  }
});

// Update city (Admin/Manager only)
router.put('/cities/:id', async (req, res) => {
  if (!['administrator', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or manager access required'
    });
  }

  try {
    const { id } = req.params;
    const { name, province, isActive } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Updating city ${id} - User: ${req.user.username}`);
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (province !== undefined) {
      fields.push(`province = $${paramCount++}`);
      values.push(province);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `UPDATE cities SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }
    
    console.log(`✅ City updated: ${id}`);
    
    res.json({
      success: true,
      message: 'City updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating city:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating city'
    });
  }
});

// Delete city (Admin only)
router.delete('/cities/:id', async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting city ${id} - User: ${req.user.username}`);
    
    await client.query('BEGIN');
    
    // Delete barangays first
    await client.query('DELETE FROM barangays WHERE city_id = $1', [id]);
    
    // Delete city
    const result = await client.query('DELETE FROM cities WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ City deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting city:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting city'
    });
  } finally {
    client.release();
  }
});

// =============================================
// BARANGAYS MANAGEMENT
// =============================================

// Get all barangays
router.get('/barangays', async (req, res) => {
  try {
    console.log(`🏘️ [${new Date().toISOString()}] Fetching barangays - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT b.id, b.name, b.city_id, b.is_active, b.created_at, b.updated_at,
             c.name as city_name
      FROM barangays b
      LEFT JOIN cities c ON b.city_id = c.id
      ORDER BY c.name ASC, b.name ASC
    `);
    
    console.log(`✅ Found ${result.rows.length} barangays`);
    
    res.json({
      success: true,
      message: 'Barangays retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        cityId: row.city_id,
        cityName: row.city_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching barangays:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barangays'
    });
  }
});

// Get barangays by city
router.get('/cities/:cityId/barangays', async (req, res) => {
  try {
    const { cityId } = req.params;
    
    console.log(`🏘️ [${new Date().toISOString()}] Fetching barangays for city ${cityId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT id, name, city_id, is_active, created_at, updated_at
      FROM barangays
      WHERE city_id = $1
      ORDER BY name ASC
    `, [cityId]);
    
    console.log(`✅ Found ${result.rows.length} barangays for city ${cityId}`);
    
    res.json({
      success: true,
      message: 'Barangays retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        cityId: row.city_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching barangays:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barangays'
    });
  }
});

// Create new barangay (Admin/Manager only)
router.post('/barangays', async (req, res) => {
  if (!['administrator', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or manager access required'
    });
  }

  try {
    const { name, cityId, isActive = true } = req.body;
    
    if (!name || !cityId) {
      return res.status(400).json({
        success: false,
        message: 'Barangay name and city ID are required'
      });
    }
    
    console.log(`➕ [${new Date().toISOString()}] Creating barangay: ${name} for city ${cityId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO barangays (name, city_id, is_active)
      VALUES ($1, $2, $3)
      RETURNING id, name, city_id, is_active, created_at, updated_at
    `, [name, cityId, isActive]);
    
    const row = result.rows[0];
    
    console.log(`✅ Barangay created: ${name} (ID: ${row.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Barangay created successfully',
      data: {
        id: row.id,
        name: row.name,
        cityId: row.city_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating barangay:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating barangay'
    });
  }
});

// Update barangay (Admin/Manager only)
router.put('/barangays/:id', async (req, res) => {
  if (!['administrator', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or manager access required'
    });
  }

  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Updating barangay ${id} - User: ${req.user.username}`);
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `UPDATE barangays SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barangay not found'
      });
    }
    
    console.log(`✅ Barangay updated: ${id}`);
    
    res.json({
      success: true,
      message: 'Barangay updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating barangay:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating barangay'
    });
  }
});

// Delete barangay (Admin only)
router.delete('/barangays/:id', async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting barangay ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM barangays WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barangay not found'
      });
    }
    
    console.log(`✅ Barangay deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Barangay deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting barangay:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting barangay'
    });
  }
});

module.exports = router;
