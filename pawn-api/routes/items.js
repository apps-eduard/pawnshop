const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all items
router.get('/', async (req, res) => {
  try {
    console.log(`🔍 [${new Date().toISOString()}] Fetching items - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pi.id, pi.custom_description, 
             pi.appraised_value, pi.loan_amount,
             pi.appraisal_notes,
             pi.status, pi.location, pi.created_at,
             t.transaction_number, t.principal_amount, t.status as transaction_status,
             p.first_name, p.last_name, p.mobile_number,
             c.name as category_name,
             d.name as description_name,
             d.description as description_text
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      ORDER BY pi.created_at DESC
    `);
    
    const items = result.rows.map(row => ({
      id: row.id,
      description: row.custom_description || row.description_name || row.description_text,
      categoryName: row.category_name,
      appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : null,
      loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : null,
      conditionNotes: row.appraisal_notes,
      status: row.status,
      location: row.location,
      createdAt: row.created_at,
      transactionNumber: row.transaction_number,
      principalAmount: row.principal_amount ? parseFloat(row.principal_amount) : null,
      transactionStatus: row.transaction_status,
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      pawnerContact: row.mobile_number
    }));
    
    console.log(`✅ Found ${items.length} items`);
    
    res.json({
      success: true,
      message: 'Items retrieved successfully',
      data: items
    });
    
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// Get expired pawn items (for auction) - MUST BE BEFORE /:id route
router.get('/expired', async (req, res) => {
  try {
    console.log(`⏰ [${new Date().toISOString()}] Fetching expired items - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.custom_description,
        pi.appraised_value,
        pi.loan_amount,
        pi.auction_price,
        pi.status,
        t.transaction_number as ticket_number,
        t.expiry_date as expired_date,
        p.first_name, 
        p.last_name,
        c.name as category
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status IN ('active', 'expired')
      ORDER BY t.expiry_date DESC
    `);
    
    const expiredItems = result.rows.map(row => ({
      id: row.id,
      ticketNumber: row.ticket_number,
      itemDescription: row.custom_description || 'N/A',
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'N/A',
      appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
      loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : 0,
      expiredDate: row.expired_date,
      category: row.category || 'N/A',
      auctionPrice: row.auction_price ? parseFloat(row.auction_price) : null,
      isSetForAuction: !!row.auction_price
    }));
    
    console.log(`✅ Found ${expiredItems.length} expired items`);
    
    res.json({
      success: true,
      message: 'Expired items retrieved successfully',
      data: expiredItems
    });
    
  } catch (error) {
    console.error('❌ Error fetching expired items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expired items',
      error: error.message
    });
  }
});

// Get items ready for auction (expired items with auction_price set)
router.get('/for-auction/list', async (req, res) => {
  try {
    console.log(`🔨 [${new Date().toISOString()}] Fetching items ready for auction - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.custom_description,
        pi.appraised_value,
        pi.loan_amount,
        pi.auction_price,
        pi.status,
        t.transaction_number as ticket_number,
        t.expiry_date as expired_date,
        t.granted_date,
        p.first_name, 
        p.last_name,
        c.name as category
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status IN ('active', 'expired')
        AND pi.auction_price IS NOT NULL
        AND pi.auction_price > 0
      ORDER BY t.expiry_date DESC
    `);
    
    const auctionItems = result.rows.map(row => ({
      id: row.id,
      ticketNumber: row.ticket_number,
      itemDescription: row.custom_description || 'N/A',
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'N/A',
      appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
      loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : 0,
      auctionPrice: row.auction_price ? parseFloat(row.auction_price) : 0,
      expiredDate: row.expired_date,
      grantedDate: row.granted_date,
      category: row.category || 'N/A',
      status: 'available' // Items set for auction are available for sale
    }));
    
    console.log(`✅ Found ${auctionItems.length} items ready for auction`);
    
    res.json({
      success: true,
      message: 'Auction items retrieved successfully',
      data: auctionItems
    });
    
  } catch (error) {
    console.error('❌ Error fetching auction items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction items',
      error: error.message
    });
  }
});

// Get single item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [${new Date().toISOString()}] Fetching item ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pi.id, pi.transaction_id, pi.custom_description, 
             pi.appraised_value, pi.loan_amount, pi.appraisal_notes, 
             pi.status, pi.location, pi.created_at,
             t.transaction_number, t.principal_amount, t.status as transaction_status,
             p.id as pawner_id, p.first_name, p.last_name, p.mobile_number,
             c.name as category_name
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      WHERE pi.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const row = result.rows[0];
    const item = {
      id: row.id,
      transactionId: row.transaction_id,
      description: row.custom_description,
      categoryName: row.category_name,
      appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : null,
      loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : null,
      conditionNotes: row.appraisal_notes,
      status: row.status,
      location: row.location,
      createdAt: row.created_at,
      transactionNumber: row.transaction_number,
      principalAmount: row.principal_amount ? parseFloat(row.principal_amount) : null,
      transactionStatus: row.transaction_status,
      pawnerId: row.pawner_id,
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      pawnerContact: row.mobile_number
    };
    
    res.json({
      success: true,
      message: 'Item retrieved successfully',
      data: item
    });
    
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

// Create new item - DISABLED (schema mismatch)
router.post('/', authorizeRoles(['administrator', 'manager']), async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Create item endpoint disabled - schema update required'
  });
});

// Update item - DISABLED (schema mismatch)
router.put('/:id', authorizeRoles(['administrator', 'manager']), async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Update item endpoint disabled - schema update required'
  });
});

// Delete item
router.delete('/:id', authorizeRoles(['administrator']), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting item ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM pawn_items WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    console.log(`✅ Deleted item ${id}`);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
});

// Get items by ticket ID - DISABLED (no ticket_id in current schema)
router.get('/ticket/:ticketId', async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get items by ticket endpoint disabled - use transaction_id instead'
  });
});

// Set auction price for an expired item
router.post('/set-auction-price', authorizeRoles('administrator', 'admin', 'manager', 'auctioneer'), async (req, res) => {
  try {
    const { itemId, auctionPrice } = req.body;
    
    console.log(`💰 [${new Date().toISOString()}] Setting auction price for item ${itemId}: ₱${auctionPrice} - User: ${req.user.username}`);
    
    // Validate input
    if (!itemId || !auctionPrice || auctionPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid itemId or auctionPrice'
      });
    }
    
    // Check if item exists and is expired
    const checkResult = await pool.query(`
      SELECT pi.id, t.expiry_date, t.status as transaction_status
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      WHERE pi.id = $1
    `, [itemId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const item = checkResult.rows[0];
    const isExpired = new Date(item.expiry_date) < new Date();
    
    if (!isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Item is not expired yet. Cannot set auction price.'
      });
    }
    
    // Update auction price
    const updateResult = await pool.query(`
      UPDATE pawn_items
      SET auction_price = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, auction_price
    `, [auctionPrice, itemId]);
    
    console.log(`✅ Auction price set for item ${itemId}: ₱${auctionPrice}`);
    
    res.json({
      success: true,
      message: 'Auction price set successfully',
      data: {
        itemId: updateResult.rows[0].id,
        auctionPrice: parseFloat(updateResult.rows[0].auction_price)
      }
    });
    
  } catch (error) {
    console.error('❌ Error setting auction price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set auction price',
      error: error.message
    });
  }
});

module.exports = router;
