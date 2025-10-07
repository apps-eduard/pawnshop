/**
 * Seed Script: Create Test Loan with RECENT Dates for Easy Testing
 * 
 * Purpose: Create loans that can be tested TODAY (October 7, 2025)
 * with various maturity scenarios that match legacy system calculations
 * 
 * Test Scenarios:
 * 1. Loan matured 3 days ago (within grace period)
 * 2. Loan matured 4 days ago (1 day after grace period)
 * 3. Loan matured 1 month + 3 days ago
 * 4. Loan matured 2 months + 3 days ago
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

// Helper function to get date X days ago
function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Helper function to add days to a date
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function seedTestLoans() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting seed for test loans with RECENT dates...\n');
    console.log(`📅 Today's Date: ${new Date().toISOString().split('T')[0]}\n`);

    await client.query('BEGIN');

    // Get or create test pawner
    console.log('📋 Step 1: Finding/Creating test pawner...');
    
    let pawnerResult = await client.query(`
      SELECT id FROM pawners 
      WHERE first_name = 'TEST' AND last_name = 'RECENT'
    `);

    let pawnerId;
    if (pawnerResult.rows.length === 0) {
      const insertPawner = await client.query(`
        INSERT INTO pawners (
          first_name, last_name, mobile_number, email,
          city_id, barangay_id, house_number, branch_id, is_active
        ) VALUES (
          'TEST', 'RECENT', '09123456789', 'test@recent.com',
          1, 1, 'Test Address', 1, true
        ) RETURNING id
      `);
      pawnerId = insertPawner.rows[0].id;
      console.log('✅ Created new test pawner with ID:', pawnerId);
    } else {
      pawnerId = pawnerResult.rows[0].id;
      console.log('✅ Found existing test pawner with ID:', pawnerId);
    }

    // Test loan configurations
    const testLoans = [
      {
        suffix: '001',
        name: 'Within Grace Period (3 days)',
        daysAgoMatured: 3,
        expectedInterest: 0,
        expectedPenalty: 0,
        description: 'Matured 3 days ago - WITHIN GRACE PERIOD'
      },
      {
        suffix: '002',
        name: 'After Grace Period (4 days)',
        daysAgoMatured: 4,
        expectedInterest: 162,
        expectedPenalty: 54,
        description: 'Matured 4 days ago - 1 day AFTER grace period'
      },
      {
        suffix: '003',
        name: 'After Grace Period (33 days)',
        daysAgoMatured: 33,
        expectedInterest: 162,
        expectedPenalty: 54,
        description: 'Matured 1 month + 3 days ago - AFTER grace period'
      },
      {
        suffix: '004',
        name: 'After Grace Period (64 days)',
        daysAgoMatured: 64,
        expectedInterest: 324,
        expectedPenalty: 162,
        description: 'Matured 2 months + 3 days ago - AFTER grace period'
      }
    ];

    const principalAmount = 2700.00; // ₱2,700 - same as legacy screenshots
    const interestRate = 0.06; // 6% monthly
    const interestAmount = 162.00; // ₱2,700 × 6% = ₱162 (advance for 1 month)
    const serviceCharge = 5.00; // ₱5 service charge
    const totalAmount = principalAmount + interestAmount; // ₱2,862

    console.log('\n📋 Step 2: Creating test transactions...\n');

    for (const loan of testLoans) {
      const ticketNumber = `TEST-${loan.suffix}`;
      
      // Calculate dates
      // Maturity date = X days ago
      const maturityDate = getDaysAgo(loan.daysAgoMatured);
      // Grant date = maturity date - 30 days (1 month before maturity)
      const grantDate = addDays(maturityDate, -30);
      // Grace period = maturity + 3 days
      const gracePeriodDate = addDays(maturityDate, 3);
      // Expiry = maturity + 90 days (3 months)
      const expiryDate = addDays(maturityDate, 90);

      console.log(`🎯 Creating: ${loan.name}`);
      console.log(`   Ticket: ${ticketNumber}`);
      console.log(`   Grant Date: ${grantDate}`);
      console.log(`   Maturity Date: ${maturityDate} (${loan.daysAgoMatured} days ago)`);
      console.log(`   Grace Period: ${gracePeriodDate}`);
      console.log(`   Expected Interest: ₱${loan.expectedInterest.toFixed(2)}`);
      console.log(`   Expected Penalty: ₱${loan.expectedPenalty.toFixed(2)}`);

      // Create transaction
      const transactionResult = await client.query(`
        INSERT INTO transactions (
          transaction_number, pawner_id, branch_id, transaction_type, status,
          principal_amount, interest_rate, interest_amount, service_charge, 
          total_amount, balance, transaction_date, granted_date, maturity_date, 
          grace_period_date, expiry_date, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        RETURNING id, transaction_number
      `, [
        ticketNumber,
        pawnerId,
        1,
        'new_loan',
        'active',
        principalAmount,
        interestRate,
        interestAmount,
        serviceCharge,
        totalAmount,
        totalAmount,
        grantDate,
        grantDate,
        maturityDate,
        gracePeriodDate,
        expiryDate,
        loan.description,
        1
      ]);

      const transactionId = transactionResult.rows[0].id;

      // Create pawn ticket
      await client.query(`
        INSERT INTO pawn_tickets (
          transaction_id, ticket_number, status, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
      `, [transactionId, ticketNumber, 'active']);

      // Create appraisal with proper appraisal value (50% of which = principal loan)
      // If principal = ₱2,700, then appraisal value should be ₱5,400
      const appraisalValue = principalAmount * 2; // ₱5,400 (50% = ₱2,700 loan)

      const appraisalResult = await client.query(`
        INSERT INTO item_appraisals (
          pawner_id, branch_id, category_id, brand, model, specifications,
          quantity, appraisal_value, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `, [
        pawnerId,
        1,                    // branch_id
        1,                    // category_id (mobile/electronics)
        'SAMSUNG',            // brand
        'GALAXY A11',         // model
        'Test Item - CP SM-A115M/DS', // specifications
        1,                    // quantity
        appraisalValue,       // ₱5,400
        'completed',          // status (must be completed to use in transactions)
        1                     // created_by
      ]);

      const appraisalId = appraisalResult.rows[0].id;

      // Link appraisal to transaction via items table
      await client.query(`
        INSERT INTO items (
          transaction_id, appraisal_id, quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
      `, [transactionId, appraisalId, 1]);

      console.log(`   ✅ Created transaction ID: ${transactionId}`);
      console.log(`   ✅ Created appraisal ID: ${appraisalId} (Value: ₱${appraisalValue.toFixed(2)})\n`);
    }

    await client.query('COMMIT');

    console.log('🎉 ========================================');
    console.log('✅ TEST LOANS SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

    console.log('📊 TEST TICKETS CREATED:\n');
    
    console.log('🔍 TEST-001: Within Grace Period (3 days after maturity)');
    console.log('   Search this ticket and test Partial Payment ₱1,000');
    console.log('   Expected Results:');
    console.log('   - Interest: ₱0.00');
    console.log('   - Penalty: ₱0.00');
    console.log('   - Advance Interest: ₱102.00 (₱1,700 × 6%)');
    console.log('   - Advance Service Charge: ₱5.00');
    console.log('   - Net Payment: ₱1,107.00\n');

    console.log('🔍 TEST-002: After Grace Period (4 days)');
    console.log('   Search this ticket and test Partial Payment ₱1,000');
    console.log('   Expected Results:');
    console.log('   - Interest: ₱162.00 (1 month)');
    console.log('   - Penalty: ₱54.00 (1 month)');
    console.log('   - Advance Interest: ₱102.00');
    console.log('   - Advance Service Charge: ₱5.00');
    console.log('   - Net Payment: ₱1,323.00\n');

    console.log('🔍 TEST-003: After 1 Month + 3 Days (33 days)');
    console.log('   Search this ticket and test Partial Payment ₱1,000');
    console.log('   Expected Results:');
    console.log('   - Interest: ₱162.00 (1 month)');
    console.log('   - Penalty: ₱54.00 (1 month)');
    console.log('   - Net Payment: ₱1,323.00\n');

    console.log('🔍 TEST-004: After 2 Months + 3 Days (64 days)');
    console.log('   Search this ticket and test Partial Payment ₱1,000');
    console.log('   Expected Results:');
    console.log('   - Interest: ₱324.00 (2 months)');
    console.log('   - Penalty: ₱162.00 (3 months penalty)');
    console.log('   - Advance Interest: ₱102.00');
    console.log('   - Advance Service Charge: ₱5.00');
    console.log('   - Net Payment: ₱1,593.00\n');

    console.log('✅ All transaction types (Partial, Additional, Renew) should show IDENTICAL calculations!\n');

    console.log('📝 Common Test Data:');
    console.log('   - Pawner: TEST RECENT');
    console.log('   - Principal: ₱2,700.00');
    console.log('   - Interest Rate: 6% monthly');
    console.log('   - Penalty Rate: 2% monthly');
    console.log('   - Partial Payment Amount: ₱1,000.00');
    console.log('   - New Balance: ₱1,700.00\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding test loans:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedTestLoans();
