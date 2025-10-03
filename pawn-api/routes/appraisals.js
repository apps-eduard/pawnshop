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
    
    // Query appraisals created today with pawner information
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.appraiser_id, a.item_category, a.item_category_description,
             a.item_type, a.description, a.serial_number, a.weight, a.karat,
             a.estimated_value, a.condition_notes, a.status, a.created_at,
             p.first_name, p.last_name, p.contact_number,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN users u ON a.appraiser_id = u.id
      WHERE a.created_at >= $1 AND a.created_at < $2
      ORDER BY a.created_at DESC
    `, [today, tomorrow]);
    
    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.item_category,
      categoryDescription: row.item_category_description,
      description: row.description,
      serialNumber: row.serial_number,
      weight: row.weight,
      karat: row.karat,
      estimatedValue: parseFloat(row.estimated_value),
      notes: row.condition_notes,
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
      SELECT a.id, a.pawner_id, a.item_category, a.item_type, a.description, a.estimated_value,
             a.status, a.created_at,
             p.first_name, p.last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = 'pending'
      AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )
      ORDER BY a.created_at DESC
    `);
    
    const mappedData = result.rows.map(row => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.item_type || row.description;
      
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
        category: row.item_category,
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
    
    // Map frontend status to database status
    let dbStatus;
    switch (status) {
      case 'pending':
        dbStatus = 'completed'; // Frontend 'pending' maps to database 'completed'
        break;
      case 'completed':
        dbStatus = 'completed';
        break;
      case 'approved':
        dbStatus = 'approved';
        break;
      default:
        dbStatus = status;
    }
    
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.appraiser_id, a.item_category, a.item_category_description,
             a.item_type, a.description, a.serial_number, a.weight, a.karat,
             a.estimated_value, a.condition_notes, a.status, a.created_at,
             p.first_name, p.last_name, p.contact_number,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN users u ON a.appraiser_id = u.id
      WHERE a.status = $1
      ORDER BY a.created_at DESC
    `, [dbStatus]);
    
    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.item_category,
      categoryDescription: row.item_category_description,
      description: row.description,
      serialNumber: row.serial_number,
      weight: row.weight,
      karat: row.karat,
      estimatedValue: parseFloat(row.estimated_value),
      appraisedValue: parseFloat(row.estimated_value), // Add this field for compatibility
      notes: row.condition_notes,
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
      console.log(`📊 [API] Status: ${status} -> ${mappedData.length} items | User: ${req.user.username}`);
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
      SELECT a.*, p.first_name, p.last_name, p.contact_number,
             u.username as appraiser_name
      FROM appraisals a
      LEFT JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN users u ON a.appraiser_id = u.id
      ORDER BY a.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
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
      categoryDescription,
      description,
      serialNumber,
      weight,
      karat,
      estimatedValue,
      interestRate,
      notes
    } = req.body;

    // Minimal logging for performance

    // Validation
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

    // Insert new appraisal with 'pending' status
    const insertQuery = `
      INSERT INTO appraisals (
        pawner_id, appraiser_id, item_category, item_category_description, 
        item_type, description, serial_number, weight, karat, 
        estimated_value, condition_notes, branch_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      pawnerId,
      req.user.id, // appraiser_id from authenticated user
      category,
      categoryDescription || null,
      description, // Using description as item_type for compatibility
      description, // description field
      serialNumber || null,
      weight || null,
      karat || null,
      parseFloat(estimatedValue),
      notes || null,
      currentBranchId
    ];

    const result = await pool.query(insertQuery, values);
    const newAppraisal = result.rows[0];

    console.log(`✅ [APPRAISAL SUCCESS] Created appraisal ID: ${newAppraisal.id} with status: ${newAppraisal.status}`);

    // Format response to match expected interface
    const responseData = {
      id: newAppraisal.id,
      pawnerId: newAppraisal.pawner_id,
      appraiserId: newAppraisal.appraiser_id,
      category: newAppraisal.item_category,
      categoryDescription: newAppraisal.item_category_description,
      description: newAppraisal.description,
      serialNumber: newAppraisal.serial_number,
      weight: newAppraisal.weight,
      karat: newAppraisal.karat,
      estimatedValue: parseFloat(newAppraisal.estimated_value),
      notes: newAppraisal.condition_notes,
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

module.exports = router;