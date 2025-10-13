const { pool } = require('./config/database');

async function cleanupDuplicateTransactions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Checking for duplicate Transactions menus...');
    
    // Find all Transactions menus
    const transactionsMenus = await client.query(`
      SELECT id, name, route, icon, parent_id, order_index, is_active, description
      FROM menu_items 
      WHERE name = 'Transactions'
      ORDER BY id
    `);
    
    console.log('\n📋 Found Transactions menus:');
    console.table(transactionsMenus.rows);
    
    if (transactionsMenus.rows.length > 1) {
      console.log('\n⚠️  Multiple Transactions menus found!');
      
      // Identify old vs new
      const oldTransactions = transactionsMenus.rows.find(m => m.route === '/transactions' && m.id === 2);
      const newTransactions = transactionsMenus.rows.find(m => m.route === '#' && m.parent_id === null && m.id !== 2);
      
      if (oldTransactions) {
        console.log('\n🔧 Old flat Transactions menu:');
        console.table([oldTransactions]);
        
        // Make sure it's inactive
        if (oldTransactions.is_active) {
          console.log('  ⚠️  Old menu is still active! Setting to inactive...');
          await client.query(`
            UPDATE menu_items 
            SET is_active = false 
            WHERE id = $1
          `, [oldTransactions.id]);
          console.log('  ✅ Old menu set to inactive');
        } else {
          console.log('  ✅ Old menu already inactive');
        }
        
        // Check if old menu has any permissions assigned
        const oldPerms = await client.query(`
          SELECT rmp.*, r.name as role_name
          FROM role_menu_permissions rmp
          JOIN roles r ON rmp.role_id = r.id
          WHERE rmp.menu_item_id = $1
        `, [oldTransactions.id]);
        
        if (oldPerms.rows.length > 0) {
          console.log('\n  📋 Old menu has permissions:');
          console.table(oldPerms.rows);
          console.log('  🗑️  Removing permissions from old menu...');
          
          await client.query(`
            DELETE FROM role_menu_permissions 
            WHERE menu_item_id = $1
          `, [oldTransactions.id]);
          console.log('  ✅ Permissions removed');
        }
      }
      
      if (newTransactions) {
        console.log('\n✨ New parent Transactions menu:');
        console.table([newTransactions]);
        
        // Make sure it's active
        if (!newTransactions.is_active) {
          console.log('  ⚠️  New menu is inactive! Setting to active...');
          await client.query(`
            UPDATE menu_items 
            SET is_active = true 
            WHERE id = $1
          `, [newTransactions.id]);
          console.log('  ✅ New menu set to active');
        } else {
          console.log('  ✅ New menu already active');
        }
        
        // Verify new menu has permissions
        const newPerms = await client.query(`
          SELECT rmp.*, r.name as role_name
          FROM role_menu_permissions rmp
          JOIN roles r ON rmp.role_id = r.id
          WHERE rmp.menu_item_id = $1
        `, [newTransactions.id]);
        
        console.log('\n  📋 New menu permissions:');
        console.table(newPerms.rows);
        
        if (newPerms.rows.length === 0) {
          console.log('  ⚠️  New menu has no permissions! This should not happen.');
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Final verification
    console.log('\n📋 Final Transactions menus status:');
    const final = await client.query(`
      SELECT id, name, route, icon, parent_id, is_active,
        (SELECT COUNT(*) FROM menu_items WHERE parent_id = menu_items.id) as children_count
      FROM menu_items 
      WHERE name = 'Transactions'
      ORDER BY id
    `);
    console.table(final.rows);
    
    console.log('\n📋 Active root menus (what user will see):');
    const active = await client.query(`
      SELECT id, name, icon, route, order_index
      FROM menu_items 
      WHERE parent_id IS NULL AND is_active = true
      ORDER BY order_index
    `);
    console.table(active.rows);
    
    console.log('\n✅ Cleanup complete!');
    console.log('📝 Refresh your browser to see the updated menu structure');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDuplicateTransactions();
