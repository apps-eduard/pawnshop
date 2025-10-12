const { pool } = require('./config/database');

async function checkItem18() {
  try {
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.status as item_status, 
        pi.auction_price, 
        t.id as transaction_id,
        t.status as txn_status,
        t.expiry_date
      FROM pawn_items pi 
      JOIN transactions t ON t.id = pi.transaction_id 
      WHERE pi.id = 18
    `);
    
    console.log('\n=== Item #18 Details ===');
    console.table(result.rows);
    
    if (result.rows.length === 0) {
      console.log('Item #18 not found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem18();
