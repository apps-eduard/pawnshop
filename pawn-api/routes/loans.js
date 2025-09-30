const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Loans endpoint - Coming soon' });
});

router.post('/', authorizeRoles('CASHIER', 'ADMIN'), (req, res) => {
  res.json({ success: true, message: 'Create loan endpoint - Coming soon' });
});

router.put('/:id', authorizeRoles('CASHIER', 'ADMIN'), (req, res) => {
  res.json({ success: true, message: 'Update loan endpoint - Coming soon' });
});

module.exports = router;