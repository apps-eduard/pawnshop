const { pool } = require('./config/database');

async function analyzeExpiredItems() {
  try {
    console.log('🔍 Analyzing the 4 items with expired dates...\n');
    
    // Find all items where expiry_date is in the past
    const result = await pool.query(`
      SELECT 
        pi.id,
        pi.status as item_status,
        pi.brand,
        pi.model,
        pi.custom_description,
        pi.appraised_value,
        t.transaction_number,
        t.expiry_date,
        t.status as transaction_status,
        p.first_name,
        p.last_name
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      WHERE t.expiry_date < CURRENT_DATE
      ORDER BY t.expiry_date DESC
    `);
    
    console.log(`Found ${result.rows.length} items with past expiry dates:\n`);
    
    result.rows.forEach((item, index) => {
      console.log(`${index + 1}. Item ID: ${item.id}`);
      console.log(`   Transaction: ${item.transaction_number}`);
      console.log(`   Item Status: ${item.item_status}`);
      console.log(`   Transaction Status: ${item.transaction_status}`);
      console.log(`   Expiry Date: ${item.expiry_date?.toISOString().split('T')[0]}`);
      console.log(`   Description: ${item.custom_description || `${item.brand || ''} ${item.model || ''}`.trim() || 'N/A'}`);
      console.log(`   Pawner: ${item.first_name} ${item.last_name}`);
      console.log('');
    });
    
    console.log('\n📊 Status Breakdown:');
    const statusCount = {};
    result.rows.forEach(item => {
      const key = `${item.item_status} (${item.transaction_status})`;
      statusCount[key] = (statusCount[key] || 0) + 1;
    });
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} items`);
    });
    
    console.log('\n💡 To make these items appear in the auctioneer dashboard:');
    console.log('   Option 1: Update item status to "in_vault"');
    console.log('   Option 2: Change the query to accept current statuses');
    console.log('   Option 3: Create new test data with correct status and past dates\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

analyzeExpiredItems();
