/**
 * Test Frontend API Integration
 * Tests the API endpoints that will be used by the Angular frontend
 */

const axios = require('axios');

async function testFrontendAPI() {
  console.log('🧪 Testing Frontend API Integration');
  console.log('===================================');

  const baseURL = 'http://localhost:3000';
  
  // Test cases for different loan amounts
  const testCases = [
    { amount: 50, expectedCharge: 1 },
    { amount: 100, expectedCharge: 1 },
    { amount: 150, expectedCharge: 2 },
    { amount: 250, expectedCharge: 3 },
    { amount: 350, expectedCharge: 4 },
    { amount: 1000, expectedCharge: 5 }
  ];

  try {
    // Test login first (to get authentication token)
    console.log('🔐 Testing login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test service charge calculation endpoint
    console.log('\n💰 Testing service charge calculation API...');
    
    for (const testCase of testCases) {
      try {
        const response = await axios.post(`${baseURL}/api/service-charge-config/calculate`, {
          principalAmount: testCase.amount
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          const result = response.data.data;
          console.log(`   ₱${testCase.amount} → ₱${result.serviceChargeAmount} (${result.calculationMethod}) ✅`);
        } else {
          console.log(`   ₱${testCase.amount} → ERROR: ${response.data.message} ❌`);
        }
      } catch (error) {
        console.log(`   ₱${testCase.amount} → API ERROR: ${error.message} ❌`);
      }
    }

    // Test getting service charge configuration
    console.log('\n⚙️ Testing service charge configuration API...');
    try {
      const configResponse = await axios.get(`${baseURL}/api/service-charge-config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (configResponse.data.success) {
        const config = configResponse.data.data;
        console.log('✅ Configuration retrieved successfully');
        console.log(`   Calculation Method: ${config.config.calculation_method}`);
        console.log(`   Number of Brackets: ${config.brackets.length}`);
      } else {
        console.log(`❌ Configuration error: ${configResponse.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Configuration API error: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Login failed: ${error.message}`);
    console.log('Make sure the API server is running on http://localhost:3000');
  }

  console.log('\n🎉 Frontend API integration test completed!');
}

// Run the test
testFrontendAPI().catch(console.error);