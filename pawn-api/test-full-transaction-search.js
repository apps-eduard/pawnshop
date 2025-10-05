const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testTransactionSearchWithAuth() {
  try {
    console.log('🧪 Testing transaction search with authentication...\n');
    
    // Step 1: Login to get a fresh token
    console.log('1️⃣ Logging in...');
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log(`Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Search for transaction
    console.log('\n2️⃣ Searching for transaction...');
    const ticketNumber = 'TXN-202510-000001';
    
    const searchOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/transactions/search/${ticketNumber}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const searchResponse = await makeRequest(searchOptions);
    console.log(`Search Status: ${searchResponse.status}`);
    
    if (searchResponse.status === 200) {
      console.log('✅ Transaction search successful!');
      const transaction = searchResponse.data.data;
      console.log('\n📋 Transaction Details:');
      console.log(`- Ticket: ${transaction.ticketNumber}`);
      console.log(`- Transaction: ${transaction.transactionNumber}`);
      console.log(`- Pawner: ${transaction.pawnerName}`);
      console.log(`- Amount: ₱${transaction.principalAmount}`);
      console.log(`- Status: ${transaction.status}`);
      console.log(`- Maturity: ${new Date(transaction.maturityDate).toLocaleDateString()}`);
    } else {
      console.error('❌ Transaction search failed:', searchResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testTransactionSearchWithAuth();