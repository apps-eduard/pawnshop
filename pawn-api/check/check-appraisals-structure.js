const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function checkAppraisalsStructure() {
  try {
    console.log('=== CHECKING APPRAISALS TABLE STRUCTURE ===');
    
    // Check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'appraisals'
      ORDER BY ordinal_position
    `);
    
    console.log('Appraisals table columns:');
    structure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if table has any data
    const count = await pool.query('SELECT COUNT(*) FROM appraisals');
    console.log('\nTotal records:', count.rows[0].count);
    
    // Check sample records if any exist
    if (parseInt(count.rows[0].count) > 0) {
      const sample = await pool.query('SELECT * FROM appraisals LIMIT 3');
      console.log('\nSample records:');
      sample.rows.forEach((row, index) => {
        console.log(`Record ${index + 1}:`, row);
      });
    } else {
      console.log('\nNo data in appraisals table');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

checkAppraisalsStructure();