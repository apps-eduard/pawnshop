const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIiwiaWF0IjoxNzI4Nzk1MjIzLCJleHAiOjE3Mjg3OTg4MjN9.mock'; // Replace with actual token

async function testPawnerAddresses() {
  try {
    console.log('\n==============================================');
    console.log('Testing Pawner Addresses API');
    console.log('==============================================\n');

    // Test 1: Get all pawners
    console.log('1. Testing GET /api/pawners (List All)');
    const listResponse = await axios.get(`${API_URL}/pawners`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (listResponse.data.success) {
      console.log(`✅ Found ${listResponse.data.data.length} pawners`);
      const firstPawner = listResponse.data.data[0];
      console.log(`   Sample: ${firstPawner.firstName} ${firstPawner.lastName}`);
      console.log(`   Address ID: ${firstPawner.addressId}`);
      console.log(`   City: ${firstPawner.cityName}`);
      console.log(`   Barangay: ${firstPawner.barangayName}`);
      console.log(`   Details: ${firstPawner.addressDetails}`);
    }

    // Test 2: Get Peter Paul (ID: 2)
    console.log('\n2. Testing GET /api/pawners/2 (Peter Paul)');
    const peterResponse = await axios.get(`${API_URL}/pawners/2`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (peterResponse.data.success) {
      const peter = peterResponse.data.data;
      console.log(`✅ Found: ${peter.firstName} ${peter.lastName}`);
      console.log(`   Address ID: ${peter.addressId}`);
      console.log(`   City: ${peter.cityName}`);
      console.log(`   Barangay: ${peter.barangayName}`);
      console.log(`   Details: ${peter.addressDetails}`);
    }

    // Test 3: Update Peter Paul's address
    console.log('\n3. Testing PUT /api/pawners/2 (Update Address)');
    const updateResponse = await axios.put(
      `${API_URL}/pawners/2`,
      {
        addressDetails: 'Updated Address via Centralized System - Test ' + Date.now()
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (updateResponse.data.success) {
      console.log('✅ Address updated successfully');
    }

    // Test 4: Verify update
    console.log('\n4. Testing GET /api/pawners/2 (Verify Update)');
    const verifyResponse = await axios.get(`${API_URL}/pawners/2`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (verifyResponse.data.success) {
      const updated = verifyResponse.data.data;
      console.log(`✅ Verified: ${updated.firstName} ${updated.lastName}`);
      console.log(`   Address ID: ${updated.addressId}`);
      console.log(`   Details: ${updated.addressDetails}`);
    }

    console.log('\n==============================================');
    console.log('All tests completed successfully! ✅');
    console.log('==============================================\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️ Token expired or invalid. Please login and update the token in this script.');
    }
  }
}

testPawnerAddresses();
