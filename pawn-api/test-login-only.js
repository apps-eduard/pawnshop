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

async function testLoginOnly() {
    try {
        console.log('=== TESTING LOGIN ONLY ===');
        
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
        
        console.log('Login Status:', loginResponse.status);
        console.log('Login Success:', loginResponse.data?.success);
        
        if (loginResponse.data?.data?.token) {
            console.log('✅ Token received successfully');
        } else {
            console.log('❌ No token in response');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLoginOnly();