const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Debug endpoint to check database connectivity
router.get('/debug', async (req, res) => {
  try {
    // Test the database connection
    const result = await pool.query('SELECT NOW() as server_time');
    
    // Check if appraisals table exists
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('appraisals', 'pawners', 'users')
    `);

    // Check for foreign key relationships
    const foreignKeysQuery = await pool.query(`
      SELECT
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name='appraisals';
    `);

    // Get column names for appraisals table if it exists
    const appraisalTableExists = tablesCheck.rows.some(row => row.table_name === 'appraisals');
    let appraisalColumns = [];
    
    if (appraisalTableExists) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appraisals'
      `);
      appraisalColumns = columnsResult.rows;
    }

    // Sample appraisal test
    let appraisalTestResult = { success: false, error: null };
    if (appraisalTableExists) {
      try {
        // Get a valid pawner ID
        const pawnerResult = await pool.query('SELECT id FROM pawners LIMIT 1');
        if (pawnerResult.rows.length > 0) {
          const pawnerId = pawnerResult.rows[0].id;
          
          // Get a valid appraiser ID
          const userResult = await pool.query("SELECT id FROM users WHERE role = 'appraiser' LIMIT 1");
          if (userResult.rows.length > 0) {
            const appraiserId = userResult.rows[0].id;
            
            // Test inserting a dummy appraisal
            const testInsertQuery = `
              INSERT INTO appraisals (
                pawner_id, appraiser_id, item_category, item_category_description, 
                item_type, description, estimated_value, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id;
            `;
            const insertResult = await pool.query(testInsertQuery, [
              pawnerId, 
              appraiserId, 
              'TEST', 
              'Test description', 
              'Test item',
              'Test description', 
              100.00,
              'pending'
            ]);
            
            // If we got here, the insert worked
            appraisalTestResult = { 
              success: true, 
              insertedId: insertResult.rows[0].id,
              pawnerId,
              appraiserId
            };
            
            // Clean up the test data
            await pool.query('DELETE FROM appraisals WHERE id = $1', [insertResult.rows[0].id]);
          } else {
            appraisalTestResult.error = 'No appraiser users found';
          }
        } else {
          appraisalTestResult.error = 'No pawners found';
        }
      } catch (testError) {
        appraisalTestResult.error = testError.message;
      }
    }
    
    // Return comprehensive debug info
    res.json({
      success: true,
      database: {
        connection: "success",
        server_time: result.rows[0].server_time,
        tables: {
          checked: tablesCheck.rows.map(row => row.table_name),
          appraisals_exists: appraisalTableExists,
        },
        appraisal_columns: appraisalColumns,
        foreign_keys: foreignKeysQuery.rows,
        appraisal_test: appraisalTestResult
      }
    });
  } catch (error) {
    console.error('Database debug check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Special debug endpoint for pawner creation
router.get('/pawner', async (req, res) => {
  try {
    // Test for valid cities and barangays
    const cityResult = await pool.query('SELECT * FROM cities LIMIT 10');
    const barangayResult = await pool.query('SELECT * FROM barangays LIMIT 10');
    
    // Get pawner table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'pawners'
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: 'Pawner debug information',
      schema: schemaResult.rows,
      city_count: cityResult.rows.length,
      barangay_count: barangayResult.rows.length,
      city_sample: cityResult.rows.slice(0, 3),
      barangay_sample: barangayResult.rows.slice(0, 3)
    });
  } catch (error) {
    console.error('Pawner debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pawner debug information',
      error: error.message
    });
  }
});

// Diagnostic endpoint for appraisal creation
router.post('/test-appraisal', async (req, res) => {
  try {
    const { pawnerId, appraiserId } = req.body;
    
    // Verify pawner exists
    const pawnerCheck = await pool.query('SELECT id FROM pawners WHERE id = $1', [pawnerId]);
    if (pawnerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found',
        pawner_check: false
      });
    }
    
    // Verify appraiser exists
    const appraiserCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [appraiserId, 'appraiser']);
    if (appraiserCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appraiser not found or user is not an appraiser',
        appraiser_check: false
      });
    }
    
    // Check appraisals table structure
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'appraisals'
    `);
    
    // Test insertion with minimal data
    const insertQuery = `
      INSERT INTO appraisals (
        pawner_id, appraiser_id, item_category, item_type, 
        description, estimated_value, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, status
    `;
    
    const insertResult = await pool.query(insertQuery, [
      pawnerId, 
      appraiserId, 
      'TEST-DIAGNOSTIC', 
      'Test Item',
      'Test description from diagnostic endpoint', 
      99.99,
      'pending'
    ]);
    
    // Clean up the test data
    if (insertResult.rows.length > 0) {
      await pool.query('DELETE FROM appraisals WHERE id = $1', [insertResult.rows[0].id]);
    }
    
    res.json({
      success: true,
      message: 'Appraisal test successful',
      pawner_check: true,
      appraiser_check: true,
      table_structure: tableCheck.rows,
      insert_test: {
        success: insertResult.rows.length > 0,
        result: insertResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Appraisal diagnostic test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Appraisal diagnostic test failed',
      error: error.message,
      error_code: error.code,
      error_constraint: error.constraint,
      stack: error.stack
    });
  }
});

module.exports = router;