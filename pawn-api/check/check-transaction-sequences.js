const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function checkTransactionSequences() {
  try {
    console.log('=== CHECKING TRANSACTION_SEQUENCES TABLE ===');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transaction_sequences' 
      ORDER BY ordinal_position
    `);
    
    console.log('transaction_sequences columns:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Check sample data
    const data = await pool.query('SELECT * FROM transaction_sequences LIMIT 3');
    console.log('\nSample data:');
    data.rows.forEach((row, index) => {
      console.log(`${index + 1}.`, row);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionSequences();