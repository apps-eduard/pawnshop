const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function testAppraisalsEndpoint() {
  try {
    console.log('=== TESTING APPRAISALS ENDPOINT FOR 500 ERROR ===');
    
    // Test the exact query that's failing
    console.log('Testing query for /api/appraisals/status/completed...');
    
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
    
    console.log(`✅ Query successful! Found ${result.rows.length} completed appraisals`);
    
    if (result.rows.length > 0) {
      console.log('Sample result:', result.rows[0]);
      
      // Test the mapping that the API does
      const mappedData = result.rows.map(row => ({
        id: row.id,
        pawnerId: row.pawner_id,
        appraiserId: row.appraiser_id,
        category: row.category,
        description: row.description,
        notes: row.notes,
        estimatedValue: parseFloat(row.estimated_value),
        totalAppraisedValue: parseFloat(row.estimated_value),
        status: row.status,
        createdAt: row.created_at,
        pawnerName: `${row.first_name} ${row.last_name}`,
        pawnerContact: row.contact_number,
        appraiserName: row.appraiser_first_name && row.appraiser_last_name 
          ? `${row.appraiser_first_name} ${row.appraiser_last_name}` 
          : 'Unknown'
      }));
      
      console.log('✅ Mapping successful!');
      console.log('First mapped item:', mappedData[0]);
    }
    
    // Check for potential issues
    console.log('\n=== CHECKING FOR POTENTIAL ISSUES ===');
    
    // Check if there are any NULL values that could cause issues
    const nullCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(ia.pawner_id) as has_pawner,
        COUNT(p.first_name) as has_first_name,
        COUNT(p.last_name) as has_last_name,
        COUNT(p.mobile_number) as has_mobile
      FROM item_appraisals ia
      LEFT JOIN pawners p ON ia.pawner_id = p.id
      WHERE ia.status = 'completed'
    `);
    
    console.log('Data integrity check:', nullCheck.rows[0]);
    
    if (nullCheck.rows[0].total !== nullCheck.rows[0].has_pawner) {
      console.log('⚠️ WARNING: Some appraisals have missing pawner references');
    }
    
  } catch (error) {
    console.error('❌ ERROR in query execution:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testAppraisalsEndpoint();