const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Vouchers endpoint - Coming soon' });
});

router.post('/', authorizeRoles('MANAGER', 'ADMIN'), (req, res) => {
  res.json({ success: true, message: 'Create voucher endpoint - Coming soon' });
});

module.exports = router;