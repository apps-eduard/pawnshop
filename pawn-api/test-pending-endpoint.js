const { pool } = require('./config/database');

async function testPendingAppraisalsEndpoint() {
  try {
    console.log('🧪 Testing updated pending appraisals endpoint...\n');
    
    // Test the exact query from the API
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.item_category, a.item_type, a.description, a.estimated_value,
             a.status, a.created_at,
             p.first_name, p.last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = 'completed'
      AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )
      ORDER BY a.created_at DESC
    `);
    
    console.log('📋 Raw query results:');
    console.table(result.rows);
    
    // Test the formatted response
    const formattedData = result.rows.map(row => ({
      id: row.id,
      pawnerName: `${row.first_name} ${row.last_name}`,
      itemType: row.item_type || row.description,
      totalAppraisedValue: parseFloat(row.estimated_value),
      pawnerId: row.pawner_id,
      category: row.item_category,
      status: row.status,
      createdAt: row.created_at
    }));
    
    console.log('\n📋 Formatted API response:');
    console.table(formattedData);
    
    console.log('\n🎯 Cashier Dashboard Display:');
    console.log('┌─────┬─────────────────────┬──────────────────────┬─────────────────┐');
    console.log('│ ID  │ Pawner Name         │ Item Type            │ Total Value     │');
    console.log('├─────┼─────────────────────┼──────────────────────┼─────────────────┤');
    
    formattedData.forEach(item => {
      console.log(`│ ${String(item.id).padEnd(3)} │ ${item.pawnerName.padEnd(19)} │ ${item.itemType.padEnd(20)} │ ₱${String(item.totalAppraisedValue).padStart(13)} │`);
    });
    console.log('└─────┴─────────────────────┴──────────────────────┴─────────────────┘');
    
    console.log('\n✅ Click handler should redirect to: /transaction/new-loan/:id');
    formattedData.forEach(item => {
      console.log(`   - Appraisal ${item.id} → /transaction/new-loan/${item.id}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

testPendingAppraisalsEndpoint();