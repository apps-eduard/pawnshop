/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create menu_items table
  await knex.schema.createTable('menu_items', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('route', 255);
    table.string('icon', 100);
    table.integer('parent_id').unsigned().references('id').inTable('menu_items').onDelete('CASCADE');
    table.integer('order_index').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.text('description');
    table.timestamps(true, true);
  });

  // 2. Create roles table
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('display_name', 100);
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 3. Create role_menu_permissions table
  await knex.schema.createTable('role_menu_permissions', (table) => {
    table.increments('id').primary();
    table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.integer('menu_item_id').unsigned().notNullable().references('id').inTable('menu_items').onDelete('CASCADE');
    table.boolean('can_view').defaultTo(true);
    table.boolean('can_create').defaultTo(false);
    table.boolean('can_edit').defaultTo(false);
    table.boolean('can_delete').defaultTo(false);
    table.timestamps(true, true);
    table.unique(['role_id', 'menu_item_id']);
  });

  // 4. Create employee_roles table (many-to-many for users and roles)
  await knex.schema.createTable('employee_roles', (table) => {
    table.increments('id').primary();
    table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.boolean('is_primary').defaultTo(true);
    table.integer('assigned_by').unsigned().references('id').inTable('employees');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.unique(['employee_id', 'role_id']);
    table.index('employee_id');
    table.index('role_id');
  });

  // Insert default roles
  await knex('roles').insert([
    { name: 'administrator', display_name: 'Administrator', description: 'Full system access' },
    { name: 'manager', display_name: 'Manager', description: 'Manage operations and staff' },
    { name: 'cashier', display_name: 'Cashier', description: 'Process transactions' },
    { name: 'appraiser', display_name: 'Appraiser', description: 'Appraise items' },
    { name: 'auctioneer', display_name: 'Auctioneer', description: 'Manage auctions' },
    { name: 'pawner', display_name: 'Pawner', description: 'Customer access - view own info and join queue' }
  ]);

  // Insert default menu items
  const menuIds = await knex('menu_items').insert([
    { name: 'Dashboard', route: '/dashboard', icon: '📊', order_index: 1 },
    { name: 'Transactions', route: '/transactions', icon: '💳', order_index: 2 },
    { name: 'Pawner Management', route: '/management/pawner', icon: '🧑‍🤝‍🧑', order_index: 3 },
    { name: 'Item Management', route: '/management/item', icon: '📦', order_index: 4 },
    { name: 'Reports', route: '/reports', icon: '📈', order_index: 5 },
    { name: 'Vouchers', route: '/vouchers', icon: '🎟️', order_index: 6 },
    { name: 'Settings', route: '/settings/admin', icon: '⚙️', order_index: 7 },
    { name: 'RBAC', route: '/rbac', icon: '🔐', order_index: 8 }
  ]).returning('id');

  // Get all roles and menus
  const roles = await knex('roles').select('id', 'name');
  const allMenus = await knex('menu_items').select('id', 'name');
  
  // Define role-menu mappings
  const roleMenuMap = {
    'administrator': ['Dashboard', 'Transactions', 'Pawner Management', 'Item Management', 'Reports', 'Vouchers', 'Settings', 'RBAC'],
    'manager': ['Dashboard', 'Transactions', 'Pawner Management', 'Item Management', 'Reports', 'Vouchers'],
    'cashier': ['Dashboard', 'Transactions', 'Pawner Management'],
    'appraiser': ['Dashboard', 'Reports'],
    'auctioneer': ['Dashboard', 'Reports'],
    'pawner': ['Dashboard'] // Pawners only see their own dashboard
  };

  // Assign role-menu permissions
  for (const role of roles) {
    const allowedMenus = roleMenuMap[role.name] || [];
    for (const menuName of allowedMenus) {
      const menu = allMenus.find(m => m.name === menuName);
      if (menu) {
        await knex('role_menu_permissions').insert({
          role_id: role.id,
          menu_item_id: menu.id,
          can_view: true,
          can_create: role.name === 'administrator' || role.name === 'manager',
          can_edit: role.name === 'administrator' || role.name === 'manager',
          can_delete: role.name === 'administrator'
        });
      }
    }
  }

  // Note: Employee role assignments are handled by seed file 07_assign_employee_roles.js
  // This is because employees are created by seeds, not migrations
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('employee_roles');
  await knex.schema.dropTableIfExists('role_menu_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('menu_items');
};
