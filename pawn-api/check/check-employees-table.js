const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function checkEmployeesTable() {
  try {
    console.log('=== EMPLOYEES TABLE STRUCTURE ===');
    const structure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n=== SAMPLE EMPLOYEE RECORDS ===');
    const sample = await pool.query('SELECT id, username, role, is_active FROM employees LIMIT 3');
    sample.rows.forEach((row, i) => {
      console.log(`${i+1}.`, row);
    });
    
    console.log('\n=== CHECKING FOR USER_ID COLUMN ===');
    const hasUserId = structure.rows.find(col => col.column_name === 'user_id');
    console.log('Has user_id column:', !!hasUserId);
    
    if (!hasUserId) {
      console.log('❌ The employees table does NOT have a user_id column!');
      console.log('👉 The auth middleware is looking for user_id but it should probably use id directly');
      
      // Check what the login endpoint returns in the JWT
      console.log('\n=== CHECKING JWT STRUCTURE ===');
      console.log('The login should encode the employee.id in JWT as userId');
      console.log('Then auth middleware should look for employees.id = decoded.userId');
      console.log('NOT employees.user_id = decoded.userId');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmployeesTable();