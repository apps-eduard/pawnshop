const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// APPRAISALS MANAGEMENT
// =============================================

// Get all appraisals
router.get('/', async (req, res) => {
  try {
    console.log(`💎 [${new Date().toISOString()}] Fetching appraisals - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT a.*, 
             p.first_name, p.last_name, p.contact_number,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      JOIN users u ON a.appraiser_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} appraisals`);
    
    res.json({
      success: true,
      message: 'Appraisals retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        pawnerId: row.pawner_id,
        appraiserId: row.appraiser_id,
        itemCategory: row.item_category,
        itemCategoryDescription: row.item_category_description,
        itemType: row.item_type,
        brand: row.brand,
        model: row.model,
        description: row.description,
        serialNumber: row.serial_number,
        weight: row.weight,
        karat: row.karat,
        estimatedValue: parseFloat(row.estimated_value),
        conditionNotes: row.condition_notes,
        appraisalNotes: row.appraisal_notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pawnerName: `${row.first_name} ${row.last_name}`,
        pawnerContact: row.contact_number,
        appraiserName: `${row.appraiser_first_name} ${row.appraiser_last_name}`
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching appraisals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appraisals'
    });
  }
});

// Get appraisals by status (for cashier dashboard)
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    console.log(`💎 [${new Date().toISOString()}] Fetching appraisals with status: ${status} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT a.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      JOIN users u ON a.appraiser_id = u.id
      WHERE a.status = $1
      ORDER BY a.created_at DESC
    `, [status]);
    
    res.json({
      success: true,
      message: `Appraisals with status '${status}' retrieved successfully`,
      data: result.rows.map(row => ({
        id: row.id,
        pawnerId: row.pawner_id,
        appraiserId: row.appraiser_id,
        itemCategory: row.item_category,
        itemCategoryDescription: row.item_category_description,
        itemType: row.item_type,
        brand: row.brand,
        model: row.model,
        description: row.description,
        serialNumber: row.serial_number,
        weight: row.weight,
        karat: row.karat,
        estimatedValue: parseFloat(row.estimated_value),
        conditionNotes: row.condition_notes,
        appraisalNotes: row.appraisal_notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pawner: {
          id: row.pawner_id,
          firstName: row.first_name,
          lastName: row.last_name,
          contactNumber: row.contact_number,
          email: row.email,
          cityId: row.city_id,
          barangayId: row.barangay_id,
          addressDetails: row.address_details,
          cityName: row.city_name,
          barangayName: row.barangay_name
        },
        appraiserName: `${row.appraiser_first_name} ${row.appraiser_last_name}`
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching appraisals by status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appraisals'
    });
  }
});

// Get appraisal by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`💎 [${new Date().toISOString()}] Fetching appraisal ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT a.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      JOIN users u ON a.appraiser_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found'
      });
    }
    
    const row = result.rows[0];
    
    res.json({
      success: true,
      message: 'Appraisal retrieved successfully',
      data: {
        id: row.id,
        pawnerId: row.pawner_id,
        appraiserId: row.appraiser_id,
        itemCategory: row.item_category,
        itemCategoryDescription: row.item_category_description,
        itemType: row.item_type,
        brand: row.brand,
        model: row.model,
        description: row.description,
        serialNumber: row.serial_number,
        weight: row.weight,
        karat: row.karat,
        estimatedValue: parseFloat(row.estimated_value),
        conditionNotes: row.condition_notes,
        appraisalNotes: row.appraisal_notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pawner: {
          id: row.pawner_id,
          firstName: row.first_name,
          lastName: row.last_name,
          contactNumber: row.contact_number,
          email: row.email,
          cityId: row.city_id,
          barangayId: row.barangay_id,
          addressDetails: row.address_details,
          cityName: row.city_name,
          barangayName: row.barangay_name
        },
        appraiserName: `${row.appraiser_first_name} ${row.appraiser_last_name}`
      }
    });
  } catch (error) {
    console.error('❌ Error fetching appraisal:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appraisal'
    });
  }
});

