const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'pawn_db',
  user: 'pawn_user',
  password: '123',
  port: 5432
});

async function checkTypes() {
  console.log('\n=== TRANSACTION TYPES IN DATABASE ===\n');
  
  const txnTypes = await pool.query(`
    SELECT DISTINCT transaction_type, COUNT(*) as count 
    FROM transactions 
    WHERE DATE(transaction_date) = CURRENT_DATE
    GROUP BY transaction_type
    ORDER BY transaction_type
  `);
  
  console.log('Today\'s Transactions:');
  txnTypes.rows.forEach(r => {
    console.log(`  - ${r.transaction_type}: ${r.count} transactions`);
  });
  
  console.log('\n=== PAYMENT TYPES IN DATABASE ===\n');
  
  const paymentTypes = await pool.query(`
    SELECT DISTINCT payment_type, COUNT(*) as count 
    FROM pawn_payments 
    WHERE DATE(created_at) = CURRENT_DATE
    GROUP BY payment_type
    ORDER BY payment_type
  `);
  
  console.log('Today\'s Payments:');
  paymentTypes.rows.forEach(r => {
    console.log(`  - ${r.payment_type}: ${r.count} payments`);
  });
  
  pool.end();
}

checkTypes().catch(console.error);
