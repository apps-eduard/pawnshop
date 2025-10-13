/**
 * Audit Logs and Trails API Routes
 * Provides endpoints to view system audit logs and transaction audit trails
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// =============================================
// AUDIT LOGS ENDPOINTS (General System Activities)
// =============================================

/**
 * GET /api/audit/logs
 * Get all audit logs with pagination and filtering
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      user_id,
      table_name,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      queryParams.push(action);
      paramIndex++;
    }

    if (user_id) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(user_id);
      paramIndex++;
    }

    if (table_name) {
      whereConditions.push(`table_name = $${paramIndex}`);
      queryParams.push(table_name);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(username ILIKE $${paramIndex} OR action ILIKE $${paramIndex} OR table_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Get paginated logs
    const query = `
      SELECT 
        id,
        user_id,
        username,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    console.log(`✅ [Audit Logs] Retrieved ${result.rows.length} of ${totalRecords} logs`);

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          pageSize: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [Audit Logs] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/logs/actions
 * Get distinct action types from audit logs
 */
router.get('/logs/actions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.action)
    });

  } catch (error) {
    console.error('❌ [Audit Logs] Error getting actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve action types'
    });
  }
});

/**
 * GET /api/audit/logs/tables
 * Get distinct table names from audit logs
 */
router.get('/logs/tables', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT table_name FROM audit_logs WHERE table_name IS NOT NULL ORDER BY table_name'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.table_name)
    });

  } catch (error) {
    console.error('❌ [Audit Logs] Error getting tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve table names'
    });
  }
});

// =============================================
// AUDIT TRAILS ENDPOINTS (Transaction Activities)
// =============================================

/**
 * GET /api/audit/trails
 * Get all audit trails with pagination and filtering
 */
router.get('/trails', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action_type,
      transaction_id,
      loan_number,
      user_id,
      branch_id,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (action_type) {
      whereConditions.push(`action_type = $${paramIndex}`);
      queryParams.push(action_type);
      paramIndex++;
    }

    if (transaction_id) {
      whereConditions.push(`transaction_id = $${paramIndex}`);
      queryParams.push(transaction_id);
      paramIndex++;
    }

    if (loan_number) {
      whereConditions.push(`loan_number = $${paramIndex}`);
      queryParams.push(loan_number);
      paramIndex++;
    }

    if (user_id) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(user_id);
      paramIndex++;
    }

    if (branch_id) {
      whereConditions.push(`branch_id = $${paramIndex}`);
      queryParams.push(branch_id);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`at.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`at.created_at <= $${paramIndex}`);
      queryParams.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(username ILIKE $${paramIndex} OR loan_number ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_trails ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Get paginated trails with branch name
    const query = `
      SELECT 
        at.id,
        at.transaction_id,
        at.loan_number,
        at.user_id,
        at.username,
        at.action_type,
        at.description,
        at.old_data,
        at.new_data,
        at.amount,
        at.status_before,
        at.status_after,
        at.branch_id,
        b.name as branch_name,
        at.ip_address,
        at.created_at,
        at.created_by
      FROM audit_trails at
      LEFT JOIN branches b ON at.branch_id = b.id
      ${whereClause}
      ORDER BY at.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    console.log(`✅ [Audit Trails] Retrieved ${result.rows.length} of ${totalRecords} trails`);

    res.json({
      success: true,
      data: {
        trails: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          pageSize: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [Audit Trails] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trails',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/trails/action-types
 * Get distinct action types from audit trails
 */
router.get('/trails/action-types', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT action_type FROM audit_trails WHERE action_type IS NOT NULL ORDER BY action_type'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.action_type)
    });

  } catch (error) {
    console.error('❌ [Audit Trails] Error getting action types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve action types'
    });
  }
});

/**
 * GET /api/audit/trails/transaction/:transactionId
 * Get all audit trails for a specific transaction
 */
router.get('/trails/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const query = `
      SELECT 
        at.*,
        b.name as branch_name
      FROM audit_trails at
      LEFT JOIN branches b ON at.branch_id = b.id
      WHERE at.transaction_id = $1
      ORDER BY at.created_at DESC
    `;

    const result = await pool.query(query, [transactionId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ [Audit Trails] Error getting transaction trails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction audit trails'
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalLogsResult,
      totalTrailsResult,
      todayLogsResult,
      todayTrailsResult,
      topActionsResult,
      topUsersResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM audit_logs'),
      pool.query('SELECT COUNT(*) FROM audit_trails'),
      pool.query('SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = $1', [today]),
      pool.query('SELECT COUNT(*) FROM audit_trails WHERE DATE(created_at) = $1', [today]),
      pool.query(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE DATE(created_at) = $1 
        GROUP BY action 
        ORDER BY count DESC 
        LIMIT 5
      `, [today]),
      pool.query(`
        SELECT username, COUNT(*) as count 
        FROM audit_logs 
        WHERE DATE(created_at) = $1 AND username IS NOT NULL 
        GROUP BY username 
        ORDER BY count DESC 
        LIMIT 5
      `, [today])
    ]);

    res.json({
      success: true,
      data: {
        totalLogs: parseInt(totalLogsResult.rows[0].count),
        totalTrails: parseInt(totalTrailsResult.rows[0].count),
        todayLogs: parseInt(todayLogsResult.rows[0].count),
        todayTrails: parseInt(todayTrailsResult.rows[0].count),
        topActions: topActionsResult.rows,
        topUsers: topUsersResult.rows
      }
    });

  } catch (error) {
    console.error('❌ [Audit] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit statistics'
    });
  }
});

module.exports = router;
