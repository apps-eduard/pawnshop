const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { updateExpiredTransactions } = require('../utils/updateExpiredTransactions');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get auctioneer dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    console.log(`📊 [${new Date().toISOString()}] Fetching auctioneer dashboard stats - User: ${req.user.username}`);
    
    // First, update any transactions that have expired
    await updateExpiredTransactions();
    
    const today = new Date().toISOString().split('T')[0];
    
    const [
      expiredItemsResult,
      itemsWithPriceResult,
      soldTodayResult,
      soldThisMonthResult,
      soldThisYearResult,
      avgSalePriceResult
    ] = await Promise.all([
      // Expired items (ready for auction pricing)
      pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(pi.appraised_value), 0) as total_value
        FROM pawn_items pi
        JOIN transactions t ON t.id = pi.transaction_id
        WHERE t.expiry_date < CURRENT_DATE
          AND pi.auction_price IS NULL
          AND pi.status != 'sold'
          AND t.status != 'redeemed'
      `),
      
      // Items with auction price set (ready for auction)
      pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(pi.auction_price), 0) as total_value
        FROM pawn_items pi
        JOIN transactions t ON t.id = pi.transaction_id
        WHERE t.expiry_date < CURRENT_DATE
          AND pi.auction_price IS NOT NULL
          AND pi.status != 'sold'
          AND t.status != 'redeemed'
      `),
      
      // Items sold today
      pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(pi.final_price), 0) as revenue
        FROM pawn_items pi
        WHERE pi.status = 'sold'
          AND DATE(pi.sold_date) = $1
      `, [today]),
      
      // Items sold this month
      pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(pi.final_price), 0) as revenue
        FROM pawn_items pi
        WHERE pi.status = 'sold'
          AND EXTRACT(MONTH FROM pi.sold_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM pi.sold_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
      
      // Items sold this year
      pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(pi.final_price), 0) as revenue
        FROM pawn_items pi
        WHERE pi.status = 'sold'
          AND EXTRACT(YEAR FROM pi.sold_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
      
      // Average sale price
      pool.query(`
        SELECT 
          COALESCE(AVG(pi.final_price), 0) as avg_price
        FROM pawn_items pi
        WHERE pi.status = 'sold'
          AND pi.final_price IS NOT NULL
      `)
    ]);
    
    const stats = {
      expiredItems: {
        count: parseInt(expiredItemsResult.rows[0].count),
        totalValue: parseFloat(expiredItemsResult.rows[0].total_value)
      },
      readyForAuction: {
        count: parseInt(itemsWithPriceResult.rows[0].count),
        totalValue: parseFloat(itemsWithPriceResult.rows[0].total_value)
      },
      soldToday: {
        count: parseInt(soldTodayResult.rows[0].count),
        revenue: parseFloat(soldTodayResult.rows[0].revenue)
      },
      soldThisMonth: {
        count: parseInt(soldThisMonthResult.rows[0].count),
        revenue: parseFloat(soldThisMonthResult.rows[0].revenue)
      },
      soldThisYear: {
        count: parseInt(soldThisYearResult.rows[0].count),
        revenue: parseFloat(soldThisYearResult.rows[0].revenue)
      },
      avgSalePrice: parseFloat(avgSalePriceResult.rows[0].avg_price)
    };
    
    console.log(`✅ Auctioneer stats retrieved:`, stats);
    
    res.json({
      success: true,
      message: 'Auctioneer dashboard statistics retrieved successfully',
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching auctioneer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auctioneer statistics',
      error: error.message
    });
  }
});

module.exports = router;