// Create new appraisal
router.post('/', async (req, res) => {
  try {
    const {
      pawnerId,
      itemCategory,
      itemCategoryDescription,
      itemType,
      brand,
      model,
      description,
      serialNumber,
      weight,
      karat,
      estimatedValue,
      conditionNotes,
      appraisalNotes
    } = req.body;
    
    // Validate required fields
    if (!pawnerId || !itemCategory || !itemType || !description || !estimatedValue) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pawnerId, itemCategory, itemType, description, estimatedValue'
      });
    }
    
    console.log(`➕ [${new Date().toISOString()}] Creating appraisal for pawner ${pawnerId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      INSERT INTO appraisals (
        pawner_id, appraiser_id, item_category, item_category_description,
        item_type, brand, model, description, serial_number, weight, karat,
        estimated_value, condition_notes, appraisal_notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      pawnerId, req.user.userId, itemCategory, itemCategoryDescription,
      itemType, brand, model, description, serialNumber, weight, karat,
      estimatedValue, conditionNotes, appraisalNotes, 'pending'
    ]);
    
    const appraisal = result.rows[0];
    
    // Log audit trail
    await pool.query(`
      SELECT log_audit_trail($1, $2, $3, $4, $5, $6, $7)
    `, [
      'appraisals',
      appraisal.id,
      'INSERT',
      req.user.userId,
      null, // no old values for insert
      JSON.stringify(appraisal),
      `Appraisal created for ${itemType} - Estimated value: ${estimatedValue}`
    ]);
    
    console.log(`✅ Appraisal created: ${itemType} (ID: ${appraisal.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Appraisal created successfully',
      data: {
        id: appraisal.id,
        pawnerId: appraisal.pawner_id,
        appraiserId: appraisal.appraiser_id,
        itemCategory: appraisal.item_category,
        itemCategoryDescription: appraisal.item_category_description,
        itemType: appraisal.item_type,
        brand: appraisal.brand,
        model: appraisal.model,
        description: appraisal.description,
        serialNumber: appraisal.serial_number,
        weight: appraisal.weight,
        karat: appraisal.karat,
        estimatedValue: parseFloat(appraisal.estimated_value),
        conditionNotes: appraisal.condition_notes,
        appraisalNotes: appraisal.appraisal_notes,
        status: appraisal.status,
        createdAt: appraisal.created_at,
        updatedAt: appraisal.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating appraisal:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appraisal'
    });
  }
});

// Update appraisal status (for cashier approval)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'approved', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, approved, processing, completed, or cancelled'
      });
    }
    
    console.log(`📝 [${new Date().toISOString()}] Updating appraisal ${id} status to ${status} - User: ${req.user.username}`);
    
    // Get current appraisal for audit trail
    const currentResult = await pool.query('SELECT * FROM appraisals WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found'
      });
    }
    
    const oldAppraisal = currentResult.rows[0];
    
    // Update status
    const result = await pool.query(`
      UPDATE appraisals 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [status, id]);
    
    const updatedAppraisal = result.rows[0];
    
    // Log audit trail
    await pool.query(`
      SELECT log_audit_trail($1, $2, $3, $4, $5, $6, $7)
    `, [
      'appraisals',
      id,
      'UPDATE',
      req.user.userId,
      JSON.stringify(oldAppraisal),
      JSON.stringify(updatedAppraisal),
      `Appraisal status changed from ${oldAppraisal.status} to ${status}`
    ]);
    
    console.log(`✅ Appraisal ${id} status updated to ${status}`);
    
    res.json({
      success: true,
      message: 'Appraisal status updated successfully',
      data: {
        id: updatedAppraisal.id,
        status: updatedAppraisal.status,
        updatedAt: updatedAppraisal.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error updating appraisal status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appraisal status'
    });
  }
});

// Delete appraisal (Admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }

  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting appraisal ${id} - User: ${req.user.username}`);
    
    // Get appraisal for audit trail
    const appraisalResult = await pool.query('SELECT * FROM appraisals WHERE id = $1', [id]);
    if (appraisalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found'
      });
    }
    
    const appraisal = appraisalResult.rows[0];
    
    // Delete appraisal
    await pool.query('DELETE FROM appraisals WHERE id = $1', [id]);
    
    // Log audit trail
    await pool.query(`
      SELECT log_audit_trail($1, $2, $3, $4, $5, $6, $7)
    `, [
      'appraisals',
      id,
      'DELETE',
      req.user.userId,
      JSON.stringify(appraisal),
      null, // no new values for delete
      `Appraisal deleted: ${appraisal.item_type}`
    ]);
    
    console.log(`✅ Appraisal deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Appraisal deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting appraisal:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting appraisal'
    });
  }
});

module.exports = router;