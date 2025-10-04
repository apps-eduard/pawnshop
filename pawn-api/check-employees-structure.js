// Check employees table structure
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function checkEmployeesStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);
    
    console.log('Employees table columns:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkEmployeesStructure();