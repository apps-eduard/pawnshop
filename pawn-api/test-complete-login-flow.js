// Use import for node-fetch ES module
async function fetch(...args) {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
}

async function testLoginFlow() {
  try {
    console.log('=== TESTING COMPLETE LOGIN FLOW ===');
    
    console.log('1. 🔐 Attempting login with admin credentials...');
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
    
    if (loginResponse.status !== 200) {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('User info:', {
      username: loginData.user?.username,
      role: loginData.user?.role,
      id: loginData.user?.id
    });
    
    const token = loginData.token;
    console.log('Token received (first 30 chars):', token.substring(0, 30) + '...');
    
    console.log('\n2. 📊 Testing appraisals endpoint with token...');
    
    const appraisalsResponse = await fetch('http://localhost:3000/api/appraisals/status/completed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Appraisals Status:', appraisalsResponse.status);
    
    if (appraisalsResponse.status === 200) {
      const appraisalsData = await appraisalsResponse.json();
      console.log('✅ SUCCESS! Appraisals retrieved:');
      console.log('Count:', appraisalsData.data?.length || 0);
      
      if (appraisalsData.data && appraisalsData.data.length > 0) {
        console.log('Sample appraisal:');
        const sample = appraisalsData.data[0];
        console.log({
          id: sample.id,
          pawnerName: sample.pawnerName,
          category: sample.category,
          description: sample.description,
          totalAppraisedValue: sample.totalAppraisedValue
        });
      }
      
      console.log('\n🎉 The API works correctly!');
      console.log('👉 The issue is likely in the frontend:');
      console.log('   - User might not be logged in');
      console.log('   - Token might not be stored in localStorage');
      console.log('   - Token might have expired');
      console.log('   - Frontend might not be sending Authorization header');
      
    } else {
      const errorText = await appraisalsResponse.text();
      console.log('❌ Appraisals request failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testLoginFlow();