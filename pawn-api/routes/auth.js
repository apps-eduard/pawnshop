const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const startTime = Date.now();
  console.log(`🔐 [${new Date().toISOString()}] Login attempt for username: ${req.body.username}`);
  console.log(`📡 Request from IP: ${req.ip || req.connection.remoteAddress}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`❌ Validation failed for ${req.body.username}:`, errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    console.log(`🔍 Looking up user in database: ${username}`);

    // Find user by username or email
    const userQuery = `
      SELECT u.*, b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE (u.username = $1 OR u.email = $1) AND u.is_active = true
    `;
    
    const result = await pool.query(userQuery, [username]);
    console.log(`📊 Database query completed. Found ${result.rows.length} user(s)`);
    
    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    console.log(`👤 User found: ${user.username} (${user.role}) - Branch: ${user.branch_name || 'N/A'}`);

    // Verify password
    console.log(`🔒 Verifying password for user: ${username}`);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`🔑 Password verification result: ${isValidPassword ? 'SUCCESS' : 'FAILED'}`);
    
    if (!isValidPassword) {
      console.log(`❌ Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`✅ Authentication successful for: ${username}`);
    console.log(`🎫 Generating JWT tokens for user ID: ${user.id}`);
    
    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        branchId: user.branch_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    
    console.log(`🔄 Tokens generated successfully for: ${username}`);

    // Update last login
    await pool.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Remove sensitive data
    delete user.password_hash;
    
    const responseTime = Date.now() - startTime;
    console.log(`🎉 Login successful for: ${username} (${user.role})`);
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📤 Sending user data and tokens to client`);
    console.log('─'.repeat(60));

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          branchId: user.branch_id,
          branchName: user.branch_name,
          position: user.position,
          contactNumber: user.contact_number,
          address: user.address
        },
        token: accessToken,
        refreshToken: refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user data
    const userQuery = `
      SELECT id, username, role, branch_id, is_active 
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(userQuery, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = result.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        branchId: user.branch_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        token: newAccessToken
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }
    
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// Logout endpoint (optional - mainly for client-side token cleanup)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
             u.branch_id, u.created_at, u.last_login,
             e.position, e.contact_number, e.address,
             b.name as branch_name
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(userQuery, [req.user.id]);
    
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
        lastName: user.last_name,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name,
        position: user.position,
        contactNumber: user.contact_number,
        address: user.address,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

module.exports = router;