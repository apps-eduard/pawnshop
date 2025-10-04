const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Middleware to check admin role for user management
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }
  next();
};

// =============================================
// USER MANAGEMENT ENDPOINTS
// =============================================

// Get all users (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    console.log(`👥 [${new Date().toISOString()}] Admin fetching all users - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT e.id, e.user_id, e.username, e.email, e.first_name, e.last_name, e.role, 
             e.is_active, e.created_at, e.updated_at,
             e.position, e.contact_number, e.address,
             b.name as branch_name,
             last_login.created_at as last_login_at,
             last_login.ip_address as last_login_ip
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) user_id, created_at, ip_address
        FROM audit_logs 
        WHERE action = 'LOGIN_SUCCESS'
        ORDER BY user_id, created_at DESC
      ) last_login ON e.id = last_login.user_id
      ORDER BY e.created_at DESC
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      position: row.position,
      contactNumber: row.contact_number,
      address: row.address,
      branchName: row.branch_name,
      lastLogin: row.last_login_at,
      lastLoginIp: row.last_login_ip,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    console.log(`✅ Found ${users.length} users`);
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Get employee by ID (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 [${new Date().toISOString()}] Admin fetching employee ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT e.id, e.user_id, e.username, e.email, e.first_name, e.last_name, e.role, 
             e.is_active, e.created_at, e.updated_at,
             e.position, e.contact_number, e.address,
             b.name as branch_name
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const row = result.rows[0];
    const employee = {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      position: row.position,
      contactNumber: row.contact_number,
      address: row.address,
      branchName: row.branch_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });
    
  } catch (error) {
    console.error('❌ Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee'
    });
  }
});

// Create new employee (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      role,
      password,
      position,
      contactNumber,
      address,
      branchId = 1, // Default to branch 1
      isActive = true
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Admin creating employee: ${username} - Admin: ${req.user.username}`);
    
    // Validate required fields
    if (!username || !email || !firstName || !lastName || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate role
    const validRoles = ['administrator', 'manager', 'cashier', 'appraiser', 'auctioneer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    await client.query('BEGIN');
    
    // Check if username or email already exists
    const existingEmployee = await client.query(
      'SELECT id FROM employees WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingEmployee.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create employee (single table approach)
    const employeeResult = await client.query(`
      INSERT INTO employees (username, email, first_name, last_name, role, password_hash, position, contact_number, address, branch_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, user_id, username, email, first_name, last_name, role, position, contact_number, address, branch_id, is_active, created_at
    `, [username, email, firstName, lastName, role, hashedPassword, position, contactNumber, address, branchId, isActive]);
    
    const newEmployee = employeeResult.rows[0];
    
    await client.query('COMMIT');
    
    // Return employee data (without password)
    const employeeData = {
      id: newEmployee.id,
      userId: newEmployee.user_id,
      username: newEmployee.username,
      email: newEmployee.email,
      firstName: newEmployee.first_name,
      lastName: newEmployee.last_name,
      role: newEmployee.role,
      isActive: newEmployee.is_active,
      position: newEmployee.position,
      contactNumber: newEmployee.contact_number,
      address: newEmployee.address,
      branchId: newEmployee.branch_id,
      createdAt: newEmployee.created_at
    };
    
    console.log(`✅ Employee created successfully: ${username} (ID: ${newEmployee.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employeeData
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating employee'
    });
  } finally {
    client.release();
  }
});

// Update employee (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      username,
      email,
      firstName,
      lastName,
      role,
      position,
      contactNumber,
      address,
      branchId,
      isActive
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Admin updating employee ${id} - Admin: ${req.user.username}`);
    
    await client.query('BEGIN');
    
    // Check if employee exists
    const existingEmployee = await client.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (existingEmployee.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check for username/email conflicts (excluding current employee)
    if (username || email) {
      const conflicts = await client.query(
        'SELECT id FROM employees WHERE (username = $1 OR email = $2) AND id != $3',
        [username, email, id]
      );
      
      if (conflicts.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
    }
    
    // Build dynamic update query for employees table
    const employeeFields = [];
    const employeeValues = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      employeeFields.push(`username = $${paramCount++}`);
      employeeValues.push(username);
    }
    if (email !== undefined) {
      employeeFields.push(`email = $${paramCount++}`);
      employeeValues.push(email);
    }
    if (firstName !== undefined) {
      employeeFields.push(`first_name = $${paramCount++}`);
      employeeValues.push(firstName);
    }
    if (lastName !== undefined) {
      employeeFields.push(`last_name = $${paramCount++}`);
      employeeValues.push(lastName);
    }
    if (role !== undefined) {
      employeeFields.push(`role = $${paramCount++}`);
      employeeValues.push(role);
    }
    if (position !== undefined) {
      employeeFields.push(`position = $${paramCount++}`);
      employeeValues.push(position);
    }
    if (contactNumber !== undefined) {
      employeeFields.push(`contact_number = $${paramCount++}`);
      employeeValues.push(contactNumber);
    }
    if (address !== undefined) {
      employeeFields.push(`address = $${paramCount++}`);
      employeeValues.push(address);
    }
    if (branchId !== undefined) {
      employeeFields.push(`branch_id = $${paramCount++}`);
      employeeValues.push(branchId);
    }
    if (isActive !== undefined) {
      employeeFields.push(`is_active = $${paramCount++}`);
      employeeValues.push(isActive);
    }
    
    // Update employees table if there are fields to update
    if (employeeFields.length > 0) {
      employeeValues.push(id);
      const employeeQuery = `UPDATE employees SET ${employeeFields.join(', ')} WHERE id = $${paramCount}`;
      await client.query(employeeQuery, employeeValues);
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Employee updated successfully: ${id}`);
    
    res.json({
      success: true,
      message: 'Employee updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee'
    });
  } finally {
    client.release();
  }
});

// Delete employee (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Admin deleting employee ${id} - Admin: ${req.user.username}`);
    
    // Check if employee exists
    const existingEmployee = await client.query('SELECT username FROM employees WHERE id = $1', [id]);
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    await client.query('BEGIN');
    
    // Delete employee
    await client.query('DELETE FROM employees WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Employee deleted successfully: ${existingEmployee.rows[0].username} (ID: ${id})`);
    
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee'
    });
  } finally {
    client.release();
  }
});

// Reset employee password (Admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔑 [${new Date().toISOString()}] Admin resetting password for employee ${id} - Admin: ${req.user.username}`);
    
    // Check if employee exists
    const existingEmployee = await pool.query('SELECT username FROM employees WHERE id = $1', [id]);
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Generate new password (username + 123)
    const newPassword = existingEmployee.rows[0].username + '123';
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    await pool.query('UPDATE employees SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
    
    console.log(`✅ Password reset for employee: ${existingEmployee.rows[0].username}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        newPassword: newPassword // Return temporary password
      }
    });
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Change employee password (Employees can change their own, Admins can change any)
router.post('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    // Employees can only change their own password unless they're admin
    if (parseInt(id) !== req.user.id && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    console.log(`🔐 [${new Date().toISOString()}] Password change request for employee ${id} - User: ${req.user.username}`);
    
    // Get current password hash
    const employeeResult = await pool.query('SELECT password_hash FROM employees WHERE id = $1', [id]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Verify old password (skip for admins changing other employees' passwords)
    if (parseInt(id) === req.user.id) {
      const isValidPassword = await bcrypt.compare(oldPassword, employeeResult.rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.query('UPDATE employees SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
    
    console.log(`✅ Password changed successfully for employee ${id}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

module.exports = router;