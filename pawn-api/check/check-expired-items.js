const { pool } = require('../config/database');

async function checkExpiredItems() {
  try {
    console.log('🔍 Checking for expired items in database...\n');
    
    // Check current date
    console.log(`📅 Current Date: ${new Date().toISOString().split('T')[0]}\n`);
    
    // Check all transactions with their expiry dates
    const allTransactions = await pool.query(`
      SELECT 
        t.id,
        t.transaction_number,
        t.expiry_date,
        t.status as transaction_status,
        t.expiry_date < CURRENT_DATE as is_expired
      FROM transactions t
      WHERE t.status = 'active'
      ORDER BY t.expiry_date DESC
      LIMIT 10
    `);
    
    console.log(`📋 Recent Active Transactions (showing 10):`);
    allTransactions.rows.forEach(row => {
      console.log(`  - ${row.transaction_number}: Expiry ${row.expiry_date?.toISOString().split('T')[0]} | Expired: ${row.is_expired} | Status: ${row.transaction_status}`);
    });
    
    console.log('\n');
    
    // Check expired items query
    const expiredQuery = await pool.query(`
      SELECT 
        pi.id, 
        pi.brand, 
        pi.model, 
        pi.custom_description,
        pi.appraised_value,
        pi.loan_amount,
        pi.auction_price,
        pi.status as item_status,
        t.transaction_number as ticket_number,
        t.expiry_date as expired_date,
        t.status as transaction_status,
        p.first_name, 
        p.last_name,
        c.name as category
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status = 'active'
      ORDER BY t.expiry_date DESC
    `);
    
    console.log(`🔥 Expired Items Found: ${expiredQuery.rows.length}\n`);
    
    if (expiredQuery.rows.length > 0) {
      console.log('📦 Expired Items Details:');
      expiredQuery.rows.forEach((item, index) => {
        console.log(`\n${index + 1}. Item ID: ${item.id}`);
        console.log(`   Ticket: ${item.ticket_number}`);
        console.log(`   Description: ${item.custom_description || `${item.brand || ''} ${item.model || ''}`.trim() || 'N/A'}`);
        console.log(`   Pawner: ${item.first_name} ${item.last_name}`);
        console.log(`   Appraised Value: ₱${parseFloat(item.appraised_value || 0).toLocaleString()}`);
        console.log(`   Loan Amount: ₱${parseFloat(item.loan_amount || 0).toLocaleString()}`);
        console.log(`   Expired Date: ${item.expired_date?.toISOString().split('T')[0]}`);
        console.log(`   Category: ${item.category || 'N/A'}`);
        console.log(`   Item Status: ${item.item_status}`);
        console.log(`   Transaction Status: ${item.transaction_status}`);
        console.log(`   Auction Price: ${item.auction_price ? '₱' + parseFloat(item.auction_price).toLocaleString() : 'Not Set'}`);
      });
    } else {
      console.log('⚠️ No expired items found with the current query criteria.');
      console.log('\nPossible reasons:');
      console.log('  1. No transactions with expiry_date < current date');
      console.log('  2. No items with status = "in_vault"');
      console.log('  3. No transactions with status = "active"');
      
      // Check without status filters
      const anyExpired = await pool.query(`
        SELECT COUNT(*) as count
        FROM pawn_items pi
        LEFT JOIN transactions t ON pi.transaction_id = t.id
        WHERE t.expiry_date < CURRENT_DATE
      `);
      
      console.log(`\n  Total items with expired dates (any status): ${anyExpired.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkExpiredItems();
