const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get dashboard data for different roles
router.get('/:role', authorizeRoles('admin', 'administrator', 'cashier', 'appraiser', 'manager', 'auctioneer'), 
  async (req, res) => {
    try {
      const { role } = req.params;
      const userRole = req.user.role;
      
      // Verify user can access this dashboard
      if (userRole !== 'ADMIN' && userRole !== role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this dashboard'
        });
      }

      // Mock dashboard data - will be implemented with real data later
      const dashboardData = {
        ADMIN: {
          totalLoans: 150,
          totalAmount: 2500000,
          activeLoans: 120,
          expiredLoans: 15,
          totalBranches: 3,
          totalUsers: 25,
          todayTransactions: 12,
          monthlyRevenue: 125000
        },
        CASHIER: {
          newLoans: 8,
          redeemed: 5,
          partial: 3,
          additional: 2,
          renewed: 4,
          auctionSales: 1,
          todayTotal: 85000
        },
        APPRAISER: {
          itemsAppraised: 15,
          pendingAppraisals: 3,
          totalValue: 450000,
          categories: {
            jewelry: 8,
            appliances: 7
          }
        },
        MANAGER: {
          branchTransactions: 45,
          branchRevenue: 75000,
          vouchersIssued: 12,
          dailyReport: 'Generated',
          staffOnDuty: 8
        },
        AUCTIONEER: {
          expiredItems: 25,
          scheduledAuctions: 5,
          completedAuctions: 3,
          totalSales: 125000,
          pendingItems: 17
        }
      };

      res.json({
        success: true,
        data: dashboardData[userRole] || {}
      });

    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data'
      });
    }
  }
);

module.exports = router;