const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/rbac/roles
 * Get all roles with their permissions
 */
router.get('/roles', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        role,
        COUNT(*) as user_count,
        json_agg(DISTINCT username) as users
      FROM employees
      WHERE is_active = true
      GROUP BY role
      ORDER BY role
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/users
 * Get all users with their roles
 */
router.get('/users', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        branch_id,
        is_active,
        created_at
      FROM employees
      ORDER BY role, username
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['admin', 'administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const query = `
      UPDATE employees
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, role
    `;
    
    const result = await pool.query(query, [role, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac/users/:id/status
 * Activate/Deactivate user
 */
router.put('/users/:id/status', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const query = `
      UPDATE employees
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, is_active
    `;
    
    const result = await pool.query(query, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/permissions
 * Get role-based menu permissions
 */
router.get('/permissions', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    // Define default permissions for each role
    const permissions = {
      admin: {
        sidebar: ['dashboard', 'new-loan', 'transactions', 'renew', 'redeem', 'partial-payment', 'additional-loan', 
                  'items', 'customers', 'auction', 'reports', 'voucher', 'settings', 'rbac'],
        features: ['all']
      },
      administrator: {
        sidebar: ['dashboard', 'new-loan', 'transactions', 'renew', 'redeem', 'partial-payment', 'additional-loan', 
                  'items', 'customers', 'auction', 'reports', 'voucher', 'settings', 'rbac'],
        features: ['all']
      },
      manager: {
        sidebar: ['dashboard', 'new-loan', 'transactions', 'renew', 'redeem', 'partial-payment', 'additional-loan',
                  'items', 'customers', 'auction', 'reports', 'voucher', 'rbac'],
        features: ['view_reports', 'manage_transactions', 'view_items', 'manage_customers', 'manage_auction']
      },
      cashier: {
        sidebar: ['dashboard', 'new-loan', 'transactions', 'renew', 'redeem', 'partial-payment', 'additional-loan', 
                  'customers', 'voucher'],
        features: ['manage_transactions', 'view_customers', 'create_voucher']
      },
      auctioneer: {
        sidebar: ['dashboard', 'items', 'auction'],
        features: ['view_items', 'manage_auction']
      },
      appraiser: {
        sidebar: ['dashboard', 'new-loan', 'items'],
        features: ['appraise_items', 'view_items']
      },
      pawner: {
        sidebar: ['dashboard', 'my-loans'],
        features: ['view_own_loans']
      }
    };

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac/menu-items
 * Get all available menu items
 */
router.get('/menu-items', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const menuItems = [
      { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', description: 'Main dashboard view' },
      { id: 'new-loan', name: 'New Loan', icon: 'add', description: 'Create new loan transaction' },
      { id: 'transactions', name: 'Transactions', icon: 'list', description: 'View all transactions' },
      { id: 'renew', name: 'Renew', icon: 'refresh', description: 'Renew existing loans' },
      { id: 'redeem', name: 'Redeem', icon: 'check', description: 'Redeem pawned items' },
      { id: 'partial-payment', name: 'Partial Payment', icon: 'payment', description: 'Make partial payments' },
      { id: 'additional-loan', name: 'Additional Loan', icon: 'add_circle', description: 'Additional loan on existing items' },
      { id: 'items', name: 'Items', icon: 'inventory', description: 'Manage pawned items' },
      { id: 'customers', name: 'Customers', icon: 'people', description: 'Manage customer information' },
      { id: 'auction', name: 'Auction', icon: 'gavel', description: 'Manage auction items' },
      { id: 'reports', name: 'Reports', icon: 'assessment', description: 'View business reports' },
      { id: 'voucher', name: 'Voucher', icon: 'receipt', description: 'Manage vouchers' },
      { id: 'settings', name: 'Settings', icon: 'settings', description: 'System settings' },
      { id: 'rbac', name: 'User Management', icon: 'admin_panel_settings', description: 'Role-based access control' },
      { id: 'my-loans', name: 'My Loans', icon: 'account_balance', description: 'View personal loans (Pawner only)' }
    ];

    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: error.message
    });
  }
});

module.exports = router;
