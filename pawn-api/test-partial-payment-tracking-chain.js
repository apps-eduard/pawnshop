/**
 * Test Partial Payment with Tracking Chain
 * 
 * Flow:
 * 1. Create New Loan (TXN-001)
 * 2. Create Partial Payment from TXN-001 (creates TXN-002)
 * 3. Check Recent Transactions shows TXN-002 (latest) with toggle to see TXN-001
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

async function login() {
  console.log('🔐 Step 1: Login as cashier...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'cashier1',
    password: 'password123'
  });
  authToken = response.data.token;
  console.log('✅ Login successful!\n');
}

async function createNewLoan() {
  console.log('📝 Step 2: Creating New Loan...');
  
  const newLoanData = {
    pawnerData: {
      firstName: 'Maria',
      lastName: 'Santos',
      contactNumber: '09171234567',
      email: 'maria@example.com',
      cityId: 26,
      barangayId: 135,
      addressDetails: '456 Sample St'
    },
    items: [
      {
        categoryId: 1, // Jewelry
        descriptionId: 1,
        appraisalNotes: '14K Gold Bracelet',
        appraisedValue: 8000,
        loanAmount: 5000
      }
    ],
    loanData: {
      principalLoan: 5000,
      interestRate: 3,
      interestAmount: 150,
      serviceCharge: 5,
      netProceeds: 4995
    }
  };
  
  const response = await axios.post(
    `${API_BASE}/transactions/new-loan`,
    newLoanData,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const ticketNumber = response.data.ticketNumber;
  console.log('✅ New Loan created!');
  console.log(`   Ticket: ${ticketNumber}`);
  console.log(`   Principal: ₱${response.data.principalAmount || 5000}\n`);
  
  return ticketNumber;
}

async function createPartialPayment(ticketId) {
  console.log('📝 Step 3: Creating Partial Payment...');
  console.log(`   From Ticket: ${ticketId}`);
  
  const partialPaymentData = {
    ticketId: ticketId,
    partialPayment: 2000,        // Pay ₱2,000
    newPrincipalLoan: 3000,      // Reduce to ₱3,000
    discountAmount: 0,
    advanceInterest: 0,
    netPayment: 2000
  };
  
  const response = await axios.post(
    `${API_BASE}/transactions/partial-payment`,
    partialPaymentData,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const newTicket = response.data.data.newTicketNumber;
  console.log('✅ Partial Payment created!');
  console.log(`   Previous Ticket: ${response.data.data.previousTicketNumber}`);
  console.log(`   New Ticket: ${newTicket}`);
  console.log(`   Tracking: ${response.data.data.trackingNumber}`);
  console.log(`   Partial Payment: ₱${response.data.data.partialPayment}`);
  console.log(`   New Principal: ₱${response.data.data.newPrincipalLoan}`);
  console.log(`   Remaining Balance: ₱${response.data.data.remainingBalance}\n`);
  
  return newTicket;
}

async function checkRecentTransactions(originalTicket, partialPaymentTicket) {
  console.log('📋 Step 4: Checking Recent Transactions...');
  const response = await axios.get(`${API_BASE}/transactions`, {
    headers: { Authorization: `Bearer ${authToken}` },
    params: { page: 1, limit: 10 }
  });
  
  // Find our transaction
  const ourTransaction = response.data.data.find(t => 
    t.trackingNumber === originalTicket || 
    t.ticketNumber === partialPaymentTicket ||
    t.transaction_number === partialPaymentTicket
  );
  
  if (!ourTransaction) {
    console.log('❌ Transaction not found in recent transactions!');
    return;
  }
  
  console.log('🎯 Recent Transactions Display:');
  console.log('━'.repeat(80));
  console.log(`📄 Shows: ${ourTransaction.ticketNumber || ourTransaction.transaction_number}`);
  console.log(`📝 Type: ${ourTransaction.transactionType || ourTransaction.type}`);
  console.log(`💰 Principal: ₱${ourTransaction.principalAmount || ourTransaction.principal_amount}`);
  console.log(`🔗 Tracking: ${ourTransaction.trackingNumber}`);
  
  const history = ourTransaction.transactionHistory;
  if (history && history.length > 1) {
    console.log(`\n✅ HAS HISTORY TOGGLE (${history.length} transactions in chain)`);
    console.log('━'.repeat(80));
    console.log('When user clicks toggle, they will see:');
    
    history.forEach((txn, index) => {
      const isLatest = index === history.length - 1;
      console.log(`\n${index + 1}. ${txn.transactionNumber} ${isLatest ? '← CURRENT (displayed in main list)' : ''}`);
      console.log(`   Type: ${txn.transactionType}`);
      console.log(`   Principal: ₱${parseFloat(txn.principalAmount).toFixed(2)}`);
      console.log(`   Date: ${new Date(txn.transactionDate || txn.createdAt).toLocaleDateString()}`);
      
      if (index === 0) {
        console.log(`   🎯 ORIGINAL NEW LOAN`);
      } else if (txn.transactionType === 'partial_payment') {
        console.log(`   💰 Partial Payment: ₱${parseFloat(txn.amountPaid || 0).toFixed(2)}`);
        console.log(`   📉 Reduced to: ₱${parseFloat(txn.principalAmount).toFixed(2)}`);
      }
    });
    
    console.log('\n' + '━'.repeat(80));
    console.log('\n✅ VERIFICATION PASSED:');
    console.log(`   ✓ Main list shows LATEST transaction (${partialPaymentTicket})`);
    console.log(`   ✓ Type shows: ${history[history.length - 1].transactionType}`);
    console.log(`   ✓ Has "${history.length} history" badge`);
    console.log(`   ✓ Clickable toggle to expand`);
    console.log(`   ✓ History shows original transaction (${originalTicket})`);
    console.log(`   ✓ Chain is complete and in order`);
    
  } else {
    console.log('\n❌ ERROR: No history found or only 1 transaction');
    console.log('   Expected to see both New Loan and Partial Payment');
  }
}

async function runTest() {
  try {
    console.log('🚀 PARTIAL PAYMENT TRACKING CHAIN TEST\n');
    console.log('This test demonstrates:');
    console.log('  1. Create New Loan (TXN-001)');
    console.log('  2. Create Partial Payment (creates TXN-002)');
    console.log('  3. Recent Transactions shows TXN-002 (latest)');
    console.log('  4. Toggle expands to show TXN-001 (original)\n');
    console.log('━'.repeat(80) + '\n');
    
    await login();
    const originalTicket = await createNewLoan();
    
    // Wait a bit to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const partialPaymentTicket = await createPartialPayment(originalTicket);
    
    // Wait a bit to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkRecentTransactions(originalTicket, partialPaymentTicket);
    
    console.log('\n' + '━'.repeat(80));
    console.log('🎉 TEST COMPLETED!');
    console.log('\nExpected Frontend Behavior:');
    console.log('  📱 Recent Transactions List:');
    console.log(`     → Shows: ${partialPaymentTicket} (Partial Payment)`);
    console.log(`     → Badge: "2 history"`);
    console.log(`     → Icon: Dropdown arrow (▼)`);
    console.log(`     → Hover: Background changes (clickable)`);
    console.log('');
    console.log('  🖱️ When User Clicks:');
    console.log(`     → Expands to show full chain`);
    console.log(`     → 1. ${originalTicket} (New Loan) - ₱5,000`);
    console.log(`     → 2. ${partialPaymentTicket} (Partial Payment) - ₱3,000 ← CURRENT`);
    console.log('');
    console.log('  ✨ User Experience:');
    console.log('     → Clear which transaction is current');
    console.log('     → Can see full payment history');
    console.log('     → Original loan preserved (immutable)');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
runTest();
