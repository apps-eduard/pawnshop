// Check appraisals in database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function checkAppraisals() {
  try {
    console.log('🔍 Checking item_appraisals table...');
    
    const countResult = await pool.query('SELECT COUNT(*) as total_count FROM item_appraisals');
    console.log(`Total appraisals: ${countResult.rows[0].total_count}`);
    
    if (countResult.rows[0].total_count > 0) {
      const statusResult = await pool.query('SELECT status, COUNT(*) as count FROM item_appraisals GROUP BY status');
      console.log('Appraisals by status:');
      statusResult.rows.forEach(row => {
        console.log(`- ${row.status}: ${row.count}`);
      });
      
      // Show sample completed appraisals
      const sampleResult = await pool.query(`
        SELECT ia.id, ia.category, ia.description, ia.estimated_value, ia.status, 
               p.first_name, p.last_name 
        FROM item_appraisals ia 
        JOIN pawners p ON ia.pawner_id = p.id 
        WHERE ia.status = 'completed' 
        LIMIT 3
      `);
      
      if (sampleResult.rows.length > 0) {
        console.log('\n✅ Sample completed appraisals (what cashier should see):');
        sampleResult.rows.forEach(row => {
          console.log(`- ID: ${row.id}, Pawner: ${row.first_name} ${row.last_name}, Item: ${row.category} - ${row.description}, Value: ₱${row.estimated_value}`);
        });
      } else {
        console.log('\n⚠️ No completed appraisals found!');
        console.log('💡 You need appraisals with status = "completed" for the cashier dashboard to show them.');
      }
    } else {
      console.log('❌ No appraisals found in database!');
      console.log('💡 You need to create some appraisal data first.');
      console.log('💡 Run: node add-more-sample-appraisals.js');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkAppraisals();