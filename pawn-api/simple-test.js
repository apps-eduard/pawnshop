const http = require('http');

async function simpleTest() {
  console.log('🧪 Simple API test...\n');
  
  // Test server health first
  try {
    console.log('1️⃣ Testing server health...');
    await testEndpoint('/api/health', 'GET');
    console.log('✅ Server is responsive\n');
  } catch (error) {
    console.error('❌ Server not responsive:', error.message);
    return;
  }
  
  // Test login
  try {
    console.log('2️⃣ Testing login...');
    const loginResult = await testEndpoint('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResult.data.success) {
      console.log('✅ Login successful');
      const token = loginResult.data.data.token;
      
      // Test transaction search
      console.log('\n3️⃣ Testing transaction search...');
      const searchResult = await testEndpoint('/api/transactions/search/TXN-202510-000001', 'GET', null, token);
      
      console.log(`Status: ${searchResult.status}`);
      console.log('Response:', JSON.stringify(searchResult.data, null, 2));
      
    } else {
      console.error('❌ Login failed:', loginResult.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

function testEndpoint(path, method, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

simpleTest();