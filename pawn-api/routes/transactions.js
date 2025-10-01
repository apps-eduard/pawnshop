const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// TRANSACTIONS MANAGEMENT
// =============================================

// Get all transactions
router.get('/', async (req, res) => {
  try {
    console.log(`💰 [${new Date().toISOString()}] Fetching transactions - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT t.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             a.id as appraisal_id, a.item_category, a.description as item_description,
             a.estimated_value, a.weight, a.karat
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      JOIN users u ON t.cashier_id = u.id
      LEFT JOIN appraisals a ON t.appraisal_id = a.id
      ORDER BY t.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} transactions`);
    
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        transactionNumber: row.transaction_number,
        appraisalId: row.appraisal_id,
        pawnerId: row.pawner_id,
        cashierId: row.cashier_id,
        previousTransactionId: row.previous_transaction_id,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        dateGranted: row.date_granted,
        dateMatured: row.date_matured,
        dateExpired: row.date_expired,
        appraisalValue: parseFloat(row.appraisal_value || 0),
        principalLoan: parseFloat(row.principal_loan || 0),
        interestRate: parseFloat(row.interest_rate || 0),
        availableAmount: parseFloat(row.available_amount || 0),
        discount: parseFloat(row.discount || 0),
        previousLoan: parseFloat(row.previous_loan || 0),
        interestAmount: parseFloat(row.interest_amount || 0),
        penalty: parseFloat(row.penalty || 0),
        additionalAmount: parseFloat(row.additional_amount || 0),
        newPrincipalLoan: parseFloat(row.new_principal_loan || 0),
        partialPayment: parseFloat(row.partial_payment || 0),
        dueAmount: parseFloat(row.due_amount || 0),
        redeemAmount: parseFloat(row.redeem_amount || 0),
        advanceInterest: parseFloat(row.advance_interest || 0),
        advanceServiceCharge: parseFloat(row.advance_service_charge || 0),
        netProceed: parseFloat(row.net_proceed || 0),
        netPayment: parseFloat(row.net_payment || 0),
        amountReceived: parseFloat(row.amount_received || 0),
        changeAmount: parseFloat(row.change_amount || 0),
        loanStatus: row.loan_status,
        notes: row.notes,
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
        // Item information
        itemCategory: row.item_category,
        itemDescription: row.item_description,
        itemValue: parseFloat(row.estimated_value || 0),
        itemWeight: parseFloat(row.weight || 0),
        itemKarat: parseInt(row.karat || 0)
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

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`💰 [${new Date().toISOString()}] Fetching transaction ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT t.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             a.id as appraisal_id, a.item_category, a.description as item_description,
             a.estimated_value, a.weight, a.karat, a.condition_notes, a.appraisal_notes
      FROM transactions t
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      JOIN users u ON t.cashier_id = u.id
      LEFT JOIN appraisals a ON t.appraisal_id = a.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    const row = result.rows[0];
    
    res.json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: {
        id: row.id,
        transactionNumber: row.transaction_number,
        appraisalId: row.appraisal_id,
        pawnerId: row.pawner_id,
        cashierId: row.cashier_id,
        previousTransactionId: row.previous_transaction_id,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        dateGranted: row.date_granted,
        dateMatured: row.date_matured,
        dateExpired: row.date_expired,
        appraisalValue: parseFloat(row.appraisal_value || 0),
        principalLoan: parseFloat(row.principal_loan || 0),
        interestRate: parseFloat(row.interest_rate || 0),
        availableAmount: parseFloat(row.available_amount || 0),
        discount: parseFloat(row.discount || 0),
        previousLoan: parseFloat(row.previous_loan || 0),
        interestAmount: parseFloat(row.interest_amount || 0),
        penalty: parseFloat(row.penalty || 0),
        additionalAmount: parseFloat(row.additional_amount || 0),
        newPrincipalLoan: parseFloat(row.new_principal_loan || 0),
        partialPayment: parseFloat(row.partial_payment || 0),
        dueAmount: parseFloat(row.due_amount || 0),
        redeemAmount: parseFloat(row.redeem_amount || 0),
        advanceInterest: parseFloat(row.advance_interest || 0),
        advanceServiceCharge: parseFloat(row.advance_service_charge || 0),
        netProceed: parseFloat(row.net_proceed || 0),
        netPayment: parseFloat(row.net_payment || 0),
        amountReceived: parseFloat(row.amount_received || 0),
        changeAmount: parseFloat(row.change_amount || 0),
        loanStatus: row.loan_status,
        notes: row.notes,
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
        // Item information
        itemCategory: row.item_category,
        itemDescription: row.item_description,
        itemValue: parseFloat(row.estimated_value || 0),
        itemWeight: parseFloat(row.weight || 0),
        itemKarat: parseInt(row.karat || 0),
        itemConditionNotes: row.condition_notes,
        itemAppraisalNotes: row.appraisal_notes
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

// Create new loan transaction from appraisal
router.post('/new-loan/:appraisalId', async (req, res) => {
  try {
    const { appraisalId } = req.params;
    const { 
      principalLoan,
      interestRate,
      advanceInterest,
      advanceServiceCharge,
      netProceed,
      notes 
    } = req.body;
    
    console.log(`➕ [${new Date().toISOString()}] Creating new loan transaction from appraisal ${appraisalId} - User: ${req.user.username}`);
    
    // Validate required fields
    if (!principalLoan || !netProceed) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: principalLoan, netProceed'
      });
    }
    
    // Get appraisal data
    const appraisalResult = await pool.query(`
      SELECT a.*, p.id as pawner_id
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.id = $1 AND a.status = 'completed'
    `, [appraisalId]);
    
    if (appraisalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Completed appraisal not found'
      });
    }
    
    const appraisal = appraisalResult.rows[0];
    
    // Generate transaction number
    const year = new Date().getFullYear();
    
    // Get or create sequence for this year
    await pool.query(`
      INSERT INTO transaction_sequences (year, next_number) 
      VALUES ($1, 1) 
      ON CONFLICT (year) DO NOTHING
    `, [year]);
    
    // Get next transaction number
    const sequenceResult = await pool.query(`
      UPDATE transaction_sequences 
      SET next_number = next_number + 1 
      WHERE year = $1 
      RETURNING next_number - 1 as current_number
    `, [year]);
    
    const transactionNumber = `${year}-${String(sequenceResult.rows[0].current_number).padStart(6, '0')}`;
    
    // Calculate dates
    const transactionDate = new Date();
    const dateGranted = new Date();
    const dateMatured = new Date();
    dateMatured.setMonth(dateMatured.getMonth() + 4); // 4 months maturity
    const dateExpired = new Date(dateMatured);
    dateExpired.setMonth(dateExpired.getMonth() + 1); // 1 month grace period
    
    // Insert transaction
    const result = await pool.query(`
      INSERT INTO transactions (
        transaction_number, appraisal_id, pawner_id, cashier_id,
        transaction_type, transaction_date, date_granted, date_matured, date_expired,
        appraisal_value, principal_loan, interest_rate, advance_interest, advance_service_charge,
        net_proceed, loan_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      transactionNumber, appraisalId, appraisal.pawner_id, req.user.id,
      'new_loan', transactionDate, dateGranted, dateMatured, dateExpired,
      appraisal.estimated_value,
      principalLoan,
      interestRate || appraisal.interest_rate,
      advanceInterest || 0,
      advanceServiceCharge || 0,
      netProceed,
      'active',
      notes || ''
    ]);
    
    const transaction = result.rows[0];
    
    // Update appraisal status to used
    await pool.query('UPDATE appraisals SET status = $1 WHERE id = $2', ['used', appraisalId]);
    
    // Log audit trail
    await pool.query(`
      INSERT INTO audit_trail (
        table_name, record_id, action, user_id, new_values, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'transactions',
      transaction.id,
      'CREATE',
      req.user.id,
      JSON.stringify(transaction),
      `Created new loan transaction from appraisal ${appraisalId}`
    ]);
    
    console.log(`✅ Transaction created: ${transactionNumber}`);
    
    res.json({
      success: true,
      message: 'New loan transaction created successfully',
      data: {
        transaction,
        transactionNumber,
        appraisalId: parseInt(appraisalId)
      }
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction'
    });
  }
});

module.exports = router;