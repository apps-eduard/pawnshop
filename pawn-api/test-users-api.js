const http = require('http');

// Test users API to check last login info
async function testUsersAPI() {
  console.log('🧪 Testing Users API for last login information...\n');

  // First, let's get a login token
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ Could not get auth token');
    return;
  }

  console.log('✅ Got auth token, now fetching users...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
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
      try {
        const response = JSON.parse(responseBody);
        console.log(`Status: ${res.statusCode}`);
        
        if (response.success && response.data) {
          console.log(`Found ${response.data.length} users:`);
          console.log('=' .repeat(80));
          
          response.data.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} (${user.firstName} ${user.lastName})`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`);
            console.log(`   Last Login IP: ${user.lastLoginIp || 'N/A'}`);
            console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
            console.log('');
          });
        } else {
          console.log('API response:', response);
        }
      } catch (e) {
        console.log('Raw response:', responseBody);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ Request error: ${error.message}`);
  });

  req.end();
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
          console.log('Login error:', responseBody);
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

testUsersAPI();