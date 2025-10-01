const fetch = require('node-fetch');

async function testPendingAppraisalsAPI() {
    try {
        console.log('\n=== Testing Pending Appraisals API Endpoint ===');
        
        // First login to get token
        console.log('🔐 Logging in as cashier...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'cashier',
                password: 'cashier123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }

        const token = loginData.token;
        console.log('✅ Login successful, got token');

        // Test the pending appraisals endpoint
        console.log('\n🏪 Testing /api/appraisals/pending-ready endpoint...');
        const response = await fetch('http://localhost:3000/api/appraisals/pending-ready', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        try {
            const data = JSON.parse(responseText);
            console.log('\n📊 Parsed API Response:');
            console.log('Success:', data.success);
            console.log('Message:', data.message);
            console.log('Data count:', data.data ? data.data.length : 0);
            
            if (data.data && data.data.length > 0) {
                console.log('\n📋 Pending Appraisals:');
                data.data.forEach((appraisal, index) => {
                    console.log(`${index + 1}. ID: ${appraisal.id}`);
                    console.log(`   Pawner: ${appraisal.pawnerName}`);
                    console.log(`   Item: ${appraisal.itemType}`);
                    console.log(`   Value: ₱${appraisal.totalAppraisedValue}`);
                    console.log(`   Status: ${appraisal.status}`);
                    console.log('   ---');
                });
            } else {
                console.log('No pending appraisals found');
            }
        } catch (parseError) {
            console.error('❌ Error parsing response:', parseError);
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPendingAppraisalsAPI();