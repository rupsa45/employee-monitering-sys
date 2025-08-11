const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000';

// Test data
const testEmployeeId = 'test-employee-id';
const testAppData = {
  appName: 'Test App',
  appPath: '/Applications/Test.app',
  appOpenAt: new Date().toISOString(),
  appCloseAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
  keysPressed: 100,
  mouseClicks: 25
};

const testIdleData = {
  from: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
  to: new Date().toISOString()
};

// Test functions
async function testAppUsageEndpoint() {
  try {
    console.log('🧪 Testing app usage endpoint...');
    const response = await axios.post(`${API_BASE_URL}/agent-working-apps/set`, {
      agentId: testEmployeeId,
      appData: testAppData
    });
    console.log('✅ App usage endpoint test passed:', response.data.message);
  } catch (error) {
    console.log('❌ App usage endpoint test failed:', error.response?.data?.message || error.message);
  }
}

async function testIdleTimeEndpoint() {
  try {
    console.log('🧪 Testing idle time endpoint...');
    const response = await axios.post(`${API_BASE_URL}/agent-idle-time/add`, {
      agentId: testEmployeeId,
      from: testIdleData.from,
      to: testIdleData.to
    });
    console.log('✅ Idle time endpoint test passed:', response.data.message);
  } catch (error) {
    console.log('❌ Idle time endpoint test failed:', error.response?.data?.message || error.message);
  }
}

async function testScreenshotEndpoint() {
  try {
    console.log('🧪 Testing screenshot endpoint...');
    // Note: This will fail without a real file, but tests the endpoint structure
    const response = await axios.post(`${API_BASE_URL}/screenshots/upload`, {
      agentId: testEmployeeId
    });
    console.log('✅ Screenshot endpoint test passed:', response.data.message);
  } catch (error) {
    console.log('❌ Screenshot endpoint test failed:', error.response?.data?.message || error.message);
  }
}

async function testGetEndpoints() {
  try {
    console.log('🧪 Testing GET endpoints...');
    
    // Test app usage summary
    const appResponse = await axios.get(`${API_BASE_URL}/agent-working-apps/summary`);
    console.log('✅ App usage summary endpoint test passed');
    
    // Test idle time summary
    const idleResponse = await axios.get(`${API_BASE_URL}/agent-idle-time/summary`);
    console.log('✅ Idle time summary endpoint test passed');
    
  } catch (error) {
    console.log('❌ GET endpoints test failed:', error.response?.data?.message || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Integration Tests...\n');
  
  await testAppUsageEndpoint();
  await testIdleTimeEndpoint();
  await testScreenshotEndpoint();
  await testGetEndpoints();
  
  console.log('\n🎉 Integration tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Install dependencies: npm install cloudinary');
  console.log('2. Run database migration: npm run prisma:migrate');
  console.log('3. Set up Cloudinary environment variables');
  console.log('4. Start the server: npm start');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAppUsageEndpoint,
  testIdleTimeEndpoint,
  testScreenshotEndpoint,
  testGetEndpoints,
  runTests
};
