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
    
    // Debug: Show all transaction types for today
    const debugResult = await pool.query(`
      SELECT transaction_type, COUNT(*) as count, SUM(principal_amount) as total
      FROM transactions
      WHERE DATE(transaction_date) = $1
      GROUP BY transaction_type
      ORDER BY transaction_type
    `, [today]);
    console.log(`🔍 DEBUG - Today's transaction types:`, debugResult.rows);
    
    // Get Auction Sales (items sold today)
    const auctionSalesResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(final_price), 0) as total_amount
      FROM pawn_items
      WHERE status = 'sold'
        AND DATE(sold_date) = $1
    `, [today]);
    
    // Get Redeem transactions (today) - transaction_type is 'redemption' not 'redeem'
    const redeemResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'redemption'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get Renew transactions (today) - transaction_type is 'renewal', use principal_amount not interest
    const renewResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'renewal'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get Partial Payment transactions (today) - stored in transactions table with type 'partial_payment'
    const partialResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'partial_payment'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get Additional Loan transactions (today)  
    const additionalResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'additional_loan'
        AND DATE(t.transaction_date) = $1
    `, [today]);
    
    // Get New Loan transactions (today)
    const newLoanResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(t.principal_amount), 0) as total_amount
      FROM transactions t
      WHERE t.transaction_type = 'new_loan'
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
      },
      newLoan: {
        count: parseInt(newLoanResult.rows[0].count),
        totalAmount: parseFloat(newLoanResult.rows[0].total_amount)
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
