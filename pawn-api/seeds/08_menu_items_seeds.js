/**
 * Seed file for menu items and role permissions
 * Creates the complete menu hierarchy with parent-child relationships
 * and assigns permissions to the administrator role
 */

exports.seed = async function(knex) {
  // First, clear existing data
  await knex('role_menu_permissions').del();
  await knex('menu_items').del();

  console.log('🗑️  Cleared existing menu items and permissions');

  // Insert parent menu items first
  const parentMenus = await knex('menu_items').insert([
    {
      id: 18,
      name: 'Management',
      route: null,
      icon: '📁',
      parent_id: null,
      order_index: 100,
      is_active: true
    },
    {
      id: 19,
      name: 'Transactions',
      route: null,
      icon: '💰',
      parent_id: null,
      order_index: 200,
      is_active: true
    }
  ]).returning('*');

  console.log('✅ Created parent menus: Management, Transactions');

  // Insert Management children (parent_id = 18)
  const managementChildren = await knex('menu_items').insert([
    {
      id: 3,
      name: 'User',
      route: '/management/user',
      icon: '👥',
      parent_id: 18,
      order_index: 1,
      is_active: true
    },
    {
      id: 4,
      name: 'Pawner',
      route: '/management/pawner',
      icon: '🧑‍🤝‍🧑',
      parent_id: 18,
      order_index: 2,
      is_active: true
    },
    {
      id: 17,
      name: 'Address',
      route: '/management/address',
      icon: '🏠',
      parent_id: 18,
      order_index: 3,
      is_active: true
    },
    {
      id: 5,
      name: 'Item',
      route: '/management/item',
      icon: '📦',
      parent_id: 18,
      order_index: 4,
      is_active: true
    },
    {
      id: 16,
      name: 'Vouchers',
      route: '/management/vouchers',
      icon: '🎟️',
      parent_id: 18,
      order_index: 5,
      is_active: true
    },
    {
      id: 21,
      name: 'Transactions',
      route: '/transactions',
      icon: '📋',
      parent_id: 18,
      order_index: 6,
      is_active: true
    }
  ]).returning('*');

  console.log('✅ Created Management children: User, Pawner, Address, Item, Vouchers, Transactions');

  // Insert Transactions children (parent_id = 19)
  const transactionChildren = await knex('menu_items').insert([
    {
      id: 6,
      name: 'Appraisal',
      route: '/transactions/appraisal',
      icon: '💎',
      parent_id: 19,
      order_index: 1,
      is_active: true
    },
    {
      id: 7,
      name: 'New Loan',
      route: '/transactions/new-loan',
      icon: '➕',
      parent_id: 19,
      order_index: 2,
      is_active: true
    },
    {
      id: 8,
      name: 'Additional',
      route: '/transactions/additional-loan',
      icon: '💵',
      parent_id: 19,
      order_index: 3,
      is_active: true
    },
    {
      id: 9,
      name: 'Partial Payment',
      route: '/transactions/partial-payment',
      icon: '💳',
      parent_id: 19,
      order_index: 4,
      is_active: true
    },
    {
      id: 10,
      name: 'Redeem',
      route: '/transactions/redeem',
      icon: '🎁',
      parent_id: 19,
      order_index: 5,
      is_active: true
    },
    {
      id: 11,
      name: 'Renew',
      route: '/transactions/renew',
      icon: '🔄',
      parent_id: 19,
      order_index: 6,
      is_active: true
    },
    {
      id: 12,
      name: 'Auction',
      route: '/transactions/auction-items',
      icon: '🔨',
      parent_id: 19,
      order_index: 7,
      is_active: true
    }
  ]).returning('*');

  console.log('✅ Created Transactions children: Appraisal, New Loan, Additional, Partial Payment, Redeem, Renew, Auction');

  // Insert standalone menu items (no parent)
  const standaloneMenus = await knex('menu_items').insert([
    {
      id: 13,
      name: 'Reports',
      route: '/reports',
      icon: '📈',
      parent_id: null,
      order_index: 300,
      is_active: true
    },
    {
      id: 14,
      name: 'RBAC',
      route: '/rbac',
      icon: '🔐',
      parent_id: null,
      order_index: 400,
      is_active: true
    },
    {
      id: 20,
      name: 'Menu Config',
      route: '/management/menu-config',
      icon: '⚙️',
      parent_id: null,
      order_index: 500,
      is_active: true
    },
    {
      id: 22,
      name: 'Settings',
      route: '/settings/admin',
      icon: '⚙️',
      parent_id: null,
      order_index: 600,
      is_active: true
    }
  ]).returning('*');

  console.log('✅ Created standalone menus: Reports, RBAC, Menu Config, Settings');

  // Get administrator role ID
  const adminRole = await knex('roles').where('name', 'administrator').first();
  
  if (!adminRole) {
    throw new Error('Administrator role not found! Please run previous seeds first.');
  }

  console.log(`📋 Found administrator role (ID: ${adminRole.id})`);

  // Check if admin user has role assignment
  const adminEmployee = await knex('employees').where('username', 'admin').first();
  if (adminEmployee) {
    const adminRoleAssignment = await knex('employee_roles')
      .where('employee_id', adminEmployee.id)
      .where('role_id', adminRole.id)
      .first();
    
    if (!adminRoleAssignment) {
      console.log('⚠️  Admin user does not have administrator role assigned. Assigning now...');
      await knex('employee_roles').insert({
        employee_id: adminEmployee.id,
        role_id: adminRole.id,
        is_primary: true,
        assigned_by: adminEmployee.id,
        assigned_at: knex.fn.now()
      });
      console.log('✅ Assigned administrator role to admin user');
    } else {
      console.log('✅ Admin user already has administrator role');
    }
  }

  // Assign permissions for parent menus (view only)
  const parentPermissions = [
    { role_id: adminRole.id, menu_item_id: 18, can_view: true, can_create: false, can_edit: false, can_delete: false },
    { role_id: adminRole.id, menu_item_id: 19, can_view: true, can_create: false, can_edit: false, can_delete: false }
  ];

  // Assign full permissions for Management children
  const managementPermissions = [3, 4, 17, 5, 16, 21].map(menuId => ({
    role_id: adminRole.id,
    menu_item_id: menuId,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true
  }));

  // Assign full permissions for Transaction children
  const transactionPermissions = [6, 7, 8, 9, 10, 11, 12].map(menuId => ({
    role_id: adminRole.id,
    menu_item_id: menuId,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true
  }));

  // Assign permissions for standalone menus (Reports, RBAC, Menu Config, Settings)
  const standalonePermissions = [
    { role_id: adminRole.id, menu_item_id: 13, can_view: true, can_create: true, can_edit: true, can_delete: true },
    { role_id: adminRole.id, menu_item_id: 14, can_view: true, can_create: true, can_edit: true, can_delete: true },
    { role_id: adminRole.id, menu_item_id: 20, can_view: true, can_create: true, can_edit: true, can_delete: true },
    { role_id: adminRole.id, menu_item_id: 22, can_view: true, can_create: true, can_edit: true, can_delete: true }
  ];

  // Insert all permissions for Administrator
  await knex('role_menu_permissions').insert([
    ...parentPermissions,
    ...managementPermissions,
    ...transactionPermissions,
    ...standalonePermissions
  ]);

  console.log('✅ Assigned all menu permissions to administrator role');

  // ========================================
  // MANAGER ROLE PERMISSIONS
  // ========================================
  const managerRole = await knex('roles').where('name', 'manager').first();
  if (managerRole) {
    console.log(`📋 Assigning permissions for Manager role (ID: ${managerRole.id})`);
    
    const managerPermissions = [
      // Management parent (view only)
      { role_id: managerRole.id, menu_item_id: 18, can_view: true, can_create: false, can_edit: false, can_delete: false },
      // Management children: Item, Vouchers, Transactions
      { role_id: managerRole.id, menu_item_id: 5, can_view: true, can_create: true, can_edit: true, can_delete: true },
      { role_id: managerRole.id, menu_item_id: 16, can_view: true, can_create: true, can_edit: true, can_delete: true },
      { role_id: managerRole.id, menu_item_id: 21, can_view: true, can_create: true, can_edit: true, can_delete: true }
    ];
    
    await knex('role_menu_permissions').insert(managerPermissions);
    console.log('✅ Assigned Manager permissions');
  }

  // ========================================
  // CASHIER ROLE PERMISSIONS
  // ========================================
  const cashierRole = await knex('roles').where('name', 'cashier').first();
  if (cashierRole) {
    console.log(`📋 Assigning permissions for Cashier role (ID: ${cashierRole.id})`);
    
    const cashierPermissions = [
      // Transactions parent (view only)
      { role_id: cashierRole.id, menu_item_id: 19, can_view: true, can_create: false, can_edit: false, can_delete: false },
      // All transaction children
      { role_id: cashierRole.id, menu_item_id: 6, can_view: true, can_create: true, can_edit: true, can_delete: false },  // Appraisal
      { role_id: cashierRole.id, menu_item_id: 7, can_view: true, can_create: true, can_edit: true, can_delete: false },  // New Loan
      { role_id: cashierRole.id, menu_item_id: 8, can_view: true, can_create: true, can_edit: true, can_delete: false },  // Additional
      { role_id: cashierRole.id, menu_item_id: 9, can_view: true, can_create: true, can_edit: true, can_delete: false },  // Partial Payment
      { role_id: cashierRole.id, menu_item_id: 10, can_view: true, can_create: true, can_edit: true, can_delete: false }, // Redeem
      { role_id: cashierRole.id, menu_item_id: 11, can_view: true, can_create: true, can_edit: true, can_delete: false }, // Renew
      { role_id: cashierRole.id, menu_item_id: 12, can_view: true, can_create: true, can_edit: true, can_delete: false }  // Auction
    ];
    
    await knex('role_menu_permissions').insert(cashierPermissions);
    console.log('✅ Assigned Cashier permissions');
  }

  // ========================================
  // AUCTIONEER ROLE PERMISSIONS
  // ========================================
  const auctioneerRole = await knex('roles').where('name', 'auctioneer').first();
  if (auctioneerRole) {
    console.log(`📋 Assigning permissions for Auctioneer role (ID: ${auctioneerRole.id})`);
    
    const auctioneerPermissions = [
      // Transactions parent (view only)
      { role_id: auctioneerRole.id, menu_item_id: 19, can_view: true, can_create: false, can_edit: false, can_delete: false },
      // Auction only
      { role_id: auctioneerRole.id, menu_item_id: 12, can_view: true, can_create: true, can_edit: true, can_delete: false }
    ];
    
    await knex('role_menu_permissions').insert(auctioneerPermissions);
    console.log('✅ Assigned Auctioneer permissions');
  }

  // ========================================
  // APPRAISER ROLE PERMISSIONS
  // ========================================
  const appraiserRole = await knex('roles').where('name', 'appraiser').first();
  if (appraiserRole) {
    console.log(`📋 Assigning permissions for Appraiser role (ID: ${appraiserRole.id})`);
    
    const appraiserPermissions = [
      // Transactions parent (view only)
      { role_id: appraiserRole.id, menu_item_id: 19, can_view: true, can_create: false, can_edit: false, can_delete: false },
      // Appraisal only
      { role_id: appraiserRole.id, menu_item_id: 6, can_view: true, can_create: true, can_edit: true, can_delete: false }
    ];
    
    await knex('role_menu_permissions').insert(appraiserPermissions);
    console.log('✅ Assigned Appraiser permissions');
  }

  console.log('');
  console.log('📊 Menu Structure Created:');
  console.log('   📁 Management (parent)');
  console.log('      ├─ 👥 User');
  console.log('      ├─ 🧑‍🤝‍🧑 Pawner');
  console.log('      ├─ 🏠 Address');
  console.log('      ├─ 📦 Item');
  console.log('      ├─ 🎟️ Vouchers');
  console.log('      └─ 📋 Transactions');
  console.log('   💰 Transactions (parent)');
  console.log('      ├─ 💎 Appraisal');
  console.log('      ├─ ➕ New Loan');
  console.log('      ├─ 💵 Additional');
  console.log('      ├─ 💳 Partial Payment');
  console.log('      ├─ 🎁 Redeem');
  console.log('      ├─ 🔄 Renew');
  console.log('      └─ 🔨 Auction');
  console.log('   📈 Reports (standalone)');
  console.log('   🔐 RBAC (standalone)');
  console.log('   ⚙️  Menu Config (standalone)');
  console.log('   ⚙️  Settings (standalone)');
  console.log('');
  console.log('✅ Role Permissions Summary:');
  console.log('   👑 Administrator: All menus (full access)');
  console.log('   👨‍💼 Manager: Item, Vouchers, Transactions management');
  console.log('   💵 Cashier: All transaction types');
  console.log('   🔨 Auctioneer: Auction only');
  console.log('   💎 Appraiser: Appraisal only');
  console.log('');
  console.log('✅ Menu items seeding completed successfully!');
};
