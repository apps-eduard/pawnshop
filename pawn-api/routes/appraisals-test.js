const express = require('express');
const router = express.Router();

// Simple test route that just returns static data
router.get('/status/:status', async (req, res) => {
  try {
    console.log('Test route called with status:', req.params.status);
    res.json({
      success: true,
      data: [
        {
          id: 1,
          pawnerName: 'Test Pawner',
          category: 'Test Category',
          status: req.params.status
        }
      ]
    });
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;