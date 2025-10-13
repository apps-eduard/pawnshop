const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkDates() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        transaction_number,
        transaction_date,
        granted_date,
        maturity_date,
        expiry_date,
        pg_typeof(transaction_date) as txn_date_type,
        pg_typeof(granted_date) as granted_date_type,
        pg_typeof(maturity_date) as maturity_date_type,
        pg_typeof(expiry_date) as expiry_date_type
      FROM transactions 
      WHERE transaction_number IN ('TXN-202510-000018', 'TXN-202510-000017', 'TXN-202510-000016')
      ORDER BY id DESC
    `);

    console.log('\n📊 Database Date Check:');
    console.log('========================\n');

    result.rows.forEach(row => {
      console.log(`🎫 ${row.transaction_number}:`);
      console.log(`   Transaction Date: ${row.transaction_date} (Type: ${row.txn_date_type})`);
      console.log(`   Granted Date:     ${row.granted_date} (Type: ${row.granted_date_type})`);
      console.log(`   Maturity Date:    ${row.maturity_date} (Type: ${row.maturity_date_type})`);
      console.log(`   Expiry Date:      ${row.expiry_date} (Type: ${row.expiry_date_type})`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkDates();
