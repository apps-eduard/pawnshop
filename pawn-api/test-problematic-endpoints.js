const http = require('http');

async function testEndpoints() {
  console.log('🧪 Testing problematic endpoints...\n');

  // Get auth token first
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ Could not get auth token');
    return;
  }

  console.log('✅ Got auth token\n');

  // Test 1: /api/pawners
  console.log('1. Testing GET /api/pawners...');
  await testEndpoint('GET', '/api/pawners', token);

  // Test 2: /api/admin/transactions
  console.log('\n2. Testing GET /api/admin/transactions...');
  await testEndpoint('GET', '/api/admin/transactions?page=1&limit=50', token);

  console.log('\n✅ Testing completed');
}

function testEndpoint(method, path, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(responseBody);
          if (res.statusCode === 200) {
            console.log(`   ✅ Success: ${response.message}`);
            console.log(`   📊 Data count: ${response.data ? (Array.isArray(response.data) ? response.data.length : 'object') : 'none'}`);
          } else {
            console.log(`   ❌ Error: ${response.message || 'Unknown error'}`);
          }
        } catch (e) {
          console.log(`   Raw response (first 200 chars): ${responseBody.substring(0, 200)}...`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request error: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

function getAuthToken() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ username: 'admin', password: 'admin123' });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          if (response.success && response.data && response.data.token) {
            resolve(response.data.token);
          } else {
            console.log('Login failed:', response.message);
            resolve(null);
          }
        } catch (e) {
          console.log('Login parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`Login error: ${error.message}`);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

testEndpoints();