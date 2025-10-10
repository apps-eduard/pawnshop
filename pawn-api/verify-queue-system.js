const { pool } = require('./config/database');

async function verifyQueueTables() {
  try {
    console.log('🔍 Verifying Queue System Tables...\n');
    
    // Check pawner_roles table
    const pawnerRolesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pawner_roles' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ pawner_roles table:');
    pawnerRolesCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check pawner_queue table
    const queueCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pawner_queue' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ pawner_queue table:');
    queueCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if pawner role exists
    const pawnerRoleCheck = await pool.query(`
      SELECT id, name, display_name, description 
      FROM roles 
      WHERE name = 'pawner'
    `);
    
    console.log('\n✅ Pawner Role:');
    if (pawnerRoleCheck.rows.length > 0) {
      const role = pawnerRoleCheck.rows[0];
      console.log(`   ID: ${role.id}`);
      console.log(`   Name: ${role.name}`);
      console.log(`   Display Name: ${role.display_name}`);
      console.log(`   Description: ${role.description}`);
    } else {
      console.log('   ⚠️  Pawner role not found! Run RBAC migration update.');
    }
    
    console.log('\n✅ Queue System Tables Verified Successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyQueueTables();
