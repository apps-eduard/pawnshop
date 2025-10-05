const { pool } = require('./config/database');

async function testAllTransactionsQuery() {
  try {
    console.log('🧪 Testing all transactions query...\n');
    
    const result = await pool.query(`
      SELECT t.*, p.first_name, p.last_name 
      FROM transactions t 
      JOIN pawners p ON t.pawner_id = p.id 
      ORDER BY t.created_at DESC 
      LIMIT 3
    `);
    
    console.log('✅ All transactions query works!');
    console.log(`📊 Found ${result.rows.length} records\n`);
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.transaction_number} - ${row.first_name} ${row.last_name} (₱${row.principal_amount})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
}

testAllTransactionsQuery();