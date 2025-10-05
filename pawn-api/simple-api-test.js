/**
 * Simple API Test
 */

const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3000';
  
  try {
    // Test basic health endpoint
    console.log('Testing basic health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('Health response:', healthResponse.data);
    
    // Test login endpoint
    console.log('\nTesting login endpoint...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Login successful, token received');
    
    // List all available routes by testing common ones
    const token = loginResponse.data.token;
    console.log('\nTesting available routes...');
    
    const testRoutes = [
      '/api/admin/categories',
      '/api/penalty-config',
      '/api/service-charge-config'
    ];
    
    for (const route of testRoutes) {
      try {
        const response = await axios.get(`${baseURL}${route}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`✅ ${route} - Working`);
      } catch (error) {
        console.log(`❌ ${route} - ${error.response?.status || 'Error'}: ${error.response?.statusText || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI().catch(console.error);