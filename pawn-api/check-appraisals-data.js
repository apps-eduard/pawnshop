const { pool } = require('./config/database');

async function checkAppraisalsData() {
  try {
    console.log('🔍 Checking appraisals data...\n');
    
    // Check appraisals with pawner data
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.item_category, a.item_type, a.description, 
             a.estimated_value, a.status,
             p.first_name, p.last_name
      FROM appraisals a 
      LEFT JOIN pawners p ON a.pawner_id = p.id 
      WHERE a.status = 'completed' 
      LIMIT 5
    `);
    
    console.log('📋 Appraisals with pawner data:');
    console.table(result.rows);
    
    // Check if pawner_id exists in appraisals
    const appraisalCheck = await pool.query('SELECT id, pawner_id, status FROM appraisals LIMIT 5');
    console.log('\n📋 Raw appraisal data:');
    console.table(appraisalCheck.rows);
    
    // Check pawners table
    const pawnersCheck = await pool.query('SELECT id, first_name, last_name FROM pawners LIMIT 5');
    console.log('\n📋 Pawners data:');
    console.table(pawnersCheck.rows);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkAppraisalsData();