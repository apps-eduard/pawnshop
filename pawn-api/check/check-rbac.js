const { pool } = require('../config/database');

async function checkRBAC() {
  try {
    const roles = await pool.query('SELECT * FROM roles ORDER BY id');
    console.log('\n📋 Roles:', roles.rows);
    
    const menus = await pool.query('SELECT * FROM menu_items ORDER BY order_index');
    console.log('\n📋 Menu Items:', menus.rows);
    
    const empRoles = await pool.query(`
      SELECT e.id, e.username, e.role as legacy_role, r.name as assigned_role, er.is_primary
      FROM employee_roles er 
      JOIN employees e ON er.employee_id = e.id 
      JOIN roles r ON er.role_id = r.id 
      ORDER BY e.id
    `);
    console.log('\n📋 Employee Roles:', empRoles.rows);
    
    const permissions = await pool.query(`
      SELECT r.name as role, COUNT(rmp.id) as menu_count
      FROM role_menu_permissions rmp
      JOIN roles r ON rmp.role_id = r.id
      GROUP BY r.name
      ORDER BY r.name
    `);
    console.log('\n📋 Role Menu Permissions:', permissions.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRBAC();
