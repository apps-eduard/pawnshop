const https = require('https');
const http = require('http');

function testTransactionSearch() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing transaction search API...\n');
    
    // Test with the ticket number from the error log
    const ticketNumber = 'TXN-202510-000001';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJjYXNoaWVyIiwiaWF0IjoxNzI4MTA5NTY5LCJleHAiOjE3MjgxOTU5Njl9.YFbTNYpeDNZIILhcfKGwOEpgQO0Kzh2wdR6bVKpjcJE';
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/transactions/search/${ticketNumber}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Status Text: ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('\nResponse:');
          console.log(JSON.stringify(jsonData, null, 2));
          resolve(jsonData);
        } catch (error) {
          console.log('\nRaw Response:');
          console.log(data);
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Test failed:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testTransactionSearch();