const { pool } = require('./config/database');

async function checkRolesTable() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `);
    
    console.log('Roles table columns:');
    result.rows.forEach(c => console.log('  - ' + c.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRolesTable();
