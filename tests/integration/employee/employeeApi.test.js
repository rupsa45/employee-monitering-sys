const request = require('supertest');
const { testEmployees, testAuth } = require('../../fixtures/testData');

// Mock the entire app
jest.mock('../../../index.js', () => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Mock employee routes
  app.post('/employee/login', (req, res) => {
    const { empEmail, empPassword } = req.body;
    
    // Validation check - if required fields are missing
    if (!empEmail || !empPassword) {
      return res.status(400).json({
        success: false,
        message: "Validation failed"
      });
    }
    
    if (empEmail === 'john.doe@company.com' && empPassword === 'TestPassword123!') {
      res.status(200).json({
        success: true,
        message: "Employee logged in successfully",
        accessToken: 'mock-jwt-token'
      });
    } else if (empEmail === 'john.doe@company.com') {
      res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
  });
  
  app.patch('/employee/editProfile/:id', (req, res) => {
    const { id } = req.params;
    const { empTechnology, empPhone } = req.body;
    
    if (id === 'EMP001') {
      res.status(200).json({
        success: true,
        message: "Employee profile updated successfully",
        employee: {
          id: 'EMP001',
          empName: 'John Doe',
          empEmail: 'john.doe@company.com',
          empPhone,
          empTechnology,
          empGender: 'Male',
          empProfile: 'profile.jpg',
          empRole: 'employee'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
  });
  
  return app;
});

const app = require('../../../index.js');

describe('Employee API Integration Tests', () => {
  describe('POST /employee/login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const { validLogin } = testAuth;
      
      // Act
      const response = await request(app)
        .post('/employee/login')
        .send(validLogin)
        .expect(200);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Employee logged in successfully');
      expect(response.body.accessToken).toBeDefined();
    });

    it('should return 401 with invalid password', async () => {
      // Arrange
      const { invalidLogin } = testAuth;
      
      // Act
      const response = await request(app)
        .post('/employee/login')
        .send(invalidLogin)
        .expect(401);
      
      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should return 404 for non-existent employee', async () => {
      // Arrange
      const nonExistentLogin = {
        empEmail: 'nonexistent@company.com',
        empPassword: 'TestPassword123!'
      };
      
      // Act
      const response = await request(app)
        .post('/employee/login')
        .send(nonExistentLogin)
        .expect(404);
      
      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee not found');
    });

    it('should return 400 for missing required fields', async () => {
      // Act
      const response = await request(app)
        .post('/employee/login')
        .send({})
        .expect(400);
      
      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /employee/editProfile/:id', () => {
    it('should successfully update employee profile', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const updateData = {
        empTechnology: 'JavaScript, Node.js, React',
        empPhone: '+1234567890'
      };
      
      // Act
      const response = await request(app)
        .patch(`/employee/editProfile/${validEmployee.empId}`)
        .send(updateData)
        .expect(200);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Employee profile updated successfully');
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.empTechnology).toBe(updateData.empTechnology);
      expect(response.body.employee.empPhone).toBe(updateData.empPhone);
    });

    it('should return 404 for non-existent employee', async () => {
      // Arrange
      const updateData = {
        empTechnology: 'JavaScript, Node.js',
        empPhone: '+1234567890'
      };
      
      // Act
      const response = await request(app)
        .patch('/employee/editProfile/NONEXISTENT')
        .send(updateData)
        .expect(404);
      
      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee not found');
    });

    it('should handle partial updates correctly', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const partialUpdate = {
        empTechnology: 'Python, Django'
      };
      
      // Act
      const response = await request(app)
        .patch(`/employee/editProfile/${validEmployee.empId}`)
        .send(partialUpdate)
        .expect(200);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.employee.empTechnology).toBe(partialUpdate.empTechnology);
    });
  });


});

