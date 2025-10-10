const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// MENU ITEMS ENDPOINTS
// ============================================

/**
 * GET /api/rbac-v2/menus
 * Get all menu items
 */
router.get('/menus', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, route, icon, parent_id, 
        order_index, is_active, description,
        created_at, updated_at
      FROM menu_items
      ORDER BY order_index, name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac-v2/menus/user/:userId
 * Get menus accessible by a specific user (based on their roles)
 */
router.get('/menus/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT DISTINCT
        m.id, m.name, m.route, m.icon, m.parent_id,
        m.order_index, m.description
      FROM menu_items m
      INNER JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id
      INNER JOIN employee_roles er ON rmp.role_id = er.role_id
      WHERE er.employee_id = $1
        AND m.is_active = true
        AND rmp.can_view = true
      ORDER BY m.order_index, m.name
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching user menus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user menus',
      error: error.message
    });
  }
});

/**
 * POST /api/rbac-v2/menus
 * Create new menu item
 */
router.post('/menus', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { name, route, icon, parent_id, order_index, description } = req.body;
    
    const query = `
      INSERT INTO menu_items (name, route, icon, parent_id, order_index, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, route, icon, parent_id, order_index, description]);
    
    res.json({
      success: true,
      message: 'Menu item created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac-v2/menus/:id
 * Update menu item
 */
router.put('/menus/:id', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, route, icon, parent_id, order_index, is_active, description } = req.body;
    
    const query = `
      UPDATE menu_items
      SET name = $1, route = $2, icon = $3, parent_id = $4,
          order_index = $5, is_active = $6, description = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, route, icon, parent_id, order_index, is_active, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item',
      error: error.message
    });
  }
});

/**
 * DELETE /api/rbac-v2/menus/:id
 * Delete menu item
 */
router.delete('/menus/:id', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item',
      error: error.message
    });
  }
});

// ============================================
// ROLES ENDPOINTS
// ============================================

/**
 * GET /api/rbac-v2/roles
 * Get all roles with user counts
 */
router.get('/roles', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.name, r.display_name, r.description, r.is_system_role,
        COUNT(DISTINCT er.employee_id) as user_count,
        json_agg(DISTINCT e.username) FILTER (WHERE e.username IS NOT NULL) as users
      FROM roles r
      LEFT JOIN employee_roles er ON r.id = er.role_id
      LEFT JOIN employees e ON er.employee_id = e.id
      GROUP BY r.id
      ORDER BY r.display_name
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
 * POST /api/rbac-v2/roles
 * Create new role
 */
router.post('/roles', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { name, display_name, description } = req.body;
    
    const query = `
      INSERT INTO roles (name, display_name, description, is_system_role)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, display_name, description]);
    
    res.json({
      success: true,
      message: 'Role created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac-v2/roles/:id
 * Update role
 */
router.put('/roles/:id', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, description } = req.body;
    
    const query = `
      UPDATE roles
      SET display_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_system_role = false
      RETURNING *
    `;
    
    const result = await pool.query(query, [display_name, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found or is a system role'
      });
    }
    
    res.json({
      success: true,
      message: 'Role updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
});

/**
 * DELETE /api/rbac-v2/roles/:id
 * Delete role (only non-system roles)
 */
router.delete('/roles/:id', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM roles WHERE id = $1 AND is_system_role = false RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found or is a system role'
      });
    }
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
});

// ============================================
// ROLE-MENU PERMISSIONS ENDPOINTS
// ============================================

/**
 * GET /api/rbac-v2/permissions/role/:roleId
 * Get all menu permissions for a specific role
 */
router.get('/permissions/role/:roleId', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const { roleId } = req.params;
    
    const query = `
      SELECT 
        m.id as menu_id, m.name as menu_name, m.route,
        rmp.can_view, rmp.can_create, rmp.can_edit, rmp.can_delete
      FROM menu_items m
      LEFT JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id AND rmp.role_id = $1
      WHERE m.is_active = true
      ORDER BY m.order_index, m.name
    `;
    
    const result = await pool.query(query, [roleId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role permissions',
      error: error.message
    });
  }
});

/**
 * GET /api/rbac-v2/permissions/matrix
 * Get full permission matrix (all roles × all menus)
 */
router.get('/permissions/matrix', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    // Get all roles
    const rolesResult = await pool.query(`
      SELECT id, name, display_name, description, is_system_role, created_at
      FROM roles
      ORDER BY display_name
    `);

    // Get all active menus
    const menusResult = await pool.query(`
      SELECT id, name, route, icon, parent_id, order_index, is_active
      FROM menu_items
      WHERE is_active = true
      ORDER BY order_index, name
    `);

    // Get all permissions
    const permissionsQuery = `
      SELECT 
        r.id as role_id,
        m.id as menu_item_id,
        COALESCE(rmp.can_view, false) as can_view,
        COALESCE(rmp.can_create, false) as can_create,
        COALESCE(rmp.can_edit, false) as can_edit,
        COALESCE(rmp.can_delete, false) as can_delete
      FROM roles r
      CROSS JOIN menu_items m
      LEFT JOIN role_menu_permissions rmp ON r.id = rmp.role_id AND m.id = rmp.menu_item_id
      WHERE m.is_active = true
      ORDER BY r.display_name, m.order_index
    `;
    
    const permissionsResult = await pool.query(permissionsQuery);
    
    res.json({
      success: true,
      data: {
        roles: rolesResult.rows,
        menus: menusResult.rows,
        permissions: permissionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching permission matrix:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permission matrix',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac-v2/permissions
 * Update role-menu permissions
 */
router.put('/permissions', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { role_id, menu_item_id, can_view, can_create, can_edit, can_delete } = req.body;
    
    console.log('📝 Updating permission:', { role_id, menu_item_id, can_view, can_create, can_edit, can_delete });
    
    const query = `
      INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (role_id, menu_item_id)
      DO UPDATE SET
        can_view = $3,
        can_create = $4,
        can_edit = $5,
        can_delete = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await pool.query(query, [role_id, menu_item_id, can_view, can_create, can_edit, can_delete]);
    
    console.log('✅ Permission updated successfully:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions',
      error: error.message
    });
  }
});

