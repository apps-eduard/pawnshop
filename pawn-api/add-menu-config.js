const { pool } = require('./config/database');

async function addMenuConfig() {
  try {
    console.log('🔧 Adding Menu Config menu item...');
    
    const result = await pool.query(`
      INSERT INTO menu_items (name, route, icon, parent_id, order_index, is_active, description)
      VALUES ('Menu Config', '/management/menu-config', '⚙️', NULL, 9, true, 'Configure menu items and hierarchy')
      ON CONFLICT DO NOTHING
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Menu Config added successfully:');
      console.table(result.rows);
    } else {
      console.log('ℹ️ Menu Config already exists');
    }
    
    // Show all root menus
    const allMenus = await pool.query(`
      SELECT id, name, icon, route, order_index, is_active 
      FROM menu_items 
      WHERE parent_id IS NULL 
      ORDER BY order_index
    `);
    
    console.log('\n📋 All root menus:');
    console.table(allMenus.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMenuConfig();
