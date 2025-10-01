const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

module.exports = router;

module.exports = router;