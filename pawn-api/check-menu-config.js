const { pool } = require('./config/database');

async function checkMenuConfig() {
  try {
    // Check Menu Config exists
    const menuConfig = await pool.query(`
      SELECT id, name, route, icon, parent_id, order_index, is_active 
      FROM menu_items 
      WHERE name = 'Menu Config'
    `);
    
    console.log('🔍 Menu Config in database:');
    console.table(menuConfig.rows);
    
    if (menuConfig.rows.length === 0) {
      console.log('❌ Menu Config not found! Adding it...');
      const result = await pool.query(`
        INSERT INTO menu_items (name, route, icon, parent_id, order_index, is_active, description)
        VALUES ('Menu Config', '/management/menu-config', '⚙️', NULL, 9, true, 'Configure menu items and hierarchy')
        RETURNING *
      `);
      console.log('✅ Menu Config added:');
      console.table(result.rows);
    } else if (!menuConfig.rows[0].is_active) {
      console.log('⚠️ Menu Config exists but is inactive. Activating...');
      await pool.query(`UPDATE menu_items SET is_active = true WHERE name = 'Menu Config'`);
      console.log('✅ Menu Config activated');
    } else {
      console.log('✅ Menu Config is active and ready');
    }
    
    // Check all root menus
    console.log('\n📋 All active root menus (should include Menu Config):');
    const allRoot = await pool.query(`
      SELECT id, name, icon, route, order_index 
      FROM menu_items 
      WHERE parent_id IS NULL AND is_active = true 
      ORDER BY order_index
    `);
    console.table(allRoot.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMenuConfig();
