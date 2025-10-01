const http = require('http');

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testPendingAppraisalsAPI() {
    try {
        console.log('\n=== Testing Pending Appraisals API Endpoint ===');
        
        // First login to get token
        console.log('🔐 Logging in as cashier...');
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginPostData = JSON.stringify({
            username: 'cashier1',
            password: 'admin123'
        });

        const loginResponse = await makeRequest(loginOptions, loginPostData);
        console.log('Login status:', loginResponse.statusCode);
        
        const loginData = JSON.parse(loginResponse.body);
        console.log('Login response:', loginData);

        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }

        const token = loginData.data.token;
        console.log('✅ Login successful, got token:', token.substring(0, 20) + '...');

        // Test the pending appraisals endpoint
        console.log('\n🏪 Testing /api/appraisals/pending-ready endpoint...');
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/appraisals/pending-ready',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await makeRequest(options);
        console.log('Response status:', response.statusCode);
        console.log('Raw response:', response.body);

        try {
            const data = JSON.parse(response.body);
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
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPendingAppraisalsAPI();