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
    
    // First, check if ticket exists and get its status
    const statusCheck = await pool.query(`
      SELECT pt.status, pt.ticket_number, t.transaction_number
      FROM pawn_tickets pt
      JOIN transactions t ON pt.transaction_id = t.id
      WHERE pt.ticket_number = $1
      LIMIT 1
    `, [ticketNumber]);
    
    // If ticket doesn't exist at all
    if (statusCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // If ticket exists but is closed/redeemed/expired
    const ticketStatus = statusCheck.rows[0].status;
    if (!['active', 'matured'].includes(ticketStatus)) {
      return res.status(400).json({
        success: false,
        message: `Ticket ${ticketNumber} is ${ticketStatus} and cannot be processed`
      });
    }
    
    const result = await pool.query(`
      SELECT pt.*, 
             t.transaction_number, t.pawner_id, t.principal_amount, t.interest_rate,
             t.interest_amount, t.penalty_amount, t.service_charge, t.total_amount,
             t.maturity_date, t.grace_period_date, t.expiry_date, t.transaction_date, t.granted_date, t.status as transaction_status,
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
    
    // This should not happen since we already checked, but just in case
    if (result.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Unexpected error: ticket status check passed but data retrieval failed'
      });
    }
    
    // Get items for this ticket with category and description details
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
    `, [result.rows[0].transaction_id]);
    
    // Get transaction history (partial payments, additional loans, etc.)
    const historyResult = await pool.query(`
      SELECT 
        ct.id,
        ct.transaction_number,
        ct.transaction_type,
        ct.transaction_date,
        ct.principal_amount,
        ct.interest_rate,
        ct.interest_amount,
        ct.penalty_amount,
        ct.service_charge,
        ct.total_amount,
        ct.amount_paid,
        ct.balance,
        ct.discount_amount,
        ct.advance_interest,
        ct.advance_service_charge,
        ct.net_payment,
        ct.new_principal_loan,
        ct.status,
        ct.notes,
        ct.created_at
      FROM transactions ct
      WHERE ct.parent_transaction_id = $1
      ORDER BY ct.created_at ASC
    `, [result.rows[0].transaction_id]);

    const row = result.rows[0];
    
    console.log('📅 Search - Raw dates from DB:', {
      transaction_date: row.transaction_date,
      granted_date: row.granted_date,
      maturity_date: row.maturity_date,
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
    
    // Calculate current principal loan - use latest partial payment's new principal if exists
    let currentPrincipal = parseFloat(row.principal_amount || 0);
    let currentMaturityDate = maturityDateStr;
    let currentGracePeriodDate = gracePeriodDateStr;
    let currentExpiryDate = expiryDateStr;
    let currentGrantedDate = grantedDateStr;
    let currentTransactionDate = transactionDateStr;
    
    if (historyResult.rows.length > 0) {
      // Find the latest partial payment transaction with new_principal_loan
      const latestPartialPayment = historyResult.rows
        .filter(h => h.transaction_type === 'partial_payment' && h.new_principal_loan != null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (latestPartialPayment) {
        currentPrincipal = parseFloat(latestPartialPayment.new_principal_loan || 0);
        console.log(`💰 Using current principal from latest partial payment: ${currentPrincipal} (was ${row.principal_amount})`);
      }
      
      // Find the most recent additional loan or renewal transaction with updated dates
      const latestDateUpdate = historyResult.rows
        .filter(h => (h.transaction_type === 'additional_loan' || h.transaction_type === 'renewal') && h.status === 'active')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (latestDateUpdate) {
        // Get the dates from the child transaction
        const childDatesResult = await pool.query(`
          SELECT transaction_date, granted_date, maturity_date, grace_period_date, expiry_date, principal_amount
          FROM transactions
          WHERE id = $1
        `, [latestDateUpdate.id]);
        
        if (childDatesResult.rows.length > 0) {
          const childRow = childDatesResult.rows[0];
          currentTransactionDate = formatDateForResponse(childRow.transaction_date, false);
          currentGrantedDate = formatDateForResponse(childRow.granted_date || childRow.transaction_date, false);
          currentMaturityDate = formatDateForResponse(childRow.maturity_date, true);
          currentGracePeriodDate = childRow.grace_period_date ? formatDateForResponse(childRow.grace_period_date, true) : null;
          currentExpiryDate = formatDateForResponse(childRow.expiry_date, true);
          currentPrincipal = parseFloat(childRow.principal_amount || currentPrincipal);
          
          console.log(`📅 Using updated dates from latest ${latestDateUpdate.transaction_type}:`, {
            transactionDate: currentTransactionDate,
            grantedDate: currentGrantedDate,
            maturityDate: currentMaturityDate,
            gracePeriodDate: currentGracePeriodDate,
            expiryDate: currentExpiryDate,
            principal: currentPrincipal
          });
        }
      }
    }
    
    // Use balance for remaining amount to pay, fallback to total_amount if balance is not set
    const currentBalance = parseFloat(row.balance || row.total_amount || 0);
    const amountPaid = parseFloat(row.amount_paid || 0);

    res.json({
      success: true,
      message: 'Transaction found successfully',
      data: {
        id: row.transaction_id, // Use transaction_id from the JOIN, not pawn_tickets.id
        ticketNumber: row.ticket_number,
        transactionNumber: row.ticket_number,
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
        interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
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
        // Transaction history (partial payments, additional loans, etc.)
        transactionHistory: historyResult.rows.map(history => ({
          id: history.id,
          transactionNumber: history.transaction_number,
          transactionType: history.transaction_type,
          transactionDate: history.transaction_date,
          principalAmount: parseFloat(history.principal_amount || 0),
          interestRate: parseFloat(history.interest_rate || 0),
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
    
    // Only show parent transactions (new_loan, renewal) - hide child transactions (partial_payment, redemption)
    whereConditions.push(`(t.parent_transaction_id IS NULL OR t.transaction_type IN ('new_loan', 'renewal'))`);
    
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
                   'transactionType', ct.transaction_type,
                   'transactionDate', ct.transaction_date,
                   'dateGranted', parent_t.granted_date,
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
               LEFT JOIN transactions parent_t ON ct.parent_transaction_id = parent_t.id
               WHERE ct.parent_transaction_id = t.id
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
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        // Snake case for frontend compatibility
        ticket_number: row.transaction_number,
        transaction_type: row.transaction_type,
        principal_amount: parseFloat(row.principal_amount || 0),
        total_amount: parseFloat(row.total_amount || 0),
        balance_remaining: parseFloat(row.balance || 0),
        status: row.status,
        loan_date: row.granted_date || row.transaction_date,
        maturity_date: row.maturity_date,
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
        expiryDate: row.expiry_date,
        dateExpired: row.expiry_date,
        principalAmount: parseFloat(row.principal_amount || 0),
        principalLoan: parseFloat(row.principal_amount || 0),
        interestRate: parseFloat(row.interest_rate || 0) * 100,
        interest_rate: parseFloat(row.interest_rate || 0), // Raw decimal value
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
      })),
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
          total_amount, balance, transaction_date, granted_date, maturity_date, grace_period_date, expiry_date,
          notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        ticketNumber, pawnerId, req.user.branch_id || 1, 'new_loan', 'active',
        principalAmount, interestRate, interestAmount, serviceCharge, 
        totalAmount, totalAmount, txnDateStr, grantedDateStr, maturedDateStr, 
        new Date(new Date(maturedDateStr).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // grace_period_date = maturity + 3 days
        expiredDateStr,
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
      
      // 1. Get current transaction details using transaction ID
      const transactionResult = await client.query(`
        SELECT t.*, pt.ticket_number, t.granted_date, t.pawner_id, t.branch_id, t.interest_rate,
               t.maturity_date, t.expiry_date
        FROM transactions t
        LEFT JOIN pawn_tickets pt ON pt.transaction_id = t.id
        WHERE t.id = $1 AND t.status IN ('active', 'matured')
      `, [ticketId]);
      
      if (transactionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Active transaction not found or not available for redemption'
        });
      }
      
      const transaction = transactionResult.rows[0];
      
      // 2. Create a new transaction record for the redemption
      const newTransactionNumber = await generateTicketNumber('TXN');
      
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number,
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
          expiry_date,
          parent_transaction_id,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, 'redemption', 'redeemed',
          $4, $5, $6, $7, 0, $8, $9, 0,
          CURRENT_TIMESTAMP, $10, $11, $12, $13, $14, $15, $15
        ) RETURNING id
      `, [
        newTransactionNumber,
        transaction.pawner_id,
        transaction.branch_id,
        transaction.principal_amount,
        transaction.interest_rate,
        transaction.interest_amount,
        parseFloat(penaltyAmount || 0),
        parseFloat(totalDue || redeemAmount),
        parseFloat(redeemAmount),
        transaction.granted_date,
        transaction.maturity_date,
        transaction.expiry_date,
        ticketId, // Link to original transaction
        notes || `Redemption - Total Due: ${totalDue}, Paid: ${redeemAmount}`,
        req.user.id
      ]);
      
      const newTransactionId = newTransactionResult.rows[0].id;
      
      // 3. Update original transaction status to redeemed
      await client.query(`
        UPDATE transactions SET
          status = 'redeemed',
          amount_paid = COALESCE(amount_paid, 0) + $1,
          balance = 0,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE id = $3
      `, [
        parseFloat(redeemAmount),
        req.user.id,
        ticketId
      ]);
      
      // 3. Update original transaction status to redeemed
      await client.query(`
        UPDATE transactions SET
          status = 'redeemed',
          amount_paid = COALESCE(amount_paid, 0) + $1,
          balance = 0,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
        WHERE id = $3
      `, [
        parseFloat(redeemAmount),
        req.user.id,
        ticketId
      ]);
      
      // 4. Update pawn_tickets table if exists (only update status and timestamp)
      await client.query(`
        UPDATE pawn_tickets SET
          status = 'redeemed',
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $1
      `, [ticketId]);
      
      // 5. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        ticketId,
        'REDEMPTION',
        req.user.id,
        JSON.stringify({ 
          old_values: { status: transaction.status },
          new_values: { 
            status: 'redeemed', 
            redeem_amount: redeemAmount,
            penalty_amount: penaltyAmount,
            discount_amount: discountAmount,
            new_transaction_id: newTransactionId
          }
        }),
        'Item redeemed'
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Redeem transaction completed for transaction: ${transaction.transaction_number}`);
      console.log(`📋 New redemption transaction created: ${newTransactionNumber} (ID: ${newTransactionId})`);
      
      res.json({
        success: true,
        message: 'Item redeemed successfully',
        data: {
          transactionId: ticketId,
          ticketNumber: transaction.ticket_number,
          transactionNumber: newTransactionNumber,
          redemptionTransactionId: newTransactionId,
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
      
      // 1. Get current ticket and transaction details
      const ticketResult = await client.query(`
        SELECT pt.*, t.granted_date,
               t.balance, t.principal_amount, t.total_amount,
               t.pawner_id, t.branch_id, t.interest_rate,
               t.maturity_date, t.expiry_date, t.status as transaction_status
        FROM pawn_tickets pt
        JOIN transactions t ON pt.transaction_id = t.id
        WHERE t.id = $1 AND pt.status IN ('active', 'matured')
      `, [ticketId]);
      
      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active pawn ticket not found'
        });
      }
      
      const ticket = ticketResult.rows[0];
      const currentBalance = parseFloat(ticket.balance || ticket.total_amount);
      const paymentAmt = parseFloat(partialPayment);
      const newPrincipal = parseFloat(newPrincipalLoan);
      const discount = parseFloat(discountAmount || 0);
      const advance = parseFloat(advanceInterest || 0);
      const netPay = parseFloat(netPayment || paymentAmt);
      
      // 2. Calculate new balance
      const newBalance = Math.max(0, currentBalance - paymentAmt);
      
      // 3. Update pawn_tickets with partial payment tracking information
      await client.query(`
        UPDATE pawn_tickets SET
          partial_payment = COALESCE(partial_payment, 0) + $1,
          new_principal_loan = $2,
          discount_amount = COALESCE(discount_amount, 0) + $3,
          advance_interest = COALESCE(advance_interest, 0) + $4,
          net_payment = COALESCE(net_payment, 0) + $5,
          payment_amount = COALESCE(payment_amount, 0) + $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $7
      `, [
        paymentAmt,
        newPrincipal,
        discount,
        advance,
        netPay,
        paymentAmt,
        ticketId
      ]);
      
      // 4. Create a new transaction record for the partial payment
      const newTransactionNumber = await generateTicketNumber('TXN');
      
      // Calculate new dates for the partial payment
      const today = new Date();
      const newGrantedDate = today;
      const newMaturityDate = new Date(today);
      newMaturityDate.setDate(newMaturityDate.getDate() + 30);
      const newGracePeriodDate = new Date(newMaturityDate);
      newGracePeriodDate.setDate(newGracePeriodDate.getDate() + 3);
      const newExpiryDate = new Date(newMaturityDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + 90);
      
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number,
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
          parent_transaction_id,
          discount_amount,
          advance_interest,
          advance_service_charge,
          net_payment,
          new_principal_loan,
          notes,
          created_by,
          updated_by
        ) VALUES (
          $1, $2, $3, 'partial_payment', $4,
          $5, $6, 0, 0, $7, $8, $9,
          CURRENT_TIMESTAMP, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21
        ) RETURNING id
      `, [
        newTransactionNumber,
        ticket.pawner_id,
        ticket.branch_id,
        ticket.transaction_status,
        newPrincipal,
        ticket.interest_rate,
        newBalance,
        paymentAmt,
        newBalance,
        newGrantedDate,
        newMaturityDate,
        newGracePeriodDate,
        newExpiryDate,
        ticket.transaction_id, // Link to original transaction
        discount,
        advance,
        parseFloat(req.body.advanceServiceCharge || 0),
        netPay,
        newPrincipal,
        notes ? `Partial payment: ${notes}` : `Partial payment of ${paymentAmt}`,
        req.user.id
      ]);
      
      const newTransactionId = newTransactionResult.rows[0].id;
      
      // 5. Update original transaction with new principal, balance, and dates
      await client.query(`
        UPDATE transactions SET
          principal_amount = $1,
          balance = $2,
          amount_paid = COALESCE(amount_paid, 0) + $3,
          granted_date = $4,
          maturity_date = $5,
          grace_period_date = $6,
          expiry_date = $7,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $8
        WHERE id = $9
      `, [
        newPrincipal,
        newBalance,
        paymentAmt,
        newGrantedDate,
        newMaturityDate,
        newGracePeriodDate,
        newExpiryDate,
        req.user.id,
        ticket.transaction_id
      ]);
      
      // 6. Log audit trail
      await client.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'transactions',
        ticket.transaction_id,
        'PARTIAL_PAYMENT',
        req.user.id,
        JSON.stringify({ 
          old_values: { 
            balance: currentBalance,
            principal_amount: ticket.principal_amount
          },
          new_values: { 
            partial_payment: paymentAmt,
            new_principal_loan: newPrincipal,
            balance: newBalance,
            new_transaction_id: newTransactionId
          }
        }),
        'Partial payment applied'
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Partial payment completed for ticket: ${ticket.ticket_number}`);
      console.log(`📋 New transaction created: ${newTransactionNumber} (ID: ${newTransactionId})`);
      
      res.json({
        success: true,
        message: 'Partial payment processed successfully',
        data: {
          ticketId,
          ticketNumber: ticket.ticket_number,
          transactionNumber: newTransactionNumber,
          transactionId: newTransactionId,
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
      
      // 1. Get original transaction details and the most recent new_principal_loan
      const transactionResult = await client.query(`
        SELECT t.*, 
               COALESCE(
                 (SELECT ct.new_principal_loan 
                  FROM transactions ct 
                  WHERE ct.parent_transaction_id = t.id 
                    AND ct.new_principal_loan IS NOT NULL
                  ORDER BY ct.created_at DESC 
                  LIMIT 1),
                 t.principal_amount
               ) as current_principal
        FROM transactions t 
        WHERE t.id = $1 AND t.status = 'active'
      `, [originalTicketId]);
      
      if (transactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active transaction not found'
        });
      }
      
      const originalTransaction = transactionResult.rows[0];
      
      // 2. Generate new ticket number for additional loan
      const branchId = originalTransaction.branch_id;
      
      const newTicketNumber = await generateTicketNumber(branchId);
      
      // 3. Calculate new amounts - use current_principal (which includes partial payment adjustments)
      const addAmount = parseFloat(additionalAmount);
      const currentPrincipal = parseFloat(originalTransaction.current_principal);
      const newPrincipal = currentPrincipal + addAmount;
      const interestRateDecimal = newInterestRate ? parseFloat(newInterestRate) / 100 : parseFloat(originalTransaction.interest_rate);
      const serviceCharge = parseFloat(newServiceCharge || 0);
      const interestAmount = newPrincipal * interestRateDecimal;
      const totalAmount = newPrincipal + interestAmount + serviceCharge;
      const netProceeds = addAmount - serviceCharge;
      
      console.log(`📊 Additional Loan Calculation:
        - Original Principal: ${originalTransaction.principal_amount}
        - Current Principal (after partial payments): ${currentPrincipal}
        - Additional Amount: ${addAmount}
        - New Principal: ${newPrincipal}
      `);
      
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
      
      // 5. Create new transaction for additional loan with new_principal_loan saved
      const newTransactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, granted_date, maturity_date, expiry_date,
          parent_transaction_id, new_principal_loan, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        newTicketNumber, originalTransaction.pawner_id, originalTransaction.branch_id, 'additional_loan', 'active',
        newPrincipal, interestRateDecimal, interestAmount, serviceCharge,
        totalAmount, totalAmount, new Date(), originalTransaction.granted_date, maturityDate, expiryDate,
        originalTransaction.id, newPrincipal, notes || `Additional loan of ${addAmount} on ticket ${originalTransaction.transaction_number}. Previous principal: ${currentPrincipal}, New principal: ${newPrincipal}`,
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
      
      // 7. Copy items from original transaction to new transaction
      await client.query(`
        INSERT INTO pawn_items (transaction_id, category_id, description_id, appraisal_notes, appraised_value, loan_amount, status)
        SELECT $1, category_id, description_id, appraisal_notes, appraised_value, loan_amount, status
        FROM pawn_items WHERE transaction_id = $2
      `, [newTransaction.id, originalTransaction.id]);
      
      // 8. Update original transaction principal_amount and balance to reflect new loan
      await client.query(`
        UPDATE transactions SET
          principal_amount = $1,
          balance = $2,
          total_amount = $3,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $4
        WHERE id = $5
      `, [
        newPrincipal,
        totalAmount,
        totalAmount,
        req.user.id,
        originalTransaction.id
      ]);
      
      // 9. Update pawn ticket status
      await client.query(`
        UPDATE pawn_tickets SET
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $1
      `, [originalTransaction.id]);
      
      // 10. Log audit trail
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
      console.log(`   Previous principal: ${currentPrincipal}, Added: ${addAmount}, New principal: ${newPrincipal}`);
      
      res.json({
        success: true,
        message: 'Additional loan processed successfully',
        data: {
          originalTransactionId: originalTransaction.id,
          originalTicketNumber: originalTransaction.transaction_number,
          newTransactionId: newTransaction.id,
          newTicketNumber,
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
          entity_type, entity_id, action, user_id, changes, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'pawn_tickets',
        ticketId,
        'UPDATE',
        req.user.id,
        JSON.stringify({ 
          old_values: { 
            maturity_date: ticket.maturity_date,
            expiry_date: ticket.expiry_date,
            total_amount: ticket.total_amount
          },
          new_values: { 
            maturity_date: maturityDate,
            expiry_date: expiryDate,
            renewal_fee: renewFee,
            total_amount: newTotalAmount
          }
        }),
        'Ticket renewed'
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