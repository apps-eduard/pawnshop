const { pool } = require('./config/database');

async function assignMenuConfigPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Assigning Menu Config permissions...');
    
    // Get Menu Config ID
    const menuResult = await client.query(`
      SELECT id FROM menu_items WHERE name = 'Menu Config'
    `);
    
    if (menuResult.rows.length === 0) {
      throw new Error('Menu Config not found in database!');
    }
    
    const menuConfigId = menuResult.rows[0].id;
    console.log(`✅ Menu Config ID: ${menuConfigId}`);
    
    // Get Administrator role ID
    const roleResult = await client.query(`
      SELECT id FROM roles WHERE name = 'administrator'
    `);
    
    if (roleResult.rows.length === 0) {
      throw new Error('Administrator role not found!');
    }
    
    const adminRoleId = roleResult.rows[0].id;
    console.log(`✅ Administrator role ID: ${adminRoleId}`);
    
    // Check if permission already exists
    const existingPerm = await client.query(`
      SELECT * FROM role_menu_permissions 
      WHERE role_id = $1 AND menu_item_id = $2
    `, [adminRoleId, menuConfigId]);
    
    if (existingPerm.rows.length > 0) {
      console.log('ℹ️  Permission already exists, updating...');
      await client.query(`
        UPDATE role_menu_permissions 
        SET can_view = true, can_create = true, can_edit = true, can_delete = true
        WHERE role_id = $1 AND menu_item_id = $2
      `, [adminRoleId, menuConfigId]);
      console.log('✅ Permission updated');
    } else {
      console.log('➕ Creating new permission...');
      await client.query(`
        INSERT INTO role_menu_permissions 
        (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, true, true, true, true)
      `, [adminRoleId, menuConfigId]);
      console.log('✅ Permission created');
    }
    
    await client.query('COMMIT');
    
    // Verify the permission
    console.log('\n📋 Verifying Menu Config permissions:');
    const verify = await client.query(`
      SELECT 
        m.name as menu_name,
        r.name as role_name,
        rmp.can_view, rmp.can_create, rmp.can_edit, rmp.can_delete
      FROM role_menu_permissions rmp
      JOIN menu_items m ON rmp.menu_item_id = m.id
      JOIN roles r ON rmp.role_id = r.id
      WHERE m.name = 'Menu Config'
    `);
    console.table(verify.rows);
    
    console.log('\n🎉 Menu Config permissions assigned successfully!');
    console.log('📝 Now refresh your browser to see Menu Config in the sidebar');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

assignMenuConfigPermissions();
