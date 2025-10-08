/**
 * Test Recent Transactions Endpoint with Tracking Chain Logic
 * Tests GET /api/transactions endpoint that shows recent transactions
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testRecentTransactions() {
  try {
    console.log('🔐 Step 1: Login as cashier...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'cashier1',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!\n');
    
    // Test getting recent transactions
    console.log('📋 Step 2: Fetching recent transactions...');
    const response = await axios.get(`${API_BASE}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log(`✅ Retrieved ${response.data.data.length} transactions\n`);
    
    // Display transaction details
    console.log('📊 Recent Transactions (Latest state only):');
    console.log('━'.repeat(100));
    
    response.data.data.forEach((txn, index) => {
      console.log(`\n${index + 1}. Ticket: ${txn.ticketNumber}`);
      console.log(`   🔗 Tracking Number: ${txn.trackingNumber || 'N/A'}`);
      console.log(`   ⬅️  Previous Ticket: ${txn.previousTransactionNumber || 'FIRST IN CHAIN'}`);
      console.log(`   📝 Type: ${txn.transactionType}`);
      console.log(`   💰 Principal: ₱${txn.principalAmount.toFixed(2)}`);
      console.log(`   📅 Granted: ${new Date(txn.dateGranted).toLocaleDateString()}`);
      console.log(`   📅 Maturity: ${new Date(txn.maturityDate).toLocaleDateString()}`);
      console.log(`   📅 Grace Period: ${txn.gracePeriodDate ? new Date(txn.gracePeriodDate).toLocaleDateString() : 'N/A'}`);
      console.log(`   👤 Pawner: ${txn.pawnerName}`);
      console.log(`   🏢 Branch: ${txn.branchName}`);
      console.log(`   📊 Status: ${txn.status}`);
      
      if (txn.transactionHistory && txn.transactionHistory.length > 0) {
        console.log(`   📜 Transaction Chain (${txn.transactionHistory.length} transactions):`);
        txn.transactionHistory.forEach((hist, histIndex) => {
          const isLatest = histIndex === txn.transactionHistory.length - 1;
          console.log(`      ${histIndex + 1}. ${hist.transactionNumber} - ${hist.transactionType} ${isLatest ? '← CURRENT' : ''}`);
          console.log(`         Principal: ₱${parseFloat(hist.principalAmount).toFixed(2)}`);
          console.log(`         Date: ${new Date(hist.transactionDate).toLocaleDateString()}`);
        });
      } else {
        console.log(`   📜 Transaction History: None (single transaction)`);
      }
    });
    
    console.log('\n' + '━'.repeat(100));
    console.log(`\n✅ Test completed successfully!`);
    console.log(`   Total transactions: ${response.data.pagination.total}`);
    console.log(`   Page: ${response.data.pagination.page}/${response.data.pagination.pages}`);
    
    // Verify tracking chain logic
    console.log('\n🔍 Verification:');
    const withTrackingNumber = response.data.data.filter(t => t.trackingNumber);
    console.log(`   - Transactions with tracking_number: ${withTrackingNumber.length}`);
    console.log(`   - Transactions without tracking_number: ${response.data.data.length - withTrackingNumber.length}`);
    
    const withHistory = response.data.data.filter(t => t.transactionHistory && t.transactionHistory.length > 1);
    console.log(`   - Transactions with chain history: ${withHistory.length}`);
    
    if (withHistory.length > 0) {
      console.log('\n📊 Example of tracking chain:');
      const example = withHistory[0];
      console.log(`   Tracking Number: ${example.trackingNumber}`);
      console.log(`   Chain:`);
      example.transactionHistory.forEach((hist, idx) => {
        console.log(`   ${idx + 1}. ${hist.transactionNumber} (${hist.transactionType})`);
        if (hist.previousTransactionNumber) {
          console.log(`      ⬅️  Previous: ${hist.previousTransactionNumber}`);
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
console.log('🚀 Testing Recent Transactions with Tracking Chain Logic\n');
testRecentTransactions();
