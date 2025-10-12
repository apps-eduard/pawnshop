const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get today's appraisals for dashboard
router.get('/today', async (req, res) => {
  try {
    // Get current date range (start of day to end of day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // Query item appraisals created today with pawner information
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.appraiser_id, ia.category, ia.description,
             ia.notes, ia.estimated_value, ia.status, ia.created_at,
             p.first_name, p.last_name, p.mobile_number as contact_number,
             e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      WHERE ia.created_at >= $1 AND ia.created_at < $2
      ORDER BY ia.created_at DESC
    `, [today, tomorrow]);
    
    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.category,
      description: row.description,
      notes: row.notes,
      estimatedValue: parseFloat(row.estimated_value),
      status: row.status,
      createdAt: row.created_at,
      pawnerName: `${row.first_name} ${row.last_name}`,
      pawnerContact: row.contact_number,
      appraiserName: row.appraiser_first_name && row.appraiser_last_name ? 
                    `${row.appraiser_first_name} ${row.appraiser_last_name}` : 
                    'Unknown'
    }));

    res.json({
      success: true,
      message: 'Today\'s appraisals retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching today\'s appraisals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s appraisals',
      error: error.message
    });
  }
});

// Get pending appraisals ready for transaction (cashier dashboard)
router.get('/pending-ready', async (req, res) => {
  try {
    // Minimal logging for performance
    
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.category, ia.description, ia.estimated_value,
             ia.status, ia.created_at,
             p.first_name, p.last_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      WHERE ia.status = 'pending'
      ORDER BY ia.created_at DESC
    `);
    
    const mappedData = result.rows.map(row => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.description; // Use description as item type
      
      // Simple value processing without excessive logging
      let totalValue = 0;
      if (row.estimated_value !== null && row.estimated_value !== undefined) {
        totalValue = parseFloat(row.estimated_value);
        if (isNaN(totalValue)) {
          totalValue = 0;
        }
      }
      
      return {
        id: row.id,
        pawnerName: pawnerName,
        itemType: itemType,
        totalAppraisedValue: totalValue,
        // Metadata for click handling
        pawnerId: row.pawner_id,
        category: row.category,
        status: row.status,
        createdAt: row.created_at
      };
    });

    // Log only summary in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [CASHIER] ${mappedData.length} pending appraisals retrieved`);
    }

    res.json({
      success: true,
      message: 'Pending appraisals ready for transaction retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching pending appraisals ready for transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending appraisals ready for transaction'
    });
  }
});

// Get appraisals by status - Optimized with reduced logging
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`🔍 [API] Getting item appraisals with status: ${status} for user: ${req.user?.username || 'unknown'}`);

    // Query the simplified item_appraisals table
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.appraiser_id, ia.category, ia.description,
             ia.notes, ia.estimated_value, ia.status, ia.created_at,
             p.first_name, p.last_name, p.mobile_number as contact_number,
             e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      WHERE ia.status = $1
      ORDER BY ia.created_at DESC
    `, [status]);
    
    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.category,
      description: row.description,
      notes: row.notes,
      estimatedValue: parseFloat(row.estimated_value),
      totalAppraisedValue: parseFloat(row.estimated_value), // For dashboard compatibility
      status: row.status,
      createdAt: row.created_at,
      pawnerName: `${row.first_name} ${row.last_name}`,
      pawnerContact: row.contact_number,
      appraiserName: row.appraiser_first_name && row.appraiser_last_name 
        ? `${row.appraiser_first_name} ${row.appraiser_last_name}` 
        : 'Unknown'
    }));
    
    // Log only summary info, not individual items
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [API] Status: ${status} -> ${mappedData.length} items | User: ${req.user?.username || 'unknown'}`);
    }
    
    res.json({
      success: true,
      data: mappedData
    });
    
  } catch (error) {
    console.error(`❌ [API ERROR] Status ${req.params.status}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appraisals',
      error: error.message
    });
  }
});



// Get all appraisals
router.get('/', async (req, res) => {
  try {
    console.log('📊 [Appraisals API] Getting all appraisals');
    
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.appraiser_id, ia.category, ia.description,
             ia.notes, ia.estimated_value, ia.status, ia.created_at,
             p.first_name, p.last_name, p.mobile_number as contact_number,
             e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
      FROM item_appraisals ia
      LEFT JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      ORDER BY ia.created_at DESC
    `);

    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.category,
      description: row.description,
      notes: row.notes,
      estimatedValue: parseFloat(row.estimated_value),
      status: row.status,
      createdAt: row.created_at,
      pawnerName: `${row.first_name} ${row.last_name}`,
      pawnerContact: row.contact_number,
      appraiserName: row.appraiser_first_name && row.appraiser_last_name 
        ? `${row.appraiser_first_name} ${row.appraiser_last_name}` 
        : 'Unknown'
    }));

    res.json({
      success: true,
      data: mappedData
    });

  } catch (error) {
    console.error('❌ [Appraisals API] Error getting appraisals:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving appraisals',
      error: error.message
    });
  }
});

