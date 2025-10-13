const { pool } = require('../config/database');

async function checkAppraisalTable() {
  try {
    console.log('📊 Checking item_appraisals Table Structure...\n');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'item_appraisals'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ item_appraisals table does not exist');
      
      // Also check if there's an appraisals table
      const appraisalsExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'appraisals'
        );
      `);
      
      if (appraisalsExists.rows[0].exists) {
        console.log('✅ Found appraisals table instead');
        
        const structure = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'appraisals' 
          ORDER BY ordinal_position;
        `);
        
        console.log('📋 appraisals Table Structure:');
        structure.rows.forEach(row => {
          console.log(`  ├─ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'Optional' : 'Required'})`);
        });
        
        // Get sample data
        const sampleData = await pool.query('SELECT * FROM appraisals LIMIT 3;');
        console.log('\n📝 Sample Appraisals Data:');
        sampleData.rows.forEach((row, index) => {
          console.log(`  ├─ Appraisal ${index + 1}: ${row.status || 'N/A'} - ${row.appraised_value || 'N/A'}`);
        });
      }
      return;
    }
    
    // Get table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'item_appraisals' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ item_appraisals Table Structure:');
    structure.rows.forEach(row => {
      console.log(`  ├─ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'Optional' : 'Required'})`);
    });
    
    // Get sample data
    const sampleData = await pool.query('SELECT * FROM item_appraisals LIMIT 3;');
    console.log('\n📝 Sample item_appraisals Data:');
    sampleData.rows.forEach((row, index) => {
      console.log(`  ├─ Appraisal ${index + 1}: ${row.status || 'N/A'} - ${row.appraised_value || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkAppraisalTable();