// Simple API test using Node.js built-in modules
const https = require('https');
const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.port === 443 ? https : http;
        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🔍 Testing API endpoint resolution...');
    console.log('');
    
    try {
        console.log('📝 Step 1: Testing login...');
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const loginData = {
            username: 'cashier1',
            password: 'cashier123'
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        
        if (loginResponse.status === 200 && loginResponse.data.success) {
            console.log('✅ Login successful!');
            console.log('📄 Response data:', loginResponse.data);
            const token = loginResponse.data.token || loginResponse.data.accessToken;
            
            console.log('📝 Step 2: Testing transactions endpoint...');
            const transactionsOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/transactions',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const transactionsResponse = await makeRequest(transactionsOptions);
            
            if (transactionsResponse.status === 200) {
                console.log('✅ Transactions endpoint working!');
                console.log('📊 Response summary:');
                console.log(`   • Status: ${transactionsResponse.status}`);
                console.log(`   • Success: ${transactionsResponse.data.success}`);
                console.log(`   • Data count: ${transactionsResponse.data.data ? transactionsResponse.data.data.length : 0}`);
                
                if (transactionsResponse.data.data && transactionsResponse.data.data.length > 0) {
                    const firstTransaction = transactionsResponse.data.data[0];
                    console.log('   • Sample transaction:');
                    console.log(`     - ID: ${firstTransaction.id}`);
                    console.log(`     - Number: ${firstTransaction.transactionNumber}`);
                    console.log(`     - Pawner: ${firstTransaction.pawnerName}`);
                    console.log(`     - Amount: ${firstTransaction.principalAmount}`);
                    console.log(`     - Interest Rate: ${firstTransaction.interestRate}%`);
                    console.log(`     - Status: ${firstTransaction.status}`);
                }
                
                console.log('');
                console.log('🎉 SUCCESS: 500 error fixed! Recent Transactions API is working.');
            } else {
                console.log(`❌ Transactions endpoint failed with status ${transactionsResponse.status}`);
                console.log('Response:', transactionsResponse.data);
            }
        } else {
            console.log(`❌ Login failed with status ${loginResponse.status}`);
            console.log('Response:', loginResponse.data);
        }
    } catch (error) {
        console.log('❌ Error occurred:', error.message);
    }
}

testAPI();