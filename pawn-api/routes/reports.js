const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/reports/transactions
 * Get transaction report by period (daily, weekly, monthly)
 */
router.get('/transactions', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = `AND t.transaction_date BETWEEN $1 AND $2`;
      params = [startDate, endDate];
    } else {
      // Default to today
      dateFilter = `AND DATE(t.transaction_date) = CURRENT_DATE`;
    }
    
    const query = `
      SELECT 
        t.id,
        t.transaction_number,
        t.loan_number,
        t.transaction_type,
        t.status,
        t.principal_amount,
        t.interest_amount,
        t.service_charge,
        t.penalty_amount,
        CASE 
          WHEN t.transaction_type IN ('redeem', 'partial_payment') 
          THEN t.principal_amount + t.interest_amount + t.service_charge + t.penalty_amount
          WHEN t.transaction_type IN ('new_loan', 'additional_loan', 'renew')
          THEN t.principal_amount
          ELSE 0
        END as total_amount,
        t.transaction_date,
        t.maturity_date,
        p.first_name as pawner_first_name,
        p.last_name as pawner_last_name,
        p.customer_code,
        p.mobile_number as pawner_mobile,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.username as employee_username,
        e.role as employee_role
      FROM transactions t
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN employees e ON t.created_by = e.id
      WHERE t.status != 'cancelled'
      ${dateFilter}
      ORDER BY t.transaction_date DESC, t.transaction_number DESC
    `;
    
    const result = await pool.query(query, params);
    
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        t.transaction_type,
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_principal,
        COALESCE(SUM(t.interest_amount), 0) as total_interest,
        COALESCE(SUM(t.service_charge), 0) as total_service_charge,
        COALESCE(SUM(t.penalty_amount), 0) as total_penalty,
        COALESCE(SUM(
          CASE 
            WHEN t.transaction_type IN ('redeem', 'partial_payment') 
            THEN t.principal_amount + t.interest_amount + t.service_charge + t.penalty_amount
            WHEN t.transaction_type IN ('new_loan', 'additional_loan', 'renew')
            THEN t.principal_amount
            ELSE 0
          END
        ), 0) as total_amount
      FROM transactions t
      WHERE t.status != 'cancelled'
      ${dateFilter}
      GROUP BY t.transaction_type
      ORDER BY t.transaction_type
    `;
    
    const summaryResult = await pool.query(summaryQuery, params);
    
    // Get auction sales separately
    const auctionQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(auction_price), 0) as total_amount,
        DATE(updated_at) as sale_date
      FROM pawn_items
      WHERE status = 'sold'
      ${startDate && endDate ? `AND DATE(updated_at) BETWEEN $1 AND $2` : `AND DATE(updated_at) = CURRENT_DATE`}
      GROUP BY DATE(updated_at)
      ORDER BY sale_date DESC
    `;
    
    const auctionResult = await pool.query(auctionQuery, params);
    
    res.json({
      success: true,
      data: {
        transactions: result.rows,
        summary: summaryResult.rows,
        auctionSales: auctionResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching transaction report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/revenue
 * Get revenue report by period
 */
router.get('/revenue', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = `WHERE DATE(t.transaction_date) BETWEEN $1 AND $2`;
      params = [startDate, endDate];
    } else {
      dateFilter = `WHERE DATE(t.transaction_date) = CURRENT_DATE`;
    }
    
    const query = `
      SELECT 
        DATE(t.transaction_date) as date,
        COUNT(*) as total_transactions,
        -- Interest revenue (from redeem, partial, renew)
        COALESCE(SUM(
          CASE WHEN t.transaction_type IN ('redeem', 'partial_payment', 'renew') 
          THEN t.interest_amount ELSE 0 END
        ), 0) as interest_revenue,
        -- Service charge revenue
        COALESCE(SUM(t.service_charge), 0) as service_charge_revenue,
        -- Penalty revenue
        COALESCE(SUM(t.penalty_amount), 0) as penalty_revenue,
        -- Total revenue
        COALESCE(SUM(
          CASE WHEN t.transaction_type IN ('redeem', 'partial_payment', 'renew')
          THEN t.interest_amount + t.service_charge + t.penalty_amount
          ELSE 0 END
        ), 0) as total_revenue
      FROM transactions t
      ${dateFilter}
      AND t.status != 'cancelled'
      GROUP BY DATE(t.transaction_date)
      ORDER BY date DESC
    `;
    
    const result = await pool.query(query, params);
    
    // Get auction revenue
    const auctionQuery = `
      SELECT 
        DATE(updated_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(auction_price), 0) as auction_revenue
      FROM pawn_items
      WHERE status = 'sold'
      ${startDate && endDate ? `AND DATE(updated_at) BETWEEN $1 AND $2` : `AND DATE(updated_at) = CURRENT_DATE`}
      GROUP BY DATE(updated_at)
      ORDER BY date DESC
    `;
    
    const auctionResult = await pool.query(auctionQuery, params);
    
    res.json({
      success: true,
      data: {
        revenue: result.rows,
        auctionRevenue: auctionResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/categories
 * Get item category report
 */
router.get('/categories', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = `AND DATE(t.transaction_date) BETWEEN $1 AND $2`;
      params = [startDate, endDate];
    } else {
      dateFilter = `AND DATE(t.transaction_date) = CURRENT_DATE`;
    }
    
    const query = `
      SELECT 
        c.name as category,
        COUNT(DISTINCT i.id) as item_count,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(SUM(i.appraised_value), 0) as total_appraised_value,
        COALESCE(SUM(t.principal_amount), 0) as total_loan_amount,
        COALESCE(AVG(i.appraised_value), 0) as avg_appraised_value,
        COALESCE(AVG(t.principal_amount), 0) as avg_loan_amount
      FROM pawn_items i
      LEFT JOIN transactions t ON i.transaction_id = t.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE 1=1
      ${dateFilter}
      GROUP BY c.name
      ORDER BY total_loan_amount DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching category report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/vouchers
 * Get voucher report
 */
router.get('/vouchers', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = `WHERE DATE(voucher_date) BETWEEN $1 AND $2`;
      params = [startDate, endDate];
    } else {
      dateFilter = `WHERE DATE(voucher_date) = CURRENT_DATE`;
    }
    
    const query = `
      SELECT 
        voucher_type,
        DATE(voucher_date) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        json_agg(
          json_build_object(
            'id', id,
            'amount', amount,
            'notes', notes,
            'created_at', created_at
          ) ORDER BY created_at DESC
        ) as vouchers
      FROM vouchers
      ${dateFilter}
      GROUP BY voucher_type, DATE(voucher_date)
      ORDER BY date DESC, voucher_type
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching voucher report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voucher report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/expired-items
 * Get expired items report
 */
router.get('/expired-items', authorizeRoles('manager', 'admin', 'administrator'), async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        pt.ticket_number,
        c.name as category,
        i.custom_description as description,
        i.appraised_value,
        i.status,
        i.auction_price,
        t.maturity_date,
        t.expiry_date,
        CURRENT_DATE - t.expiry_date as days_expired,
        p.first_name,
        p.last_name,
        p.mobile_number as contact_number
      FROM pawn_items i
      INNER JOIN transactions t ON i.transaction_id = t.id
      LEFT JOIN pawn_tickets pt ON t.id = pt.transaction_id
      LEFT JOIN categories c ON i.category_id = c.id
      INNER JOIN pawners p ON t.pawner_id = p.id
      WHERE t.expiry_date < CURRENT_DATE
        AND t.status IN ('expired', 'active')
        AND i.status NOT IN ('redeemed', 'sold')
      ORDER BY t.expiry_date ASC
    `;
    
    const result = await pool.query(query);
    
    // Summary statistics
    const summaryQuery = `
      SELECT 
        i.status,
        COUNT(*) as count,
        COALESCE(SUM(i.appraised_value), 0) as total_appraised_value,
        COALESCE(SUM(i.auction_price), 0) as total_auction_price
      FROM pawn_items i
      INNER JOIN transactions t ON i.transaction_id = t.id
      WHERE t.expiry_date < CURRENT_DATE
        AND t.status IN ('expired', 'active')
        AND i.status NOT IN ('redeemed')
      GROUP BY i.status
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        summary: summaryResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching expired items report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expired items report',
      error: error.message
    });
  }
});

module.exports = router;
