/**
 * Remove duplicate Administrator role
 * Keep only the 'administrator' role, remove the 'admin' role
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function removeDuplicateRole() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Checking for duplicate Administrator roles...');
    
    // Check current roles
    const rolesCheck = await client.query(`
      SELECT id, name, display_name, description 
      FROM roles 
      WHERE name IN ('admin', 'administrator')
      ORDER BY id
    `);
    
    console.log('\n📋 Current Administrator roles:');
    rolesCheck.rows.forEach(role => {
      console.log(`  - ID: ${role.id}, Name: "${role.name}", Display: "${role.display_name}"`);
    });
    
    if (rolesCheck.rows.length <= 1) {
      console.log('\n✅ No duplicates found!');
      await client.query('ROLLBACK');
      return;
    }
    
    // Find the 'admin' role (the one to remove)
    const adminRole = rolesCheck.rows.find(r => r.name === 'admin');
    const administratorRole = rolesCheck.rows.find(r => r.name === 'administrator');
    
    if (!adminRole) {
      console.log('\n✅ No "admin" role found to remove!');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`\n🗑️  Removing role: "${adminRole.name}" (ID: ${adminRole.id})`);
    console.log(`✅ Keeping role: "${administratorRole.name}" (ID: ${administratorRole.id})`);
    
    // Step 1: Update all employee_roles that reference 'admin' to 'administrator'
    console.log('\n📝 Step 1: Updating employee_roles...');
    const updateEmployeeRoles = await client.query(`
      UPDATE employee_roles 
      SET role_id = $1 
      WHERE role_id = $2
      RETURNING *
    `, [administratorRole.id, adminRole.id]);
    console.log(`   Updated ${updateEmployeeRoles.rowCount} employee role assignments`);
    
    // Step 2: Update role_menu_permissions that reference 'admin' to 'administrator'
    // But first, check if there are conflicts
    console.log('\n📝 Step 2: Checking role_menu_permissions...');
    const conflictCheck = await client.query(`
      SELECT rmp1.menu_item_id 
      FROM role_menu_permissions rmp1
      INNER JOIN role_menu_permissions rmp2 ON rmp1.menu_item_id = rmp2.menu_item_id
      WHERE rmp1.role_id = $1 AND rmp2.role_id = $2
    `, [adminRole.id, administratorRole.id]);
    
    if (conflictCheck.rowCount > 0) {
      console.log(`   Found ${conflictCheck.rowCount} permission conflicts - removing admin permissions first`);
      await client.query(`
        DELETE FROM role_menu_permissions 
        WHERE role_id = $1
      `, [adminRole.id]);
      console.log(`   Deleted all permissions for 'admin' role`);
    } else {
      // No conflicts, safe to update
      const updatePermissions = await client.query(`
        UPDATE role_menu_permissions 
        SET role_id = $1 
        WHERE role_id = $2
        RETURNING *
      `, [administratorRole.id, adminRole.id]);
      console.log(`   Updated ${updatePermissions.rowCount} menu permissions`);
    }
    
    // Step 3: Delete the 'admin' role
    console.log('\n📝 Step 3: Deleting the duplicate "admin" role...');
    await client.query(`
      DELETE FROM roles 
      WHERE id = $1
    `, [adminRole.id]);
    console.log(`   ✅ Deleted role: "${adminRole.name}"`);
    
    await client.query('COMMIT');
    
    // Verify final state
    console.log('\n✅ Verification:');
    const finalCheck = await client.query(`
      SELECT id, name, display_name 
      FROM roles 
      WHERE name IN ('admin', 'administrator')
    `);
    console.log(`   Remaining Administrator roles: ${finalCheck.rowCount}`);
    finalCheck.rows.forEach(role => {
      console.log(`   - ID: ${role.id}, Name: "${role.name}", Display: "${role.display_name}"`);
    });
    
    console.log('\n🎉 Successfully removed duplicate Administrator role!');
    console.log('💡 Refresh your RBAC page to see the changes.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
removeDuplicateRole()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
