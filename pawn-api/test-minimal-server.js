const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
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

async function testMinimalServer() {
    try {
        console.log('=== TESTING MINIMAL SERVER APPRAISALS ===');
        
        // Test health endpoint first
        const healthOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/health',
            method: 'GET'
        };
        
        const healthResponse = await makeRequest(healthOptions);
        console.log('Health Status:', healthResponse.status);
        
        if (healthResponse.status !== 200) {
            console.log('❌ Health check failed');
            return;
        }
        
        // Test appraisals endpoint (this will likely fail with auth error, but we want to see the actual error)
        console.log('\n📋 Testing appraisals endpoint...');
        
        const appraisalsOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/appraisals/status/completed',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const appraisalsResponse = await makeRequest(appraisalsOptions);
        
        console.log('Appraisals Status:', appraisalsResponse.status);
        console.log('Appraisals Response:', appraisalsResponse.data);
        
        if (appraisalsResponse.status === 401) {
            console.log('✅ Expected 401 (unauthorized) - this means the endpoint is working but needs auth');
        } else if (appraisalsResponse.status === 500) {
            console.log('❌ 500 error - this is the issue we need to fix');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testMinimalServer();