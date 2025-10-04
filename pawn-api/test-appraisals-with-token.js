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

async function testAppraisalsWithToken() {
    try {
        console.log('=== TESTING APPRAISALS API WITH TOKEN ===');
        
        // First get a token
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log('✅ Login Status:', loginResponse.status);
        
        const token = loginResponse.data?.data?.token;
        if (!token) {
            console.log('❌ No token received');
            return;
        }
        
        console.log('🔑 Token received, testing appraisals API...');
        
        // Now test the appraisals API
        const appraisalsOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/appraisals/status/completed',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        console.log('📋 Making appraisals request...');
        const appraisalsResponse = await makeRequest(appraisalsOptions);
        
        console.log('Appraisals Status:', appraisalsResponse.status);
        
        if (appraisalsResponse.status === 200) {
            console.log('✅ SUCCESS! Appraisals API working');
            console.log('Data count:', appraisalsResponse.data?.length || 0);
        } else {
            console.log('❌ FAILED! Status:', appraisalsResponse.status);
            console.log('Error data:', appraisalsResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAppraisalsWithToken();