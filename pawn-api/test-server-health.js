const http = require('http');

function testServerHealth() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ Server is running! Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response:', data);
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Server not running:', error.message);
  });
  
  req.end();
}

testServerHealth();