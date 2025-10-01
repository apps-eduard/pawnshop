const { pool } = require('./config/database');

async function testCashierDashboardAPI() {
  try {
    console.log('🏪 Testing CASHIER DASHBOARD API...\n');
    
    // Test the exact query used in the API
    console.log('1️⃣ Testing SQL Query...');
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
    
    console.log(`✅ Found ${result.rows.length} completed appraisals:`);
    console.table(result.rows);
    
    // Test the mapping logic
    console.log('\n2️⃣ Testing Data Mapping...');
    const mappedData = result.rows.map(row => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.item_type || row.description;
      const totalValue = parseFloat(row.estimated_value);
      
      console.log(`🔍 Processing appraisal ${row.id}:`);
      console.log(`   Pawner: "${row.first_name}" + "${row.last_name}" = "${pawnerName}"`);
      console.log(`   Item Type: "${itemType}"`);
      console.log(`   Value: ₱${totalValue}`);
      
      return {
        id: row.id,
        pawnerName: pawnerName,
        itemType: itemType,
        totalAppraisedValue: totalValue
      };
    });
    
    console.log('\n3️⃣ Final Cashier Dashboard Display:');
    console.log('┌─────┬─────────────────────┬──────────────────────┬─────────────────┐');
    console.log('│ ID  │ Pawner Name         │ Item Type            │ Total Value     │');
    console.log('├─────┼─────────────────────┼──────────────────────┼─────────────────┤');
    
    mappedData.forEach(item => {
      console.log(`│ ${String(item.id).padEnd(3)} │ ${item.pawnerName.padEnd(19)} │ ${item.itemType.padEnd(20)} │ ₱${String(item.totalAppraisedValue).padStart(13)} │`);
    });
    console.log('└─────┴─────────────────────┴──────────────────────┴─────────────────┘');
    
    console.log('\n4️⃣ Frontend Click Handler Debugging:');
    console.log('Add this to your Angular component:');
    console.log('```typescript');
    console.log('onAppraisalClick(appraisal: any) {');
    console.log('  console.log("🔗 [CASHIER] Clicked on appraisal:", appraisal);');
    console.log('  console.log("🔗 [CASHIER] Appraisal ID:", appraisal.id);');
    console.log('  console.log("🔗 [CASHIER] Pawner Name:", appraisal.pawnerName);');
    console.log('  console.log("🔗 [CASHIER] Redirecting to:", `/transaction/new-loan/${appraisal.id}`);');
    console.log('  this.router.navigate(["/transaction/new-loan", appraisal.id]);');
    console.log('}');
    console.log('```');
    
    await pool.end();
    console.log('\n🎉 Cashier Dashboard API test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

testCashierDashboardAPI();