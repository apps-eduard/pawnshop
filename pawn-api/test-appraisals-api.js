const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function testAppraisalsAPI() {
  try {
    console.log('=== TESTING APPRAISALS API DIRECTLY ===');
    
    // Test the query that the API uses
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
    
    console.log(`Found ${result.rows.length} completed appraisals`);
    
    if (result.rows.length > 0) {
      console.log('\n=== SAMPLE COMPLETED APPRAISAL ===');
      const sample = result.rows[0];
      
      // Format like the API does
      const formatted = {
        id: sample.id,
        pawnerId: sample.pawner_id,
        appraiserId: sample.appraiser_id,
        category: sample.category,
        description: sample.description,
        notes: sample.notes,
        estimatedValue: parseFloat(sample.estimated_value),
        totalAppraisedValue: parseFloat(sample.estimated_value),
        status: sample.status,
        createdAt: sample.created_at,
        pawnerName: `${sample.first_name} ${sample.last_name}`,
        pawnerContact: sample.contact_number,
        appraiserName: sample.appraiser_first_name && sample.appraiser_last_name 
          ? `${sample.appraiser_first_name} ${sample.appraiser_last_name}` 
          : 'Unknown'
      };
      
      console.log('Formatted for frontend:');
      console.log(JSON.stringify(formatted, null, 2));
      
      console.log('\n✅ This is what the cashier dashboard will receive');
      console.log(`📊 Pawner: ${formatted.pawnerName}`);
      console.log(`💰 Value: ₱${formatted.totalAppraisedValue}`);
      console.log(`📝 Item: ${formatted.category} - ${formatted.description}`);
      console.log(`📄 Notes: ${formatted.notes}`);
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

testAppraisalsAPI();