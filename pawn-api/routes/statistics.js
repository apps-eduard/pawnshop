const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get today's transaction statistics
router.get('/today', async (req, res) => {
  try {
    console.log(`📊 [${new Date().toISOString()}] Fetching today's statistics - User: ${req.user.username}`);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get Auction Sales (items sold today)
    const auctionSalesResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(final_price), 0) as total_amount
      FROM pawn_items
      WHERE status = 'sold'
        AND DATE(sold_date) = $1
    `, [today]);
    
    // Get Redeem transactions (today)
    const redeemResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'redeem'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get Renew transactions (today)
    const renewResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.interest_charged), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'renew'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get Partial Payment transactions (today)
    const partialResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(pp.amount), 0) as total_amount
      FROM pawn_payments pp
      WHERE pp.payment_type = 'partial_redemption'
        AND DATE(pp.created_at) = $1
    `, [today]);
    
    // Get Additional Loan transactions (today)
    const additionalResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.additional_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'additional_loan'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    const statistics = {
      auctionSales: {
        count: parseInt(auctionSalesResult.rows[0].count),
        totalAmount: parseFloat(auctionSalesResult.rows[0].total_amount)
      },
      redeem: {
        count: parseInt(redeemResult.rows[0].count),
        totalAmount: parseFloat(redeemResult.rows[0].total_amount)
      },
      renew: {
        count: parseInt(renewResult.rows[0].count),
        totalAmount: parseFloat(renewResult.rows[0].total_amount)
      },
      partial: {
        count: parseInt(partialResult.rows[0].count),
        totalAmount: parseFloat(partialResult.rows[0].total_amount)
      },
      additional: {
        count: parseInt(additionalResult.rows[0].count),
        totalAmount: parseFloat(additionalResult.rows[0].total_amount)
      }
    };
    
    console.log(`✅ Today's statistics retrieved:`, statistics);
    
    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: statistics
    });
    
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
