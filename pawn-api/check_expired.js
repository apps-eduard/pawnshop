const { pool } = require('./config/database');

async function checkExpiredItems() {
  try {
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.status as item_status, 
        pi.auction_price, 
        t.status as txn_status 
      FROM pawn_items pi 
      JOIN transactions t ON t.id = pi.transaction_id 
      WHERE t.status = 'expired' 
      ORDER BY pi.id
    `);
    
    console.log('\n=== All Expired Items ===');
    console.table(result.rows);
    
    const withoutPrice = result.rows.filter(r => r.auction_price === null && r.item_status !== 'sold');
    const withPrice = result.rows.filter(r => r.auction_price !== null && r.item_status !== 'sold');
    
    console.log('\n=== Summary ===');
    console.log(`Total expired items: ${result.rows.length}`);
    console.log(`Without auction price (Expired Items): ${withoutPrice.length}`);
    console.log(`With auction price (Ready for Auction): ${withPrice.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkExpiredItems();
