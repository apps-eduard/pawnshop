const { pool } = require('../config/database');

async function checkItemData() {
  try {
    console.log('🔍 Checking item data structure...\n');
    
    // Get item #5 (the Appliances one)
    const result = await pool.query(`
      SELECT pi.*, 
             c.name as category_name,
             d.description as description_text,
             t.transaction_number
      FROM pawn_items pi
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      WHERE pi.id = 5
    `);
    
    if (result.rows.length > 0) {
      console.log('📦 Raw database data for Item #5:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      const item = result.rows[0];
      console.log('\n📋 Field Analysis:');
      console.log('  category_name:', item.category_name);
      console.log('  custom_description:', item.custom_description);
      console.log('  description_text:', item.description_text);
      console.log('  item_condition (notes):', item.item_condition);
      console.log('  transaction_number:', item.transaction_number);
      
      console.log('\n✅ Mapped description:', item.custom_description || item.description_text || 'EMPTY');
    } else {
      console.log('❌ Item #5 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkItemData();
