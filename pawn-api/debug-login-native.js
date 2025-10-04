const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data ? JSON.parse(data) : null
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

async function debugLoginResponse() {
    try {
        console.log('=== DEBUGGING LOGIN RESPONSE STRUCTURE ===');
        
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
        
        console.log('Login Response Status:', loginResponse.status);
        console.log('Login Response Data (full):', JSON.stringify(loginResponse.data, null, 2));
        
        // Check if there's a token
        const token = loginResponse.data?.token;
        if (token) {
            console.log('\n🔑 Token found:', token.substring(0, 50) + '...');
            
            // Try to call the appraisals API
            console.log('\n2. 📋 Testing appraisals API call...');
            
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
            
            const appraisalsResponse = await makeRequest(appraisalsOptions);
            
            console.log('Appraisals Status:', appraisalsResponse.status);
            console.log('Appraisals Data:', JSON.stringify(appraisalsResponse.data, null, 2));
        } else {
            console.log('❌ No token found in response!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugLoginResponse();