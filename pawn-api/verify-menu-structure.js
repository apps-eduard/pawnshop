const { pool } = require('./config/database');

async function verifyMenuStructure() {
  try {
    console.log('🔍 Verifying Menu Structure and Role Permissions...\n');

    // Get all menu items with their roles
    const result = await pool.query(`
      SELECT 
        m.id, 
        m.name, 
        m.route, 
        m.parent_id,
        m.order_index,
        STRING_AGG(r.name, ', ' ORDER BY r.name) as roles
      FROM menu_items m
      LEFT JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id AND rmp.can_view = true
      LEFT JOIN roles r ON rmp.role_id = r.id
      GROUP BY m.id, m.name, m.route, m.parent_id, m.order_index
      ORDER BY m.parent_id NULLS FIRST, m.order_index
    `);

    console.log('📊 Complete Menu Structure:\n');
    
    const menuMap = {};
    const parentMenus = [];
    
    // Organize menus
    result.rows.forEach(menu => {
      if (menu.parent_id === null) {
        parentMenus.push(menu);
      } else {
        if (!menuMap[menu.parent_id]) {
          menuMap[menu.parent_id] = [];
        }
        menuMap[menu.parent_id].push(menu);
      }
    });

    // Display parent menus and their children
    parentMenus.forEach(parent => {
      const children = menuMap[parent.id] || [];
      
      if (children.length > 0) {
        console.log(`📁 ${parent.name} (ID: ${parent.id})`);
        console.log(`   Roles: ${parent.roles || 'None'}\n`);
        
        children.forEach(child => {
          console.log(`   ├─ ${child.name}`);
          console.log(`   │  Route: ${child.route}`);
          console.log(`   │  Roles: ${child.roles || 'None'}`);
          console.log('');
        });
      } else {
        console.log(`📄 ${parent.name} (ID: ${parent.id})`);
        console.log(`   Route: ${parent.route}`);
        console.log(`   Roles: ${parent.roles || 'None'}`);
        console.log('');
      }
    });

    // Get role-specific menu counts
    const roleCounts = await pool.query(`
      SELECT 
        r.name as role_name,
        COUNT(DISTINCT rmp.menu_item_id) as menu_count
      FROM roles r
      LEFT JOIN role_menu_permissions rmp ON r.id = rmp.role_id AND rmp.can_view = true
      WHERE r.name IN ('administrator', 'manager', 'cashier', 'auctioneer', 'appraiser')
      GROUP BY r.name
      ORDER BY r.name
    `);

    console.log('\n📋 Menu Access Summary by Role:\n');
    roleCounts.rows.forEach(role => {
      console.log(`   ${role.role_name}: ${role.menu_count} menus`);
    });

    console.log('\n✅ Verification completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyMenuStructure();
