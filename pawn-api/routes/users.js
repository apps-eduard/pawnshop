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
      SELECT e.id, e.username, e.email, e.first_name, e.middle_name, e.last_name, 
             e.mobile_number, e.role, e.is_active, e.last_login,
             e.created_at, e.updated_at, e.address_id,
             b.name as branch_name,
             a.city_id, a.barangay_id, a.address_details,
             c.name as city_name,
             br.name as barangay_name,
             last_login.created_at as last_login_at,
             last_login.ip_address as last_login_ip,
             COALESCE(
               (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'displayName', r.display_name, 'isPrimary', er.is_primary) ORDER BY er.is_primary DESC, r.name)
                FROM employee_roles er
                JOIN roles r ON er.role_id = r.id
                WHERE er.employee_id = e.id),
               '[]'::json
             ) as roles
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN addresses a ON e.address_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      LEFT JOIN barangays br ON a.barangay_id = br.id
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
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      contactNumber: row.mobile_number,
      role: row.role,
      roles: row.roles,
      isActive: row.is_active,
      branchName: row.branch_name,
      addressId: row.address_id,
      cityId: row.city_id,
      barangayId: row.barangay_id,
      address: row.address_details,
      cityName: row.city_name,
      barangayName: row.barangay_name,
      lastLogin: row.last_login || row.last_login_at,
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

// Get current user profile (MUST be before /:id route)
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT e.id, e.username, e.email, e.first_name, e.middle_name, e.last_name, 
             e.mobile_number, e.role, 
             e.position, e.contact_number, e.address, e.is_active,
             e.created_at, b.name as branch_name
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        mobileNumber: user.mobile_number,
        role: user.role,
        position: user.position,
        contactNumber: user.contact_number,
        address: user.address,
        isActive: user.is_active,
        branchName: user.branch_name,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Update employee profile (Users can update their own profile)
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email,
      firstName,
      lastName,
      mobileNumber,
      contactNumber,
      address
    } = req.body;
    
    console.log(`👤 [${new Date().toISOString()}] Profile update request - User: ${req.user.username}`);
    
    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, and last name are required'
      });
    }
    
    // Check if email is already taken by another user
    const existingUser = await pool.query(
      'SELECT id FROM employees WHERE email = $1 AND id != $2',
      [email, userId]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }
    
    // Update profile
    const result = await pool.query(`
      UPDATE employees 
      SET email = $1, 
          first_name = $2, 
          last_name = $3,
          mobile_number = $4, 
          contact_number = $5, 
          address = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, username, email, first_name, last_name, role, mobile_number, contact_number, address, position, is_active
    `, [email, firstName, lastName, mobileNumber, contactNumber, address, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updatedUser = result.rows[0];
    
    console.log(`✅ Profile updated successfully for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        mobileNumber: updatedUser.mobile_number,
        contactNumber: updatedUser.contact_number,
        address: updatedUser.address,
        position: updatedUser.position,
        isActive: updatedUser.is_active
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Get employee by ID (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 [${new Date().toISOString()}] Admin fetching employee ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT e.id, e.username, e.email, e.first_name, e.middle_name, e.last_name, e.role, 
             e.mobile_number, e.is_active, e.created_at, e.updated_at,
             e.position, e.contact_number, e.address,
             b.name as branch_name,
             COALESCE(
               (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'displayName', r.display_name, 'isPrimary', er.is_primary) ORDER BY er.is_primary DESC, r.name)
                FROM employee_roles er
                JOIN roles r ON er.role_id = r.id
                WHERE er.employee_id = e.id),
               '[]'::json
             ) as roles
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
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      mobileNumber: row.mobile_number,
      role: row.role,
      roles: row.roles,
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
      username: newEmployee.username,
      email: newEmployee.email,
      firstName: newEmployee.first_name,
      middleName: newEmployee.middle_name,
      lastName: newEmployee.last_name,
      mobileNumber: newEmployee.mobile_number,
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
      cityId,
      barangayId,
      branchId,
      isActive
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Admin updating employee ${id} - Admin: ${req.user.username}`);
    
    await client.query('BEGIN');
    
    // Check if employee exists and get their current address_id
    const existingEmployee = await client.query('SELECT id, address_id FROM employees WHERE id = $1', [id]);
    if (existingEmployee.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const currentAddressId = existingEmployee.rows[0].address_id;
    
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
    
    // Handle address updates
    let addressId = currentAddressId;
    if (cityId !== undefined || barangayId !== undefined || address !== undefined) {
      if (currentAddressId) {
        // Update existing address record
        const addressFields = [];
        const addressValues = [];
        let addrParamCount = 1;
        
        if (cityId !== undefined) {
          addressFields.push(`city_id = $${addrParamCount++}`);
          addressValues.push(cityId);
        }
        if (barangayId !== undefined) {
          addressFields.push(`barangay_id = $${addrParamCount++}`);
          addressValues.push(barangayId);
        }
        if (address !== undefined) {
          addressFields.push(`address_details = $${addrParamCount++}`);
          addressValues.push(address);
        }
        
        if (addressFields.length > 0) {
          addressFields.push(`updated_at = $${addrParamCount++}`);
          addressValues.push(new Date());
          addressValues.push(currentAddressId);
          
          const addressQuery = `UPDATE addresses SET ${addressFields.join(', ')} WHERE id = $${addrParamCount}`;
          await client.query(addressQuery, addressValues);
          console.log(`✅ Updated address ${currentAddressId} for employee ${id}`);
        }
      } else {
        // Create new address record
        // Need cityId and barangayId to create address
        if (cityId && barangayId) {
          const addressResult = await client.query(
            `INSERT INTO addresses (city_id, barangay_id, address_details, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [cityId, barangayId, address || '', new Date(), new Date()]
          );
          addressId = addressResult.rows[0].id;
          console.log(`✅ Created new address ${addressId} for employee ${id}`);
        }
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
      employeeFields.push(`mobile_number = $${paramCount++}`);
      employeeValues.push(contactNumber);
    }
    if (branchId !== undefined) {
      employeeFields.push(`branch_id = $${paramCount++}`);
      employeeValues.push(branchId);
    }
    if (isActive !== undefined) {
      employeeFields.push(`is_active = $${paramCount++}`);
      employeeValues.push(isActive);
    }
    
    // Link to address if we have one (either existing or newly created)
    if (addressId && addressId !== currentAddressId) {
      employeeFields.push(`address_id = $${paramCount++}`);
      employeeValues.push(addressId);
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