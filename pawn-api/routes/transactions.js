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
    
    // Step 1: Find the transaction by ticket number to get tracking_number
    const ticketQuery = await pool.query(`
      SELECT t.tracking_number, t.transaction_number, t.status
      FROM transactions t
      WHERE t.transaction_number = $1
      LIMIT 1
    `, [ticketNumber]);
    
    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    const trackingNumber = ticketQuery.rows[0].tracking_number;
    const ticketStatus = ticketQuery.rows[0].status;
    
    console.log(`🔗 Found tracking number: ${trackingNumber} for ticket: ${ticketNumber}`);
    
    // Check if ticket can be processed
    if (!['active', 'matured'].includes(ticketStatus)) {
      return res.status(400).json({
        success: false,
        message: `Ticket ${ticketNumber} is ${ticketStatus} and cannot be processed`
      });
    }
    
    // Step 2: Get ALL transactions in the chain using tracking_number
    const chainQuery = await pool.query(`
      SELECT 
        t.id,
        t.transaction_number,
        t.tracking_number,
        t.previous_transaction_number,
        t.transaction_type,
        t.status,
        t.principal_amount,
        t.interest_rate,
        t.interest_amount,
        t.penalty_amount,
        t.service_charge,
        t.total_amount,
        t.balance,
        t.amount_paid,
        t.transaction_date,
        t.granted_date,
        t.maturity_date,
        t.grace_period_date,
        t.expiry_date,
        t.discount_amount,
        t.advance_interest,
        t.advance_service_charge,
        t.net_payment,
        t.new_principal_loan,
        t.notes,
        t.created_at,
        t.updated_at
      FROM transactions t
      WHERE t.tracking_number = $1
      ORDER BY t.created_at ASC
    `, [trackingNumber]);
    
    if (chainQuery.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Unexpected error: tracking number found but no transactions'
      });
    }
    
    // Step 3: Get the LATEST transaction (current state)
    const currentTransaction = chainQuery.rows[chainQuery.rows.length - 1];
    
    console.log(`📊 Transaction chain: ${chainQuery.rows.length} transactions, current: ${currentTransaction.transaction_number}`);
    
    // Step 4: Get customer/pawner info from the latest transaction
    const result = await pool.query(`
      SELECT 
        t.*,
        p.first_name, p.last_name, p.mobile_number, p.email,
        p.city_id, p.barangay_id, p.house_number, p.street,
        c.name as city_name, 
        b.name as barangay_name,
        e.first_name as cashier_first_name, 
        e.last_name as cashier_last_name,
        br.name as branch_name
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees e ON t.created_by = e.id
      WHERE t.id = $1
    `, [currentTransaction.id]);
    
    const row = result.rows[0];
    
    // Step 5: Get items for the current transaction
    const itemsResult = await pool.query(`
      SELECT pi.*,
             cat.name as category_name,
             d.name as description_name,
             COALESCE(d.name, 'No description') as item_description
      FROM pawn_items pi
      LEFT JOIN categories cat ON pi.category_id = cat.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      WHERE pi.transaction_id = $1 
      ORDER BY pi.id
    `, [currentTransaction.id]);
    
    console.log('📅 Search - Raw dates from DB:', {
      transaction_date: row.transaction_date,
      granted_date: row.granted_date,
      maturity_date: row.maturity_date,
      grace_period_date: row.grace_period_date,
      expiry_date: row.expiry_date
    });

    // Format dates as YYYY-MM-DD strings to avoid timezone issues
    const formatDateForResponse = (date, isDateColumn = false) => {
      if (!date) return null;
      const d = new Date(date);
      
      if (isDateColumn) {
        // For DATE columns: PostgreSQL stores them as local dates but pg driver returns them
        // as midnight UTC, which can shift the date when converted to local timezone
        // Add 12 hours to ensure we're in the middle of the correct day
        const adjusted = new Date(d.getTime() + (12 * 60 * 60 * 1000));
        const year = adjusted.getUTCFullYear();
        const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
        const day = String(adjusted.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        // For TIMESTAMP columns: use local date parts
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    };

    const transactionDateStr = formatDateForResponse(row.transaction_date, false); // TIMESTAMP
    const grantedDateStr = formatDateForResponse(row.granted_date || row.transaction_date, false); // TIMESTAMP
    const maturityDateStr = formatDateForResponse(row.maturity_date, true); // DATE column
    const gracePeriodDateStr = row.grace_period_date ? formatDateForResponse(row.grace_period_date, true) : null; // DATE column
    const expiryDateStr = formatDateForResponse(row.expiry_date, true); // DATE column

    console.log('📅 Search - Formatted dates for frontend:', {
      transactionDateStr,
      grantedDateStr,
      maturityDateStr,
      gracePeriodDateStr,
      expiryDateStr
    });
    
    // With tracking number chain, the current transaction already has the latest data
    // No need to look for child transactions - we ARE the current transaction!
    const currentPrincipal = parseFloat(row.principal_amount || 0);
    const currentMaturityDate = maturityDateStr;
    const currentGracePeriodDate = gracePeriodDateStr;
    const currentExpiryDate = expiryDateStr;
    const currentGrantedDate = grantedDateStr;
    const currentTransactionDate = transactionDateStr;
    
    console.log(`� Current transaction state (ticket: ${currentTransaction.transaction_number}):`, {
      principal: currentPrincipal,
      maturityDate: currentMaturityDate,
      gracePeriodDate: currentGracePeriodDate,
      expiryDate: currentExpiryDate
    });
    
    // Use balance for remaining amount to pay, fallback to total_amount if balance is not set
    const currentBalance = parseFloat(row.balance || row.total_amount || 0);
    const amountPaid = parseFloat(row.amount_paid || 0);

    res.json({
      success: true,
      message: 'Transaction found successfully',
      data: {
        id: currentTransaction.id,
        ticketNumber: currentTransaction.transaction_number,
        transactionNumber: currentTransaction.transaction_number,
        trackingNumber: trackingNumber, // NEW: Original tracking number
        pawnerId: row.pawner_id,
        branchId: row.branch_id,
        createdBy: row.created_by,
        transactionType: row.transaction_type,
        transactionDate: currentTransactionDate,
        loanDate: currentGrantedDate,
        dateGranted: currentGrantedDate,
        maturityDate: currentMaturityDate,
        dateMatured: currentMaturityDate,
        gracePeriodDate: currentGracePeriodDate, // Grace period end date (maturity + 3 days)
        expiryDate: currentExpiryDate,
        dateExpired: currentExpiryDate,
        principalAmount: currentPrincipal, // Current principal after partial payments
        principalLoan: currentPrincipal, // Current principal after partial payments
        originalPrincipalAmount: parseFloat(row.principal_amount || 0), // Keep original for reference
        interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
        interestAmount: parseFloat(row.interest_amount || 0),
        serviceCharge: parseFloat(row.service_charge || 0),
        netProceeds: parseFloat(row.net_proceeds || 0),
        totalAmount: currentBalance, // Use current balance for redeem calculation
        paymentAmount: amountPaid,
        balanceRemaining: currentBalance, // Current balance after partial payments
        dueAmount: currentBalance, // Amount due for redemption
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
        })),
        // Transaction history - the complete chain using tracking_number
        transactionHistory: chainQuery.rows.map(history => ({
          id: history.id,
          transactionNumber: history.transaction_number,
          trackingNumber: history.tracking_number,
          previousTransactionNumber: history.previous_transaction_number,
          transactionType: history.transaction_type,
          transactionDate: formatDateForResponse(history.transaction_date, false),
          maturityDate: history.maturity_date ? formatDateForResponse(history.maturity_date, true) : null,
          gracePeriodDate: history.grace_period_date ? formatDateForResponse(history.grace_period_date, true) : null,
          expiryDate: history.expiry_date ? formatDateForResponse(history.expiry_date, true) : null,
          principalAmount: parseFloat(history.principal_amount || 0),
          interestRate: parseFloat(history.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
          interestAmount: parseFloat(history.interest_amount || 0),
          penaltyAmount: parseFloat(history.penalty_amount || 0),
          serviceCharge: parseFloat(history.service_charge || 0),
          totalAmount: parseFloat(history.total_amount || 0),
          amountPaid: parseFloat(history.amount_paid || 0),
          balance: parseFloat(history.balance || 0),
          discountAmount: parseFloat(history.discount_amount || 0),
          advanceInterest: parseFloat(history.advance_interest || 0),
          advanceServiceCharge: parseFloat(history.advance_service_charge || 0),
          netPayment: parseFloat(history.net_payment || 0),
          newPrincipalLoan: parseFloat(history.new_principal_loan || 0),
          status: history.status,
          notes: history.notes,
          createdAt: history.created_at
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
    const { 
      page = 1, 
      limit = 50, 
      search, 
      type, 
      status, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    console.log(`💰 [${new Date().toISOString()}] Fetching transactions - User: ${req.user.username} (${req.user.role})`);
    console.log(`📋 Filters: page=${page}, limit=${limit}, search=${search}, type=${type}, status=${status}, dateFrom=${dateFrom}, dateTo=${dateTo}`);
    
    // Build WHERE conditions
    let whereConditions = ['1=1'];
    let params = [];
    let paramIndex = 1;
    
    // **NEW TRACKING CHAIN LOGIC**
    // Only show the LATEST transaction in each tracking chain
    // This ensures we only see the current state of each loan
    whereConditions.push(`t.id IN (
      SELECT MAX(id) 
      FROM transactions 
      WHERE tracking_number IS NOT NULL 
      GROUP BY tracking_number
    )`);
    
    // Search by ticket number or pawner name
    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(t.transaction_number ILIKE $${paramIndex} OR p.first_name ILIKE $${paramIndex} OR p.last_name ILIKE $${paramIndex})`);
      paramIndex++;
    }
    
    // Filter by transaction type
    if (type) {
      params.push(type);
      whereConditions.push(`t.transaction_type = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by status
    if (status) {
      params.push(status);
      whereConditions.push(`t.status = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by date range (use updated_at to show recent activity, not just creation date)
    if (dateFrom) {
      params.push(dateFrom);
      whereConditions.push(`DATE(t.updated_at) >= $${paramIndex}`);
      paramIndex++;
    }
    
    if (dateTo) {
      params.push(dateTo);
      whereConditions.push(`DATE(t.updated_at) <= $${paramIndex}`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      WHERE ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Add pagination params
    params.push(parseInt(limit));
    const limitParam = paramIndex;
    paramIndex++;
    
    params.push(offset);
    const offsetParam = paramIndex;
    
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
                   'descriptionName', d.name,
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
             ) as items,
             (
               SELECT json_agg(
                 json_build_object(
                   'id', ct.id,
                   'transactionNumber', ct.transaction_number,
                   'trackingNumber', ct.tracking_number,
                   'previousTransactionNumber', ct.previous_transaction_number,
                   'transactionType', ct.transaction_type,
                   'transactionDate', ct.transaction_date,
                   'grantedDate', ct.granted_date,
                   'maturityDate', ct.maturity_date,
                   'expiryDate', ct.expiry_date,
                   'gracePeriodDate', ct.grace_period_date,
                   'principalAmount', ct.principal_amount,
                   'interestRate', ct.interest_rate,
                   'interestAmount', ct.interest_amount,
                   'penaltyRate', ct.penalty_rate,
                   'penaltyAmount', ct.penalty_amount,
                   'serviceCharge', ct.service_charge,
                   'otherCharges', ct.other_charges,
                   'totalAmount', ct.total_amount,
                   'amountPaid', ct.amount_paid,
                   'balance', ct.balance,
                   'discountAmount', ct.discount_amount,
                   'advanceInterest', ct.advance_interest,
                   'advanceServiceCharge', ct.advance_service_charge,
                   'netPayment', ct.net_payment,
                   'newPrincipalLoan', ct.new_principal_loan,
                   'appraisalValue', (
                     SELECT SUM(pi.appraised_value)
                     FROM pawn_items pi
                     WHERE pi.transaction_id = ct.id
                   ),
                   'status', ct.status,
                   'notes', ct.notes,
                   'createdBy', ct.created_by,
                   'createdAt', ct.created_at
                 ) ORDER BY ct.created_at ASC
               )
               FROM transactions ct
               WHERE ct.tracking_number = t.tracking_number
             ) as transaction_history
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees e ON t.created_by = e.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);
    
    console.log(`✅ Found ${result.rows.length} transactions (Total: ${total})`);
    
    // Debug: Check if transaction_history exists in first row
    if (result.rows.length > 0) {
      console.log('🔍 Debug - First transaction raw data:');
      console.log('  - ID:', result.rows[0].id);
      console.log('  - Transaction Number:', result.rows[0].transaction_number);
      console.log('  - Has transaction_history?', !!result.rows[0].transaction_history);
      console.log('  - transaction_history:', result.rows[0].transaction_history);
    }
    
    // Map regular transactions
    const transactions = result.rows.map(row => ({
      id: row.id,
      // Tracking chain fields
      tracking_number: row.tracking_number,
      trackingNumber: row.tracking_number,
      previous_transaction_number: row.previous_transaction_number,
      previousTransactionNumber: row.previous_transaction_number,
      // Snake case for frontend compatibility
      ticket_number: row.transaction_number,
      transaction_type: row.transaction_type,
      principal_amount: parseFloat(row.principal_amount || 0),
      total_amount: parseFloat(row.total_amount || 0),
      balance_remaining: parseFloat(row.balance || 0),
      status: row.status,
      loan_date: row.granted_date || row.transaction_date,
      maturity_date: row.maturity_date,
      grace_period_date: row.grace_period_date,
      first_name: row.first_name,
      last_name: row.last_name,
      branch_name: row.branch_name || 'N/A',
      // Camel case for backward compatibility
      ticketNumber: row.transaction_number,
      transactionNumber: row.transaction_number,
      loanNumber: row.loan_number,
      pawnerId: row.pawner_id,
      branchId: row.branch_id,
      createdBy: row.created_by,
      transactionType: row.transaction_type,
      transactionDate: row.transaction_date,
      loanDate: row.granted_date || row.transaction_date,
      dateGranted: row.granted_date || row.transaction_date,
      maturityDate: row.maturity_date,
      dateMatured: row.maturity_date,
      gracePeriodDate: row.grace_period_date,
      expiryDate: row.expiry_date,
      dateExpired: row.expiry_date,
      principalAmount: parseFloat(row.principal_amount || 0),
      principalLoan: parseFloat(row.principal_amount || 0),
      interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
      interest_rate: parseFloat(row.interest_rate || 0), // Same value, not decimal
      interestAmount: parseFloat(row.interest_amount || 0),
      interest_amount: parseFloat(row.interest_amount || 0),
      serviceCharge: parseFloat(row.service_charge || 0),
      service_charge: parseFloat(row.service_charge || 0),
      penaltyAmount: parseFloat(row.penalty_amount || 0),
      penalty_amount: parseFloat(row.penalty_amount || 0),
      otherCharges: parseFloat(row.other_charges || 0),
      other_charges: parseFloat(row.other_charges || 0),
      netProceeds: parseFloat(row.principal_amount || 0) - parseFloat(row.service_charge || 0),
      netProceed: parseFloat(row.principal_amount || 0) - parseFloat(row.service_charge || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      paymentAmount: parseFloat(row.amount_paid || 0),
      balanceRemaining: parseFloat(row.balance || 0),
      dueAmount: parseFloat(row.balance || 0),
      additionalAmount: 0,
      renewalFee: 0,
      penaltyAmount: parseFloat(row.penalty_amount || 0),
      penalty: parseFloat(row.penalty_amount || 0),
      status: row.status,
      loanStatus: row.status,
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
      cashierName: `${row.cashier_first_name || ''} ${row.cashier_last_name || ''}`.trim(),
      // Branch information
      branchName: row.branch_name || 'N/A',
      // Items information
      items: row.items || [],
      // Transaction history (partial payments, redemptions, etc.)
      transactionHistory: row.transaction_history || []
    }));
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
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
             d.name as description_name
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
        interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
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
      sourceAppraisalId, // ID of the appraisal this loan is created from
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
    console.log('📋 Received data:', { sourceAppraisalId, pawnerData, items: items?.length, loanData });
    
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
      const branchId = parseInt(req.user.branch_id) || 1;
      
      const ticketNumber = await generateTicketNumber(branchId);
      
      // 3. Calculate dates (preserve local time, avoid timezone shifts)
      const parseLocalDate = (dateStr) => {
        if (!dateStr) return new Date();
        // If it's a date-only string (YYYY-MM-DD), parse it directly as local date
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day, 12, 0, 0); // month is 0-indexed
        }
        return new Date(dateStr);
      };

      const txnDate = parseLocalDate(transactionDate);
      const grantedDate = parseLocalDate(loanDate);
      
      const maturedDate = maturityDate ? parseLocalDate(maturityDate) : (() => {
        const date = new Date(grantedDate);
        date.setMonth(date.getMonth() + 1); // 1 month maturity
        return date;
      })();
      
      const expiredDate = expiryDate ? parseLocalDate(expiryDate) : (() => {
        const date = new Date(maturedDate);
        date.setMonth(date.getMonth() + 3); // 3 months grace period (total 4 months from grant)
        return date;
      })();

      console.log('📅 Date Processing:', {
        received: { transactionDate, loanDate, maturityDate, expiryDate },
        parsed: {
          txnDate: txnDate.toISOString(),
          grantedDate: grantedDate.toISOString(),
          maturedDate: maturedDate.toISOString(),
          expiredDate: expiredDate.toISOString()
        }
      });

      // Format dates as YYYY-MM-DD strings to avoid timezone issues
      const formatDateForDB = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const txnDateStr = formatDateForDB(txnDate);
      const grantedDateStr = formatDateForDB(grantedDate);
      const maturedDateStr = formatDateForDB(maturedDate);
      const expiredDateStr = formatDateForDB(expiredDate);

      console.log('📅 Formatted for DB:', {
        txnDateStr,
        grantedDateStr,
        maturedDateStr,
        expiredDateStr
      });
      
      // 4. Calculate totals
      const totalAppraisal = items.reduce((sum, item) => sum + parseFloat(item.appraisalValue || 0), 0);
      const principalAmount = parseFloat(loanData.principalLoan);
      const interestRatePercent = parseFloat(loanData.interestRate || 3.0);
      const interestRate = interestRatePercent; // Store as percentage (10% -> 10, not 0.10)
      const interestAmount = parseFloat(loanData.interestAmount || 0);
      const serviceCharge = parseFloat(loanData.serviceCharge || 0);
      const netProceeds = parseFloat(loanData.netProceeds || 0);
      const totalAmount = principalAmount + interestAmount + serviceCharge;
      
      // 5. Insert transaction record with tracking number chain
      const transactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, tracking_number, previous_transaction_number,
          pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, granted_date, maturity_date, grace_period_date, expiry_date,
          notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `, [
        ticketNumber, 
        ticketNumber, // tracking_number = own transaction_number for new loans
        null,         // previous_transaction_number = NULL (first in chain)
        pawnerId, req.user.branch_id || 1, 'new_loan', 'active',
        principalAmount, interestRate, interestAmount, serviceCharge, 
        totalAmount, totalAmount, txnDateStr, grantedDateStr, maturedDateStr, 
        new Date(new Date(maturedDateStr).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // grace_period_date = maturity + 3 days
        expiredDateStr,
        notes || '', req.user.id, new Date(), new Date()
      ]);
      
      const transaction = transactionResult.rows[0];
      console.log(`✅ Created transaction: ${ticketNumber}`);
      console.log(`🔗 Tracking chain initialized: tracking_number=${ticketNumber}, previous=NULL`);
      
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
            'SELECT id FROM descriptions WHERE name = $1 AND category_id = $2', 
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
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        transaction.id,
        'CREATE',
        req.user.id,
        JSON.stringify({ new_values: transaction }),
        'New loan transaction created'
      ]);
      
      // 9. Mark source appraisal as completed if this loan was created from a pending appraisal
      if (sourceAppraisalId) {
        console.log(`🔄 Marking appraisal ${sourceAppraisalId} as completed...`);
        await client.query(`
          UPDATE item_appraisals 
          SET status = 'completed', updated_at = NOW()
          WHERE id = $1
        `, [sourceAppraisalId]);
        console.log(`✅ Appraisal ${sourceAppraisalId} marked as completed`);
      }
      
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
      transactionNumber,
      redeemAmount,
      penaltyAmount,
      discountAmount,
      totalDue,
      notes 
    } = req.body;
    
    console.log(`🔄 [${new Date().toISOString()}] Processing redeem transaction - User: ${req.user.username}`);
    console.log('📋 Redeem data:', { ticketId, transactionNumber, redeemAmount, penaltyAmount, discountAmount, totalDue });
    
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
      
      // **TRACKING CHAIN ARCHITECTURE**
      // 1. Find previous transaction by ticket number OR ID
      console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);
      
      // Check if ticketId is a number (ID) or string (transaction number)
      const isNumericId = !isNaN(ticketId);
      
      const previousTxnResult = await client.query(`
        SELECT * FROM transactions 
        WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'}
      `, [ticketId]);
      
      if (previousTxnResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const previousTransaction = previousTxnResult.rows[0];
      console.log(`✅ Found previous transaction: ${previousTransaction.transaction_number}`);
      
      // 2. Generate NEW transaction number for redemption
      const branchId = parseInt(previousTransaction.branch_id) || 1;
      const newTransactionNumber = await generateTicketNumber(branchId);
      
      console.log(`📝 Creating redemption transaction: ${newTransactionNumber}`);
      console.log(`🔗 Tracking Number: ${previousTransaction.tracking_number || previousTransaction.transaction_number}`);
      console.log(`⬅️  Previous Transaction: ${previousTransaction.transaction_number}`);
      
      // 3. Format dates for DB
      const formatDateForDB = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const transactionDateStr = formatDateForDB(new Date());
      
      // 4. Create NEW transaction (final transaction in chain - status='redeemed')
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number,
          tracking_number,
          previous_transaction_number,
          pawner_id,
          branch_id,
          transaction_type,
          status,
          principal_amount,
          interest_rate,
          interest_amount,
          penalty_amount,
          service_charge,
          total_amount,
          amount_paid,
          balance,
          transaction_date,
          granted_date,
          maturity_date,
          grace_period_date,
          expiry_date,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'redemption', 'redeemed',
          $6, $7, $8, $9, 0, $10, $11, 0,
          $12, $13, $14, $15, $16, $17, $18, $18
        ) RETURNING id, transaction_number
      `, [
        newTransactionNumber,                                                  // $1: NEW transaction number
        previousTransaction.tracking_number || previousTransaction.transaction_number,  // $2: SAME tracking number
        previousTransaction.transaction_number,                                // $3: Previous transaction link
        previousTransaction.pawner_id,                                        // $4
        branchId,                                                             // $5
        previousTransaction.principal_amount,                                  // $6
        previousTransaction.interest_rate,                                    // $7
        previousTransaction.interest_amount,                                  // $8
        parseFloat(penaltyAmount || 0),                                       // $9
        parseFloat(totalDue || redeemAmount),                                 // $10: Total amount
        parseFloat(redeemAmount),                                             // $11: Amount paid
        transactionDateStr,                                                   // $12: transaction_date (today)
        previousTransaction.granted_date,                                     // $13: granted_date (keep original)
        previousTransaction.maturity_date,                                    // $14: maturity date (keep original)
        previousTransaction.grace_period_date,                                // $15: grace period date (keep original)
        previousTransaction.expiry_date,                                      // $16: expiry date (keep original)
        notes || `Redemption - Total Due: ₱${totalDue}, Paid: ₱${redeemAmount}`, // $17
        req.user.id                                                           // $18
      ]);
      
      const newTransactionId = newTransactionResult.rows[0].id;
      const newTicket = newTransactionResult.rows[0].transaction_number;
      
      console.log(`✅ Redemption transaction created: ${newTicket}`);
      
      // Mark previous transaction as superseded
      await client.query(`
        UPDATE transactions 
        SET status = 'superseded', 
            is_active = false,
            notes = COALESCE(notes, '') || ' | Superseded by ${newTicket}',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_number = $1
      `, [previousTransaction.transaction_number]);
      
      console.log(`✅ Marked ${previousTransaction.transaction_number} as superseded by ${newTicket}`);
      
      // **TRACKING CHAIN: Previous transaction now superseded**
      console.log(`🔗 Tracking chain completed (final transaction):`);
      console.log(`   Previous: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`   Redeemed: ${newTicket} (final - status='redeemed')`);
      
      // 4. Copy items from previous transaction to new transaction
      await client.query(`
        INSERT INTO pawn_items (
          transaction_id, category_id, description_id,
          appraisal_notes, appraised_value, loan_amount, status
        )
        SELECT $1, category_id, description_id,
               appraisal_notes, appraised_value, loan_amount, 'redeemed'
        FROM pawn_items
        WHERE transaction_id = $2
      `, [newTransactionId, previousTransaction.id]);
      
      console.log(`📦 Copied items from previous transaction with status='redeemed'`);
      
      // 5. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        newTransactionId,
        'REDEMPTION',
        req.user.id,
        JSON.stringify({ 
          tracking_number: previousTransaction.tracking_number || previousTransaction.transaction_number,
          previous_transaction: previousTransaction.transaction_number,
          redemption_transaction: newTicket,
          redeem_amount: redeemAmount,
          penalty_amount: penaltyAmount,
          discount_amount: discountAmount,
          total_due: totalDue,
          status: 'redeemed'
        }),
        `Item redeemed - ₱${redeemAmount} paid, loan completed`
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Redemption completed!`);
      console.log(`📋 Previous Transaction: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`📋 Redemption Transaction: ${newTicket} (final - redeemed)`);
      
      res.json({
        success: true,
        message: 'Item redeemed successfully',
        data: {
          previousTicketNumber: previousTransaction.transaction_number,
          redemptionTicketNumber: newTicket,
          trackingNumber: previousTransaction.tracking_number || previousTransaction.transaction_number,
          redemptionTransactionId: newTransactionId,
          redeemAmount: parseFloat(redeemAmount),
          penaltyAmount: parseFloat(penaltyAmount || 0),
          discountAmount: parseFloat(discountAmount || 0),
          totalDue: parseFloat(totalDue || redeemAmount),
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
      
      // **TRACKING CHAIN ARCHITECTURE**
      // 1. Find the previous transaction by ticket number OR ID
      console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);
      
      // Check if ticketId is a number (ID) or string (transaction number)
      const isNumericId = !isNaN(ticketId);
      
      const previousTxnResult = await client.query(`
        SELECT t.*, t.transaction_number as ticket_number
        FROM transactions t
        WHERE ${isNumericId ? 't.id = $1' : 't.transaction_number = $1'}
      `, [ticketId]);
      
      if (previousTxnResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const previousTransaction = previousTxnResult.rows[0];
      console.log(`✅ Found previous transaction: ${previousTransaction.transaction_number}`);
      
      // 2. Calculate amounts
      const currentBalance = parseFloat(previousTransaction.balance || previousTransaction.total_amount);
      const paymentAmt = parseFloat(partialPayment);
      const newPrincipal = parseFloat(newPrincipalLoan);
      const discount = parseFloat(discountAmount || 0);
      const advance = parseFloat(advanceInterest || 0);
      const netPay = parseFloat(netPayment || paymentAmt);
      
      // Calculate new balance
      const newBalance = Math.max(0, currentBalance - paymentAmt);
      
      console.log(`💰 Partial Payment Calculation:`);
      console.log(`   Previous Principal: ₱${previousTransaction.principal_amount}`);
      console.log(`   Current Balance: ₱${currentBalance}`);
      console.log(`   Payment Amount: ₱${paymentAmt}`);
      console.log(`   New Principal: ₱${newPrincipal}`);
      console.log(`   New Balance: ₱${newBalance}`);
      
      // 3. Generate NEW transaction number for the partial payment
      const branchId = parseInt(previousTransaction.branch_id) || 1;
      console.log(`🏢 Branch ID for new transaction: ${branchId} (type: ${typeof branchId})`);
      const newTransactionNumber = await generateTicketNumber(branchId);
      
      console.log(`📝 Creating new partial payment transaction: ${newTransactionNumber}`);
      console.log(`🔗 Tracking Number: ${previousTransaction.tracking_number || previousTransaction.transaction_number}`);
      console.log(`⬅️  Previous Transaction: ${previousTransaction.transaction_number}`);
      
      // 4. Calculate new dates - extend by 1 month from previous maturity
      const previousMaturityDate = new Date(previousTransaction.maturity_date);
      const newMaturityDate = new Date(previousMaturityDate);
      newMaturityDate.setMonth(newMaturityDate.getMonth() + 1);
      
      const newGracePeriodDate = new Date(newMaturityDate);
      newGracePeriodDate.setDate(newGracePeriodDate.getDate() + 3); // 3 days after maturity
      
      const newExpiryDate = new Date(newMaturityDate);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 3); // 3 months after maturity
      
      // Format dates as YYYY-MM-DD
      const formatDateForDB = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const maturityDateStr = formatDateForDB(newMaturityDate);
      const gracePeriodDateStr = formatDateForDB(newGracePeriodDate);
      const expiryDateStr = formatDateForDB(newExpiryDate);
      
      console.log(`📅 New Dates: Maturity: ${maturityDateStr}, Grace: ${gracePeriodDateStr}, Expiry: ${expiryDateStr}`);
      
      // 5. Create NEW transaction (tracking chain - immutable previous transaction)
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number,
          tracking_number,
          previous_transaction_number,
          pawner_id,
          branch_id,
          transaction_type,
          status,
          principal_amount,
          interest_rate,
          interest_amount,
          service_charge,
          total_amount,
          amount_paid,
          balance,
          transaction_date,
          granted_date,
          maturity_date,
          grace_period_date,
          expiry_date,
          discount_amount,
          advance_interest,
          advance_service_charge,
          net_payment,
          new_principal_loan,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'partial_payment', $6,
          $7, $8, 0, 0, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $23
        ) RETURNING id, transaction_number
      `, [
        newTransactionNumber,                                                  // $1: NEW transaction number
        previousTransaction.tracking_number || previousTransaction.transaction_number,  // $2: SAME tracking number
        previousTransaction.transaction_number,                                // $3: Previous transaction link
        previousTransaction.pawner_id,                                        // $4
        branchId,                                                             // $5
        previousTransaction.status,                                           // $6
        newPrincipal,                                                         // $7: NEW principal
        previousTransaction.interest_rate,                                    // $8
        newBalance,                                                           // $9: NEW total amount
        paymentAmt,                                                           // $10: Amount paid
        newBalance,                                                           // $11: NEW balance
        formatDateForDB(new Date()),                                          // $12: transaction_date (today)
        previousTransaction.granted_date,                                     // $13: granted_date (keep original)
        maturityDateStr,                                                      // $14: NEW maturity date
        gracePeriodDateStr,                                                   // $15: NEW grace period date
        expiryDateStr,                                                        // $16: NEW expiry date
        discount,                                                             // $17
        advance,                                                              // $18
        parseFloat(req.body.advanceServiceCharge || 0),                      // $19
        netPay,                                                               // $20
        newPrincipal,                                                         // $21
        notes ? `Partial payment: ${notes}` : `Partial payment of ₱${paymentAmt}`, // $22
        req.user.id                                                           // $23
      ]);
      
      console.log(`✅ New partial payment transaction created: ${newTransactionResult.rows[0].transaction_number}`);
      
      const newTransactionId = newTransactionResult.rows[0].id;
      const newTicket = newTransactionResult.rows[0].transaction_number;
      
      // Mark previous transaction as superseded
      await client.query(`
        UPDATE transactions 
        SET status = 'superseded', 
            is_active = false,
            notes = COALESCE(notes, '') || ' | Superseded by ${newTicket}',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_number = $1
      `, [previousTransaction.transaction_number]);
      
      console.log(`✅ Marked ${previousTransaction.transaction_number} as superseded by ${newTicket}`);
      
      // **TRACKING CHAIN: Previous transaction now superseded**
      console.log(`🔗 Tracking chain updated:`);
      console.log(`   Previous: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`   New: ${newTicket} (current state)`);
      
      // 5. Copy items from previous transaction to new transaction
      await client.query(`
        INSERT INTO pawn_items (
          transaction_id, category_id, description_id,
          appraisal_notes, appraised_value, loan_amount, status
        )
        SELECT $1, category_id, description_id,
               appraisal_notes, appraised_value, loan_amount, status
        FROM pawn_items
        WHERE transaction_id = $2
      `, [newTransactionId, previousTransaction.id]);
      
      console.log(`📦 Copied items from previous transaction`);
      
      // 6. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        newTransactionId,
        'PARTIAL_PAYMENT',
        req.user.id,
        JSON.stringify({ 
          tracking_number: previousTransaction.tracking_number || previousTransaction.transaction_number,
          previous_transaction: previousTransaction.transaction_number,
          new_transaction: newTicket,
          previous_balance: currentBalance,
          previous_principal: previousTransaction.principal_amount,
          partial_payment: paymentAmt,
          new_principal: newPrincipal,
          new_balance: newBalance
        }),
        `Partial payment of ₱${paymentAmt} - New transaction created in chain`
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Partial payment completed!`);
      console.log(`📋 Previous Transaction: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`📋 New Transaction: ${newTicket} (current state)`);
      
      res.json({
        success: true,
        message: 'Partial payment processed successfully',
        data: {
          previousTicketNumber: previousTransaction.transaction_number,
          newTicketNumber: newTicket,
          trackingNumber: previousTransaction.tracking_number || previousTransaction.transaction_number,
          transactionId: newTransactionId,
          partialPayment: paymentAmt,
          newPrincipalLoan: newPrincipal,
          discountAmount: discount,
          advanceInterest: advance,
          netPayment: netPay,
          remainingBalance: newBalance,
          status: previousTransaction.status,
          maturityDate: maturityDateStr,
          gracePeriodDate: gracePeriodDateStr,
          expiryDate: expiryDateStr
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
      newGracePeriodDate,
      newExpiryDate,
      notes 
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Processing additional loan - User: ${req.user.username}`);
    console.log('📋 Additional loan data:', { originalTicketId, additionalAmount, newInterestRate, newMaturityDate, newGracePeriodDate, newExpiryDate });
    
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
      
      // 1. Find previous transaction by ticket_number OR ID
      console.log(`🔍 Looking for transaction with identifier: ${originalTicketId}`);
      
      // Check if originalTicketId is a number (ID) or string (transaction number)
      const isNumericId = !isNaN(originalTicketId);
      
      const transactionResult = await client.query(`
        SELECT * FROM transactions 
        WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'} AND status = 'active'
      `, [originalTicketId]);
      
      if (transactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active transaction not found'
        });
      }
      
      const previousTransaction = transactionResult.rows[0];
      
      console.log(`🔗 Found previous transaction: ${previousTransaction.transaction_number}, tracking: ${previousTransaction.tracking_number}`);
      
      // 2. Generate new ticket number for additional loan
      const branchId = parseInt(previousTransaction.branch_id) || 1;
      const newTicketNumber = await generateTicketNumber(branchId);
      
      // 3. Calculate new amounts - use current principal from previous transaction
      const addAmount = parseFloat(additionalAmount);
      const currentPrincipal = parseFloat(previousTransaction.principal_amount);
      const newPrincipal = currentPrincipal + addAmount;
      const interestRatePercent = newInterestRate ? parseFloat(newInterestRate) : parseFloat(previousTransaction.interest_rate);
      const serviceCharge = parseFloat(newServiceCharge || 0);
      const interestAmount = (newPrincipal * interestRatePercent) / 100; // Calculate interest from percentage
      const totalAmount = newPrincipal + interestAmount + serviceCharge;
      const netProceeds = addAmount - serviceCharge;
      
      console.log(`📊 Additional Loan Calculation:
        - Previous Transaction: ${previousTransaction.transaction_number}
        - Previous Principal: ${currentPrincipal}
        - Additional Amount: ${addAmount}
        - New Principal: ${newPrincipal}
        - Tracking Number: ${previousTransaction.tracking_number}
      `);
      
      // 4. Calculate new dates
      const maturityDate = newMaturityDate ? new Date(newMaturityDate) : (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 4);
        return date;
      })();
      const gracePeriodDate = newGracePeriodDate ? new Date(newGracePeriodDate) : (() => {
        const date = new Date(maturityDate);
        date.setDate(date.getDate() + 3);
        return date;
      })();
      const expiryDate = newExpiryDate ? new Date(newExpiryDate) : (() => {
        const date = new Date(maturityDate);
        date.setMonth(date.getMonth() + 1);
        return date;
      })();
      
      console.log(`📅 Additional Loan - New Dates:
        - Maturity Date: ${maturityDate.toISOString().split('T')[0]}
        - Grace Period Date: ${gracePeriodDate.toISOString().split('T')[0]}
        - Expiry Date: ${expiryDate.toISOString().split('T')[0]}
      `);
      
      // 5. Create new transaction in the chain (DO NOT MODIFY PREVIOUS!)
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, tracking_number, previous_transaction_number,
          pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, granted_date, maturity_date, grace_period_date, expiry_date,
          notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `, [
        newTicketNumber,
        previousTransaction.tracking_number,          // SAME tracking number as previous
        previousTransaction.transaction_number,       // Link to previous transaction
        previousTransaction.pawner_id, previousTransaction.branch_id, 'additional_loan', 'active',
        newPrincipal, interestRatePercent, interestAmount, serviceCharge,
        totalAmount, totalAmount, new Date(), previousTransaction.granted_date, maturityDate, gracePeriodDate, expiryDate,
        notes || `Additional loan of ${addAmount} on ticket ${previousTransaction.transaction_number}. Previous principal: ${currentPrincipal}, New principal: ${newPrincipal}`,
        req.user.id, new Date(), new Date()
      ]);
      
      const newTransaction = newTransactionResult.rows[0];
      
      console.log(`🔗 Created new transaction in chain:
        - New Ticket: ${newTicketNumber}
        - Tracking Number: ${previousTransaction.tracking_number}
        - Previous Ticket: ${previousTransaction.transaction_number}
      `);
      
      // 5.5. Mark previous transaction as superseded
      await client.query(`
        UPDATE transactions 
        SET status = 'superseded', 
            is_active = false,
            notes = COALESCE(notes, '') || ' | Superseded by ${newTicketNumber}',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_number = $1
      `, [previousTransaction.transaction_number]);
      
      console.log(`✅ Marked ${previousTransaction.transaction_number} as superseded by ${newTicketNumber}`);
      
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
      
      // 7. Copy items from previous transaction to new transaction
      await client.query(`
        INSERT INTO pawn_items (transaction_id, category_id, description_id, appraisal_notes, appraised_value, loan_amount, status)
        SELECT $1, category_id, description_id, appraisal_notes, appraised_value, loan_amount, status
        FROM pawn_items WHERE transaction_id = $2
      `, [newTransaction.id, previousTransaction.id]);
      
      
      // 8. REMOVED: Do NOT update previous transaction! (immutable in tracking chain)
      // Previous transaction stays as-is for perfect audit trail
      
      // 9. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        newTransaction.id,
        'ADDITIONAL_LOAN',
        req.user.id,
        JSON.stringify({ 
          new_values: {
            new_transaction_id: newTransaction.id,
            previous_principal: currentPrincipal,
            additional_amount: addAmount,
            new_principal: newPrincipal
          }
        }),
        'Additional loan processed'
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Additional loan completed - New transaction: ${newTicketNumber}`);
      console.log(`   Previous ticket: ${previousTransaction.transaction_number}, Previous principal: ${currentPrincipal}`);
      console.log(`   Additional amount: ${addAmount}, New principal: ${newPrincipal}`);
      console.log(`   Tracking number: ${previousTransaction.tracking_number}`);
      
      res.json({
        success: true,
        message: 'Additional loan processed successfully',
        data: {
          // OLD system data (for backward compatibility)
          originalTransactionId: previousTransaction.id,
          originalTicketNumber: previousTransaction.transaction_number,
          // NEW system data
          newTransactionId: newTransaction.id,
          newTicketNumber,
          trackingNumber: previousTransaction.tracking_number,
          previousTicketNumber: previousTransaction.transaction_number,
          // Financial data
          previousPrincipal: currentPrincipal,
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
      
      // **TRACKING CHAIN ARCHITECTURE**
      // 1. Find previous transaction by ticket number OR ID
      console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);
      
      // Check if ticketId is a number (ID) or string (transaction number)
      const isNumericId = !isNaN(ticketId);
      
      const previousTxnResult = await client.query(`
        SELECT * FROM transactions 
        WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'}
      `, [ticketId]);
      
      if (previousTxnResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      const previousTransaction = previousTxnResult.rows[0];
      console.log(`✅ Found previous transaction: ${previousTransaction.transaction_number}`);
      
      // 2. Generate NEW transaction number for renewal
      const branchId = parseInt(previousTransaction.branch_id) || 1;
      const newTransactionNumber = await generateTicketNumber(branchId);
      
      console.log(`📝 Creating renewal transaction: ${newTransactionNumber}`);
      console.log(`🔗 Tracking Number: ${previousTransaction.tracking_number || previousTransaction.transaction_number}`);
      console.log(`⬅️  Previous Transaction: ${previousTransaction.transaction_number}`);
      
      // 3. Calculate new amounts and dates - extend maturity by 1 month
      const renewFee = parseFloat(renewalFee);
      const interestRate = parseFloat(newInterestRate || previousTransaction.interest_rate);
      const principalAmount = parseFloat(previousTransaction.principal_amount);
      const newInterestAmount = (principalAmount * interestRate) / 100;
      const serviceCharge = parseFloat(previousTransaction.service_charge || 0);
      const newTotalAmount = principalAmount + newInterestAmount + serviceCharge;
      
      // Calculate new dates - extend by 1 month
      const previousMaturityDate = new Date(previousTransaction.maturity_date);
      const newMaturityDate = new Date(previousMaturityDate);
      newMaturityDate.setMonth(newMaturityDate.getMonth() + 1);
      
      const newGracePeriodDate = new Date(newMaturityDate);
      newGracePeriodDate.setDate(newGracePeriodDate.getDate() + 3); // 3 days after maturity
      
      const newExpiryDate = new Date(newMaturityDate);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 3); // 3 months after maturity
      
      // Format dates as YYYY-MM-DD
      const formatDateForDB = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const transactionDateStr = formatDateForDB(new Date());
      const maturityDateStr = formatDateForDB(newMaturityDate);
      const gracePeriodDateStr = formatDateForDB(newGracePeriodDate);
      const expiryDateStr = formatDateForDB(newExpiryDate);
      
      console.log(`💰 Renewal Calculation:`);
      console.log(`   Principal: ₱${principalAmount}`);
      console.log(`   Interest Rate: ${interestRate}%`);
      console.log(`   New Interest: ₱${newInterestAmount}`);
      console.log(`   Renewal Fee: ₱${renewFee}`);
      console.log(`   New Total: ₱${newTotalAmount}`);
      
      // 4. Create NEW transaction (renewal extends maturity)
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number,
          tracking_number,
          previous_transaction_number,
          pawner_id,
          branch_id,
          transaction_type,
          status,
          principal_amount,
          interest_rate,
          interest_amount,
          service_charge,
          other_charges,
          total_amount,
          balance,
          transaction_date,
          granted_date,
          maturity_date,
          grace_period_date,
          expiry_date,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'renewal', 'active',
          $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $19
        ) RETURNING id, transaction_number
      `, [
        newTransactionNumber,                                                  // $1: NEW transaction number
        previousTransaction.tracking_number || previousTransaction.transaction_number,  // $2: SAME tracking number
        previousTransaction.transaction_number,                                // $3: Previous transaction link
        previousTransaction.pawner_id,                                        // $4
        branchId,                                                             // $5
        principalAmount,                                                      // $6: Same principal
        interestRate,                                                         // $7: Interest rate
        newInterestAmount,                                                    // $8: NEW interest
        serviceCharge,                                                        // $9: Service charge
        renewFee,                                                             // $10: Renewal fee
        newTotalAmount,                                                       // $11: NEW total
        newTotalAmount,                                                       // $12: Balance
        transactionDateStr,                                                   // $13: transaction_date (today)
        previousTransaction.granted_date,                                     // $14: Keep original granted date
        maturityDateStr,                                                      // $15: EXTENDED maturity
        gracePeriodDateStr,                                                   // $16: EXTENDED grace period
        expiryDateStr,                                                        // $17: EXTENDED expiry
        notes || `Renewal - Fee: ₱${renewFee}, Extended maturity`, // $18
        req.user.id                                                           // $19
      ]);
      
      const newTransactionId = newTransactionResult.rows[0].id;
      const newTicket = newTransactionResult.rows[0].transaction_number;
      
      console.log(`✅ Renewal transaction created: ${newTicket}`);
      
      // Mark previous transaction as superseded
      await client.query(`
        UPDATE transactions 
        SET status = 'superseded', 
            is_active = false,
            notes = COALESCE(notes, '') || ' | Superseded by ${newTicket}',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_number = $1
      `, [previousTransaction.transaction_number]);
      
      console.log(`✅ Marked ${previousTransaction.transaction_number} as superseded by ${newTicket}`);
      
      // **TRACKING CHAIN: Previous transaction now superseded**
      console.log(`🔗 Tracking chain updated:`);
      console.log(`   Previous: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`   Renewed: ${newTicket} (extended maturity)`);
      
      // 5. Copy items from previous transaction to new transaction
      await client.query(`
        INSERT INTO pawn_items (
          transaction_id, category_id, description_id,
          appraisal_notes, appraised_value, loan_amount, status
        )
        SELECT $1, category_id, description_id,
               appraisal_notes, appraised_value, loan_amount, status
        FROM pawn_items
        WHERE transaction_id = $2
      `, [newTransactionId, previousTransaction.id]);
      
      console.log(`📦 Copied items from previous transaction`);
      
      // 6. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        newTransactionId,
        'RENEWAL',
        req.user.id,
        JSON.stringify({ 
          tracking_number: previousTransaction.tracking_number || previousTransaction.transaction_number,
          previous_transaction: previousTransaction.transaction_number,
          renewal_transaction: newTicket,
          previous_maturity: previousTransaction.maturity_date,
          new_maturity: maturityDateStr,
          renewal_fee: renewFee,
          new_total: newTotalAmount
        }),
        `Loan renewed - Maturity extended, Fee: ₱${renewFee}`
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Renewal completed!`);
      console.log(`📋 Previous Transaction: ${previousTransaction.transaction_number} (unchanged)`);
      console.log(`📋 Renewal Transaction: ${newTicket} (current state)`);
      
      res.json({
        success: true,
        message: 'Loan renewed successfully',
        data: {
          previousTicketNumber: previousTransaction.transaction_number,
          renewalTicketNumber: newTicket,
          trackingNumber: previousTransaction.tracking_number || previousTransaction.transaction_number,
          renewalTransactionId: newTransactionId,
          renewalFee: renewFee,
          principalAmount: principalAmount,
          newMaturityDate: maturityDateStr,
          newGracePeriodDate: gracePeriodDateStr,
          newExpiryDate: expiryDateStr,
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