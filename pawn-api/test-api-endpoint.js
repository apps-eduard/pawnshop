// Use import for node-fetch ES module
async function fetch(...args) {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
}

async function testAPIEndpoint() {
  try {
    console.log('=== TESTING API ENDPOINT THAT RETURNS 500 ===');
    console.log('URL: http://localhost:3000/api/appraisals/status/completed');
    
    // Test without authentication (this might be the issue)
    console.log('\n1. Testing WITHOUT authentication:');
    try {
      const response = await fetch('http://localhost:3000/api/appraisals/status/completed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      const text = await response.text();
      console.log('Response:', text);
      
    } catch (error) {
      console.log('Error without auth:', error.message);
    }
    
    // The issue is likely that the endpoint requires authentication
    console.log('\n🔑 The issue is probably that this endpoint requires authentication!');
    console.log('👉 The frontend needs to send Authorization header with JWT token');
    console.log('👉 Check if the frontend is logged in and sending the token');
    
    // Test login endpoint to get a token
    console.log('\n2. Testing login to get authentication token:');
    try {
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      console.log('Login Status:', loginResponse.status);
      
      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful!');
        
        const token = loginData.token;
        
        // Now test with authentication
        console.log('\n3. Testing WITH authentication:');
        const authResponse = await fetch('http://localhost:3000/api/appraisals/status/completed', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Authenticated Status:', authResponse.status);
        
        if (authResponse.status === 200) {
          const authData = await authResponse.json();
          console.log('✅ SUCCESS! Data received:', authData.data?.length || 0, 'appraisals');
          console.log('Sample:', authData.data?.[0] || 'No data');
        } else {
          const errorText = await authResponse.text();
          console.log('❌ Error with auth:', errorText);
        }
        
      } else {
        console.log('❌ Login failed');
        const errorData = await loginResponse.text();
        console.log('Login error:', errorData);
      }
      
    } catch (error) {
      console.log('Login error:', error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAPIEndpoint();