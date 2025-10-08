const knex = require('knex')(require('./knexfile').development);
const { pool } = require('./config/database');

async function testExpiredItemsQuery() {
  try {
    console.log('🔍 Testing expired items query...\n');
    
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.custom_description,
        pi.appraised_value,
        pi.loan_amount,
        pi.auction_price,
        pi.status,
        t.transaction_number as ticket_number,
        t.expiry_date as expired_date,
        p.first_name, 
        p.last_name,
        c.name as category
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status IN ('active', 'expired')
      ORDER BY t.expiry_date DESC
    `);
    
    console.log(`✅ Query executed successfully!`);
    console.log(`📊 Found ${result.rows.length} expired items\n`);
    
    if (result.rows.length > 0) {
      console.log('📋 Sample items:');
      result.rows.forEach((item, index) => {
        console.log(`\n${index + 1}. Item #${item.id}`);
        console.log(`   Ticket: ${item.ticket_number}`);
        console.log(`   Description: ${item.custom_description || 'N/A'}`);
        console.log(`   Category: ${item.category || 'N/A'}`);
        console.log(`   Pawner: ${item.first_name} ${item.last_name}`);
        console.log(`   Appraised: ₱${parseFloat(item.appraised_value || 0).toLocaleString()}`);
        console.log(`   Loan: ₱${parseFloat(item.loan_amount || 0).toLocaleString()}`);
        console.log(`   Auction Price: ${item.auction_price ? '₱' + parseFloat(item.auction_price).toLocaleString() : 'Not Set'}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Expired: ${item.expired_date?.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('⚠️ No expired items found.');
      console.log('\nChecking for items with past expiry dates...');
      
      const anyExpired = await pool.query(`
        SELECT COUNT(*) as count
        FROM pawn_items pi
        LEFT JOIN transactions t ON pi.transaction_id = t.id
        WHERE t.expiry_date < CURRENT_DATE
      `);
      
      console.log(`Total items with past expiry dates: ${anyExpired.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testExpiredItemsQuery();
