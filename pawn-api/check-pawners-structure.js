const { pool } = require('./config/database');

async function checkPawnersTableStructure() {
  try {
    console.log('🔍 Checking pawners table structure...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      ORDER BY ordinal_position
    `);
    
    console.log('pawners table columns:');
    console.log('=' .repeat(50));
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    console.log('\n🔍 Sample data from pawners:');
    console.log('=' .repeat(50));
    
    const sampleData = await pool.query('SELECT * FROM pawners ORDER BY created_at DESC LIMIT 2');
    if (sampleData.rows.length === 0) {
      console.log('No data found in pawners table');
    } else {
      sampleData.rows.forEach((row, index) => {
        console.log(`Entry ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPawnersTableStructure();