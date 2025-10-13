const { pool } = require('../config/database');

async function checkEmployeesColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Employees table columns:');
    console.log('=====================================');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    console.log('=====================================\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkEmployeesColumns();
