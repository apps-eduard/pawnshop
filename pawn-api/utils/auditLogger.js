/**
 * Audit Logging Utility
 * 
 * Helper functions for logging to audit_logs and audit_trails tables
 */

const { pool } = require('../config/database');

/**
 * Log general system activity to audit_logs table
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID performing the action
 * @param {string} params.username - Username performing the action
 * @param {string} params.action - Action type (LOGIN_SUCCESS, CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.tableName - Table being affected
 * @param {number} params.recordId - ID of the record being affected
 * @param {Object} params.oldValues - Previous state (for UPDATE/DELETE)
 * @param {Object} params.newValues - New state (for CREATE/UPDATE)
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent string
 * @param {Object} params.client - Optional: database client for transactions
 */
async function logAudit({
  userId,
  username,
  action,
  tableName = null,
  recordId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
  client = null
}) {
  const dbClient = client || pool;
  
  try {
    await dbClient.query(`
      INSERT INTO audit_logs (
        user_id, username, action, table_name, record_id, 
        old_values, new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      userId,
      username,
      action,
      tableName,
      recordId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('❌ Failed to log audit:', error.message);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Log transaction-specific activity to audit_trails table
 * 
 * @param {Object} params
 * @param {number} params.transactionId - Transaction ID
 * @param {string} params.loanNumber - Loan/ticket number
 * @param {number} params.userId - User ID performing the action
 * @param {string} params.username - Username performing the action
 * @param {string} params.actionType - Action type (CREATE, UPDATE, PAYMENT, RENEWAL, REDEMPTION, etc.)
 * @param {string} params.description - Human-readable description of the action
 * @param {Object} params.oldData - Previous transaction state
 * @param {Object} params.newData - New transaction state
 * @param {number} params.amount - Transaction amount
 * @param {string} params.statusBefore - Status before the action
 * @param {string} params.statusAfter - Status after the action
 * @param {number} params.branchId - Branch ID
 * @param {string} params.ipAddress - IP address of the request
 * @param {Object} params.client - Optional: database client for transactions
 */
async function logAuditTrail({
  transactionId,
  loanNumber,
  userId,
  username,
  actionType,
  description,
  oldData = null,
  newData = null,
  amount = null,
  statusBefore = null,
  statusAfter = null,
  branchId,
  ipAddress = null,
  client = null
}) {
  const dbClient = client || pool;
  
  try {
    await dbClient.query(`
      INSERT INTO audit_trails (
        transaction_id, loan_number, user_id, username, action_type, 
        description, old_data, new_data, amount, status_before, 
        status_after, branch_id, ip_address, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      transactionId,
      loanNumber,
      userId,
      username,
      actionType,
      description,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      amount,
      statusBefore,
      statusAfter,
      branchId,
      ipAddress,
      userId
    ]);
  } catch (error) {
    console.error('❌ Failed to log audit trail:', error.message);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Get IP address from Express request
 */
function getIpAddress(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         null;
}

/**
 * Get User Agent from Express request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}

module.exports = {
  logAudit,
  logAuditTrail,
  getIpAddress,
  getUserAgent
};
