const http = require('http');

// Test data
const testData = {
  description: 'Test Description via HTTP API'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/categories/1/descriptions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    // You would need a valid JWT token here for authentication
    // 'Authorization': 'Bearer your-jwt-token'
  }
};

console.log('Testing category description API endpoint...');
console.log(`POST ${options.hostname}:${options.port}${options.path}`);
console.log('Data:', testData);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);

  let responseBody = '';
  
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsedResponse = JSON.parse(responseBody);
      console.log(JSON.stringify(parsedResponse, null, 2));
    } catch (e) {
      console.log(responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(postData);
req.end();