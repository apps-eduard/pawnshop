const { pool } = require('../config/database');

async function checkSequenceTable() {
  try {
    console.log('🔍 Checking transaction_sequences table...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transaction_sequences' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columns:', result.rows);
    
    // Check current data
    const dataResult = await pool.query('SELECT * FROM transaction_sequences LIMIT 5');
    console.log('📋 Sample data:', dataResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkSequenceTable();