const { pool } = require('../config/database');

async function checkExpiredByDate() {
  try {
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.status as item_status, 
        pi.auction_price, 
        t.status as txn_status,
        t.expiry_date,
        CASE WHEN t.expiry_date < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END as is_expired
      FROM pawn_items pi 
      JOIN transactions t ON t.id = pi.transaction_id 
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status != 'sold'
        AND t.status != 'redeemed'
      ORDER BY pi.id
    `);
    
    console.log('\n=== Items Past Expiry Date ===');
    console.table(result.rows);
    
    const withoutPrice = result.rows.filter(r => r.auction_price === null);
    const withPrice = result.rows.filter(r => r.auction_price !== null);
    
    console.log('\n=== Summary (By Expiry Date) ===');
    console.log(`Total expired items (past expiry date): ${result.rows.length}`);
    console.log(`Without auction price (Expired Items): ${withoutPrice.length}`);
    console.log(`With auction price (Ready for Auction): ${withPrice.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkExpiredByDate();
