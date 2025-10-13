const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function checkTransactionsColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Transactions table columns:');
    result.rows.forEach(row => {
      console.log(`  • ${row.column_name}: ${row.data_type}`);
    });
    
    // Also check a sample transaction to see what fields are populated
    const sample = await pool.query(`
      SELECT * FROM transactions 
      WHERE transaction_type = 'partial_payment' 
      LIMIT 1
    `);
    
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample partial payment transaction fields:');
      Object.keys(sample.rows[0]).forEach(key => {
        const value = sample.rows[0][key];
        if (value !== null) {
          console.log(`  • ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionsColumns();
