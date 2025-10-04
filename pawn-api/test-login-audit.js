const http = require('http');

// Test login audit logging
async function testLoginAuditLogging() {
  console.log('🧪 Testing Login Audit Logging...\n');

  // Test 1: Valid login
  console.log('1. Testing valid login...');
  await testLogin('admin', 'admin123');

  // Test 2: Invalid username
  console.log('\n2. Testing invalid username...');
  await testLogin('nonexistent', 'password');

  // Test 3: Invalid password
  console.log('\n3. Testing invalid password...');
  await testLogin('admin', 'wrongpassword');

  // Test 4: Check audit logs
  console.log('\n4. Checking audit logs...');
  await checkAuditLogs();
}

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'LoginAuditTest/1.0'
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
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Result: ${response.success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`   Message: ${response.message}`);
          resolve(response);
        } catch (e) {
          console.log(`   Error parsing response: ${e.message}`);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   Request error: ${error.message}`);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

async function checkAuditLogs() {
  const { pool } = require('./config/database');
  
  try {
    const result = await pool.query(`
      SELECT id, user_id, username, action, ip_address, created_at
      FROM audit_logs 
      WHERE action LIKE 'LOGIN%'
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    console.log(`   Found ${result.rows.length} login-related audit log entries:`);
    result.rows.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.created_at.toISOString()} - ${log.username} - ${log.action} - IP: ${log.ip_address}`);
    });

    await pool.end();
  } catch (error) {
    console.error(`   Database error: ${error.message}`);
  }
}

// Run the test
testLoginAuditLogging().then(() => {
  console.log('\n✅ Login audit logging test completed');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});