/**
 * Migration: Dynamic Menu & Multiple Roles RBAC System
 * 
 * This migration creates:
 * 1. menu_items - stores all sidebar menu items
 * 2. roles - defines available roles
 * 3. role_menu_permissions - role-based menu access control
 * 4. employee_roles - many-to-many relationship for multiple roles per user
 * 
 * Run: node migrations/create-dynamic-menu-rbac-system.js
 */

const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting Dynamic Menu & RBAC Migration...\n');

    // ====================================
    // 1. Create menu_items table
    // ====================================
    console.log('📋 Creating menu_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        route VARCHAR(255),
        icon VARCHAR(100),
        parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ menu_items table created\n');

    // ====================================
    // 2. Create roles table
    // ====================================
    console.log('👥 Creating roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ roles table created\n');

    // ====================================
    // 3. Create role_menu_permissions table
    // ====================================
    console.log('🔐 Creating role_menu_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_menu_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT true,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, menu_item_id)
      )
    `);
    console.log('✅ role_menu_permissions table created\n');

    // ====================================
    // 4. Create employee_roles table
    // ====================================
    console.log('👤 Creating employee_roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_roles (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        assigned_by INTEGER REFERENCES employees(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, role_id)
      )
    `);
    console.log('✅ employee_roles table created\n');

    // ====================================
    // 5. Create indexes for performance
    // ====================================
    console.log('⚡ Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_parent ON menu_items(parent_id);
      CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
      CREATE INDEX IF NOT EXISTS idx_role_menu_role ON role_menu_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_menu_menu ON role_menu_permissions(menu_item_id);
      CREATE INDEX IF NOT EXISTS idx_employee_roles_employee ON employee_roles(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_roles_role ON employee_roles(role_id);
    `);
    console.log('✅ Indexes created\n');

    // ====================================
    // 6. Insert default roles
    // ====================================
    console.log('🎭 Inserting default roles...');
    const rolesData = [
      { name: 'administrator', display_name: 'Administrator', description: 'Full system access', is_system: true },
      { name: 'manager', display_name: 'Manager', description: 'Supervisory access', is_system: true },
      { name: 'cashier', display_name: 'Cashier', description: 'Transaction processing', is_system: true },
      { name: 'auctioneer', display_name: 'Auctioneer', description: 'Auction management', is_system: true },
      { name: 'appraiser', display_name: 'Appraiser', description: 'Item appraisal', is_system: true },
      { name: 'pawner', display_name: 'Pawner', description: 'Customer portal access', is_system: true }
    ];

    for (const role of rolesData) {
      await client.query(`
        INSERT INTO roles (name, display_name, description, is_system_role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `, [role.name, role.display_name, role.description, role.is_system]);
    }
    console.log('✅ Default roles inserted\n');

    // ====================================
    // 7. Insert default menu items
    // ====================================
    console.log('📱 Inserting default menu items...');
    const menuItems = [
      // Main menus
      { name: 'Dashboard', route: '/dashboard', icon: '📊', order: 1, description: 'Main dashboard view' },
      { name: 'Transactions', route: '/transactions', icon: '💳', order: 2, description: 'View all transactions' },
      { name: 'New Loan', route: '/transactions/new-loan', icon: '➕', order: 3, description: 'Create new loan' },
      { name: 'Renew', route: '/transactions/renew', icon: '🔄', order: 4, description: 'Renew existing loans' },
      { name: 'Redeem', route: '/transactions/redeem', icon: '✅', order: 5, description: 'Redeem pawned items' },
      { name: 'Partial Payment', route: '/transactions/partial-payment', icon: '💰', order: 6, description: 'Make partial payments' },
      { name: 'Additional Loan', route: '/transactions/additional-loan', icon: '💵', order: 7, description: 'Additional loan on existing items' },
      { name: 'User Management', route: '/user-management', icon: '👥', order: 8, description: 'Manage users' },
      { name: 'Address Management', route: '/address-management', icon: '🏠', order: 9, description: 'Manage addresses' },
      { name: 'Pawner Management', route: '/pawner-management', icon: '🧑‍🤝‍🧑', order: 10, description: 'Manage customers' },
      { name: 'Item Management', route: '/item-management', icon: '📦', order: 11, description: 'Manage pawned items' },
      { name: 'Reports', route: '/reports', icon: '📈', order: 12, description: 'View business reports' },
      { name: 'User & Role Management', route: '/rbac', icon: '🔐', order: 13, description: 'Role-based access control' },
      { name: 'Settings', route: '/admin-settings', icon: '⚙️', order: 14, description: 'System settings' },
      { name: 'Vouchers', route: '/vouchers', icon: '🎟️', order: 15, description: 'Manage vouchers' },
      { name: 'Auctions', route: '/auctions', icon: '🔨', order: 16, description: 'Manage auctions' },
      { name: 'Appraisals', route: '/appraisals', icon: '💎', order: 17, description: 'Item appraisals' },
      { name: 'My Loans', route: '/my-loans', icon: '🏦', order: 18, description: 'View personal loans (Pawner)' }
    ];

    for (const menu of menuItems) {
      await client.query(`
        INSERT INTO menu_items (name, route, icon, order_index, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [menu.name, menu.route, menu.icon, menu.order, menu.description]);
    }
    console.log('✅ Default menu items inserted\n');

    // ====================================
    // 8. Set default permissions for roles
    // ====================================
    console.log('🔑 Setting default role-menu permissions...');
    
    // Get role IDs
    const roleIds = {};
    const rolesResult = await client.query('SELECT id, name FROM roles');
    rolesResult.rows.forEach(role => {
      roleIds[role.name] = role.id;
    });

    // Get menu IDs
    const menuIds = {};
    const menusResult = await client.query('SELECT id, name FROM menu_items');
    menusResult.rows.forEach(menu => {
      menuIds[menu.name] = menu.id;
    });

    // Admin/Administrator - Full access to everything
    const adminMenus = Object.values(menuIds);
    for (const menuId of adminMenus) {
      await client.query(`
        INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, true, true, true, true)
        ON CONFLICT (role_id, menu_item_id) DO NOTHING
      `, [roleIds['admin'], menuId]);
      
      await client.query(`
        INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, true, true, true, true)
        ON CONFLICT (role_id, menu_item_id) DO NOTHING
      `, [roleIds['administrator'], menuId]);
    }

    // Manager - Most menus except settings
    const managerMenus = ['Dashboard', 'Transactions', 'New Loan', 'Renew', 'Redeem', 'Partial Payment', 
                          'Additional Loan', 'Pawner Management', 'Item Management', 'Reports', 
                          'User & Role Management', 'Vouchers', 'Auctions'];
    for (const menuName of managerMenus) {
      if (menuIds[menuName]) {
        await client.query(`
          INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, true, true, true)
          ON CONFLICT (role_id, menu_item_id) DO NOTHING
        `, [roleIds['manager'], menuIds[menuName]]);
      }
    }

    // Cashier - Transaction-related menus
    const cashierMenus = ['Dashboard', 'Transactions', 'New Loan', 'Renew', 'Redeem', 
                          'Partial Payment', 'Additional Loan', 'Pawner Management'];
    for (const menuName of cashierMenus) {
      if (menuIds[menuName]) {
        await client.query(`
          INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, true, true, false)
          ON CONFLICT (role_id, menu_item_id) DO NOTHING
        `, [roleIds['cashier'], menuIds[menuName]]);
      }
    }

    // Auctioneer - Auction menus
    const auctioneerMenus = ['Dashboard', 'Auctions', 'Item Management'];
    for (const menuName of auctioneerMenus) {
      if (menuIds[menuName]) {
        await client.query(`
          INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, true, true, true)
          ON CONFLICT (role_id, menu_item_id) DO NOTHING
        `, [roleIds['auctioneer'], menuIds[menuName]]);
      }
    }

    // Appraiser - Appraisal menus
    const appraiserMenus = ['Dashboard', 'Appraisals', 'Item Management', 'Reports'];
    for (const menuName of appraiserMenus) {
      if (menuIds[menuName]) {
        await client.query(`
          INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, true, true, false)
          ON CONFLICT (role_id, menu_item_id) DO NOTHING
        `, [roleIds['appraiser'], menuIds[menuName]]);
      }
    }

    // Pawner - Customer portal only
    const pawnerMenus = ['Dashboard', 'My Loans'];
    for (const menuName of pawnerMenus) {
      if (menuIds[menuName]) {
        await client.query(`
          INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
          VALUES ($1, $2, true, false, false, false)
          ON CONFLICT (role_id, menu_item_id) DO NOTHING
        `, [roleIds['pawner'], menuIds[menuName]]);
      }
    }

    console.log('✅ Default permissions set\n');

    // ====================================
    // 9. Migrate existing employee roles
    // ====================================
    console.log('🔄 Migrating existing employee roles...');
    const employees = await client.query(`
      SELECT id, role FROM employees WHERE role IS NOT NULL
    `);

    for (const emp of employees.rows) {
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [emp.role]
      );
      
      if (roleResult.rows.length > 0) {
        await client.query(`
          INSERT INTO employee_roles (employee_id, role_id, is_primary, assigned_by)
          VALUES ($1, $2, true, $1)
          ON CONFLICT (employee_id, role_id) DO NOTHING
        `, [emp.id, roleResult.rows[0].id]);
      }
    }
    console.log(`✅ Migrated ${employees.rows.length} employee roles\n`);

    // ====================================
    // 10. Drop old role column (optional - commented out for safety)
    // ====================================
    console.log('⚠️  Keeping old "role" column for backward compatibility');
    console.log('   To remove it later, run: ALTER TABLE employees DROP COLUMN role;\n');
    
    // Uncomment to remove old column:
    // await client.query('ALTER TABLE employees DROP COLUMN IF EXISTS role');

    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Created 4 new tables');
    console.log('   - Inserted 7 default roles');
    console.log(`   - Inserted ${menuItems.length} menu items`);
    console.log('   - Set up role-based permissions');
    console.log(`   - Migrated ${employees.rows.length} employee roles`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });
