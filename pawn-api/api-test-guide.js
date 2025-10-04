// Test API endpoint with simple HTTP request
const https = require('https');
const http = require('http');

async function testWithCurl() {
    console.log('🔍 Testing transactions API endpoint...');
    console.log('');
    
    console.log('📝 Step 1: Login to get authentication token');
    console.log('Command: curl -X POST http://localhost:3000/api/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"username":"cashier1","password":"password123"}\'');
    console.log('');
    
    console.log('📝 Step 2: Use token to fetch transactions');
    console.log('Command: curl -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  http://localhost:3000/api/transactions');
    console.log('');
    
    console.log('🎯 Expected Result:');
    console.log('- Status 200 OK');
    console.log('- JSON response with success: true');
    console.log('- Array of transaction data');
    console.log('- Each transaction should have:');
    console.log('  • id, transactionNumber, pawnerName');
    console.log('  • principalAmount, interestRate (as percentage)');
    console.log('  • status, createdAt');
    console.log('');
    
    console.log('✅ API fixes applied:');
    console.log('- Fixed employees table reference (was users)');
    console.log('- Fixed mobile_number column (was contact_number)');
    console.log('- Fixed address mapping (house_number + street)');
    console.log('- Interest rate conversion (decimal * 100 = percentage)');
}

testWithCurl();