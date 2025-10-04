const axios = require('axios');

async function debugLoginResponse() {
    try {
        console.log('=== DEBUGGING LOGIN RESPONSE STRUCTURE ===');
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        console.log('Login Response Status:', loginResponse.status);
        console.log('Login Response Headers:', JSON.stringify(loginResponse.headers, null, 2));
        console.log('Login Response Data (full):', JSON.stringify(loginResponse.data, null, 2));
        
        // Check if there's a token
        const token = loginResponse.data.token;
        if (token) {
            console.log('\n🔑 Token found:', token.substring(0, 50) + '...');
            
            // Try to call the appraisals API
            console.log('\n2. 📋 Testing appraisals API call...');
            const appraisalsResponse = await axios.get('http://localhost:3001/api/appraisals/status/completed', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Appraisals Status:', appraisalsResponse.status);
            console.log('Appraisals Data:', JSON.stringify(appraisalsResponse.data, null, 2));
        } else {
            console.log('❌ No token found in response!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugLoginResponse();