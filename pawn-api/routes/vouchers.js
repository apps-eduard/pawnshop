const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/vouchers
 * Get all vouchers with filtering options
 * Query params: page, limit, type, startDate, endDate
 */
router.get('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      startDate, 
      endDate,
      createdBy 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];
    let paramCounter = 1;
    
    if (type) {
      whereConditions.push(`v.voucher_type = $${paramCounter}`);
      queryParams.push(type);
      paramCounter++;
    }
    
    if (startDate) {
      whereConditions.push(`v.voucher_date >= $${paramCounter}`);
      queryParams.push(startDate);
      paramCounter++;
    }
    
    if (endDate) {
      whereConditions.push(`v.voucher_date <= $${paramCounter}`);
      queryParams.push(endDate);
      paramCounter++;
    }
    
    if (createdBy) {
      whereConditions.push(`v.created_by = $${paramCounter}`);
      queryParams.push(createdBy);
      paramCounter++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vouchers v
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get vouchers with employee details
    const vouchersQuery = `
      SELECT 
        v.id,
        v.voucher_type,
        v.transaction_type,
        v.voucher_date,
        v.amount,
        v.notes,
        v.created_by,
        v.created_at,
        v.updated_at,
        e.username as created_by_username,
        e.first_name as created_by_first_name,
        e.last_name as created_by_last_name
      FROM vouchers v
      LEFT JOIN employees e ON v.created_by = e.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);
    const vouchersResult = await client.query(vouchersQuery, queryParams);
    
    res.json({
      success: true,
      data: vouchersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vouchers',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/vouchers/:id
 * Get a specific voucher by ID
 */
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        v.id,
        v.voucher_type,
        v.transaction_type,
        v.voucher_date,
        v.amount,
        v.notes,
        v.created_by,
        v.created_at,
        v.updated_at,
        e.username as created_by_username,
        e.first_name as created_by_first_name,
        e.last_name as created_by_last_name
      FROM vouchers v
      LEFT JOIN employees e ON v.created_by = e.id
      WHERE v.id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voucher',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/vouchers/batch
 * Create multiple vouchers at once
 * Body: { vouchers: [{ type, date, amount, notes }, ...] }
 */
router.post('/batch', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { vouchers } = req.body;
    const userId = req.user.userId;
    
    // Validation
    if (!vouchers || !Array.isArray(vouchers) || vouchers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vouchers array is required and must not be empty'
      });
    }
    
    // Validate each voucher
    for (let i = 0; i < vouchers.length; i++) {
      const voucher = vouchers[i];
      if (!voucher.type || !['cash', 'cheque'].includes(voucher.type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid voucher type at index ${i}. Must be 'cash' or 'cheque'`
        });
      }
      const transactionType = voucher.transactionType || 'cash_out';
      if (!['cash_in', 'cash_out'].includes(transactionType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transaction type at index ${i}. Must be 'cash_in' or 'cash_out'`
        });
      }
      if (!voucher.date) {
        return res.status(400).json({
          success: false,
          message: `Voucher date is required at index ${i}`
        });
      }
      if (!voucher.amount || voucher.amount <= 0) {
        return res.status(400).json({
          success: false,
          message: `Valid amount is required at index ${i}`
        });
      }
      if (!voucher.notes || voucher.notes.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Notes are required at index ${i}`
        });
      }
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    const savedVouchers = [];
    
    for (const voucher of vouchers) {
      const transactionType = voucher.transactionType || 'cash_out';
      const insertQuery = `
        INSERT INTO vouchers (voucher_type, voucher_date, amount, notes, transaction_type, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        voucher.type,
        voucher.date,
        voucher.amount,
        voucher.notes.trim(),
        transactionType,
        userId
      ]);
      
      savedVouchers.push(result.rows[0]);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${savedVouchers.length} voucher(s)`,
      data: savedVouchers
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error creating vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vouchers',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/vouchers
 * Create a single voucher
 * Body: { type, date, amount, notes, transactionType }
 */
router.post('/', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { type, date, amount, notes, transactionType = 'cash_out' } = req.body;
    const userId = req.user.userId;
    
    // Validation
    if (!type || !['cash', 'cheque'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Voucher type is required and must be 'cash' or 'cheque'"
      });
    }
    
    if (!transactionType || !['cash_in', 'cash_out'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Transaction type is required and must be 'cash_in' or 'cash_out'"
      });
    }
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Voucher date is required'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (!notes || notes.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Notes are required'
      });
    }
    
    const insertQuery = `
      INSERT INTO vouchers (voucher_type, voucher_date, amount, notes, transaction_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      type,
      date,
      amount,
      notes.trim(),
      transactionType,
      userId
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create voucher',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/vouchers/:id
 * Delete a voucher by ID
 */
router.delete('/:id', authorizeRoles('admin', 'administrator'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const deleteQuery = 'DELETE FROM vouchers WHERE id = $1 RETURNING *';
    const result = await client.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Voucher deleted successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete voucher',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/vouchers/stats/summary
 * Get voucher statistics summary
 */
router.get('/stats/summary', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE voucher_date BETWEEN $1 AND $2';
      queryParams = [startDate, endDate];
    } else if (startDate) {
      whereClause = 'WHERE voucher_date >= $1';
      queryParams = [startDate];
    } else if (endDate) {
      whereClause = 'WHERE voucher_date <= $1';
      queryParams = [endDate];
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_vouchers,
        SUM(amount) as total_amount,
        SUM(CASE WHEN voucher_type = 'cash' THEN amount ELSE 0 END) as total_cash,
        SUM(CASE WHEN voucher_type = 'cheque' THEN amount ELSE 0 END) as total_cheque,
        COUNT(CASE WHEN voucher_type = 'cash' THEN 1 END) as cash_count,
        COUNT(CASE WHEN voucher_type = 'cheque' THEN 1 END) as cheque_count
      FROM vouchers
      ${whereClause}
    `;
    
    const result = await client.query(query, queryParams);
    
    res.json({
      success: true,
      data: {
        total_vouchers: parseInt(result.rows[0].total_vouchers) || 0,
        total_amount: parseFloat(result.rows[0].total_amount) || 0,
        total_cash: parseFloat(result.rows[0].total_cash) || 0,
        total_cheque: parseFloat(result.rows[0].total_cheque) || 0,
        cash_count: parseInt(result.rows[0].cash_count) || 0,
        cheque_count: parseInt(result.rows[0].cheque_count) || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching voucher stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voucher statistics',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;