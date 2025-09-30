const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const userQuery = `
      SELECT id, username, email, first_name, last_name, role, branch_id, is_active 
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query(userQuery, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found or inactive'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

const checkBranchAccess = (req, res, next) => {
  // Admin can access all branches
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Other users can only access their own branch data
  const branchId = req.params.branchId || req.body.branchId || req.query.branchId;
  
  if (branchId && branchId !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Branch access denied'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkBranchAccess
};