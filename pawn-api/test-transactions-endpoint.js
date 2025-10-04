// Test the actual API endpoint with authentication
const axios = require('axios');

async function testTransactionsAPI() {
    try {
        console.log('🔍 Testing transactions API endpoint with authentication...');
        
        // First, login to get a token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'cashier1',
            password: 'password123'
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful, got token');
        
        // Now test the transactions endpoint
        console.log('📊 Fetching transactions...');
        const transactionsResponse = await axios.get('http://localhost:3000/api/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Transactions API successful!');
        console.log('📋 Response:', {
            success: transactionsResponse.data.success,
            message: transactionsResponse.data.message,
            dataCount: transactionsResponse.data.data?.length || 0
        });
        
        if (transactionsResponse.data.data && transactionsResponse.data.data.length > 0) {
            console.log('\n📝 First transaction:');
            const firstTxn = transactionsResponse.data.data[0];
            console.log({
                id: firstTxn.id,
                transactionNumber: firstTxn.transactionNumber,
                pawnerName: firstTxn.pawnerName,
                principalAmount: firstTxn.principalAmount,
                interestRate: firstTxn.interestRate + '%',
                status: firstTxn.status,
                createdAt: firstTxn.createdAt
            });
        }
        
        console.log('\n🎉 API test completed successfully!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.response?.data || error.message);
    }
}

testTransactionsAPI();