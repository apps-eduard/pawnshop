const { pool } = require('./config/database');

async function testItemsQuery() {
  try {
    console.log('🔍 Testing items API query...');
    
    const result = await pool.query(`
      SELECT pi.id, pi.brand, pi.model, pi.custom_description, 
             pi.appraised_value, pi.loan_amount, pi.serial_number, 
             pi.weight, pi.karat, pi.item_condition, pi.defects,
             pi.status, pi.location, pi.created_at,
             t.transaction_number, t.principal_amount, t.status as transaction_status,
             p.first_name, p.last_name, p.mobile_number,
             c.name as category_name,
             d.description as description_text
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      ORDER BY pi.created_at DESC
      LIMIT 5
    `);
    
    console.log('✅ Query successful');
    console.log('Row count:', result.rows.length);
    console.log('Sample rows:', result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detail:', error.detail || 'No detail provided');
  } finally {
    process.exit();
  }
}

testItemsQuery();