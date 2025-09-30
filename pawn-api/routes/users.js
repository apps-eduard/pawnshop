const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Middleware to check admin role for user management
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
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
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
             u.is_active, u.created_at,
             e.position, e.contact_number, e.city_id, e.barangay_id, e.address,
             b.name as branch_name,
             c.name as city_name, br.name as barangay_name
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN barangays br ON e.barangay_id = br.id
      ORDER BY u.created_at DESC
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      position: row.position,
      contactNumber: row.contact_number,
      cityId: row.city_id,
      barangayId: row.barangay_id,
      address: row.address,
      branchName: row.branch_name,
      cityName: row.city_name,
      barangayName: row.barangay_name,
      createdAt: row.created_at
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

// Get user by ID (Admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 [${new Date().toISOString()}] Admin fetching user ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
             u.is_active, u.created_at,
             e.position, e.contact_number, e.city_id, e.barangay_id, e.address,
             b.name as branch_name,
             c.name as city_name, br.name as barangay_name
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN barangays br ON e.barangay_id = br.id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const row = result.rows[0];
    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      position: row.position,
      contactNumber: row.contact_number,
      cityId: row.city_id,
      barangayId: row.barangay_id,
      address: row.address,
      branchName: row.branch_name,
      cityName: row.city_name,
      barangayName: row.barangay_name,
      createdAt: row.created_at
    };
    
    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
    
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// Create new user (Admin only)
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
      cityId,
      barangayId,
      address,
      isActive = true
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Admin creating user: ${username} - Admin: ${req.user.username}`);
    
    // Validate required fields
    if (!username || !email || !firstName || !lastName || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'cashier', 'appraiser', 'auctioneer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    await client.query('BEGIN');
    
    // Check if username or email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const userResult = await client.query(`
      INSERT INTO users (username, email, first_name, last_name, role, password_hash, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, first_name, last_name, role, is_active, created_at
    `, [username, email, firstName, lastName, role, hashedPassword, isActive]);
    
    const newUser = userResult.rows[0];
    
    // Create employee record if additional info provided
    if (position || contactNumber || address || cityId || barangayId) {
      await client.query(`
        INSERT INTO employees (user_id, position, contact_number, city_id, barangay_id, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [newUser.id, position, contactNumber, cityId, barangayId, address]);
    }
    
    await client.query('COMMIT');
    
    // Return user data (without password)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      isActive: newUser.is_active,
      position: position,
      contactNumber: contactNumber,
      cityId: cityId,
      barangayId: barangayId,
      address: address,
      createdAt: newUser.created_at
    };
    
    console.log(`✅ User created successfully: ${username} (ID: ${newUser.id})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userData
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  } finally {
    client.release();
  }
});

// Update user (Admin only)
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
      cityId,
      barangayId,
      address,
      isActive
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Admin updating user ${id} - Admin: ${req.user.username}`);
    
    await client.query('BEGIN');
    
    // Check if user exists
    const existingUser = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check for username/email conflicts (excluding current user)
    if (username || email) {
      const conflicts = await client.query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
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
    
    // Build dynamic update query for users table
    const userFields = [];
    const userValues = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      userFields.push(`username = $${paramCount++}`);
      userValues.push(username);
    }
    if (email !== undefined) {
      userFields.push(`email = $${paramCount++}`);
      userValues.push(email);
    }
    if (firstName !== undefined) {
      userFields.push(`first_name = $${paramCount++}`);
      userValues.push(firstName);
    }
    if (lastName !== undefined) {
      userFields.push(`last_name = $${paramCount++}`);
      userValues.push(lastName);
    }
    if (role !== undefined) {
      userFields.push(`role = $${paramCount++}`);
      userValues.push(role);
    }
    if (isActive !== undefined) {
      userFields.push(`is_active = $${paramCount++}`);
      userValues.push(isActive);
    }
    
    // Update users table if there are fields to update
    if (userFields.length > 0) {
      userValues.push(id);
      const userQuery = `UPDATE users SET ${userFields.join(', ')} WHERE id = $${paramCount}`;
      await client.query(userQuery, userValues);
    }
    
    // Update or insert employee record
    const employeeCheck = await client.query('SELECT user_id FROM employees WHERE user_id = $1', [id]);
    
    if (employeeCheck.rows.length > 0) {
      // Update existing employee record
      const empFields = [];
      const empValues = [];
      let empParamCount = 1;
      
      if (position !== undefined) {
        empFields.push(`position = $${empParamCount++}`);
        empValues.push(position);
      }
      if (contactNumber !== undefined) {
        empFields.push(`contact_number = $${empParamCount++}`);
        empValues.push(contactNumber);
      }
      if (cityId !== undefined) {
        empFields.push(`city_id = $${empParamCount++}`);
        empValues.push(cityId);
      }
      if (barangayId !== undefined) {
        empFields.push(`barangay_id = $${empParamCount++}`);
        empValues.push(barangayId);
      }
      if (address !== undefined) {
        empFields.push(`address = $${empParamCount++}`);
        empValues.push(address);
      }
      
      if (empFields.length > 0) {
        empValues.push(id);
        const empQuery = `UPDATE employees SET ${empFields.join(', ')} WHERE user_id = $${empParamCount}`;
        await client.query(empQuery, empValues);
      }
    } else {
      // Create new employee record if any employee data provided
      if (position || contactNumber || cityId || barangayId || address) {
        await client.query(`
          INSERT INTO employees (user_id, position, contact_number, city_id, barangay_id, address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, position, contactNumber, cityId, barangayId, address]);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ User updated successfully: ${id}`);
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  } finally {
    client.release();
  }
});

// Delete user (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Admin deleting user ${id} - Admin: ${req.user.username}`);
    
    // Check if user exists
    const existingUser = await client.query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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
    
    // Delete employee record first (if exists)
    await client.query('DELETE FROM employees WHERE user_id = $1', [id]);
    
    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ User deleted successfully: ${existingUser.rows[0].username} (ID: ${id})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  } finally {
    client.release();
  }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔑 [${new Date().toISOString()}] Admin resetting password for user ${id} - Admin: ${req.user.username}`);
    
    // Check if user exists
    const existingUser = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new password (username + 123)
    const newPassword = existingUser.rows[0].username + '123';
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
    
    console.log(`✅ Password reset for user: ${existingUser.rows[0].username}`);
    
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

// Change user password (Users can change their own, Admins can change any)
router.post('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    // Users can only change their own password unless they're admin
    if (parseInt(id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    console.log(`🔐 [${new Date().toISOString()}] Password change request for user ${id} - User: ${req.user.username}`);
    
    // Get current password hash
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify old password (skip for admins changing other users' passwords)
    if (parseInt(id) === req.user.id) {
      const isValidPassword = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
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
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
    
    console.log(`✅ Password changed successfully for user ${id}`);
    
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