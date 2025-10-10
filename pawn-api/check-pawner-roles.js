const { pool } = require('./config/database');

async function checkPawnerRoles() {
  try {
    // Check if pawners table has role columns
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      ORDER BY ordinal_position
    `);
    
    console.log('Pawners table columns:');
    columns.rows.forEach(c => console.log('  - ' + c.column_name));
    
    // Check if there's a pawner role in roles table
    const role = await pool.query(`
      SELECT * FROM roles WHERE name = 'pawner'
    `);
    
    console.log('\nPawner role exists:', role.rows.length > 0);
    if (role.rows.length > 0) {
      console.log('  Role:', role.rows[0]);
    }
    
    // Check if there's a pawner_roles table
    const pawnerRolesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pawner_roles'
      );
    `);
    
    console.log('\nPawner_roles table exists:', pawnerRolesTable.rows[0].exists);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPawnerRoles();
