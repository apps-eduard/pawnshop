const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { pool } = require('../config/database');
const { updateExpiredTransactions } = require('../utils/updateExpiredTransactions');

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
    
    // First, update any transactions that have expired
    await updateExpiredTransactions();
    
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.custom_description,
        pi.appraised_value,
        pi.loan_amount,
        pi.auction_price,
        pi.status,
        t.id as transaction_id,
        t.transaction_number as ticket_number,
        t.tracking_number,
        t.expiry_date as expired_date,
        t.principal_amount,
        p.first_name, 
        p.last_name,
        c.name as category,
        d.name as description_name,
        d.description as description_text
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status IN ('active', 'expired')
      ORDER BY t.expiry_date DESC
    `);
    
    const expiredItems = result.rows.map(row => {
      // Build item description from available fields
      let itemDesc = row.custom_description;
      if (!itemDesc || itemDesc.trim() === '') {
        // Priority: description_name > description_text > category
        itemDesc = row.description_name || row.description_text || row.category || 'Item';
      }
      
      return {
        id: row.id,
        transactionId: row.transaction_id,
        ticketNumber: row.ticket_number,
        trackingNumber: row.tracking_number || row.ticket_number,
        itemDescription: itemDesc,
        descriptionName: row.description_name || null,  // Added for descriptions table
        pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'N/A',
        appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
        loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : 0,
        currentPrincipal: row.principal_amount ? parseFloat(row.principal_amount) : 0,
        expiredDate: row.expired_date,
        category: row.category || 'N/A',
        auctionPrice: row.auction_price ? parseFloat(row.auction_price) : null,
        isSetForAuction: !!row.auction_price
      };
    });
    
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

// Get transaction history for expired item (for auction pricing decision)
router.get('/expired/:itemId/history', async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log(`📜 [${new Date().toISOString()}] Fetching transaction history for item ${itemId} - User: ${req.user.username}`);
    
    // Get the item's transaction to find tracking number
    const itemResult = await pool.query(`
      SELECT t.tracking_number, t.transaction_number
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      WHERE pi.id = $1
    `, [itemId]);
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const trackingNumber = itemResult.rows[0].tracking_number || itemResult.rows[0].transaction_number;
    
    // Get all transactions in the chain
    const historyResult = await pool.query(`
      SELECT 
        t.id,
        t.transaction_number,
        t.tracking_number,
        t.previous_transaction_number,
        t.transaction_type,
        t.transaction_date,
        t.maturity_date,
        t.expiry_date,
        t.principal_amount,
        t.interest_rate,
        t.interest_amount,
        t.service_charge,
        t.total_amount,
        t.amount_paid,
        t.balance,
        t.discount_amount,
        t.advance_interest,
        t.new_principal_loan,
        t.status,
        t.notes
      FROM transactions t
      WHERE t.tracking_number = $1
      ORDER BY t.transaction_date ASC
    `, [trackingNumber]);
    
    const transactionHistory = historyResult.rows.map(row => ({
      id: row.id,
      transactionNumber: row.transaction_number,
      trackingNumber: row.tracking_number,
      previousTransactionNumber: row.previous_transaction_number,
      transactionType: row.transaction_type,
      transactionDate: row.transaction_date,
      maturityDate: row.maturity_date,
      expiryDate: row.expiry_date,
      principalAmount: parseFloat(row.principal_amount || 0),
      interestRate: parseFloat(row.interest_rate || 0) * 100,
      interestAmount: parseFloat(row.interest_amount || 0),
      serviceCharge: parseFloat(row.service_charge || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      amountPaid: parseFloat(row.amount_paid || 0),
      balance: parseFloat(row.balance || 0),
      discountAmount: parseFloat(row.discount_amount || 0),
      advanceInterest: parseFloat(row.advance_interest || 0),
      newPrincipalLoan: row.new_principal_loan ? parseFloat(row.new_principal_loan) : null,
      status: row.status,
      notes: row.notes
    }));
    
    console.log(`✅ Found ${transactionHistory.length} transactions in chain for item ${itemId}`);
    
    res.json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        trackingNumber: trackingNumber,
        transactionCount: transactionHistory.length,
        history: transactionHistory
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
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
        c.name as category,
        d.name as description_name,
        d.description as description_text
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE t.expiry_date < CURRENT_DATE
        AND pi.status = 'in_vault'
        AND t.status IN ('active', 'expired')
        AND pi.auction_price IS NOT NULL
        AND pi.auction_price > 0
      ORDER BY t.expiry_date DESC
    `);
    
    const auctionItems = result.rows.map(row => {
      // Build item description from available fields
      let itemDesc = row.custom_description;
      if (!itemDesc || itemDesc.trim() === '') {
        // Priority: description_name > description_text > category
        itemDesc = row.description_name || row.description_text || row.category || 'Item';
      }
      
      return {
        id: row.id,
        ticketNumber: row.ticket_number,
        itemDescription: itemDesc,
        descriptionName: row.description_name || null,
        pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'N/A',
        appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
        loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : 0,
        auctionPrice: row.auction_price ? parseFloat(row.auction_price) : 0,
        expiredDate: row.expired_date,
        grantedDate: row.granted_date,
        category: row.category || 'N/A',
        status: 'available' // Items set for auction are available for sale
      };
    });
    
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

