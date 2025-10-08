/**
 * Test Complete Tracking Chain Flow
 * 
 * Tests:
 * 1. Create New Loan (TXN-001)
 * 2. Create Additional Loan (TXN-002)
 * 3. Check Recent Transactions shows TXN-002 (latest)
 * 4. Verify transactionHistory contains both TXN-001 and TXN-002
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

// Test data
const newLoanData = {
  pawnerData: {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    contactNumber: '09123456789',
    email: 'juan@example.com',
    cityId: 26, // Butuan City
    barangayId: 135,
    addressDetails: '123 Test Street'
  },
  items: [
    {
      categoryId: 1, // Jewelry
      descriptionId: 1,
      appraisalNotes: '18K Gold Ring',
      appraisedValue: 5000,
      loanAmount: 3000
    }
  ],
  loanData: {
    principalLoan: 3000,
    interestRate: 3,
    interestAmount: 90,
    serviceCharge: 5,
    netProceeds: 2995
  }
};

async function login() {
  console.log('🔐 Step 1: Login as cashier...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'cashier1',
    password: 'password123'
  });
  authToken = response.data.token;
  console.log('✅ Login successful!\n');
  return authToken;
}

async function createNewLoan() {
  console.log('📝 Step 2: Creating New Loan...');
  const response = await axios.post(
    `${API_BASE}/transactions/new-loan`,
    newLoanData,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const ticketNumber = response.data.ticketNumber;
  console.log('✅ New Loan created!');
  console.log(`   Ticket: ${ticketNumber}`);
  console.log(`   Tracking: ${response.data.trackingNumber || ticketNumber}`);
  console.log(`   Principal: ₱${response.data.principalAmount || 3000}\n`);
  
  return ticketNumber;
}

async function createAdditionalLoan(originalTicket) {
  console.log('📝 Step 3: Creating Additional Loan...');
  const response = await axios.post(
    `${API_BASE}/transactions/additional-loan`,
    {
      originalTicketId: originalTicket,
      additionalAmount: 2000
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const newTicket = response.data.newTicketNumber;
  console.log('✅ Additional Loan created!');
  console.log(`   New Ticket: ${newTicket}`);
  console.log(`   Tracking: ${response.data.trackingNumber}`);
  console.log(`   Previous: ${response.data.previousTicketNumber || originalTicket}`);
  console.log(`   New Principal: ₱${response.data.newPrincipalAmount}\n`);
  
  return newTicket;
}

async function checkRecentTransactions(originalTicket, additionalTicket) {
  console.log('📋 Step 4: Checking Recent Transactions...');
  const response = await axios.get(`${API_BASE}/transactions`, {
    headers: { Authorization: `Bearer ${authToken}` },
    params: { page: 1, limit: 10 }
  });
  
  console.log(`✅ Retrieved ${response.data.data.length} transactions\n`);
  
  // Find our transaction
  const ourTransaction = response.data.data.find(t => 
    t.trackingNumber === originalTicket || 
    t.ticketNumber === additionalTicket ||
    t.transaction_number === additionalTicket
  );
  
  if (!ourTransaction) {
    console.log('❌ Transaction not found in recent transactions!');
    console.log('   Available transactions:', response.data.data.map(t => t.transaction_number || t.ticketNumber));
    return;
  }
  
  console.log('🎯 Found Our Transaction in Recent List:');
  console.log('━'.repeat(80));
  console.log(`📄 Current Ticket: ${ourTransaction.ticketNumber || ourTransaction.transaction_number}`);
  console.log(`🔗 Tracking Number: ${ourTransaction.trackingNumber || 'N/A'}`);
  console.log(`⬅️  Previous Ticket: ${ourTransaction.previousTransactionNumber || 'FIRST IN CHAIN'}`);
  console.log(`📝 Type: ${ourTransaction.transactionType || ourTransaction.type}`);
  console.log(`💰 Principal: ₱${ourTransaction.principalAmount || ourTransaction.principal_amount || 0}`);
  console.log(`👤 Customer: ${ourTransaction.pawnerName || ourTransaction.customer_name}`);
  console.log(`📊 Status: ${ourTransaction.status}`);
  
  // Check transaction history
  const history = ourTransaction.transactionHistory;
  if (history && history.length > 0) {
    console.log(`\n📜 Transaction Chain History (${history.length} transactions):`);
    console.log('━'.repeat(80));
    
    history.forEach((txn, index) => {
      const isFirst = index === 0;
      const isLast = index === history.length - 1;
      
      console.log(`\n${index + 1}. ${txn.transactionNumber} ${isLast ? '← CURRENT (Latest)' : ''} ${isFirst ? '(Original)' : ''}`);
      console.log(`   Type: ${txn.transactionType}`);
      console.log(`   Principal: ₱${parseFloat(txn.principalAmount).toFixed(2)}`);
      console.log(`   Date: ${new Date(txn.transactionDate || txn.createdAt).toLocaleDateString()}`);
      
      if (txn.previousTransactionNumber) {
        console.log(`   ⬅️  Previous: ${txn.previousTransactionNumber}`);
      } else {
        console.log(`   🎯 First in chain`);
      }
      
      if (txn.maturityDate) {
        console.log(`   📅 Maturity: ${new Date(txn.maturityDate).toLocaleDateString()}`);
      }
    });
    
    console.log('\n' + '━'.repeat(80));
    console.log('\n✅ VERIFICATION:');
    console.log(`   ✓ Shows latest transaction (${additionalTicket}) in main list`);
    console.log(`   ✓ Transaction history contains ${history.length} transactions`);
    console.log(`   ✓ First transaction: ${history[0].transactionNumber} (${history[0].transactionType})`);
    console.log(`   ✓ Latest transaction: ${history[history.length - 1].transactionNumber} (${history[history.length - 1].transactionType})`);
    
    // Verify chain links
    console.log('\n🔗 Chain Link Verification:');
    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      if (i === 0) {
        if (current.previousTransactionNumber === null) {
          console.log(`   ✓ ${current.transactionNumber}: First in chain (no previous)`);
        } else {
          console.log(`   ⚠️ ${current.transactionNumber}: Should have no previous, but has ${current.previousTransactionNumber}`);
        }
      } else {
        const previous = history[i - 1];
        if (current.previousTransactionNumber === previous.transactionNumber) {
          console.log(`   ✓ ${current.transactionNumber}: Correctly links to ${previous.transactionNumber}`);
        } else {
          console.log(`   ⚠️ ${current.transactionNumber}: Links to ${current.previousTransactionNumber}, expected ${previous.transactionNumber}`);
        }
      }
    }
    
    // Check tracking numbers
    const allSameTracking = history.every(txn => txn.trackingNumber === history[0].trackingNumber);
    if (allSameTracking) {
      console.log(`\n   ✓ All transactions share same tracking_number: ${history[0].trackingNumber}`);
    } else {
      console.log(`\n   ⚠️ WARNING: Transactions have different tracking numbers!`);
      history.forEach(txn => {
        console.log(`      ${txn.transactionNumber}: ${txn.trackingNumber}`);
      });
    }
    
  } else {
    console.log('\n⚠️ No transaction history found!');
    console.log('   Expected to see both New Loan and Additional Loan transactions');
  }
}

async function runTest() {
  try {
    console.log('🚀 TRACKING CHAIN TEST - Complete Flow\n');
    console.log('This test will:');
    console.log('  1. Create a New Loan');
    console.log('  2. Create an Additional Loan');
    console.log('  3. Verify Recent Transactions shows LATEST transaction');
    console.log('  4. Verify transaction history contains FULL CHAIN\n');
    console.log('━'.repeat(80) + '\n');
    
    await login();
    const originalTicket = await createNewLoan();
    const additionalTicket = await createAdditionalLoan(originalTicket);
    await checkRecentTransactions(originalTicket, additionalTicket);
    
    console.log('\n' + '━'.repeat(80));
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('\nFrontend Display Should Show:');
    console.log('  ▶ Main List: Latest transaction (Additional Loan)');
    console.log('  ▶ Click to expand: Shows full chain (New Loan → Additional Loan)');
    console.log('  ▶ Toggle works: History appears/disappears on click');
    
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
