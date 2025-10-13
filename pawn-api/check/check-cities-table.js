const { pool } = require('../config/database');

async function checkCitiesTable() {
  try {
    console.log('📊 Checking Cities Table Structure...\n');
    
    // Check if cities table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cities'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Cities table does not exist');
      return;
    }
    
    // Get table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'cities' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Cities Table Structure:');
    structure.rows.forEach(row => {
      console.log(`  ├─ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'Optional' : 'Required'})`);
    });
    
    // Get sample data
    const sampleData = await pool.query('SELECT * FROM cities LIMIT 5;');
    
    console.log('\n📝 Sample Cities Data:');
    sampleData.rows.forEach(row => {
      console.log(`  ├─ ${row.name} (${row.province})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkCitiesTable();