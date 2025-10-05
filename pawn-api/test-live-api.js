const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testing live API endpoint...\n');
    
    // Login first to get a valid token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'cashier1',
      password: 'password123'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful, got token');
    
    // Now test the transaction search
    const response = await axios.get('http://localhost:3000/api/transactions/search/TXN-202510-000001', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📦 API Response Status:', response.status);
    console.log('📦 API Response Success:', response.data.success);
    
    if (response.data.data && response.data.data.items) {
      console.log('\n🎯 Items Data:');
      response.data.data.items.forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        console.log('categoryName:', item.categoryName);
        console.log('descriptionName:', item.descriptionName);
        console.log('customDescription:', item.customDescription);
        console.log('description (old):', item.description);
        console.log('itemDescription (old):', item.itemDescription);
        console.log('appraisalValue:', item.appraisalValue);
        console.log('notes:', item.notes);
        console.log('appraisalNotes:', item.appraisalNotes);
      });
      
      console.log('\n🎯 Frontend should display:');
      const item = response.data.data.items[0];
      console.log('Category:', item.categoryName || item.category);
      console.log('Description:', item.descriptionName || item.itemName || item.description || item.itemDescription);
      console.log('Notes:', item.customDescription || item.notes || item.appraisalNotes || 'No remarks');
      console.log('Appraisal Value:', item.appraisedValue || item.appraisalValue);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

testAPI();