// Validate auction item availability before sale
router.get('/for-auction/validate/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log(`✅ [${new Date().toISOString()}] Validating auction item ${itemId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT 
        pi.id, 
        pi.custom_description,
        pi.auction_price,
        pi.status,
        t.status as transaction_status,
        t.expiry_date
      FROM pawn_items pi
      LEFT JOIN transactions t ON pi.transaction_id = t.id
      WHERE pi.id = $1
    `, [itemId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
        code: 'ITEM_NOT_FOUND'
      });
    }
    
    const item = result.rows[0];
    
    // Validation checks
    const validationErrors = [];
    
    if (!item.auction_price || item.auction_price <= 0) {
      validationErrors.push('Item does not have a valid auction price set');
    }
    
    if (item.status !== 'in_vault') {
      validationErrors.push(`Item status is "${item.status}", expected "in_vault"`);
    }
    
    if (!['active', 'expired'].includes(item.transaction_status)) {
      validationErrors.push(`Transaction status is "${item.transaction_status}", expected "active" or "expired"`);
    }
    
    const isExpired = new Date(item.expiry_date) < new Date();
    if (!isExpired) {
      validationErrors.push('Item is not expired yet');
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Item is not available for auction',
        code: 'VALIDATION_FAILED',
        errors: validationErrors
      });
    }
    
    // Item is valid for auction
    res.json({
      success: true,
      message: 'Item is valid for auction',
      data: {
        id: item.id,
        description: item.custom_description,
        auctionPrice: parseFloat(item.auction_price),
        status: item.status,
        isValid: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error validating auction item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate auction item',
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

// Remove auction price (unset from auction)
router.post('/remove-auction-price', authorizeRoles('administrator', 'admin', 'manager', 'auctioneer'), async (req, res) => {
  try {
    const { itemId } = req.body;
    
    console.log(`🚫 [${new Date().toISOString()}] Removing auction price for item ${itemId} - User: ${req.user.username}`);
    
    // Validate input
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid itemId'
      });
    }
    
    // Check if item exists
    const checkResult = await pool.query(`
      SELECT pi.id, pi.auction_price
      FROM pawn_items pi
      WHERE pi.id = $1
    `, [itemId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const item = checkResult.rows[0];
    
    // Check if auction price is already null
    if (!item.auction_price) {
      return res.status(400).json({
        success: false,
        message: 'Item does not have an auction price set'
      });
    }
    
    // Remove auction price (set to NULL)
    const updateResult = await pool.query(`
      UPDATE pawn_items
      SET auction_price = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [itemId]);
    
    console.log(`✅ Auction price removed for item ${itemId} - returned to pending status`);
    
    res.json({
      success: true,
      message: 'Auction price removed successfully. Item returned to pending status.',
      data: {
        itemId: updateResult.rows[0].id
      }
    });
    
  } catch (error) {
    console.error('❌ Error removing auction price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove auction price',
      error: error.message
    });
  }
});

// Process auction sale
router.post('/for-auction/confirm-sale', async (req, res) => {
  try {
    const {
      itemId,
      buyerName,
      buyerContact,
      saleNotes,
      discountAmount,
      finalPrice,
      receivedAmount,
      changeAmount
    } = req.body;
    
    console.log(`✅ [${new Date().toISOString()}] Processing auction sale for item ${itemId} - User: ${req.user.username}`);
    
    // Validate required fields
    if (!itemId || !buyerName || !buyerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and buyer name are required'
      });
    }
    
    if (finalPrice === undefined || finalPrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Final price is required'
      });
    }
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify item exists and is available for sale
      const itemCheck = await client.query(`
        SELECT 
          pi.id,
          pi.status,
          pi.auction_price,
          t.status as transaction_status
        FROM pawn_items pi
        LEFT JOIN transactions t ON pi.transaction_id = t.id
        WHERE pi.id = $1
      `, [itemId]);
      
      if (itemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      const item = itemCheck.rows[0];
      
      // Validate item can be sold
      if (item.status === 'sold') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Item has already been sold'
        });
      }
      
      if (item.status === 'redeemed') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Item has been redeemed and cannot be sold'
        });
      }
      
      // Update pawn_items with sale information
      const updateResult = await client.query(`
        UPDATE pawn_items
        SET 
          status = 'sold',
          buyer_name = $1,
          buyer_contact = $2,
          sale_notes = $3,
          discount_amount = $4,
          final_price = $5,
          received_amount = $6,
          change_amount = $7,
          sold_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `, [
        buyerName.trim(),
        buyerContact || null,
        saleNotes || null,
        discountAmount || 0,
        finalPrice,
        receivedAmount || 0,
        changeAmount || 0,
        itemId
      ]);
      
      // Update transaction status if needed
      if (item.transaction_status === 'active') {
        await client.query(`
          UPDATE transactions
          SET 
            status = 'closed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT transaction_id FROM pawn_items WHERE id = $1)
        `, [itemId]);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Sale completed for item ${itemId} - Buyer: ${buyerName}`);
      
      res.json({
        success: true,
        message: 'Sale completed successfully',
        data: {
          item: updateResult.rows[0],
          saleDetails: {
            itemId,
            buyerName,
            buyerContact,
            auctionPrice: item.auction_price,
            discountAmount: discountAmount || 0,
            finalPrice,
            receivedAmount: receivedAmount || 0,
            changeAmount: changeAmount || 0,
            soldDate: new Date().toISOString().split('T')[0]
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error processing auction sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sale',
      error: error.message
    });
  }
});

module.exports = router;
