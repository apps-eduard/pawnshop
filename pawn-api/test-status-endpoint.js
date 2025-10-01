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

async function testStatusEndpoint() {
    try {
        console.log('\n=== Testing Status Endpoint ===');
        
        // First login to get token
        console.log('🔐 Logging in as cashier1...');
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
            password: 'cashier123'
        });

        const loginResponse = await makeRequest(loginOptions, loginPostData);
        const loginData = JSON.parse(loginResponse.body);

        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }

        const token = loginData.data.token;
        console.log('✅ Login successful');

        // Test the status endpoint that frontend is calling
        console.log('\n🔍 Testing /api/appraisals/status/completed endpoint...');
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/appraisals/status/completed',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await makeRequest(options);
        console.log('Response status:', response.statusCode);
        
        const data = JSON.parse(response.body);
        console.log('\n📊 API Response:');
        console.log('Success:', data.success);
        console.log('Message:', data.message);
        console.log('Data count:', data.data ? data.data.length : 0);
        
        if (data.data && data.data.length > 0) {
            console.log('\n📋 Found Appraisals:');
            data.data.forEach((appraisal, index) => {
                console.log(`${index + 1}. ID: ${appraisal.id} | Pawner: ${appraisal.pawnerName} | Item: ${appraisal.itemType} | Value: ₱${appraisal.totalAppraisedValue}`);
            });
        } else {
            console.log('\n❌ No appraisals found - this explains why frontend shows 0 items');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testStatusEndpoint();