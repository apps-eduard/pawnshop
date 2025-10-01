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

async function comprehensiveTest() {
    try {
        console.log('\n=== COMPREHENSIVE API TEST FOR NaN DEBUGGING ===');
        
        // Login
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const loginResponse = await makeRequest(loginOptions, JSON.stringify({
            username: 'cashier1',
            password: 'cashier123'
        }));

        const loginData = JSON.parse(loginResponse.body);
        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }

        const token = loginData.data.token;
        
        // Test multiple endpoints
        const endpoints = [
            '/api/appraisals/status/completed',
            '/api/appraisals/pending-ready'
        ];

        for (const endpoint of endpoints) {
            console.log(`\n🔍 Testing ${endpoint}...`);
            
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const response = await makeRequest(options);
            const data = JSON.parse(response.body);
            
            console.log(`Status: ${response.statusCode}`);
            console.log(`Success: ${data.success}`);
            console.log(`Data count: ${data.data ? data.data.length : 0}`);
            
            if (data.data && data.data.length > 0) {
                data.data.forEach((item, index) => {
                    console.log(`  ${index + 1}. ID: ${item.id}`);
                    console.log(`     pawnerName: "${item.pawnerName}"`);
                    console.log(`     itemType: "${item.itemType}"`);
                    console.log(`     totalAppraisedValue: ${item.totalAppraisedValue} (type: ${typeof item.totalAppraisedValue})`);
                    console.log(`     isNaN: ${isNaN(item.totalAppraisedValue)}`);
                    console.log(`     Raw JSON: ${JSON.stringify(item)}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

comprehensiveTest();