const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { testEmployees, testAuth, mockResponses } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    }
  }
}));
jest.mock('../../../service/emailService');

// Import the controller
const empController = require('../../../employee_app/controller/empController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Employee Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('loginEmployee', () => {
    it('should successfully login an employee with valid credentials', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const { validLogin } = testAuth;
      
      mockReq.body = validLogin;
      
      const mockEmployee = {
        id: validEmployee.empId,
        empEmail: validEmployee.email,
        empPassword: 'hashedPassword',
        empRole: 'employee'
      };
      
      const mockToken = 'mock-jwt-token';
      
      // Mock dependencies
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      await empController.loginEmployee(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { empEmail: validLogin.empEmail }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(validLogin.empPassword, mockEmployee.empPassword);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userData: {
            empId: mockEmployee.id,
            empEmail: mockEmployee.empEmail,
            empRole: mockEmployee.empRole
          }
        },
        process.env.SECRET_KEY,
        { expiresIn: "15d" }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee logged in successfully",
        accessToken: mockToken
      });
    });

    it('should return 404 when employee is not found', async () => {
      // Arrange
      const { validLogin } = testAuth;
      mockReq.body = validLogin;
      
      prisma.employee.findUnique.mockResolvedValue(null);
      
      // Act
      await empController.loginEmployee(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { empEmail: validLogin.empEmail }
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Employee not found"
      });
      });

    it('should return 401 when password is invalid', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const { validLogin } = testAuth;
      
      mockReq.body = validLogin;
      
      const mockEmployee = {
        id: validEmployee.empId,
        empEmail: validEmployee.email,
        empPassword: 'hashedPassword',
        empRole: 'employee'
      };
      
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      bcrypt.compare.mockResolvedValue(false);
      
      // Act
      await empController.loginEmployee(mockReq, mockRes);
      
      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(validLogin.empPassword, mockEmployee.empPassword);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password"
      });
      });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const { validLogin } = testAuth;
      mockReq.body = validLogin;
      
      const dbError = new Error('Database connection failed');
      prisma.employee.findUnique.mockRejectedValue(dbError);
      
      // Act
      await empController.loginEmployee(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: dbError.message
      });
      });
  });

  describe('editProfile', () => {
    it('should successfully update employee profile', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const updateData = {
        empTechnology: 'JavaScript, Node.js',
        empPhone: '+1234567890'
      };
      
      mockReq.params = { id: validEmployee.empId };
      mockReq.body = updateData;
      
      const updatedEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName,
        empEmail: validEmployee.email,
        empPhone: updateData.empPhone,
        empTechnology: updateData.empTechnology,
        empGender: 'Male',
        empProfile: 'profile.jpg',
        empRole: 'employee'
      };
      
      prisma.employee.update.mockResolvedValue(updatedEmployee);
      
      // Act
      await empController.editProfile(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: validEmployee.empId },
        data: {
          empTechnology: updateData.empTechnology,
          empPhone: updateData.empPhone
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empPhone: true,
          empTechnology: true,
          empGender: true,
          empProfile: true,
          empRole: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Employee profile updated successfully",
        employee: updatedEmployee
      });
    });

    it('should handle profile update errors gracefully', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      const updateData = {
        empTechnology: 'JavaScript, Node.js',
        empPhone: '+1234567890'
      };
      
      mockReq.params = { id: validEmployee.empId };
      mockReq.body = updateData;
      
      const updateError = new Error('Employee not found');
      prisma.employee.update.mockRejectedValue(updateError);
      
      // Act
      await empController.editProfile(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: updateError.message
      });
      });
  });
});
