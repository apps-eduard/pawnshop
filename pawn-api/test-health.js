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

async function testHealthEndpoint() {
    try {
        console.log('=== TESTING HEALTH ENDPOINT ===');
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/health',
            method: 'GET'
        };
        
        const response = await makeRequest(options);
        console.log('Health Status:', response.status);
        
        if (response.status === 200) {
            console.log('✅ Server is running and healthy');
        } else {
            console.log('❌ Server health check failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testHealthEndpoint();