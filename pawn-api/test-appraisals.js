const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function testAppraisals() {
  try {
    console.log('=== TESTING APPRAISALS DATA ===');
    
    // First check if appraisals table exists and has data
    const countResult = await pool.query('SELECT COUNT(*) FROM appraisals');
    console.log('Total appraisals in database:', countResult.rows[0].count);
    
    if (parseInt(countResult.rows[0].count) === 0) {
      console.log('NO APPRAISALS DATA FOUND - Creating sample data...');
      
      // Create sample appraisal data
      await pool.query(`
        INSERT INTO appraisals (
          pawner_id, appraiser_id, item_category, item_category_description,
          item_type, description, estimated_value, condition_notes, status
        ) VALUES 
        (1, 1, 'jewelry', 'Gold Ring', 'ring', '18k gold wedding ring', 15000, 'Good condition', 'completed'),
        (2, 1, 'electronics', 'Smartphone', 'phone', 'iPhone 13 Pro', 35000, 'Excellent condition', 'completed'),
        (3, 1, 'jewelry', 'Gold Necklace', 'necklace', '14k gold chain necklace', 25000, 'Very good condition', 'pending')
      `);
      console.log('Sample appraisal data created!');
    }
    
    // Test the fixed query
    console.log('\n=== TESTING COMPLETED APPRAISALS QUERY ===');
    const result = await pool.query(`
      SELECT a.id, a.pawner_id, a.appraiser_id, a.item_category, a.item_category_description,
             a.item_type, a.description, a.serial_number, a.weight, a.karat,
             a.estimated_value, a.condition_notes, a.status, a.created_at,
             p.first_name, p.last_name, p.mobile_number as contact_number,
             e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN employees e ON a.appraiser_id = e.id
      WHERE a.status = 'completed'
      ORDER BY a.created_at DESC
    `);
    
    console.log('Query successful! Found', result.rows.length, 'completed appraisals');
    
    if (result.rows.length > 0) {
      console.log('\n=== SAMPLE APPRAISAL RECORD ===');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('No completed appraisals found');
    }
    
    // Test all appraisals
    console.log('\n=== ALL APPRAISALS ===');
    const allResult = await pool.query(`
      SELECT a.id, a.status, a.item_category, a.estimated_value,
             p.first_name, p.last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      ORDER BY a.created_at DESC
    `);
    
    console.log('All appraisals:', allResult.rows);
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testAppraisals();