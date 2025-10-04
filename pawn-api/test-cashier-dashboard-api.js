const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function testCashierDashboardAPI() {
  try {
    console.log('=== TESTING CASHIER DASHBOARD API ENDPOINT ===');
    console.log('Testing: GET /api/appraisals/status/completed');
    
    // This is the exact query from the /status/:status endpoint
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.appraiser_id, ia.category, ia.description,
             ia.notes, ia.estimated_value, ia.status, ia.created_at,
             p.first_name, p.last_name, p.mobile_number as contact_number,
             e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      WHERE ia.status = 'completed'
      ORDER BY ia.created_at DESC
    `);
    
    // This is the exact mapping from the API
    const mappedData = result.rows.map(row => ({
      id: row.id,
      pawnerId: row.pawner_id,
      appraiserId: row.appraiser_id,
      category: row.category,
      description: row.description,
      notes: row.notes,
      estimatedValue: parseFloat(row.estimated_value),
      totalAppraisedValue: parseFloat(row.estimated_value), // For dashboard compatibility
      status: row.status,
      createdAt: row.created_at,
      pawnerName: `${row.first_name} ${row.last_name}`,
      pawnerContact: row.contact_number,
      appraiserName: row.appraiser_first_name && row.appraiser_last_name 
        ? `${row.appraiser_first_name} ${row.appraiser_last_name}` 
        : 'Unknown'
    }));
    
    console.log(`\n📊 API Response: ${mappedData.length} appraisals found`);
    console.log('\n=== FRONTEND WILL RECEIVE ===');
    
    const apiResponse = {
      success: true,
      data: mappedData
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));
    
    console.log('\n=== CASHIER DASHBOARD CARDS ===');
    mappedData.forEach((item, index) => {
      console.log(`Card ${index + 1}:`);
      console.log(`  👤 ${item.pawnerName}`);
      console.log(`  📱 ${item.pawnerContact}`);
      console.log(`  🏷️  ${item.category}`);
      console.log(`  📝 ${item.description}`);
      console.log(`  💰 ₱${item.totalAppraisedValue.toLocaleString()}`);
      console.log(`  📄 ${item.notes}`);
      console.log(`  👨‍💼 Appraiser: ${item.appraiserName}`);
      console.log(`  🆔 ID: ${item.id} (for click handling)`);
      console.log('  ─────────────────────────────');
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testCashierDashboardAPI();