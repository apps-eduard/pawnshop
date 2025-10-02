const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get today's appraisals for dashboard
router.get('/today', async (req, res) => {
  try {
    console.log(`🗓️ [${new Date().toISOString()}] TODAY'S APPRAISALS - Fetching appraisals from today - User: ${req.user.username}`);
    
    // Get current date range (start of day to end of day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    console.log(`🔍 [TODAY'S APPRAISALS] Date range: ${today.toISOString()} to ${tomorrow.toISOString()}`);
    
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
    
    console.log(`📊 [TODAY'S APPRAISALS] Found ${result.rows.length} appraisals for today`);
    
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
    console.log(`🏪 [${new Date().toISOString()}] CASHIER DASHBOARD - Fetching pending appraisals ready for transaction - User: ${req.user.username}`);
    
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
    
    console.log(`🔍 [CASHIER DEBUG] Raw query found ${result.rows.length} pending appraisals:`);
    result.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, Pawner: ${row.first_name} ${row.last_name}, Item: ${row.item_type}, Value: ₱${row.estimated_value}`);
    });
    
    const mappedData = result.rows.map(row => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.item_type || row.description;
      
      // Enhanced value processing with debugging
      let totalValue;
      console.log(`🔍 [VALUE DEBUG] Raw estimated_value: "${row.estimated_value}" (type: ${typeof row.estimated_value})`);
      
      if (row.estimated_value === null || row.estimated_value === undefined) {
        console.log(`⚠️ [VALUE WARNING] estimated_value is null/undefined for appraisal ${row.id}`);
        totalValue = 0;
      } else {
        totalValue = parseFloat(row.estimated_value);
        if (isNaN(totalValue)) {
          console.log(`❌ [VALUE ERROR] parseFloat resulted in NaN for value: "${row.estimated_value}"`);
          totalValue = 0;
        }
      }
      
      console.log(`🔍 [CASHIER DEBUG] Processing appraisal ${row.id}:`);
      console.log(`     Pawner: "${row.first_name}" + "${row.last_name}" = "${pawnerName}"`);
      console.log(`     Item Type: "${itemType}"`);
      console.log(`     Raw Value: "${row.estimated_value}" -> Parsed: ${totalValue}`);
      
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

    console.log(`✅ [CASHIER SUCCESS] Returning ${mappedData.length} pending appraisals for cashier dashboard`);

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

// Get appraisals by status (for frontend compatibility)
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    console.log(`📊 [${new Date().toISOString()}] APPRAISALS STATUS - Fetching ${status} appraisals - User: ${req.user.username}`);
    
    // Map frontend status requests to our data
    let queryStatus = status;
    let additionalWhere = '';
    
    if (status === 'completed') {
      // Frontend asks for "completed" but wants pending appraisals ready for transaction
      queryStatus = 'pending';
      additionalWhere = `AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )`;
      console.log(`🔄 [STATUS MAPPING] Frontend requested 'completed' - returning 'pending' appraisals ready for transaction`);
    }
    
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.item_category, a.item_type, a.description, a.estimated_value,
             a.status, a.created_at,
             p.first_name, p.last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = $1
      ${additionalWhere}
      ORDER BY a.created_at DESC
    `, [queryStatus]);
    
    console.log(`🔍 [STATUS DEBUG] Found ${result.rows.length} appraisals with status '${status}' (mapped to '${queryStatus}'):`);
    result.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, Pawner: ${row.first_name} ${row.last_name}, Item: ${row.item_type}, Value: ₱${row.estimated_value}`);
    });
    
    const mappedData = result.rows.map(row => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.item_type || row.description;
      
      // Enhanced value processing with debugging
      let totalValue;
      console.log(`🔍 [STATUS VALUE DEBUG] Raw estimated_value: "${row.estimated_value}" (type: ${typeof row.estimated_value})`);
      
      if (row.estimated_value === null || row.estimated_value === undefined) {
        console.log(`⚠️ [STATUS VALUE WARNING] estimated_value is null/undefined for appraisal ${row.id}`);
        totalValue = 0;
      } else {
        totalValue = parseFloat(row.estimated_value);
        if (isNaN(totalValue)) {
          console.log(`❌ [STATUS VALUE ERROR] parseFloat resulted in NaN for value: "${row.estimated_value}"`);
          totalValue = 0;
        }
      }
      
      console.log(`✅ [STATUS DEBUG] Appraisal ${row.id}: Value converted from "${row.estimated_value}" to ${totalValue}`);
      
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

    console.log(`✅ [STATUS SUCCESS] Returning ${mappedData.length} appraisals for status '${status}'`);

    res.json({
      success: true,
      message: `${status.charAt(0).toUpperCase() + status.slice(1)} appraisals retrieved successfully`,
      data: mappedData
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.status} appraisals:`, error);
    res.status(500).json({
      success: false,
      message: `Error fetching ${req.params.status} appraisals`
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

    console.log(`💎 [${new Date().toISOString()}] APPRAISAL CREATE - Creating new appraisal for pawner ${pawnerId} - User: ${req.user.username}`);
    console.log(`📋 [APPRAISAL DATA] Category: ${category}, Value: ₱${estimatedValue}, Description: ${description}`);

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

    // Insert new appraisal with 'pending' status
    const insertQuery = `
      INSERT INTO appraisals (
        pawner_id, appraiser_id, item_category, item_category_description, 
        item_type, description, serial_number, weight, karat, 
        estimated_value, condition_notes, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 
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
      notes || null
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