const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateTicketNumber } = require('../utils/transactionUtils');
const PenaltyCalculatorService = require('../services/penalty-calculator.service');

const router = express.Router();
const penaltyCalculator = new PenaltyCalculatorService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// TRANSACTIONS MANAGEMENT
// =============================================

// Search transaction by ticket number
router.get('/search/:ticketNumber', async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    
    console.log(`🔍 [${new Date().toISOString()}] Searching for ticket ${ticketNumber} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pt.*, 
             t.transaction_number, t.pawner_id, t.principal_amount, t.interest_rate,
             t.interest_amount, t.penalty_amount, t.service_charge, t.total_amount,
             t.maturity_date, t.expiry_date, t.transaction_date, t.status as transaction_status,
             t.balance, t.amount_paid, t.days_overdue,
             p.first_name, p.last_name, p.mobile_number, p.email,
             p.city_id, p.barangay_id, p.house_number, p.street,
             c.name as city_name, b.name as barangay_name,
             e.first_name as cashier_first_name, e.last_name as cashier_last_name,
             br.name as branch_name
      FROM pawn_tickets pt
      JOIN transactions t ON pt.transaction_id = t.id
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees e ON t.created_by = e.id
      WHERE pt.ticket_number = $1 AND pt.status IN ('active', 'matured')
    `, [ticketNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or not available for redemption'
      });
    }
    
    // Get items for this ticket with category and description details
    const itemsResult = await pool.query(`
      SELECT pi.*,
             cat.name as category_name,
             d.description_name,
             COALESCE(d.description_name, 'No description') as item_description
      FROM pawn_items pi
      LEFT JOIN categories cat ON pi.category_id = cat.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE pi.transaction_id = $1 
      ORDER BY pi.id
    `, [result.rows[0].transaction_id]);

    const row = result.rows[0];    res.json({
      success: true,
      message: 'Transaction found successfully',
      data: {
        id: row.id,
        ticketNumber: row.ticket_number,
        transactionNumber: row.ticket_number,
        pawnerId: row.pawner_id,
        branchId: row.branch_id,
        createdBy: row.created_by,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        loanDate: row.loan_date,
        dateGranted: row.loan_date,
        maturityDate: row.maturity_date,
        dateMatured: row.maturity_date,
        expiryDate: row.expiry_date,
        dateExpired: row.expiry_date,
        principalAmount: parseFloat(row.principal_amount || 0),
        principalLoan: parseFloat(row.principal_amount || 0),
        interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
        interestAmount: parseFloat(row.interest_amount || 0),
        serviceCharge: parseFloat(row.service_charge || 0),
        netProceeds: parseFloat(row.net_proceeds || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        paymentAmount: parseFloat(row.payment_amount || 0),
        balanceRemaining: parseFloat(row.balance_remaining || 0),
        dueAmount: parseFloat(row.due_amount || 0),
        additionalAmount: parseFloat(row.additional_amount || 0),
        renewalFee: parseFloat(row.renewal_fee || 0),
        penaltyAmount: parseFloat(row.penalty_amount || 0),
        penalty: parseFloat(row.penalty_amount || 0),
        status: row.status,
        loanStatus: row.status,
        redeemedDate: row.redeemed_date,
        renewedDate: row.renewed_date,
        defaultedDate: row.defaulted_date,
        parentTicketId: row.parent_ticket_id,
        approvedBy: row.approved_by,
        notes: row.notes,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Pawner information
        pawnerName: `${row.first_name} ${row.last_name}`,
        firstName: row.first_name,
        lastName: row.last_name,
        pawnerContact: row.mobile_number,
        contactNumber: row.mobile_number,
        pawnerEmail: row.email,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        completeAddress: `${row.house_number || ''} ${row.street || ''}`.trim(),
        // Branch information
        branchName: row.branch_name,
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Items - Updated for simplified schema
        items: itemsResult.rows.map(item => ({
          id: item.id,
          categoryId: item.category_id,
          category: item.category_name,
          categoryName: item.category_name,
          descriptionId: item.description_id,
          description: item.item_description,
          itemDescription: item.item_description,
          descriptionName: item.description_name,
          appraisalValue: parseFloat(item.appraised_value || 0),
          loanAmount: parseFloat(item.loan_amount || 0),
          appraisalNotes: item.appraisal_notes,
          notes: item.appraisal_notes,
          status: item.status,
          location: item.location,
          appraisedBy: item.appraised_by,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching transaction',
      error: error.message
    });
  }
});

// Get all transactions - Updated to use transactions table
router.get('/', async (req, res) => {
  try {
    console.log(`💰 [${new Date().toISOString()}] Fetching transactions - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT t.*, 
             p.first_name, p.last_name, p.mobile_number, p.email,
             p.city_id, p.barangay_id, p.house_number, p.street,
             c.name as city_name, b.name as barangay_name,
             e.first_name as cashier_first_name, e.last_name as cashier_last_name,
             br.name as branch_name,
             (
               SELECT json_agg(
                 json_build_object(
                   'id', pi.id,
                   'categoryId', pi.category_id,
                   'categoryName', cat.name,
                   'descriptionId', pi.description_id,
                   'descriptionName', d.description_name,
                   'appraisalNotes', pi.appraisal_notes,
                   'appraisedValue', pi.appraised_value,
                   'loanAmount', pi.loan_amount,
                   'status', pi.status
                 )
               )
               FROM pawn_items pi
               LEFT JOIN categories cat ON pi.category_id = cat.id
               LEFT JOIN descriptions d ON pi.description_id = d.id
               WHERE pi.transaction_id = t.id
             ) as items
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees e ON t.created_by = e.id
      ORDER BY t.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} transactions`);
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        ticketNumber: row.transaction_number,  // Map transaction_number to ticketNumber
        transactionNumber: row.transaction_number, // For compatibility
        loanNumber: row.loan_number,
        pawnerId: row.pawner_id,
        branchId: row.branch_id,
        createdBy: row.created_by,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        loanDate: row.granted_date || row.transaction_date,
        dateGranted: row.granted_date || row.transaction_date, // For compatibility
        maturityDate: row.maturity_date,
        dateMatured: row.maturity_date, // For compatibility
        expiryDate: row.expiry_date,
        dateExpired: row.expiry_date, // For compatibility
        principalAmount: parseFloat(row.principal_amount || 0),
        principalLoan: parseFloat(row.principal_amount || 0), // For compatibility
        interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
        interestAmount: parseFloat(row.interest_amount || 0),
        serviceCharge: parseFloat(row.service_charge || 0),
        netProceeds: parseFloat(row.principal_amount || 0) - parseFloat(row.service_charge || 0),
        netProceed: parseFloat(row.principal_amount || 0) - parseFloat(row.service_charge || 0), // For compatibility
        totalAmount: parseFloat(row.total_amount || 0),
        paymentAmount: parseFloat(row.amount_paid || 0),
        balanceRemaining: parseFloat(row.balance || 0),
        dueAmount: parseFloat(row.balance || 0),
        additionalAmount: 0,
        renewalFee: 0,
        penaltyAmount: parseFloat(row.penalty_amount || 0),
        penalty: parseFloat(row.penalty_amount || 0), // For compatibility
        status: row.status,
        loanStatus: row.status, // For compatibility
        redeemedDate: null,
        renewedDate: null,
        defaultedDate: null,
        parentTicketId: row.parent_transaction_id,
        approvedBy: row.approved_by,
        notes: row.notes,
        reason: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Pawner information
        pawnerName: `${row.first_name} ${row.last_name}`,
        pawnerContact: row.mobile_number,
        pawnerEmail: row.email,
        pawnerAddress: {
          city: row.city_name,
          barangay: row.barangay_name,
          details: `${row.house_number || ''} ${row.street || ''}`.trim()
        },
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Branch information
        branchName: row.branch_name,
        // Items information
        items: row.items || []
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

// Get transaction by ID - Updated to use transactions table
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`💰 [${new Date().toISOString()}] Fetching transaction ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT t.*, 
             p.first_name, p.last_name, p.mobile_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             br.name as branch_name
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Get items for this transaction with category and description names
    const itemsResult = await pool.query(`
      SELECT pi.*, 
             cat.name as category_name,
             d.description_name
      FROM pawn_items pi
      LEFT JOIN categories cat ON pi.category_id = cat.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE pi.transaction_id = $1 
      ORDER BY pi.id
    `, [id]);
    
    const row = result.rows[0];
    
    res.json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: {
        id: row.id,
        ticketNumber: row.ticket_number,
        transactionNumber: row.ticket_number, // For compatibility
        pawnerId: row.pawner_id,
        branchId: row.branch_id,
        createdBy: row.created_by,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        loanDate: row.loan_date,
        dateGranted: row.loan_date, // For compatibility
        maturityDate: row.maturity_date,
        dateMatured: row.maturity_date, // For compatibility
        expiryDate: row.expiry_date,
        dateExpired: row.expiry_date, // For compatibility
        principalAmount: parseFloat(row.principal_amount || 0),
        principalLoan: parseFloat(row.principal_amount || 0), // For compatibility
        interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
        interestAmount: parseFloat(row.interest_amount || 0),
        serviceCharge: parseFloat(row.service_charge || 0),
        netProceeds: parseFloat(row.net_proceeds || 0),
        netProceed: parseFloat(row.net_proceeds || 0), // For compatibility
        totalAmount: parseFloat(row.total_amount || 0),
        paymentAmount: parseFloat(row.payment_amount || 0),
        balanceRemaining: parseFloat(row.balance_remaining || 0),
        dueAmount: parseFloat(row.due_amount || 0),
        additionalAmount: parseFloat(row.additional_amount || 0),
        renewalFee: parseFloat(row.renewal_fee || 0),
        penaltyAmount: parseFloat(row.penalty_amount || 0),
        penalty: parseFloat(row.penalty_amount || 0), // For compatibility
        status: row.status,
        loanStatus: row.status, // For compatibility
        redeemedDate: row.redeemed_date,
        renewedDate: row.renewed_date,
        defaultedDate: row.defaulted_date,
        parentTicketId: row.parent_ticket_id,
        approvedBy: row.approved_by,
        notes: row.notes,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Pawner information
        pawnerName: `${row.first_name} ${row.last_name}`,
        pawnerContact: row.mobile_number,
        pawnerEmail: row.email,
        pawnerAddress: {
          city: row.city_name,
          barangay: row.barangay_name,
          details: `${row.house_number || ''} ${row.street || ''}`.trim()
        },
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Branch information
        branchName: row.branch_name,
        // Items information
        items: itemsResult.rows.map(item => ({
          id: item.id,
          categoryId: item.category_id,
          categoryName: item.category_name,
          descriptionId: item.description_id,
          descriptionName: item.description_name,
          category: item.category_name,
          description: item.description_name,
          itemDescription: item.description_name,
          appraisalNotes: item.appraisal_notes,
          notes: item.appraisal_notes,
          appraisalValue: parseFloat(item.appraised_value || 0),
          appraisedValue: parseFloat(item.appraised_value || 0),
          loanAmount: parseFloat(item.loan_amount || 0),
          status: item.status
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction'
    });
  }
});

// Create new loan transaction - Updated to use pawn_tickets table
router.post('/new-loan', async (req, res) => {
  try {
    const { 
      pawnerData,
      items,
      loanData,
      transactionDate,
      loanDate,
      maturityDate,
      expiryDate,
      notes 
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Creating new loan transaction - User: ${req.user.username}`);
    console.log('📋 Received data:', { pawnerData, items: items?.length, loanData });
    
    // Validate required fields
    if (!pawnerData || !items || !loanData || !loanData.principalLoan) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pawnerData, items, loanData.principalLoan'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Create or get pawner
      let pawnerId;
      if (pawnerData.id) {
        pawnerId = pawnerData.id;
      } else {
        // Create new pawner
        const pawnerResult = await client.query(`
          INSERT INTO pawners (
            first_name, last_name, mobile_number, email,
            city_id, barangay_id, house_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          pawnerData.firstName, pawnerData.lastName, pawnerData.contactNumber,
          pawnerData.email || null, pawnerData.cityId, pawnerData.barangayId,
          pawnerData.addressDetails || ''
        ]);
        pawnerId = pawnerResult.rows[0].id;
        console.log(`✅ Created new pawner: ${pawnerId}`);
      }
      
      // 2. Generate ticket number using configuration
      const branchId = req.user.branch_id || 1;
      
      const ticketNumber = await generateTicketNumber(branchId);
      
      // 3. Calculate dates
      const txnDate = transactionDate ? new Date(transactionDate) : new Date();
      const grantedDate = loanDate ? new Date(loanDate) : new Date();
      const maturedDate = maturityDate ? new Date(maturityDate) : (() => {
        const date = new Date(grantedDate);
        date.setMonth(date.getMonth() + 4); // 4 months maturity
        return date;
      })();
      const expiredDate = expiryDate ? new Date(expiryDate) : (() => {
        const date = new Date(maturedDate);
        date.setMonth(date.getMonth() + 1); // 1 month grace period
        return date;
      })();
      
      // 4. Calculate totals
      const totalAppraisal = items.reduce((sum, item) => sum + parseFloat(item.appraisalValue || 0), 0);
      const principalAmount = parseFloat(loanData.principalLoan);
      const interestRatePercent = parseFloat(loanData.interestRate || 3.0);
      const interestRate = interestRatePercent / 100; // Convert percentage to decimal (10% -> 0.10)
      const interestAmount = parseFloat(loanData.interestAmount || 0);
      const serviceCharge = parseFloat(loanData.serviceCharge || 0);
      const netProceeds = parseFloat(loanData.netProceeds || 0);
      const totalAmount = principalAmount + interestAmount + serviceCharge;
      
      // 5. Insert transaction record
      const transactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, maturity_date, expiry_date,
          notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        ticketNumber, pawnerId, req.user.branch_id || 1, 'new_loan', 'active',
        principalAmount, interestRate, interestAmount, serviceCharge, 
        totalAmount, totalAmount, txnDate, maturedDate, expiredDate,
        notes || '', req.user.id, new Date(), new Date()
      ]);
      
      const transaction = transactionResult.rows[0];
      console.log(`✅ Created transaction: ${ticketNumber}`);
      
      // 6. Insert pawn ticket (for printing management)
      const ticketResult = await client.query(`
        INSERT INTO pawn_tickets (
          transaction_id, ticket_number, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        transaction.id, ticketNumber, 'active', new Date(), new Date()
      ]);
      
      const ticket = ticketResult.rows[0];
      console.log(`✅ Created pawn ticket: ${ticketNumber}`);
      
      // 7. Insert pawn items  
      for (const item of items) {
        // Get category_id from category name
        const categoryResult = await client.query('SELECT id FROM categories WHERE name = $1', [item.category]);
        const categoryId = categoryResult.rows[0]?.id || 1; // Default to category 1 if not found
        
        // Get description_id from categoryDescription if it matches a description name
        let descriptionId = null;
        if (item.categoryDescription) {
          const descResult = await client.query(
            'SELECT id FROM descriptions WHERE description_name = $1 AND category_id = $2', 
            [item.categoryDescription, categoryId]
          );
          descriptionId = descResult.rows[0]?.id || null;
        }
        
        await client.query(`
          INSERT INTO pawn_items (
            transaction_id, category_id, description_id, appraisal_notes, 
            appraised_value, loan_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          transaction.id,               // transaction_id (use transaction id, not ticket id)
          categoryId,                   // category_id 
          descriptionId,                // description_id (if found)
          item.description || item.categoryDescription || '', // appraisal_notes
          parseFloat(item.appraisalValue), // appraised_value
          parseFloat(item.appraisalValue), // loan_amount (same as appraised for now)
          'in_vault'                    // status - must use constraint-allowed value
        ]);
      }
      console.log(`✅ Added ${items.length} items to ticket`);
      
      // 8. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, new_values
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'transactions',
        transaction.id,
        'CREATE',
        req.user.id,
        JSON.stringify(transaction)
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ New loan transaction completed: ${ticketNumber}`);
      
      res.json({
        success: true,
        message: 'New loan created successfully',
        data: {
          ticket,
          ticketNumber,
          pawnerId,
          totalAppraisal,
          itemCount: items.length
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error creating new loan:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating new loan',
      error: error.message
    });
  }
});

// Redeem transaction - Customer redeems their pawned items
router.post('/redeem', async (req, res) => {
  try {
    const { 
      ticketId,
      redeemAmount,
      penaltyAmount,
      discountAmount,
      totalDue,
      notes 
    } = req.body;
    
    console.log(`🔄 [${new Date().toISOString()}] Processing redeem transaction - User: ${req.user.username}`);
    console.log('📋 Redeem data:', { ticketId, redeemAmount, penaltyAmount, discountAmount, totalDue });
    
    // Validate required fields
    if (!ticketId || !redeemAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ticketId, redeemAmount'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get current ticket details
      const ticketResult = await client.query(`
        SELECT * FROM pawn_tickets WHERE id = $1 AND status IN ('active', 'overdue')
      `, [ticketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const ticket = ticketResult.rows[0];
      
      // 2. Update ticket with redeem information
      await client.query(`
        UPDATE pawn_tickets SET
          status = 'redeemed',
          redeem_amount = $1,
          penalty_amount = $2,
          discount_amount = $3,
          payment_amount = $4,
          balance_remaining = 0,
          redeemed_date = CURRENT_TIMESTAMP,
          notes = COALESCE(notes, '') || $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [
        parseFloat(redeemAmount),
        parseFloat(penaltyAmount || 0),
        parseFloat(discountAmount || 0),
        parseFloat(redeemAmount),
        notes ? `\nRedeemed: ${notes}` : '\nRedeemed',
        ticketId
      ]);
      
      // 3. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, old_values, new_values
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'pawn_tickets',
        ticketId,
        'UPDATE',
        req.user.id,
        JSON.stringify({ status: ticket.status }),
        JSON.stringify({ 
          status: 'redeemed', 
          redeem_amount: redeemAmount,
          penalty_amount: penaltyAmount,
          discount_amount: discountAmount
        })
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Redeem transaction completed for ticket: ${ticket.ticket_number}`);
      
      res.json({
        success: true,
        message: 'Item redeemed successfully',
        data: {
          ticketId,
          ticketNumber: ticket.ticket_number,
          redeemAmount: parseFloat(redeemAmount),
          penaltyAmount: parseFloat(penaltyAmount || 0),
          discountAmount: parseFloat(discountAmount || 0),
          status: 'redeemed'
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error processing redeem:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing redeem transaction',
      error: error.message
    });
  }
});

// Partial payment transaction - Customer makes partial payment
router.post('/partial-payment', async (req, res) => {
  try {
    const { 
      ticketId,
      partialPayment,
      newPrincipalLoan,
      discountAmount,
      advanceInterest,
      netPayment,
      notes 
    } = req.body;
    
    console.log(`💰 [${new Date().toISOString()}] Processing partial payment - User: ${req.user.username}`);
    console.log('📋 Partial payment data:', { ticketId, partialPayment, newPrincipalLoan, discountAmount });
    
    // Validate required fields
    if (!ticketId || !partialPayment || !newPrincipalLoan) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ticketId, partialPayment, newPrincipalLoan'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get current ticket details
      const ticketResult = await client.query(`
        SELECT * FROM pawn_tickets WHERE id = $1 AND status IN ('active', 'overdue')
      `, [ticketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const ticket = ticketResult.rows[0];
      const currentBalance = parseFloat(ticket.balance_remaining || ticket.total_amount);
      const paymentAmt = parseFloat(partialPayment);
      const newPrincipal = parseFloat(newPrincipalLoan);
      const discount = parseFloat(discountAmount || 0);
      const advance = parseFloat(advanceInterest || 0);
      const netPay = parseFloat(netPayment || paymentAmt);
      
      // 2. Calculate new balance
      const newBalance = Math.max(0, currentBalance - paymentAmt);
      
      // 3. Update ticket with partial payment information
      await client.query(`
        UPDATE pawn_tickets SET
          partial_payment = COALESCE(partial_payment, 0) + $1,
          new_principal_loan = $2,
          discount_amount = COALESCE(discount_amount, 0) + $3,
          advance_interest = COALESCE(advance_interest, 0) + $4,
          net_payment = COALESCE(net_payment, 0) + $5,
          payment_amount = COALESCE(payment_amount, 0) + $6,
          balance_remaining = $7,
          principal_amount = $8,
          notes = COALESCE(notes, '') || $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `, [
        paymentAmt,
        newPrincipal,
        discount,
        advance,
        netPay,
        paymentAmt,
        newBalance,
        newPrincipal,
        notes ? `\nPartial payment: ${notes}` : `\nPartial payment of ${paymentAmt}`,
        ticketId
      ]);
      
      // 4. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, old_values, new_values
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'pawn_tickets',
        ticketId,
        'UPDATE',
        req.user.id,
        JSON.stringify({ 
          balance_remaining: currentBalance,
          principal_amount: ticket.principal_amount
        }),
        JSON.stringify({ 
          partial_payment: paymentAmt,
          new_principal_loan: newPrincipal,
          balance_remaining: newBalance
        })
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Partial payment completed for ticket: ${ticket.ticket_number}`);
      
      res.json({
        success: true,
        message: 'Partial payment processed successfully',
        data: {
          ticketId,
          ticketNumber: ticket.ticket_number,
          partialPayment: paymentAmt,
          newPrincipalLoan: newPrincipal,
          discountAmount: discount,
          advanceInterest: advance,
          netPayment: netPay,
          remainingBalance: newBalance,
          status: ticket.status
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error processing partial payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing partial payment',
      error: error.message
    });
  }
});

// Additional loan transaction - Customer gets additional loan on existing items
router.post('/additional-loan', async (req, res) => {
  try {
    const { 
      originalTicketId,
      additionalAmount,
      newInterestRate,
      newServiceCharge,
      newMaturityDate,
      newExpiryDate,
      notes 
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Processing additional loan - User: ${req.user.username}`);
    console.log('📋 Additional loan data:', { originalTicketId, additionalAmount, newInterestRate });
    
    // Validate required fields
    if (!originalTicketId || !additionalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: originalTicketId, additionalAmount'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get original ticket details
      const ticketResult = await client.query(`
        SELECT pt.*, t.pawner_id, t.branch_id, t.principal_amount, t.interest_rate, t.total_amount
        FROM pawn_tickets pt 
        JOIN transactions t ON pt.transaction_id = t.id 
        WHERE pt.id = $1 AND t.status = 'active'
      `, [originalTicketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const originalTicket = ticketResult.rows[0];
      
      // 2. Generate new ticket number for additional loan
      const branchId = originalTicket.branch_id;
      
      const newTicketNumber = await generateTicketNumber(branchId);
      
      // 3. Calculate new amounts
      const addAmount = parseFloat(additionalAmount);
      const currentPrincipal = parseFloat(originalTicket.principal_amount);
      const newPrincipal = currentPrincipal + addAmount;
      const interestRateDecimal = newInterestRate ? parseFloat(newInterestRate) / 100 : parseFloat(originalTicket.interest_rate);
      const serviceCharge = parseFloat(newServiceCharge || 0);
      const interestAmount = newPrincipal * interestRateDecimal;
      const totalAmount = newPrincipal + interestAmount + serviceCharge;
      const netProceeds = addAmount - serviceCharge;
      
      // 4. Calculate new dates
      const maturityDate = newMaturityDate ? new Date(newMaturityDate) : (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 4);
        return date;
      })();
      const expiryDate = newExpiryDate ? new Date(newExpiryDate) : (() => {
        const date = new Date(maturityDate);
        date.setMonth(date.getMonth() + 1);
        return date;
      })();
      
      // 5. Create new transaction for additional loan
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, maturity_date, expiry_date,
          parent_transaction_id, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        newTicketNumber, originalTicket.pawner_id, originalTicket.branch_id, 'additional_loan', 'active',
        newPrincipal, interestRateDecimal, interestAmount, serviceCharge,
        totalAmount, totalAmount, new Date(), maturityDate, expiryDate,
        originalTicket.transaction_id, notes || `Additional loan of ${addAmount} on ticket ${originalTicket.ticket_number}`,
        req.user.id, new Date(), new Date()
      ]);
      
      const newTransaction = newTransactionResult.rows[0];
      
      // 6. Create new pawn ticket (for printing)
      const newTicketResult = await client.query(`
        INSERT INTO pawn_tickets (
          transaction_id, ticket_number, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newTransaction.id, newTicketNumber, 'active', new Date(), new Date()
      ]);
      
      const newTicket = newTicketResult.rows[0];
      
      // 6. Copy items from original ticket to new ticket
      await client.query(`
        INSERT INTO pawn_items (ticket_id, category, category_description, description, appraisal_value)
        SELECT $1, category, category_description, description, appraisal_value
        FROM pawn_items WHERE ticket_id = $2
      `, [newTicket.id, originalTicketId]);
      
      // 7. Update original ticket status
      await client.query(`
        UPDATE pawn_tickets SET
          status = 'replaced_by_additional',
          additional_amount = $1,
          notes = COALESCE(notes, '') || $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [
        addAmount,
        `\nReplaced by additional loan ticket: ${newTicketNumber}`,
        originalTicketId
      ]);
      
      // 8. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, new_values
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'pawn_tickets',
        newTicket.id,
        'CREATE',
        req.user.id,
        JSON.stringify(newTicket)
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Additional loan completed - New ticket: ${newTicketNumber}`);
      
      res.json({
        success: true,
        message: 'Additional loan processed successfully',
        data: {
          originalTicketId,
          originalTicketNumber: originalTicket.ticket_number,
          newTicketId: newTicket.id,
          newTicketNumber,
          additionalAmount: addAmount,
          newPrincipalAmount: newPrincipal,
          netProceeds,
          status: 'active'
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error processing additional loan:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing additional loan',
      error: error.message
    });
  }
});

// Renew transaction - Customer renews their loan for another term
router.post('/renew', async (req, res) => {
  try {
    const { 
      ticketId,
      renewalFee,
      newInterestRate,
      newMaturityDate,
      newExpiryDate,
      notes 
    } = req.body;
    
    console.log(`🔄 [${new Date().toISOString()}] Processing renewal - User: ${req.user.username}`);
    console.log('📋 Renewal data:', { ticketId, renewalFee, newInterestRate });
    
    // Validate required fields
    if (!ticketId || !renewalFee) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ticketId, renewalFee'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get current ticket details
      const ticketResult = await client.query(`
        SELECT * FROM pawn_tickets WHERE id = $1 AND status IN ('active', 'overdue')
      `, [ticketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const ticket = ticketResult.rows[0];
      
      // 2. Calculate new dates
      const currentMaturity = new Date(ticket.maturity_date);
      const maturityDate = newMaturityDate ? new Date(newMaturityDate) : (() => {
        const date = new Date(currentMaturity);
        date.setMonth(date.getMonth() + 4); // Extend by 4 months
        return date;
      })();
      const expiryDate = newExpiryDate ? new Date(newExpiryDate) : (() => {
        const date = new Date(maturityDate);
        date.setMonth(date.getMonth() + 1); // 1 month grace period
        return date;
      })();
      
      // 3. Calculate new amounts
      const renewFee = parseFloat(renewalFee);
      const interestRate = parseFloat(newInterestRate || ticket.interest_rate);
      const principalAmount = parseFloat(ticket.principal_amount);
      const newInterestAmount = (principalAmount * interestRate) / 100;
      const newTotalAmount = principalAmount + newInterestAmount + renewFee;
      
      // 4. Update ticket with renewal information
      await client.query(`
        UPDATE pawn_tickets SET
          status = 'active',
          maturity_date = $1,
          expiry_date = $2,
          interest_rate = $3,
          interest_amount = $4,
          renewal_fee = COALESCE(renewal_fee, 0) + $5,
          total_amount = $6,
          due_amount = $7,
          balance_remaining = $8,
          renewed_date = CURRENT_TIMESTAMP,
          notes = COALESCE(notes, '') || $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `, [
        maturityDate,
        expiryDate,
        interestRate,
        newInterestAmount,
        renewFee,
        newTotalAmount,
        newTotalAmount,
        newTotalAmount,
        notes ? `\nRenewed: ${notes}` : `\nRenewed with fee: ${renewFee}`,
        ticketId
      ]);
      
      // 5. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, old_values, new_values
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'pawn_tickets',
        ticketId,
        'UPDATE',
        req.user.id,
        JSON.stringify({ 
          maturity_date: ticket.maturity_date,
          expiry_date: ticket.expiry_date,
          total_amount: ticket.total_amount
        }),
        JSON.stringify({ 
          maturity_date: maturityDate,
          expiry_date: expiryDate,
          renewal_fee: renewFee,
          total_amount: newTotalAmount
        })
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Renewal completed for ticket: ${ticket.ticket_number}`);
      
      res.json({
        success: true,
        message: 'Loan renewed successfully',
        data: {
          ticketId,
          ticketNumber: ticket.ticket_number,
          renewalFee: renewFee,
          newMaturityDate: maturityDate,
          newExpiryDate: expiryDate,
          newTotalAmount: newTotalAmount,
          interestRate: interestRate,
          status: 'active'
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error processing renewal:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing renewal transaction',
      error: error.message
    });
  }
});

module.exports = router;