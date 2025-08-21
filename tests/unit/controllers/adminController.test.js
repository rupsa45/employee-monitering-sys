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
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));
// Import the controller
const adminController = require('../../../admin_app/controller/adminController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Admin Controller', () => {
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

  describe('adminRegister', () => {
    it('should successfully register a new admin', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const registrationData = {
        empName: adminEmployee.firstName + ' ' + adminEmployee.lastName,
        empEmail: adminEmployee.email,
        empPhone: adminEmployee.phone,
        empPassword: adminEmployee.password,
        confirmPassword: adminEmployee.password,
        empTechnology: 'JavaScript, Node.js',
        empGender: 'MALE'
      };
      
      mockReq.body = registrationData;
      
      const mockHashedPassword = 'hashedPassword123';
      const mockAdmin = {
        id: adminEmployee.empId,
        empName: registrationData.empName,
        empEmail: registrationData.empEmail,
        empPhone: registrationData.empPhone,
        empPassword: mockHashedPassword,
        empTechnology: registrationData.empTechnology,
        empGender: registrationData.empGender,
        empProfile: '../upload/maleAvatar.png',
        empRole: 'admin'
      };
      
      // Mock dependencies
      prisma.employee.findUnique.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      prisma.employee.create.mockResolvedValue(mockAdmin);
      
      // Act
      await adminController.adminRegister(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { empEmail: registrationData.empEmail }
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(registrationData.empPassword, 'salt');
      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: {
          empName: registrationData.empName,
          empEmail: registrationData.empEmail,
          empPhone: registrationData.empPhone,
          empPassword: mockHashedPassword,
          confirmPassword: mockHashedPassword,
          empTechnology: registrationData.empTechnology,
          empGender: registrationData.empGender,
          empProfile: '../upload/maleAvatar.png',
          empRole: 'admin'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Admin Registered Successfully",
        admin: {
          id: mockAdmin.id,
          empName: mockAdmin.empName,
          empEmail: mockAdmin.empEmail,
          empTechnology: mockAdmin.empTechnology,
          empGender: mockAdmin.empGender,
          empRole: mockAdmin.empRole
        }
      });
    });

    it('should return 409 when admin already exists', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const registrationData = {
        empName: adminEmployee.firstName + ' ' + adminEmployee.lastName,
        empEmail: adminEmployee.email,
        empPhone: adminEmployee.phone,
        empPassword: adminEmployee.password,
        confirmPassword: adminEmployee.password,
        empTechnology: 'JavaScript, Node.js',
        empGender: 'MALE'
      };
      
      mockReq.body = registrationData;
      
      const existingAdmin = {
        id: adminEmployee.empId,
        empEmail: adminEmployee.email,
        empRole: 'admin'
      };
      
      prisma.employee.findUnique.mockResolvedValue(existingAdmin);
      
      // Act
      await adminController.adminRegister(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { empEmail: registrationData.empEmail }
      });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin Already Exists With This Email"
      });
      });

    it('should return 400 when passwords do not match', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const registrationData = {
        empName: adminEmployee.firstName + ' ' + adminEmployee.lastName,
        empEmail: adminEmployee.email,
        empPhone: adminEmployee.phone,
        empPassword: adminEmployee.password,
        confirmPassword: 'DifferentPassword123!',
        empTechnology: 'JavaScript, Node.js',
        empGender: 'MALE'
      };
      
      mockReq.body = registrationData;
      
      prisma.employee.findUnique.mockResolvedValue(null);
      
      // Act
      await adminController.adminRegister(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Password and confirm password do not match"
      });
    });

    it('should set female avatar for female admin', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const registrationData = {
        empName: adminEmployee.firstName + ' ' + adminEmployee.lastName,
        empEmail: adminEmployee.email,
        empPhone: adminEmployee.phone,
        empPassword: adminEmployee.password,
        confirmPassword: adminEmployee.password,
        empTechnology: 'JavaScript, Node.js',
        empGender: 'FEMALE'
      };
      
      mockReq.body = registrationData;
      
      const mockHashedPassword = 'hashedPassword123';
      const mockAdmin = {
        id: adminEmployee.empId,
        empName: registrationData.empName,
        empEmail: registrationData.empEmail,
        empPhone: registrationData.empPhone,
        empPassword: mockHashedPassword,
        empTechnology: registrationData.empTechnology,
        empGender: registrationData.empGender,
        empProfile: '../upload/femaleAvatar.png',
        empRole: 'admin'
      };
      
      prisma.employee.findUnique.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      prisma.employee.create.mockResolvedValue(mockAdmin);
      
      // Act
      await adminController.adminRegister(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empProfile: '../upload/femaleAvatar.png'
        })
      });
    });
  });

  describe('adminLogin', () => {
    it('should successfully login an admin with valid credentials', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const { validLogin } = testAuth;
      
      mockReq.body = validLogin;
      
      const mockAdmin = {
        id: adminEmployee.empId,
        empEmail: adminEmployee.email,
        empPassword: 'hashedPassword',
        empRole: 'admin'
      };
      
      const mockToken = 'mock-jwt-token';
      
      prisma.employee.findUnique.mockResolvedValue(mockAdmin);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      await adminController.adminLogin(mockReq, mockRes);
      
      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { empEmail: validLogin.empEmail }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(validLogin.empPassword, mockAdmin.empPassword);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userData: {
            empId: mockAdmin.id,
            empEmail: mockAdmin.empEmail,
            empRole: mockAdmin.empRole
          }
        },
        process.env.SECRET_KEY,
        { expiresIn: "15d" }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Admin logged in successfully",
        accessToken: mockToken
      });
    });

    it('should return 404 when admin is not found', async () => {
      // Arrange
      const { validLogin } = testAuth;
      mockReq.body = validLogin;
      
      prisma.employee.findUnique.mockResolvedValue(null);
      
      // Act
      await adminController.adminLogin(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin not found"
      });
    });

    it('should return 401 when password is invalid', async () => {
      // Arrange
      const { adminEmployee } = testEmployees;
      const { validLogin } = testAuth;
      
      mockReq.body = validLogin;
      
      const mockAdmin = {
        id: adminEmployee.empId,
        empEmail: adminEmployee.email,
        empPassword: 'hashedPassword',
        empRole: 'admin'
      };
      
      prisma.employee.findUnique.mockResolvedValue(mockAdmin);
      bcrypt.compare.mockResolvedValue(false);
      
      // Act
      await adminController.adminLogin(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid password"
      });
    });
  });
});

