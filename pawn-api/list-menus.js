const { pool } = require('./config/database');

async function listMenus() {
  try {
    const result = await pool.query(`
      SELECT name, route, icon, order_index 
      FROM menu_items 
      ORDER BY order_index
    `);
    
    console.log('✅ All menus in RBAC system:');
    console.log('═'.repeat(60));
    result.rows.forEach(m => {
      console.log(`${m.order_index.toString().padStart(3)}: ${m.icon} ${m.name.padEnd(25)} ${m.route}`);
    });
    console.log('═'.repeat(60));
    console.log(`Total: ${result.rows.length} menus`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listMenus();
