const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  console.log(`🔐 [${new Date().toISOString()}] AUTH MIDDLEWARE:`, {
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers['authorization'] ? `${req.headers['authorization'].substring(0, 30)}...` : 'MISSING',
      'content-type': req.headers['content-type']
    },
    ip: req.ip || req.connection.remoteAddress
  });

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log(`❌ [${new Date().toISOString()}] No token provided`);
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  console.log(`🔑 [${new Date().toISOString()}] Token received: ${token.substring(0, 20)}...`);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ [${new Date().toISOString()}] Token decoded successfully:`, { 
      userId: decoded.userId, 
      exp: new Date(decoded.exp * 1000).toISOString() 
    });
    
    // Verify user still exists and is active
    const userQuery = `
      SELECT id, username, email, first_name, last_name, role, branch_id, is_active 
      FROM employees 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query(userQuery, [decoded.userId]);
    console.log(`👤 [${new Date().toISOString()}] User lookup result:`, { 
      found: result.rows.length > 0, 
      user: result.rows[0] ? { id: result.rows[0].id, username: result.rows[0].username, role: result.rows[0].role } : null 
    });
    
    if (result.rows.length === 0) {
      console.log(`❌ [${new Date().toISOString()}] User not found or inactive for ID: ${decoded.userId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found or inactive'
      });
    }

    req.user = result.rows[0];
    console.log(`🎉 [${new Date().toISOString()}] Authentication successful for user: ${req.user.username} (${req.user.role})`);
    next();
  } catch (error) {
    console.log(`❌ [${new Date().toISOString()}] Authentication error:`, {
      name: error.name,
      message: error.message,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });

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