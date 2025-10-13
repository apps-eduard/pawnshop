const { pool } = require('../config/database');

async function checkTransactionsTable() {
  try {
    console.log('🔍 Checking transactions table structure...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER by ordinal_position
    `);
    
    console.log('transactions table columns:');
    console.log('=' .repeat(60));
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    // Check sample data
    const sampleData = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`\nRecords in transactions: ${sampleData.rows[0].count}`);
    
    if (sampleData.rows[0].count > 0) {
      console.log('\nSample record:');
      const sample = await pool.query('SELECT * FROM transactions LIMIT 1');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTransactionsTable();