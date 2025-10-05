const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function testItemsData() {
  try {
    console.log('🔍 Testing items data for ticket TXN-202510-000001...\n');
    
    // First, get the transaction
    const transactionResult = await pool.query(`
      SELECT * FROM pawn_tickets 
      WHERE ticket_number = $1 AND status IN ('active', 'matured')
    `, ['TXN-202510-000001']);
    
    if (transactionResult.rows.length === 0) {
      console.log('❌ No transaction found');
      return;
    }
    
    const transaction = transactionResult.rows[0];
    console.log('✅ Transaction found:', {
      id: transaction.id,
      transaction_id: transaction.transaction_id,
      ticket_number: transaction.ticket_number
    });
    
    // Now get the items with detailed logging
    const itemsResult = await pool.query(`
      SELECT pi.*,
             cat.name as category_name,
             cat.description as category_description, 
             d.name as description_name,
             d.description as description_detail,
             COALESCE(pi.custom_description, d.name) as item_description
      FROM pawn_items pi
      LEFT JOIN categories cat ON pi.category_id = cat.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE pi.transaction_id = $1 
      ORDER BY pi.id
    `, [transaction.transaction_id]);
    
    console.log(`\n📦 Found ${itemsResult.rows.length} items:\n`);
    
    itemsResult.rows.forEach((item, index) => {
      console.log(`--- Item ${index + 1} ---`);
      console.log('Raw database fields:');
      console.log('  custom_description:', item.custom_description);
      console.log('  category_name:', item.category_name);
      console.log('  description_name:', item.description_name);
      console.log('  description_detail:', item.description_detail);
      console.log('  item_description:', item.item_description);
      console.log('  appraisal_notes:', item.appraisal_notes);
      console.log('  notes:', item.notes);
      console.log('  appraised_value:', item.appraised_value);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testItemsData();