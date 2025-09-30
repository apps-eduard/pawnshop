const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// PAWNERS MANAGEMENT
// =============================================

// Search pawners (must be before /:id route)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    console.log(`🔍 [${new Date().toISOString()}] Searching pawners: ${q} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details, p.is_active,
             p.created_at, p.updated_at,
             c.name as city_name, b.name as barangay_name
      FROM pawners p
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      WHERE p.is_active = true
        AND (
          LOWER(p.first_name) LIKE LOWER($1) OR
          LOWER(p.last_name) LIKE LOWER($1) OR
          p.contact_number LIKE $1 OR
          LOWER(p.email) LIKE LOWER($1)
        )
      ORDER BY p.first_name ASC, p.last_name ASC
      LIMIT 50
    `, [`%${q}%`]);
    
    console.log(`✅ Found ${result.rows.length} pawners matching: ${q}`);
    
    res.json({
      success: true,
      message: 'Pawners found successfully',
      data: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error searching pawners:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching pawners'
    });
  }
});

// Get all pawners
router.get('/', async (req, res) => {
  try {
    console.log(`👤 [${new Date().toISOString()}] Fetching pawners - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details, p.is_active,
             p.created_at, p.updated_at,
             c.name as city_name, b.name as barangay_name
      FROM pawners p
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      ORDER BY p.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} pawners`);
    
    res.json({
      success: true,
      message: 'Pawners retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching pawners:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pawners'
    });
  }
});

// Get pawner by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 [${new Date().toISOString()}] Fetching pawner ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details, p.is_active,
             p.created_at, p.updated_at,
             c.name as city_name, b.name as barangay_name
      FROM pawners p
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    const row = result.rows[0];
    
    res.json({
      success: true,
      message: 'Pawner retrieved successfully',
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pawner'
    });
  }
});

// Create new pawner
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      contactNumber,
      email,
      cityId,
      barangayId,
      addressDetails,
      isActive = true
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !contactNumber || !cityId || !barangayId || !addressDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    console.log(`➕ [${new Date().toISOString()}] Creating pawner: ${firstName} ${lastName} - User: ${req.user.username}`);
    
    // Check if contact number already exists
    const existingPawner = await pool.query(
      'SELECT id FROM pawners WHERE contact_number = $1',
      [contactNumber]
    );
    
    if (existingPawner.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact number already exists'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO pawners (first_name, last_name, contact_number, email, city_id, barangay_id, address_details, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, first_name, last_name, contact_number, email, city_id, barangay_id, address_details, is_active, created_at, updated_at
    `, [firstName, lastName, contactNumber, email, cityId, barangayId, addressDetails, isActive]);
    
    const row = result.rows[0];
    
    console.log(`✅ Pawner created: ${firstName} ${lastName} (ID: ${row.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Pawner created successfully',
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pawner'
    });
  }
});

// Update pawner
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      contactNumber,
      email,
      cityId,
      barangayId,
      addressDetails,
      isActive
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Updating pawner ${id} - User: ${req.user.username}`);
    
    // Check if pawner exists
    const existingPawner = await pool.query('SELECT id FROM pawners WHERE id = $1', [id]);
    if (existingPawner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    // Check for contact number conflicts (excluding current pawner)
    if (contactNumber) {
      const conflicts = await pool.query(
        'SELECT id FROM pawners WHERE contact_number = $1 AND id != $2',
        [contactNumber, id]
      );
      
      if (conflicts.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact number already exists'
        });
      }
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (firstName !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (contactNumber !== undefined) {
      fields.push(`contact_number = $${paramCount++}`);
      values.push(contactNumber);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (cityId !== undefined) {
      fields.push(`city_id = $${paramCount++}`);
      values.push(cityId);
    }
    if (barangayId !== undefined) {
      fields.push(`barangay_id = $${paramCount++}`);
      values.push(barangayId);
    }
    if (addressDetails !== undefined) {
      fields.push(`address_details = $${paramCount++}`);
      values.push(addressDetails);
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
    
    const query = `UPDATE pawners SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    await pool.query(query, values);
    
    console.log(`✅ Pawner updated: ${id}`);
    
    res.json({
      success: true,
      message: 'Pawner updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pawner'
    });
  }
});

// Delete pawner (Admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }

  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting pawner ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM pawners WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    console.log(`✅ Pawner deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Pawner deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pawner'
    });
  }
});

module.exports = router;