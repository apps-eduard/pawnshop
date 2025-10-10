/**
 * Update RBAC system with complete menu structure
 * Adds all missing menus for transaction types, management sections, etc.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Get existing menu items to avoid duplicates
  const existingMenus = await knex('menu_items').select('name', 'route');
  const existingRoutes = existingMenus.map(m => m.route);

  // Define all menus that should exist
  const menusToAdd = [];

  // Transaction submenus
  const transactionSubmenus = [
    { name: 'Appraisal', route: '/transactions/appraisal', icon: '💎', order_index: 21 },
    { name: 'New Loan', route: '/transactions/new-loan', icon: '💰', order_index: 22 },
    { name: 'Additional Loan', route: '/transactions/additional-loan', icon: '➕', order_index: 23 },
    { name: 'Partial Payment', route: '/transactions/partial-payment', icon: '💵', order_index: 24 },
    { name: 'Redeem', route: '/transactions/redeem', icon: '🎁', order_index: 25 },
    { name: 'Renew', route: '/transactions/renew', icon: '🔄', order_index: 26 },
    { name: 'Auction Items', route: '/transactions/auction-items', icon: '🔨', order_index: 27 }
  ];

  for (const menu of transactionSubmenus) {
    if (!existingRoutes.includes(menu.route)) {
      menusToAdd.push(menu);
    }
  }

  // Management submenus
  const managementSubmenus = [
    { name: 'Address Management', route: '/management/address', icon: '🏠', order_index: 31 },
    { name: 'User Management', route: '/management/user', icon: '👥', order_index: 32 }
  ];

  for (const menu of managementSubmenus) {
    if (!existingRoutes.includes(menu.route)) {
      menusToAdd.push(menu);
    }
  }

  // Insert new menus
  if (menusToAdd.length > 0) {
    await knex('menu_items').insert(menusToAdd);
    console.log(`✅ Added ${menusToAdd.length} new menu items`);
  }

  // Get all roles and menus
  const roles = await knex('roles').select('id', 'name');
  const allMenus = await knex('menu_items').select('id', 'name', 'route');

  // Enhanced role-menu mappings with all routes
  const roleMenuRoutes = {
    'administrator': [
      '/dashboard',
      '/transactions',
      '/transactions/appraisal',
      '/transactions/new-loan',
      '/transactions/additional-loan',
      '/transactions/partial-payment',
      '/transactions/redeem',
      '/transactions/renew',
      '/transactions/auction-items',
      '/management/pawner',
      '/management/item',
      '/management/address',
      '/management/user',
      '/reports',
      '/settings/admin',
      '/rbac'
    ],
    'manager': [
      '/dashboard',
      '/transactions',
      '/transactions/appraisal',
      '/transactions/new-loan',
      '/transactions/additional-loan',
      '/transactions/partial-payment',
      '/transactions/redeem',
      '/transactions/renew',
      '/transactions/auction-items',
      '/management/pawner',
      '/management/item',
      '/reports'
    ],
    'cashier': [
      '/dashboard',
      '/transactions/new-loan',
      '/transactions/additional-loan',
      '/transactions/partial-payment',
      '/transactions/redeem',
      '/transactions/renew',
      '/management/pawner'
    ],
    'appraiser': [
      '/dashboard',
      '/transactions/appraisal',
      '/reports'
    ],
    'auctioneer': [
      '/dashboard',
      '/transactions/auction-items',
      '/reports'
    ],
    'pawner': [
      '/dashboard'
    ]
  };

  // Assign new menu permissions
  for (const role of roles) {
    const allowedRoutes = roleMenuRoutes[role.name] || [];
    
    for (const route of allowedRoutes) {
      const menu = allMenus.find(m => m.route === route);
      if (menu) {
        // Check if permission already exists
        const existingPerm = await knex('role_menu_permissions')
          .where({ role_id: role.id, menu_item_id: menu.id })
          .first();

        if (!existingPerm) {
          await knex('role_menu_permissions').insert({
            role_id: role.id,
            menu_item_id: menu.id,
            can_view: true,
            can_create: ['administrator', 'manager'].includes(role.name),
            can_edit: ['administrator', 'manager'].includes(role.name),
            can_delete: role.name === 'administrator'
          });
        }
      }
    }
  }

  console.log('✅ RBAC menus updated successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove added menus (keep original ones)
  const routesToRemove = [
    '/transactions/appraisal',
    '/transactions/new-loan',
    '/transactions/additional-loan',
    '/transactions/partial-payment',
    '/transactions/redeem',
    '/transactions/renew',
    '/transactions/auction-items',
    '/management/address',
    '/management/user'
  ];

  await knex('menu_items').whereIn('route', routesToRemove).del();
  console.log('✅ Rolled back menu additions');
};
