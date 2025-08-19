const http = require('http');

// Test health endpoint
function testHealth() {
  console.log('Testing health endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 9000,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Health endpoint status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Health endpoint response:', data);
      testAdminMeetings();
    });
  });

  req.on('error', (err) => {
    console.log('Health endpoint error:', err.message);
    testAdminMeetings();
  });

  req.on('timeout', () => {
    console.log('Health endpoint timeout');
    req.destroy();
    testAdminMeetings();
  });

  req.end();
}

// Test admin meetings endpoint
function testAdminMeetings() {
  console.log('\nTesting admin meetings endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 9000,
    path: '/admin/meetings',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Admin meetings endpoint status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Admin meetings endpoint response:', data);
      console.log('\nTest completed!');
    });
  });

  req.on('error', (err) => {
    console.log('Admin meetings endpoint error:', err.message);
    console.log('\nTest completed!');
  });

  req.on('timeout', () => {
    console.log('Admin meetings endpoint timeout');
    req.destroy();
    console.log('\nTest completed!');
  });

  req.end();
}

// Start testing
testHealth();
