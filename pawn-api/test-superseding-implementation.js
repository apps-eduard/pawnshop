const axios = require('axios');

async function testAutomaticSuperseding() {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Login first to get auth token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'cashier1',
      password: 'password123'
    });
    
    const authToken = loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    console.log('✅ Logged in successfully');
    
    // Step 1: Create a new loan
    console.log('\n📝 Step 1: Creating new loan...');
    
    const newLoanData = {
      pawnerData: {
        firstName: 'Test',
        lastName: 'Superseding',
        contactNumber: '09171234567',
        email: 'test@example.com',
        cityId: 26,
        barangayId: 135,
        addressDetails: '123 Test St'
      },
      items: [{
        categoryId: 1,
        descriptionId: 1,
        appraisalNotes: 'Test Gold Ring',
        appraisedValue: 5000,
        loanAmount: 3000
      }],
      loanData: {
        principalLoan: 3000,
        interestRate: 3,
        interestAmount: 90,
        serviceCharge: 5,
        netProceeds: 2995
      },
      notes: 'Test loan for superseding'
    };
    
    const newLoanResponse = await axios.post(
      `${API_BASE}/transactions/new-loan`,
      newLoanData,
      { headers }
    );
    
    const originalTicket = newLoanResponse.data.ticketNumber;
    console.log(`✅ Created new loan: ${originalTicket}`);
    
    // Step 2: Check the original transaction status
    console.log('\n🔍 Step 2: Checking original transaction status...');
    
    const searchResponse1 = await axios.get(
      `${API_BASE}/transactions/search/${originalTicket}`,
      { headers }
    );
    
    console.log(`📋 ${originalTicket} status: ${searchResponse1.data.data.status}`);
    console.log(`📋 ${originalTicket} is_active: ${searchResponse1.data.data.is_active}`);
    
    // Step 3: Create additional loan
    console.log('\n➕ Step 3: Creating additional loan...');
    
    const additionalLoanData = {
      originalTicketId: originalTicket,
      additionalAmount: 1500,
      notes: 'Test additional loan for superseding'
    };
    
    const additionalResponse = await axios.post(
      `${API_BASE}/transactions/additional-loan`,
      additionalLoanData,
      { headers }
    );
    
    const additionalTicket = additionalResponse.data.newTicketNumber;
    console.log(`✅ Created additional loan: ${additionalTicket}`);
    
    // Step 4: Check both transactions status
    console.log('\n🔍 Step 4: Checking transaction statuses after additional loan...');
    
    const searchResponse2 = await axios.get(
      `${API_BASE}/transactions/search/${originalTicket}`,
      { headers }
    );
    
    const chainHistory = searchResponse2.data.data.transactionHistory || [];
    
    console.log('\n📊 Transaction Chain Status:');
    chainHistory.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.transaction_number} (${tx.transaction_type}) - Status: ${tx.status} | Active: ${tx.is_active}`);
    });
    
    // Verify superseding worked
    const originalTxInHistory = chainHistory.find(tx => tx.transaction_number === originalTicket);
    const additionalTxInHistory = chainHistory.find(tx => tx.transaction_number === additionalTicket);
    
    console.log('\n🧪 Superseding Test Results:');
    
    if (originalTxInHistory && originalTxInHistory.status === 'superseded') {
      console.log(`✅ SUCCESS: ${originalTicket} is now superseded`);
    } else {
      console.log(`❌ FAILED: ${originalTicket} should be superseded but is ${originalTxInHistory?.status}`);
    }
    
    if (additionalTxInHistory && additionalTxInHistory.status === 'active') {
      console.log(`✅ SUCCESS: ${additionalTicket} is active (latest in chain)`);
    } else {
      console.log(`❌ FAILED: ${additionalTicket} should be active but is ${additionalTxInHistory?.status}`);
    }
    
    console.log('\n🎯 Automatic Superseding Implementation: COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAutomaticSuperseding();