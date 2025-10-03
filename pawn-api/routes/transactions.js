const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             br.name as branch_name
      FROM pawn_tickets pt
      JOIN pawners p ON pt.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON pt.branch_id = br.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.ticket_number = $1 AND pt.status IN ('active', 'matured')
    `, [ticketNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or not available for redemption'
      });
    }
    
    // Get items for this ticket
    const itemsResult = await pool.query(`
      SELECT * FROM pawn_items WHERE ticket_id = $1 ORDER BY id
    `, [result.rows[0].id]);
    
    const row = result.rows[0];
    
    res.json({
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
        interestRate: parseFloat(row.interest_rate || 0),
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
        pawnerContact: row.contact_number,
        contactNumber: row.contact_number,
        pawnerEmail: row.email,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        completeAddress: row.address_details,
        // Branch information
        branchName: row.branch_name,
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Items
        items: itemsResult.rows.map(item => ({
          id: item.id,
          category: item.category,
          categoryDescription: item.category_description,
          description: item.description,
          itemsDescription: item.description,
          appraisalValue: parseFloat(item.appraisal_value || 0),
          estimatedValue: parseFloat(item.estimated_value || 0)
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

// Get all transactions - Updated to use pawn_tickets table
router.get('/', async (req, res) => {
  try {
    console.log(`💰 [${new Date().toISOString()}] Fetching transactions - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pt.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             b.name as branch_name
      FROM pawn_tickets pt
      JOIN pawners p ON pt.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON pt.branch_id = br.id
      LEFT JOIN users u ON pt.created_by = u.id
      ORDER BY pt.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} transactions`);
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result.rows.map(row => ({
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
        interestRate: parseFloat(row.interest_rate || 0),
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
        pawnerContact: row.contact_number,
        pawnerEmail: row.email,
        pawnerAddress: {
          city: row.city_name,
          barangay: row.barangay_name,
          details: row.address_details
        },
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Branch information
        branchName: row.branch_name
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

// Get transaction by ID - Updated to use pawn_tickets table
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`💰 [${new Date().toISOString()}] Fetching transaction ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pt.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             br.name as branch_name
      FROM pawn_tickets pt
      JOIN pawners p ON pt.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON pt.branch_id = br.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Get items for this ticket
    const itemsResult = await pool.query(`
      SELECT * FROM pawn_items WHERE ticket_id = $1 ORDER BY id
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
        interestRate: parseFloat(row.interest_rate || 0),
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
        pawnerContact: row.contact_number,
        pawnerEmail: row.email,
        pawnerAddress: {
          city: row.city_name,
          barangay: row.barangay_name,
          details: row.address_details
        },
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Branch information
        branchName: row.branch_name,
        // Items information
        items: itemsResult.rows.map(item => ({
          id: item.id,
          category: item.category,
          categoryDescription: item.category_description,
          description: item.description,
          appraisalValue: parseFloat(item.appraisal_value || 0)
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
            first_name, last_name, contact_number, email,
            city_id, barangay_id, address_details
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
      
      // 2. Generate ticket number
      const year = new Date().getFullYear();
      
      // Get or create sequence for this year  
      await client.query(`
        INSERT INTO transaction_sequences (year, next_number) 
        VALUES ($1, 1) 
        ON CONFLICT (year) DO NOTHING
      `, [year]);
      
      // Get next ticket number
      const sequenceResult = await client.query(`
        UPDATE transaction_sequences 
        SET next_number = next_number + 1 
        WHERE year = $1 
        RETURNING next_number - 1 as current_number
      `, [year]);
      
      const ticketNumber = `PT${year}-${String(sequenceResult.rows[0].current_number).padStart(6, '0')}`;
      
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
      const interestRate = parseFloat(loanData.interestRate || 3.0);
      const interestAmount = parseFloat(loanData.interestAmount || 0);
      const serviceCharge = parseFloat(loanData.serviceCharge || 0);
      const netProceeds = parseFloat(loanData.netProceeds || 0);
      const totalAmount = principalAmount + interestAmount + serviceCharge;
      
      // 5. Insert pawn ticket
      const ticketResult = await client.query(`
        INSERT INTO pawn_tickets (
          ticket_number, pawner_id, branch_id, created_by,
          transaction_type, transaction_date, loan_date, maturity_date, expiry_date,
          status, principal_amount, interest_rate, interest_amount, service_charge, net_proceeds,
          total_amount, due_amount, balance_remaining,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        ticketNumber, pawnerId, req.user.branch_id || 1, req.user.id,
        'new_loan', txnDate, grantedDate, maturedDate, expiredDate,
        'active', principalAmount, interestRate, interestAmount, serviceCharge, netProceeds,
        totalAmount, totalAmount, totalAmount,
        notes || ''
      ]);
      
      const ticket = ticketResult.rows[0];
      console.log(`✅ Created pawn ticket: ${ticketNumber}`);
      
      // 6. Insert pawn items
      for (const item of items) {
        await client.query(`
          INSERT INTO pawn_items (
            ticket_id, item_type, category, category_description, description, appraisal_value, estimated_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          ticket.id,
          item.category || 'General', // Use category as item_type
          item.category,
          item.categoryDescription,
          item.description || '',
          parseFloat(item.appraisalValue),
          parseFloat(item.appraisalValue) // Use appraisal_value as estimated_value
        ]);
      }
      console.log(`✅ Added ${items.length} items to ticket`);
      
      // 7. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          table_name, record_id, action, user_id, new_values
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'pawn_tickets',
        ticket.id,
        'CREATE',
        req.user.id,
        JSON.stringify(ticket)
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
        SELECT * FROM pawn_tickets WHERE id = $1 AND status = 'active'
      `, [originalTicketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const originalTicket = ticketResult.rows[0];
      
      // 2. Generate new ticket number for additional loan
      const year = new Date().getFullYear();
      
      await client.query(`
        INSERT INTO transaction_sequences (year, next_number) 
        VALUES ($1, 1) 
        ON CONFLICT (year) DO NOTHING
      `, [year]);
      
      const sequenceResult = await client.query(`
        UPDATE transaction_sequences 
        SET next_number = next_number + 1 
        WHERE year = $1 
        RETURNING next_number - 1 as current_number
      `, [year]);
      
      const newTicketNumber = `PT${year}-${String(sequenceResult.rows[0].current_number).padStart(6, '0')}`;
      
      // 3. Calculate new amounts
      const addAmount = parseFloat(additionalAmount);
      const currentPrincipal = parseFloat(originalTicket.principal_amount);
      const newPrincipal = currentPrincipal + addAmount;
      const interestRate = parseFloat(newInterestRate || originalTicket.interest_rate);
      const serviceCharge = parseFloat(newServiceCharge || 0);
      const interestAmount = (newPrincipal * interestRate) / 100;
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
      
      // 5. Create new ticket for additional loan
      const newTicketResult = await client.query(`
        INSERT INTO pawn_tickets (
          ticket_number, pawner_id, branch_id, created_by,
          transaction_type, transaction_date, loan_date, maturity_date, expiry_date,
          status, principal_amount, interest_rate, interest_amount, service_charge, net_proceeds,
          total_amount, due_amount, balance_remaining, additional_amount,
          parent_ticket_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        newTicketNumber, originalTicket.pawner_id, originalTicket.branch_id, req.user.id,
        'additional_loan', new Date(), new Date(), maturityDate, expiryDate,
        'active', newPrincipal, interestRate, interestAmount, serviceCharge, netProceeds,
        totalAmount, totalAmount, totalAmount, addAmount,
        originalTicketId, notes || `Additional loan of ${addAmount} on ticket ${originalTicket.ticket_number}`
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