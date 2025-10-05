const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function testAPIResponse() {
  try {
    console.log('🔍 Testing API response format...\n');
    
    // Simulate the API query - simplified to just get transaction_id
    const result = await pool.query(`
      SELECT pt.*, t.*
      FROM pawn_tickets pt
      LEFT JOIN transactions t ON pt.transaction_id = t.id  
      WHERE pt.ticket_number = $1 AND pt.status IN ('active', 'matured')
    `, ['TXN-202510-000001']);
    
    if (result.rows.length === 0) {
      console.log('❌ No transaction found');
      return;
    }
    
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
    `, [result.rows[0].transaction_id]);
    
    console.log('📦 API Response Items:');
    const apiItems = itemsResult.rows.map(item => ({
      id: item.id,
      categoryName: item.category_name, // For frontend compatibility
      descriptionName: item.description_name, // Proper item description
      customDescription: item.custom_description, // User notes/remarks
      appraisalValue: parseFloat(item.appraised_value || 0),
    }));
    
    apiItems.forEach((item, index) => {
      console.log(`\n--- API Item ${index + 1} ---`);
      console.log('✅ categoryName:', item.categoryName);
      console.log('✅ descriptionName:', item.descriptionName);
      console.log('✅ customDescription (notes):', item.customDescription);
      console.log('✅ appraisalValue:', item.appraisalValue);
    });
    
    console.log('\n🎯 Expected Frontend Display:');
    console.log('Category: "Appliances"');
    console.log('Description: "1.5HP Split Type Aircon"'); 
    console.log('Notes: "cold"');
    console.log('Appraisal Value: "₱150,000.00"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAPIResponse();