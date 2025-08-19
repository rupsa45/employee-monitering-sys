const http = require('http');

// Test the health endpoint first
const healthOptions = {
  hostname: 'localhost',
  port: 9000,
  path: '/health',
  method: 'GET'
};

console.log('Testing health endpoint...');
const healthReq = http.request(healthOptions, (res) => {
  console.log(`Health endpoint status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log('Health response:', chunk.toString());
  });
});

healthReq.on('error', (e) => {
  console.error('Health endpoint error:', e.message);
});

healthReq.end();

// Test the admin meetings endpoint
const meetingOptions = {
  hostname: 'localhost',
  port: 9000,
  path: '/admin/meetings',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('\nTesting admin meetings endpoint...');
const meetingReq = http.request(meetingOptions, (res) => {
  console.log(`Admin meetings endpoint status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log('Admin meetings response:', chunk.toString());
  });
});

meetingReq.on('error', (e) => {
  console.error('Admin meetings endpoint error:', e.message);
});

meetingReq.end();
