const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Helper function to log audit trail
async function logAuditTrail(userId, action, tableName, recordId, oldValues, newValues) {
  try {
    await pool.query(`
      INSERT INTO admin_audit_log (user_id, action, table_name, record_id, old_values, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, tableName, recordId, oldValues, newValues]);
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
}

// =============================================
// BULK OPERATIONS
// =============================================

// Bulk update categories
router.put('/categories/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { categories } = req.body;
    
    console.log(`📦 [${new Date().toISOString()}] Admin bulk updating ${categories.length} categories - User: ${req.user.username}`);
    
    await client.query('BEGIN');
    
    const results = [];
    for (const category of categories) {
      const { id, name, description, interest_rate, is_active } = category;
      
      // Get old values for audit
      const oldResult = await client.query('SELECT * FROM categories WHERE id = $1', [id]);
      const oldValues = oldResult.rows[0];
      
      const result = await client.query(`
        UPDATE categories 
        SET name = $1, description = $2, interest_rate = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [name, description, interest_rate, is_active, id]);
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
        
        // Log audit trail
        await logAuditTrail(
          req.user.userId,
          'UPDATE',
          'categories',
          id,
          JSON.stringify(oldValues),
          JSON.stringify(result.rows[0])
        );
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Bulk updated ${results.length} categories`);
    
    res.json({
      success: true,
      message: `Successfully updated ${results.length} categories`,
      data: results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk update failed'
    });
  } finally {
    client.release();
  }
});

// Bulk activate/deactivate items
router.patch('/categories/bulk-status', async (req, res) => {
  try {
    const { category_ids, is_active } = req.body;
    
    console.log(`🔄 [${new Date().toISOString()}] Admin bulk ${is_active ? 'activating' : 'deactivating'} categories - User: ${req.user.username}`);
    
    const result = await pool.query(`
      UPDATE categories 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
      RETURNING *
    `, [is_active, category_ids]);
    
    // Log audit trail for each updated category
    for (const category of result.rows) {
      await logAuditTrail(
        req.user.userId,
        'UPDATE',
        'categories',
        category.id,
        JSON.stringify({is_active: !is_active}),
        JSON.stringify({is_active: is_active})
      );
    }
    
    console.log(`✅ Bulk status update completed for ${result.rows.length} categories`);
    
    res.json({
      success: true,
      message: `Successfully ${is_active ? 'activated' : 'deactivated'} ${result.rows.length} categories`,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error in bulk status update:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk status update failed'
    });
  }
});

// =============================================
// AUDIT TRAIL
// =============================================

// Get audit trail
router.get('/audit-trail', async (req, res) => {
  try {
    const { table_name, limit = 50, offset = 0 } = req.query;
    
    console.log(`📊 [${new Date().toISOString()}] Admin fetching audit trail - User: ${req.user.username}`);
    
    let query = `
      SELECT al.*, u.username
      FROM admin_audit_log al
      JOIN users u ON al.user_id = u.id
    `;
    let params = [];
    
    if (table_name) {
      query += ' WHERE al.table_name = $1';
      params.push(table_name);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Retrieved ${result.rows.length} audit trail entries`);
    
    res.json({
      success: true,
      message: 'Audit trail retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail'
    });
  }
});

// =============================================
// SYSTEM STATISTICS
// =============================================

// Get system statistics
router.get('/statistics', async (req, res) => {
  try {
    console.log(`📈 [${new Date().toISOString()}] Admin fetching system statistics - User: ${req.user.username}`);
    
    const stats = {};
    
    // Categories statistics
    const categoriesResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM categories
    `);
    stats.categories = categoriesResult.rows[0];
    
    // Branches statistics
    const branchesResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM branches
    `);
    stats.branches = branchesResult.rows[0];
    
    // Voucher types statistics
    const voucherTypesResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM voucher_types
    `);
    stats.voucher_types = voucherTypesResult.rows[0];
    
    // Recent audit activity (last 24 hours)
    const auditResult = await pool.query(`
      SELECT COUNT(*) as recent_changes
      FROM admin_audit_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    stats.recent_changes = auditResult.rows[0].recent_changes;
    
    console.log(`✅ System statistics retrieved`);
    
    res.json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

module.exports = router;