/**
 * DELETE /api/rbac-v2/permissions
 * Remove permission (deny access)
 */
router.delete('/permissions', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { role_id, menu_id } = req.body;
    
    const result = await pool.query(
      'DELETE FROM role_menu_permissions WHERE role_id = $1 AND menu_item_id = $2 RETURNING *',
      [role_id, menu_id]
    );
    
    res.json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    console.error('Error removing permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove permission',
      error: error.message
    });
  }
});

// ============================================
// USER-ROLE ASSIGNMENTS ENDPOINTS
// ============================================

/**
 * GET /api/rbac-v2/users
 * Get all users with their roles
 */
router.get('/users', authorizeRoles('admin', 'administrator', 'manager'), async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id, e.username, e.email, e.first_name, e.last_name,
        e.branch_id, e.is_active, e.created_at,
        json_agg(
          json_build_object(
            'role_id', r.id,
            'role_name', r.name,
            'role_display_name', r.display_name,
            'is_primary', er.is_primary
          ) ORDER BY er.is_primary DESC, r.display_name
        ) FILTER (WHERE r.id IS NOT NULL) as roles
      FROM employees e
      LEFT JOIN employee_roles er ON e.id = er.employee_id
      LEFT JOIN roles r ON er.role_id = r.id
      GROUP BY e.id
      ORDER BY e.username
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
 * POST /api/rbac-v2/users/:userId/roles
 * Assign role(s) to user
 */
router.post('/users/:userId/roles', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_ids, primary_role_id } = req.body; // role_ids is array
    const assignedBy = req.user.userId;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Remove existing roles if replacing
      if (req.body.replace) {
        await client.query('DELETE FROM employee_roles WHERE employee_id = $1', [userId]);
      }
      
      // Insert new roles
      for (const roleId of role_ids) {
        const isPrimary = roleId === primary_role_id;
        
        await client.query(`
          INSERT INTO employee_roles (employee_id, role_id, is_primary, assigned_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (employee_id, role_id) 
          DO UPDATE SET is_primary = $3, assigned_at = CURRENT_TIMESTAMP
        `, [userId, roleId, isPrimary, assignedBy]);
      }
      
      // Ensure only one primary role
      if (primary_role_id) {
        await client.query(`
          UPDATE employee_roles
          SET is_primary = false
          WHERE employee_id = $1 AND role_id != $2
        `, [userId, primary_role_id]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'User roles updated successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign roles',
      error: error.message
    });
  }
});

/**
 * DELETE /api/rbac-v2/users/:userId/roles/:roleId
 * Remove role from user
 */
router.delete('/users/:userId/roles/:roleId', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM employee_roles WHERE employee_id = $1 AND role_id = $2 RETURNING *',
      [userId, roleId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Role removed from user successfully'
    });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove role',
      error: error.message
    });
  }
});

/**
 * PUT /api/rbac-v2/users/:userId/primary-role
 * Set primary role for user
 */
router.put('/users/:userId/primary-role', authorizeRoles('admin', 'administrator'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Set all roles to non-primary
      await client.query('UPDATE employee_roles SET is_primary = false WHERE employee_id = $1', [userId]);
      
      // Set specified role as primary
      const result = await client.query(
        'UPDATE employee_roles SET is_primary = true WHERE employee_id = $1 AND role_id = $2 RETURNING *',
        [userId, role_id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'User does not have this role assigned'
        });
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Primary role updated successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error setting primary role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set primary role',
      error: error.message
    });
  }
});

module.exports = router;
