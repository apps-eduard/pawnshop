const { query } = require('../config/database');

/**
 * Middleware to automatically inject current branch ID into requests
 * This ensures all transactions are tagged with the correct branch
 */
const injectBranchId = async (req, res, next) => {
  try {
    // Get current branch ID from system configuration
    const result = await query(`
      SELECT config_value as branch_id 
      FROM system_config 
      WHERE config_key = 'current_branch_id'
    `);

    if (result.rows.length > 0) {
      req.currentBranchId = parseInt(result.rows[0].branch_id);
    } else {
      // Default to branch 1 if no configuration found
      req.currentBranchId = 1;
      console.warn('⚠️ No branch configuration found, defaulting to branch ID 1');
    }

    next();
  } catch (error) {
    console.error('❌ Error getting current branch ID:', error);
    // Default to branch 1 and continue
    req.currentBranchId = 1;
    next();
  }
};

/**
 * Utility function to get current branch ID
 * Can be used in routes that don't use the middleware
 */
const getCurrentBranchId = async () => {
  try {
    const result = await query(`
      SELECT config_value as branch_id 
      FROM system_config 
      WHERE config_key = 'current_branch_id'
    `);

    return result.rows.length > 0 ? parseInt(result.rows[0].branch_id) : 1;
  } catch (error) {
    console.error('❌ Error getting current branch ID:', error);
    return 1; // Default fallback
  }
};

/**
 * Enhanced audit logging that includes branch information
 */
const auditLog = async (userId, action, tableName, recordId, oldValues, newValues, branchId = null) => {
  try {
    // If no branch ID provided, get current branch
    if (!branchId) {
      branchId = await getCurrentBranchId();
    }

    await query(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        changes, description, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      userId,
      action,
      tableName,
      recordId,
      JSON.stringify({
        old_values: oldValues || null,
        new_values: newValues || null,
        branch_id: branchId
      }),
      `Branch ${branchId} - ${action}`
    ]);

    console.log(`📝 Audit log created: ${action} on ${tableName} (Branch: ${branchId})`);
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
  }
};

/**
 * Validate that a branch ID exists and is active
 */
const validateBranchId = async (branchId) => {
  try {
    const result = await query(
      'SELECT id, name, is_active FROM branches WHERE id = $1',
      [branchId]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Branch not found' };
    }

    if (!result.rows[0].is_active) {
      return { valid: false, error: 'Branch is not active' };
    }

    return { valid: true, branch: result.rows[0] };
  } catch (error) {
    return { valid: false, error: 'Database error validating branch' };
  }
};

/**
 * Get branch information for display purposes
 */
const getBranchInfo = async (branchId) => {
  try {
    const result = await query(
      'SELECT id, name, address, contact_number FROM branches WHERE id = $1',
      [branchId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Error getting branch info:', error);
    return null;
  }
};

module.exports = {
  injectBranchId,
  getCurrentBranchId,
  auditLog,
  validateBranchId,
  getBranchInfo
};