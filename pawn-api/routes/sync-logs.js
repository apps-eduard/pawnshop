const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/sync-logs - Get branch synchronization logs
router.get('/', authenticateToken, authorizeRoles('administrator', 'manager'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, status = 'all', branch_id = 'all' } = req.query;
    
    console.log(`📋 Fetching sync logs - Status: ${status}, Branch: ${branch_id}, Limit: ${limit}`);
    
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;
    
    // Filter by status
    if (status !== 'all') {
      whereClause += `WHERE bsl.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Filter by branch
    if (branch_id !== 'all') {
      const andOr = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${andOr} bsl.source_branch_id = $${paramIndex}`;
      queryParams.push(parseInt(branch_id));
      paramIndex++;
    }
    
    // Add pagination parameters
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const syncLogsResult = await query(`
      SELECT 
        bsl.id,
        bsl.source_branch_id,
        sb.name as source_branch_name,
        bsl.target_branch_id,
        tb.name as target_branch_name,
        bsl.sync_type,
        bsl.table_name,
        bsl.records_synced,
        bsl.status,
        bsl.error_message,
        bsl.started_at,
        bsl.completed_at,
        bsl.sync_data,
        CASE 
          WHEN bsl.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (bsl.completed_at - bsl.started_at)) 
          ELSE NULL 
        END as duration_seconds
      FROM branch_sync_log bsl
      LEFT JOIN branches sb ON sb.id = bsl.source_branch_id
      LEFT JOIN branches tb ON tb.id = bsl.target_branch_id
      ${whereClause}
      ORDER BY bsl.started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);
    
    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM branch_sync_log bsl
      ${whereClause}
    `, queryParams.slice(0, -2)); // Remove limit and offset from count query
    
    // Get sync statistics
    const statsResult = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (completed_at - started_at))
            ELSE NULL 
          END
        ) as avg_duration_seconds
      FROM branch_sync_log
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY status
      ORDER BY status
    `);
    
    res.json({
      success: true,
      data: {
        logs: syncLogsResult.rows,
        totalCount: parseInt(countResult.rows[0].total),
        statistics: statsResult.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + syncLogsResult.rows.length < parseInt(countResult.rows[0].total)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sync logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync logs',
      error: error.message
    });
  }
});

// GET /api/sync-logs/:id - Get specific sync log details
router.get('/:id', authenticateToken, authorizeRoles('administrator', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        bsl.*,
        sb.name as source_branch_name,
        sb.address as source_branch_address,
        tb.name as target_branch_name,
        tb.address as target_branch_address,
        u.username as triggered_by_username,
        u.first_name as triggered_by_first_name,
        u.last_name as triggered_by_last_name
      FROM branch_sync_log bsl
      LEFT JOIN branches sb ON sb.id = bsl.source_branch_id
      LEFT JOIN branches tb ON tb.id = bsl.target_branch_id
      LEFT JOIN users u ON u.id = (bsl.sync_data->>'triggered_by')::integer
      WHERE bsl.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sync log not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching sync log details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync log details',
      error: error.message
    });
  }
});

// GET /api/sync-logs/summary/dashboard - Get sync summary for dashboard
router.get('/summary/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get recent sync activity (last 24 hours)
    const recentActivity = await query(`
      SELECT 
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_syncs,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '1 hour') as last_hour_syncs
      FROM branch_sync_log
      WHERE started_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get sync status by branch
    const branchActivity = await query(`
      SELECT 
        b.id,
        b.name as branch_name,
        COUNT(bsl.id) as total_syncs,
        COUNT(*) FILTER (WHERE bsl.status = 'completed') as successful_syncs,
        COUNT(*) FILTER (WHERE bsl.status = 'failed') as failed_syncs,
        MAX(bsl.completed_at) as last_successful_sync
      FROM branches b
      LEFT JOIN branch_sync_log bsl ON b.id = bsl.source_branch_id 
        AND bsl.started_at >= NOW() - INTERVAL '7 days'
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY b.name
    `);
    
    // Get latest sync activity
    const latestSyncs = await query(`
      SELECT 
        bsl.id,
        sb.name as source_branch_name,
        tb.name as target_branch_name,
        bsl.sync_type,
        bsl.status,
        bsl.records_synced,
        bsl.started_at,
        bsl.completed_at
      FROM branch_sync_log bsl
      LEFT JOIN branches sb ON sb.id = bsl.source_branch_id
      LEFT JOIN branches tb ON tb.id = bsl.target_branch_id
      ORDER BY bsl.started_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        recentActivity: recentActivity.rows[0],
        branchActivity: branchActivity.rows,
        latestSyncs: latestSyncs.rows
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sync summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync summary',
      error: error.message
    });
  }
});

module.exports = router;