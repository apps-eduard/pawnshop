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
    // Also fetch all assigned roles from employee_roles table
    const userQuery = `
      SELECT 
        e.id, e.username, e.email, e.first_name, e.last_name, 
        e.role as legacy_role, e.branch_id, e.is_active,
        COALESCE(
          json_agg(
            DISTINCT r.name ORDER BY r.name
          ) FILTER (WHERE r.name IS NOT NULL),
          '[]'
        ) as roles,
        (
          SELECT r2.name 
          FROM employee_roles er2
          JOIN roles r2 ON er2.role_id = r2.id
          WHERE er2.employee_id = e.id AND er2.is_primary = true
          LIMIT 1
        ) as primary_role
      FROM employees e
      LEFT JOIN employee_roles er ON e.id = er.employee_id
      LEFT JOIN roles r ON er.role_id = r.id
      WHERE e.id = $1 AND e.is_active = true
      GROUP BY e.id
    `;
    
    const result = await db.query(userQuery, [decoded.userId]);
    console.log(`👤 [${new Date().toISOString()}] User lookup result:`, { 
      found: result.rows.length > 0, 
      user: result.rows[0] ? { 
        id: result.rows[0].id, 
        username: result.rows[0].username, 
        roles: result.rows[0].roles,
        primary_role: result.rows[0].primary_role,
        legacy_role: result.rows[0].legacy_role
      } : null 
    });
    
    if (result.rows.length === 0) {
      console.log(`❌ [${new Date().toISOString()}] User not found or inactive for ID: ${decoded.userId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found or inactive'
      });
    }

    const user = result.rows[0];
    
    // Build comprehensive user object
    req.user = {
      ...user,
      userId: user.id, // For backward compatibility
      role: user.primary_role || user.legacy_role || (user.roles && user.roles[0]) || 'unknown', // Fallback hierarchy
      roles: user.roles || [] // Array of all role names
    };
    
    console.log(`🎉 [${new Date().toISOString()}] Authentication successful for user: ${req.user.username} (Primary: ${req.user.role}, All: ${JSON.stringify(req.user.roles)})`);
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

    // Check if user has ANY of the required roles
    // Support both single role (legacy) and multiple roles (new system)
    const userRoles = req.user.roles || [req.user.role];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      console.log(`🚫 [${new Date().toISOString()}] Access denied for ${req.user.username}. Required: [${roles.join(', ')}], Has: [${userRoles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    console.log(`✅ [${new Date().toISOString()}] Authorization passed for ${req.user.username}`);
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