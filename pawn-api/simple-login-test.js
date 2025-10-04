const http = require('http');

// Simple HTTP test for login audit
async function testLogin(username, password, testName) {
  return new Promise((resolve) => {
    console.log(`🧪 ${testName}...`);
    
    const postData = JSON.stringify({ username, password });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'AuditTest/1.0'
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
          console.log(`   Status: ${res.statusCode} - ${response.message}`);
          if (response.success) {
            console.log(`   ✅ Login successful for user: ${username}`);
          } else {
            console.log(`   ❌ Login failed for user: ${username}`);
          }
        } catch (e) {
          console.log(`   Response: ${responseBody}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request error: ${error.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🔐 Testing Login Audit Implementation\n');
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test valid login
  await testLogin('admin', 'admin123', 'Valid login test');
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test invalid login
  await testLogin('admin', 'wrongpass', 'Invalid password test');
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test nonexistent user
  await testLogin('nobody', 'password', 'Nonexistent user test');
  
  console.log('\n✅ Tests completed. Check audit_logs table to see the entries.');
  console.log('You can check with: SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;');
}

runTests();