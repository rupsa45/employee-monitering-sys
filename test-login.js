const axios = require('axios');

const API_BASE_URL = 'http://localhost:9000';

// Test credentials from the test data
const testCredentials = {
  employee: {
    empEmail: 'john.doe@company.com',
    empPassword: 'TestPassword123!'
  },
  admin: {
    empEmail: 'admin@company.com',
    empPassword: 'AdminPassword123!'
  }
};

async function testLogin() {
  console.log('🔐 Testing Login Endpoints...\n');

  // Test Employee Login
  console.log('1. Testing Employee Login...');
  try {
    const employeeResponse = await axios.post(`${API_BASE_URL}/employee/login`, testCredentials.employee);
    console.log('✅ Employee Login Success:', {
      success: employeeResponse.data.success,
      message: employeeResponse.data.message,
      hasToken: !!employeeResponse.data.accessToken,
      userRole: employeeResponse.data.user?.empRole
    });
  } catch (error) {
    console.log('❌ Employee Login Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }

  console.log('\n2. Testing Admin Login...');
  try {
    const adminResponse = await axios.post(`${API_BASE_URL}/admin/adminLogin`, testCredentials.admin);
    console.log('✅ Admin Login Success:', {
      success: adminResponse.data.success,
      message: adminResponse.data.message,
      hasToken: !!adminResponse.data.accessToken,
      userRole: adminResponse.data.user?.empRole
    });
  } catch (error) {
    console.log('❌ Admin Login Failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
  }

  console.log('\n3. Testing Invalid Employee Login...');
  try {
    const invalidEmployeeResponse = await axios.post(`${API_BASE_URL}/employee/login`, {
      empEmail: 'invalid@email.com',
      empPassword: 'wrongpassword'
    });
    console.log('❌ Invalid Employee Login (Expected to fail):', {
      status: invalidEmployeeResponse.status,
      message: invalidEmployeeResponse.data?.message
    });
  } catch (error) {
    console.log('✅ Invalid Employee Login Failed (Expected):', {
      status: error.response?.status,
      message: error.response?.data?.message
    });
  }

  console.log('\n📋 Available Test Credentials:');
  console.log('Employee:', testCredentials.employee);
  console.log('Admin:', testCredentials.admin);
}

// Test API health
async function testApiHealth() {
  console.log('🏥 Testing API Health...\n');
  
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API Health Check Success:', {
      status: healthResponse.status,
      data: healthResponse.data
    });
  } catch (error) {
    console.log('❌ API Health Check Failed:', {
      status: error.response?.status,
      message: error.message
    });
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Authentication Tests...\n');
  
  await testApiHealth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testLogin();
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Test completed!');
  console.log('\n💡 If employee login fails, check:');
  console.log('   1. Database is running and connected');
  console.log('   2. Test data exists in the database');
  console.log('   3. Backend server is running on port 9000');
  console.log('   4. Use the test credentials shown above');
}

runTests().catch(console.error);
