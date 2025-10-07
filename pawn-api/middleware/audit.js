const db = require('../config/database');

const auditLogger = (entity) => {
  return (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the audit trail after successful operations
      if (data && data.success && req.user) {
        logAuditTrail(req, entity, data);
      }
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};

const logAuditTrail = async (req, entity, responseData) => {
  try {
    const action = getActionFromMethod(req.method);
    const entityId = getEntityId(req, responseData);
    
    const auditData = {
      entity: entity,
      entityId: entityId,
      action: action,
      performedBy: req.user.id,
      branchId: req.user.branch_id,
      previousValues: req.previousValues || null,
      newValues: getNewValues(req, responseData),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const insertQuery = `
      INSERT INTO audit_logs (
        entity_type, entity_id, action, user_id, 
        changes, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;

    await db.query(insertQuery, [
      auditData.entity,
      auditData.entityId,
      auditData.action,
      auditData.performedBy,
      JSON.stringify({
        old_values: auditData.previousValues || null,
        new_values: auditData.newValues || null,
        branch_id: auditData.branchId || null
      }),
      auditData.ipAddress,
      auditData.userAgent
    ]);

  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't fail the main operation if audit logging fails
  }
};

const getActionFromMethod = (method) => {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'READ';
  }
};

const getEntityId = (req, responseData) => {
  // Try to get ID from various sources
  return req.params.id || 
         responseData.data?.id || 
         responseData.id || 
         req.body.id || 
         'unknown';
};

const getNewValues = (req, responseData) => {
  // For CREATE operations, return the created data
  if (req.method === 'POST' && responseData.data) {
    return responseData.data;
  }
  
  // For UPDATE operations, return the request body
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return req.body;
  }
  
  return null;
};

// Middleware to capture previous values for UPDATE operations
const capturePreviousValues = (tableName, idField = 'id') => {
  return async (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const id = req.params.id || req.body[idField];
        if (id) {
          const result = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = $1`, [id]);
          if (result.rows.length > 0) {
            req.previousValues = result.rows[0];
          }
        }
      } catch (error) {
        console.error('Error capturing previous values:', error);
      }
    }
    next();
  };
};

module.exports = {
  auditLogger,
  capturePreviousValues,
  logAuditTrail
};