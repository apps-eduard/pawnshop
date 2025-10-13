const { pool } = require('./config/database');

async function assignParentMenuPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Assigning permissions for parent menus...');
    
    // Get Management and Transactions menu IDs
    const menusResult = await client.query(`
      SELECT id, name FROM menu_items 
      WHERE name IN ('Management', 'Transactions') 
      AND parent_id IS NULL
      ORDER BY name
    `);
    
    console.log('\n📋 Found parent menus:');
    console.table(menusResult.rows);
    
    if (menusResult.rows.length === 0) {
      throw new Error('Management and Transactions menus not found!');
    }
    
    // Get Administrator role ID
    const roleResult = await client.query(`
      SELECT id FROM roles WHERE name = 'administrator'
    `);
    
    if (roleResult.rows.length === 0) {
      throw new Error('Administrator role not found!');
    }
    
    const adminRoleId = roleResult.rows[0].id;
    console.log(`✅ Administrator role ID: ${adminRoleId}`);
    
    // Assign permissions to each parent menu
    for (const menu of menusResult.rows) {
      console.log(`\n🔄 Processing ${menu.name}...`);
      
      // Check if permission already exists
      const existingPerm = await client.query(`
        SELECT * FROM role_menu_permissions 
        WHERE role_id = $1 AND menu_item_id = $2
      `, [adminRoleId, menu.id]);
      
      if (existingPerm.rows.length > 0) {
        console.log(`  ℹ️  Permission already exists, updating...`);
        await client.query(`
          UPDATE role_menu_permissions 
          SET can_view = true, can_create = false, can_edit = false, can_delete = false
          WHERE role_id = $1 AND menu_item_id = $2
        `, [adminRoleId, menu.id]);
        console.log(`  ✅ Permission updated`);
      } else {
        console.log(`  ➕ Creating new permission...`);
        await client.query(`
          INSERT INTO role_menu_permissions 
          (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, false, false, false)
        `, [adminRoleId, menu.id]);
        console.log(`  ✅ Permission created`);
      }
    }
    
    await client.query('COMMIT');
    
    // Verify all parent menu permissions
    console.log('\n📋 Verifying parent menu permissions:');
    const verify = await client.query(`
      SELECT 
        m.name as menu_name,
        m.id as menu_id,
        r.name as role_name,
        rmp.can_view
      FROM role_menu_permissions rmp
      JOIN menu_items m ON rmp.menu_item_id = m.id
      JOIN roles r ON rmp.role_id = r.id
      WHERE m.name IN ('Management', 'Transactions') 
      AND m.parent_id IS NULL
      ORDER BY m.name
    `);
    console.table(verify.rows);
    
    // Also verify all child menus have permissions
    console.log('\n📋 Checking child menu permissions:');
    const childCheck = await client.query(`
      SELECT 
        m.id,
        m.name,
        m.parent_id,
        CASE 
          WHEN rmp.menu_item_id IS NULL THEN '❌ Missing'
          ELSE '✅ Has Permission'
        END as permission_status
      FROM menu_items m
      LEFT JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id AND rmp.role_id = $1
      WHERE m.parent_id IN (
        SELECT id FROM menu_items WHERE name IN ('Management', 'Transactions') AND parent_id IS NULL
      )
      ORDER BY m.parent_id, m.order_index
    `, [adminRoleId]);
    console.table(childCheck.rows);
    
    const missingPerms = childCheck.rows.filter(row => row.permission_status.includes('Missing'));
    if (missingPerms.length > 0) {
      console.log('\n⚠️  Warning: Some child menus are missing permissions!');
      console.log('Run the assign-all-menu-permissions.js script to fix this.');
    }
    
    console.log('\n🎉 Parent menu permissions assigned successfully!');
    console.log('📝 Now refresh your browser to see Management and Transactions in the sidebar');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

assignParentMenuPermissions();
