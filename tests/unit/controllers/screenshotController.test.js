const { testEmployees } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn()
    },
    screenshot: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));
jest.mock('../../../config/cloudinaryConfig', () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn()
  }
}));
jest.mock('../../../utils/adminLogger/adminLogger');

// Import the controller
const screenshotController = require('../../../admin_app/controller/screenshotController');
const { prisma } = require('../../../config/prismaConfig');
const cloudinary = require('../../../config/cloudinaryConfig');
// Logger removed for cleaner output

describe('Screenshot Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      file: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('uploadScreenshot', () => {
    it('should successfully upload screenshot', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.body = { agentId: validEmployee.empId };
      mockReq.file = {
        path: '/tmp/screenshot.jpg',
        originalname: 'screenshot.jpg'
      };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockCloudinaryResponse = {
        secure_url: 'https://res.cloudinary.com/example/image/upload/screenshot.jpg',
        public_id: 'employee-screenshots/screenshot_123'
      };

      const mockScreenshot = {
        id: 'screenshot1',
        imageUrl: mockCloudinaryResponse.secure_url,
        publicId: mockCloudinaryResponse.public_id,
        empId: validEmployee.empId,
        createdAt: new Date()
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      cloudinary.uploader.upload.mockResolvedValue(mockCloudinaryResponse);
      prisma.screenshot.create.mockResolvedValue(mockScreenshot);

      // Act
      await screenshotController.uploadScreenshot(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: validEmployee.empId }
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        '/tmp/screenshot.jpg',
        {
          folder: 'employee-screenshots',
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }
      );
      expect(prisma.screenshot.create).toHaveBeenCalledWith({
        data: {
          imageUrl: mockCloudinaryResponse.secure_url,
          publicId: mockCloudinaryResponse.public_id,
          empId: validEmployee.empId
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Screenshot uploaded successfully',
        screenshot: {
          id: mockScreenshot.id,
          imageUrl: mockScreenshot.imageUrl,
          createdAt: mockScreenshot.createdAt
        }
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', expect.stringContaining('Screenshot uploaded for employee'));
    });

    it('should return 400 when no file is provided', async () => {
      // Arrange
      mockReq.body = { agentId: 'EMP001' };
      mockReq.file = null;

      // Act
      await screenshotController.uploadScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No screenshot file provided'
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.body = { agentId: 'NONEXISTENT' };
      mockReq.file = {
        path: '/tmp/screenshot.jpg',
        originalname: 'screenshot.jpg'
      };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await screenshotController.uploadScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    it('should handle Cloudinary upload errors', async () => {
      // Arrange
      mockReq.body = { agentId: 'EMP001' };
      mockReq.file = {
        path: '/tmp/screenshot.jpg',
        originalname: 'screenshot.jpg'
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const cloudinaryError = new Error('Cloudinary upload failed');

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      cloudinary.uploader.upload.mockRejectedValue(cloudinaryError);

      // Act
      await screenshotController.uploadScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error uploading screenshot',
        error: cloudinaryError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Screenshot upload error: ${cloudinaryError.message}`);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.body = { agentId: 'EMP001' };
      mockReq.file = {
        path: '/tmp/screenshot.jpg',
        originalname: 'screenshot.jpg'
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockCloudinaryResponse = {
        secure_url: 'https://res.cloudinary.com/example/image/upload/screenshot.jpg',
        public_id: 'employee-screenshots/screenshot_123'
      };
      const dbError = new Error('Database connection failed');

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      cloudinary.uploader.upload.mockResolvedValue(mockCloudinaryResponse);
      prisma.screenshot.create.mockRejectedValue(dbError);

      // Act
      await screenshotController.uploadScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error uploading screenshot',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Screenshot upload error: ${dbError.message}`);
    });
  });

  describe('getEmployeeScreenshots', () => {
    it('should retrieve employee screenshots with pagination', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.params = { empId: validEmployee.empId };
      mockReq.query = { page: '1', limit: '10' };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockScreenshots = [
        {
          id: 'screenshot1',
          imageUrl: 'https://res.cloudinary.com/example/image/upload/screenshot1.jpg',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'screenshot2',
          imageUrl: 'https://res.cloudinary.com/example/image/upload/screenshot2.jpg',
          createdAt: new Date('2024-01-15T11:00:00Z')
        }
      ];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.screenshot.findMany.mockResolvedValue(mockScreenshots);
      prisma.screenshot.count.mockResolvedValue(2);

      // Act
      await screenshotController.getEmployeeScreenshots(mockReq, mockRes);

      // Assert
      expect(prisma.screenshot.findMany).toHaveBeenCalledWith({
        where: {
          empId: validEmployee.empId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0,
        take: 10,
        select: {
          id: true,
          imageUrl: true,
          createdAt: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Screenshots retrieved successfully',
        data: {
          screenshots: mockScreenshots,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalScreenshots: 2,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.params = { empId: 'NONEXISTENT' };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await screenshotController.getEmployeeScreenshots(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    it('should handle empty screenshots data', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockScreenshots = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.screenshot.findMany.mockResolvedValue(mockScreenshots);
      prisma.screenshot.count.mockResolvedValue(0);

      // Act
      await screenshotController.getEmployeeScreenshots(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Screenshots retrieved successfully',
        data: {
          screenshots: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalScreenshots: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };
      mockReq.query = { page: '2', limit: '5' };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockScreenshots = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.screenshot.findMany.mockResolvedValue(mockScreenshots);
      prisma.screenshot.count.mockResolvedValue(10);

      // Act
      await screenshotController.getEmployeeScreenshots(mockReq, mockRes);

      // Assert
      expect(prisma.screenshot.findMany).toHaveBeenCalledWith({
        where: {
          empId: 'EMP001',
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 5, // (page - 1) * limit
        take: 5,
        select: {
          id: true,
          imageUrl: true,
          createdAt: true
        }
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Screenshots retrieved successfully',
        data: {
          screenshots: [],
          pagination: {
            currentPage: 2,
            totalPages: 2,
            totalScreenshots: 10,
            hasNext: true,
            hasPrev: true
          }
        }
      });
    });
  });

  describe('deleteScreenshot', () => {
    it('should successfully delete screenshot', async () => {
      // Arrange
      mockReq.params = { id: 'screenshot1' };

      const mockScreenshot = {
        id: 'screenshot1',
        publicId: 'employee-screenshots/screenshot_123',
        imageUrl: 'https://res.cloudinary.com/example/image/upload/screenshot.jpg'
      };

      prisma.screenshot.findUnique.mockResolvedValue(mockScreenshot);
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
      prisma.screenshot.update.mockResolvedValue(mockScreenshot);

      // Act
      await screenshotController.deleteScreenshot(mockReq, mockRes);

      // Assert
      expect(prisma.screenshot.findUnique).toHaveBeenCalledWith({
        where: { id: 'screenshot1' }
      });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('employee-screenshots/screenshot_123');
      expect(prisma.screenshot.update).toHaveBeenCalledWith({
        where: { id: 'screenshot1' },
        data: { isActive: false }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Screenshot deleted successfully'
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', 'Screenshot deleted: screenshot1');
    });

    it('should return 404 when screenshot not found', async () => {
      // Arrange
      mockReq.params = { id: 'NONEXISTENT' };

      prisma.screenshot.findUnique.mockResolvedValue(null);

      // Act
      await screenshotController.deleteScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Screenshot not found'
      });
    });

    it('should handle Cloudinary deletion errors', async () => {
      // Arrange
      mockReq.params = { id: 'screenshot1' };

      const mockScreenshot = {
        id: 'screenshot1',
        publicId: 'employee-screenshots/screenshot_123',
        imageUrl: 'https://res.cloudinary.com/example/image/upload/screenshot.jpg'
      };

      const cloudinaryError = new Error('Cloudinary deletion failed');

      prisma.screenshot.findUnique.mockResolvedValue(mockScreenshot);
      cloudinary.uploader.destroy.mockRejectedValue(cloudinaryError);

      // Act
      await screenshotController.deleteScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error deleting screenshot',
        error: cloudinaryError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Delete screenshot error: ${cloudinaryError.message}`);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.params = { id: 'screenshot1' };

      const mockScreenshot = {
        id: 'screenshot1',
        publicId: 'employee-screenshots/screenshot_123',
        imageUrl: 'https://res.cloudinary.com/example/image/upload/screenshot.jpg'
      };

      const dbError = new Error('Database connection failed');

      prisma.screenshot.findUnique.mockResolvedValue(mockScreenshot);
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
      prisma.screenshot.update.mockRejectedValue(dbError);

      // Act
      await screenshotController.deleteScreenshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error deleting screenshot',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Delete screenshot error: ${dbError.message}`);
    });
  });
});
