/**
 * Seed Script: Create Test Loan with Legacy System Dates
 * 
 * Purpose: Create a loan with exact dates from legacy system screenshots
 * to test if new calculations match legacy system results.
 * 
 * Test Dates:
 * - Date Granted: October 22, 2021
 * - Date Mature: November 22, 2021 (30 days after grant)
 * - Grace Period: November 22-25, 2021 (3 days)
 * 
 * Expected Results:
 * - Within grace (11/25/2021): Interest=0, Penalty=0
 * - After grace (11/26/2021): Interest=162, Penalty=54
 * - 2 months (01/25/2022): Interest=324, Penalty=162
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function seedTestLoan() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting seed for test loan with legacy dates...\n');

    await client.query('BEGIN');

    // 1. Get or create test pawner (customer)
    console.log('📋 Step 1: Finding/Creating test pawner...');
    
    let pawnerResult = await client.query(`
      SELECT id FROM pawners 
      WHERE first_name = 'TEST' AND last_name = 'LEGACY'
    `);

    let pawnerId;
    if (pawnerResult.rows.length === 0) {
      // Create test pawner
      const insertPawner = await client.query(`
        INSERT INTO pawners (
          first_name, last_name, mobile_number, email,
          city_id, barangay_id, house_number, branch_id, is_active
        ) VALUES (
          'TEST', 'LEGACY', '09123456789', 'test@legacy.com',
          1, 1, 'Test Address', 1, true
        ) RETURNING id
      `);
      pawnerId = insertPawner.rows[0].id;
      console.log('✅ Created new test pawner with ID:', pawnerId);
    } else {
      pawnerId = pawnerResult.rows[0].id;
      console.log('✅ Found existing test pawner with ID:', pawnerId);
    }

    // 2. Create transaction with legacy dates
    console.log('\n📋 Step 2: Creating transaction with legacy dates...');
    
    const dateGranted = '2021-10-22'; // October 22, 2021
    const dateMature = '2021-11-22';  // November 22, 2021 (30 days after)
    const dateExpired = '2022-02-22'; // February 22, 2022 (3 months after maturity)
    const gracePeriodDate = '2021-11-25'; // November 25, 2021 (3 days after maturity)

    const ticketNumber = 'TEST-LEGACY-001';
    const principalAmount = 2700.00; // ₱2,700 - same as legacy screenshots
    const interestRate = 0.06; // 6% monthly
    const interestAmount = 162.00; // ₱2,700 × 6% = ₱162
    const serviceCharge = 5.00; // ₱5 service charge
    const totalAmount = principalAmount + interestAmount; // ₱2,862

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
      1,                 // branch_id (default branch)
      'new_loan',
      'active',
      principalAmount,
      interestRate,
      interestAmount,
      serviceCharge,
      totalAmount,
      totalAmount,       // balance (same as total initially)
      dateGranted,       // transaction_date (same as date_granted)
      dateGranted,       // granted_date: 10/22/2021
      dateMature,        // maturity_date: 11/22/2021
      gracePeriodDate,   // grace_period_date: 11/25/2021
      dateExpired,       // expiry_date: 02/22/2022
      'Test loan with legacy system dates for calculation testing',
      1                  // created_by (admin user)
    ]);

    const transactionId = transactionResult.rows[0].id;
    console.log('✅ Created transaction:', transactionResult.rows[0].transaction_number);
    console.log('   Transaction ID:', transactionId);
    console.log('   Date Granted:', dateGranted);
    console.log('   Date Mature:', dateMature);
    console.log('   Grace Period Date:', gracePeriodDate);
    console.log('   Principal Amount:', '₱' + principalAmount.toFixed(2));

    // 3. Create pawn ticket
    console.log('\n📋 Step 3: Creating pawn ticket...');
    
    await client.query(`
      INSERT INTO pawn_tickets (
        transaction_id, ticket_number, status, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
    `, [transactionId, ticketNumber, 'active']);

    console.log('✅ Created pawn ticket');

    await client.query('COMMIT');

    console.log('\n🎉 ========================================');
    console.log('✅ TEST LOAN SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

    console.log('📊 TEST SCENARIOS TO RUN:\n');
    
    console.log('🔍 SCENARIO 1: Partial Payment Within Grace Period');
    console.log('   Ticket Number: TEST-LEGACY-001');
    console.log('   Test Date: November 25, 2021 (3 days after maturity)');
    console.log('   Expected: Interest = ₱0.00, Penalty = ₱0.00');
    console.log('   Partial Payment: ₱1,000.00');
    console.log('   Expected Net Payment: ₱1,107.00 (1000 + 0 + 0 + 102 + 5)\n');

    console.log('🔍 SCENARIO 2: Partial Payment After Grace Period');
    console.log('   Ticket Number: TEST-LEGACY-001');
    console.log('   Test Date: November 26, 2021 (4 days after maturity)');
    console.log('   Expected: Interest = ₱162.00, Penalty = ₱54.00');
    console.log('   Partial Payment: ₱1,000.00');
    console.log('   Expected Net Payment: ₱1,323.00 (1000 + 162 + 54 + 102 + 5)\n');

    console.log('🔍 SCENARIO 3: Partial Payment After 2 Months');
    console.log('   Ticket Number: TEST-LEGACY-001');
    console.log('   Test Date: January 25, 2022 (64 days after maturity)');
    console.log('   Expected: Interest = ₱324.00, Penalty = ₱162.00');
    console.log('   Partial Payment: ₱1,000.00');
    console.log('   Expected Net Payment: ₱1,593.00 (1000 + 324 + 162 + 102 + 5)\n');

    console.log('🔍 ADDITIONAL LOAN TEST:');
    console.log('   Same ticket number and test dates');
    console.log('   Expected calculations match partial payment\n');

    console.log('🔍 RENEW TEST:');
    console.log('   Same ticket number and test dates');
    console.log('   Expected calculations match partial payment\n');

    console.log('⚠️  NOTE: To simulate different test dates, you may need to:');
    console.log('   1. Temporarily modify system date in your test environment, OR');
    console.log('   2. Update the calculation logic to accept a custom "test date" parameter\n');

    console.log('📝 Database Changes:');
    console.log('   - Pawner: TEST LEGACY');
    console.log('   - Ticket: TEST-LEGACY-001');
    console.log('   - Transaction ID:', transactionId);
    console.log('   - Principal: ₱2,700.00');
    console.log('   - Date Granted: 2021-10-22');
    console.log('   - Date Mature: 2021-11-22');
    console.log('   - Grace Period: 2021-11-25');
    console.log('\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding test loan:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedTestLoan();
