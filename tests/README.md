# 🧪 Employee Monitoring System - Testing Documentation

## 📋 Overview

This document provides comprehensive information about the Jest testing setup for the Employee Monitoring System. The testing framework is designed to ensure code quality, reliability, and maintainability through various types of tests.

## 🏗️ Test Structure

```
tests/
├── unit/                    # Unit tests for individual functions
│   ├── controllers/         # Controller logic tests
│   │   ├── empController.test.js
│   │   └── adminController.test.js
│   ├── services/           # Service layer tests
│   ├── middleware/         # Middleware tests
│   └── utils/              # Utility function tests
├── integration/             # API endpoint tests
│   ├── admin/              # Admin API tests
│   ├── employee/           # Employee API tests
│   │   └── employeeApi.test.js
│   └── auth/               # Authentication tests
├── e2e/                    # End-to-end workflow tests
│   └── employeeWorkflow.test.js
├── fixtures/               # Test data and mocks
│   └── testData.js
├── setup/                  # Test setup and teardown
│   └── testSetup.js
├── coverage/               # Coverage reports
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Jest testing framework

### Installation

1. **Install Jest and testing dependencies:**
   ```bash
   npm install --save-dev jest supertest @types/jest
   ```

2. **Add test scripts to package.json:**
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "test:unit": "jest tests/unit",
       "test:integration": "jest tests/integration",
       "test:e2e": "jest tests/e2e"
     }
   }
   ```

3. **Create test environment file (.env.test):**
   ```env
   NODE_ENV=test
   DATABASE_URL=your_test_database_url
   SECRET_KEY=test_secret_key
   ```

## 🧪 Test Types

### 1. Unit Tests (`tests/unit/`)

**Purpose:** Test individual functions and methods in isolation.

**Characteristics:**
- Fast execution
- No external dependencies
- Mock all external calls
- Test business logic only

**Example:**
```javascript
describe('Employee Controller', () => {
  it('should successfully login an employee', async () => {
    // Arrange
    const mockReq = { body: { email: 'test@example.com', password: 'password' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
    // Act
    await empController.loginEmployee(mockReq, mockRes);
    
    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
```

### 2. Integration Tests (`tests/integration/`)

**Purpose:** Test API endpoints and database interactions.

**Characteristics:**
- Test complete request-response cycles
- Use test database
- Mock external services
- Test middleware integration

**Example:**
```javascript
describe('Employee API', () => {
  it('should login employee successfully', async () => {
    const response = await request(app)
      .post('/employee/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose:** Test complete user workflows and business processes.

**Characteristics:**
- Test full user journeys
- Simulate real user interactions
- Test multiple components together
- Validate business requirements

**Example:**
```javascript
describe('Employee Daily Workflow', () => {
  it('should complete full employee workflow', async () => {
    // Login → Check-in → View Tasks → Update Task → Submit Leave → Check-out
    // Tests the complete daily workflow
  });
});
```

## 📊 Test Data Management

### Fixtures (`tests/fixtures/testData.js`)

Centralized test data for consistent testing across all test files.

**Benefits:**
- Consistent test data
- Easy maintenance
- Reusable across tests
- Clear data structure

**Usage:**
```javascript
const { testEmployees, testAuth } = require('../fixtures/testData');

// Use in tests
const { validEmployee } = testEmployees;
const { validLogin } = testAuth;
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'tests/coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  testTimeout: 30000
};
```

### Test Setup (`tests/setup/testSetup.js`)

Global setup for all tests:
- Environment configuration
- Mock setup
- Database connection
- Cleanup procedures

## 🎯 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Running Specific Tests

```bash
# Run specific test file
npm test -- tests/unit/controllers/empController.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Run tests in specific directory
npm test -- tests/unit/
```

## 📈 Coverage Reports

### Coverage Configuration

Jest generates coverage reports in multiple formats:
- **Text**: Console output
- **HTML**: Interactive web report
- **LCOV**: For CI/CD integration

### Coverage Targets

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open tests/coverage/lcov-report/index.html
```

## 🧩 Mocking Strategy

### Database Mocking

```javascript
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));
```

### External Services Mocking

```javascript
jest.mock('../../../service/emailService');
jest.mock('../../../utils/empLogger/employeeLogger');
```

### HTTP Request Mocking

```javascript
const request = require('supertest');
// supertest automatically handles HTTP mocking
```

## 🔍 Best Practices

### 1. Test Organization

- **Arrange-Act-Assert**: Structure tests clearly
- **Descriptive Names**: Use clear test descriptions
- **Single Responsibility**: Each test should test one thing
- **Independent Tests**: Tests should not depend on each other

### 2. Mocking Guidelines

- **Mock External Dependencies**: Database, APIs, file system
- **Don't Mock Business Logic**: Test actual implementation
- **Reset Mocks**: Clear mocks between tests
- **Verify Mock Calls**: Ensure mocks are called correctly

### 3. Test Data Management

- **Use Fixtures**: Centralized test data
- **Clean Data**: Reset data between tests
- **Realistic Data**: Use realistic but safe test data
- **Avoid Hardcoding**: Use variables for test data

### 4. Error Testing

- **Test Error Cases**: Include error scenarios
- **Validate Error Messages**: Check error responses
- **Test Edge Cases**: Boundary conditions
- **Handle Async Errors**: Proper async error handling

## 🚨 Common Issues & Solutions

### 1. Test Timeouts

**Problem:** Tests taking too long to complete
**Solution:** Increase timeout or optimize test setup

```javascript
// In jest.config.js
testTimeout: 30000

// In individual tests
jest.setTimeout(30000);
```

### 2. Database Connection Issues

**Problem:** Tests failing due to database issues
**Solution:** Use test database or mocks

```javascript
// Use test database
process.env.DATABASE_URL = 'test_database_url';

// Or mock database
jest.mock('../../../config/prismaConfig');
```

### 3. Environment Variables

**Problem:** Missing environment variables in tests
**Solution:** Create test environment file

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=test_database_url
SECRET_KEY=test_secret
```

## 📝 Writing New Tests

### 1. Unit Test Template

```javascript
const { testData } = require('../../fixtures/testData');

describe('Component Name', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { body: {}, params: {}, query: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  describe('Method Name', () => {
    it('should handle success case', async () => {
      // Arrange
      const testData = { /* test data */ };
      
      // Act
      await component.method(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle error case', async () => {
      // Arrange
      const error = new Error('Test error');
      
      // Act
      await component.method(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
```

### 2. Integration Test Template

```javascript
const request = require('supertest');
const { testData } = require('../../fixtures/testData');

describe('API Endpoint', () => {
  it('should return success response', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(testData)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the provided fixtures
3. Maintain test coverage above 80%
4. Update this documentation if needed
5. Run all tests before submitting

## 📞 Support

For questions about testing:
- Check this documentation first
- Review existing test examples
- Consult Jest documentation
- Ask the development team

---

**Last Updated:** January 2024  
**Version:** 1.0.0
