const http = require('http');

async function testNewLoanEndpoints() {
  console.log('🧪 Testing New Loan related endpoints...\n');

  // Get auth token first
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ Could not get auth token');
    return;
  }

  console.log('✅ Got auth token\n');

  // Test 1: Pawner search
  console.log('1. Testing pawner search endpoint...');
  await testEndpoint('GET', '/api/pawners/search?q=car', token);

  // Test 2: Check if pawners table has data
  console.log('\n2. Testing general pawners endpoint...');
  await testEndpoint('GET', '/api/pawners', token);

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

    console.log(`   Testing: ${method} ${path}`);

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
            if (response.data && Array.isArray(response.data)) {
              console.log(`   📊 Data count: ${response.data.length}`);
              if (response.data.length > 0) {
                console.log(`   📋 First item: ${JSON.stringify(response.data[0], null, 2).substring(0, 150)}...`);
              }
            }
          } else {
            console.log(`   ❌ Error: ${response.message || 'Unknown error'}`);
            console.log(`   🔍 Details: ${JSON.stringify(response, null, 2)}`);
          }
        } catch (e) {
          console.log(`   ⚠️  Could not parse JSON response`);
          console.log(`   📄 Raw response: ${responseBody.substring(0, 200)}`);
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

testNewLoanEndpoints();