// Create new appraisal
router.post('/', async (req, res) => {
  try {
    const {
      pawnerId,
      category,
      description,
      estimatedValue,
      notes
    } = req.body;

    // Minimal logging for performance

    // Validation - simplified to only required fields
    if (!pawnerId || !category || !description || !estimatedValue) {
      console.log('❌ [APPRAISAL VALIDATION] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pawnerId, category, description, and estimatedValue are required'
      });
    }

    // Verify pawner exists
    const pawnerCheck = await pool.query('SELECT id FROM pawners WHERE id = $1', [pawnerId]);
    if (pawnerCheck.rows.length === 0) {
      console.log(`❌ [APPRAISAL VALIDATION] Pawner with ID ${pawnerId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }

    // Get current branch ID
    const branchResult = await pool.query(`
      SELECT config_value as branch_id 
      FROM system_config 
      WHERE config_key = 'current_branch_id'
    `);
    const currentBranchId = branchResult.rows.length > 0 ? parseInt(branchResult.rows[0].branch_id) : 1;

    // Insert new appraisal with 'pending' status into simplified table
    const insertQuery = `
      INSERT INTO item_appraisals (
        pawner_id, appraiser_id, category, description, notes, 
        estimated_value, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      pawnerId,
      req.user?.id || 1, // appraiser_id from authenticated user (fallback to 1 for testing)
      category,
      description,
      notes || null,
      parseFloat(estimatedValue)
    ];

    const result = await pool.query(insertQuery, values);
    const newAppraisal = result.rows[0];

    console.log(`✅ [APPRAISAL SUCCESS] Created appraisal ID: ${newAppraisal.id} with status: ${newAppraisal.status}`);

    // Format response to match expected interface
    const responseData = {
      id: newAppraisal.id,
      pawnerId: newAppraisal.pawner_id,
      appraiserId: newAppraisal.appraiser_id,
      category: newAppraisal.category,
      description: newAppraisal.description,
      notes: newAppraisal.notes,
      estimatedValue: parseFloat(newAppraisal.estimated_value),
      status: newAppraisal.status,
      createdAt: newAppraisal.created_at,
      updatedAt: newAppraisal.updated_at
    };

    res.status(201).json({
      success: true,
      message: 'Appraisal created successfully with pending status',
      data: responseData
    });

  } catch (error) {
    console.error('❌ [Appraisals API] Error creating appraisal:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appraisal',
      error: error.message
    });
  }
});

// Delete/Cancel appraisal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log(`🗑️ [Appraisals API] Deleting appraisal ID: ${id} by user: ${req.user?.username || 'unknown'}`);

    // Check if appraisal exists and get details
    const checkResult = await pool.query(
      'SELECT id, status, appraiser_id FROM item_appraisals WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found'
      });
    }

    const appraisal = checkResult.rows[0];

    // Optional: Check if user has permission to delete
    // For now, allow cashiers and appraisers to delete
    // You can add more strict permission checking here if needed

    // Delete the appraisal
    await pool.query(
      'DELETE FROM item_appraisals WHERE id = $1',
      [id]
    );

    console.log(`✅ [Appraisals API] Successfully deleted appraisal ID: ${id}`);

    res.json({
      success: true,
      message: 'Appraisal deleted successfully',
      data: { id: parseInt(id) }
    });

  } catch (error) {
    console.error('❌ [Appraisals API] Error deleting appraisal:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting appraisal',
      error: error.message
    });
  }
});

module.exports = router;