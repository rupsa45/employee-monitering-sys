const { testEmployees, testNotifications } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findMany: jest.fn()
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));
// Import the controller
const notificationController = require('../../../admin_app/controller/notificationController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Notification Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('createNotification', () => {
    it('should create notification for specific employees successfully', async () => {
      // Arrange
      mockReq.body = {
        title: 'Important Update',
        message: 'Please check your email for important updates',
        empIds: ['EMP001', 'EMP002']
      };

      const mockEmployees = [
        { id: 'EMP001' },
        { id: 'EMP002' }
      ];

      const mockNotifications = [
        {
          id: 'notif1',
          title: 'Important Update',
          message: 'Please check your email for important updates',
          empId: 'EMP001',
          isActive: true,
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        },
        {
          id: 'notif2',
          title: 'Important Update',
          message: 'Please check your email for important updates',
          empId: 'EMP002',
          isActive: true,
          employee: {
            empName: 'Jane Smith',
            empEmail: 'jane@example.com',
            empTechnology: 'React'
          }
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.notification.create
        .mockResolvedValueOnce(mockNotifications[0])
        .mockResolvedValueOnce(mockNotifications[1]);

      // Act
      await notificationController.createNotification(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['EMP001', 'EMP002'] },
          isActive: true,
          empRole: 'employee'
        },
        select: { id: true }
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification created successfully for 2 employees',
        notifications: mockNotifications,
        totalRecipients: 2,
        recipients: expect.arrayContaining([
          expect.objectContaining({
            empId: 'EMP001',
            empName: 'John Doe',
            empEmail: 'john@example.com'
          }),
          expect.objectContaining({
            empId: 'EMP002',
            empName: 'Jane Smith',
            empEmail: 'jane@example.com'
          })
        ])
      });
      });

    it('should create notification for all employees when sendToAll is true', async () => {
      // Arrange
      mockReq.body = {
        title: 'Company Announcement',
        message: 'Company meeting tomorrow at 10 AM',
        sendToAll: true
      };

      const mockEmployees = [
        { id: 'EMP001' },
        { id: 'EMP002' },
        { id: 'EMP003' }
      ];

      const mockNotifications = [
        {
          id: 'notif1',
          title: 'Company Announcement',
          message: 'Company meeting tomorrow at 10 AM',
          empId: 'EMP001',
          isActive: true,
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.notification.create.mockResolvedValue(mockNotifications[0]);

      // Act
      await notificationController.createNotification(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          empRole: 'employee'
        },
        select: { id: true }
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(3);
    });

    it('should return 400 when neither empIds nor sendToAll is provided', async () => {
      // Arrange
      mockReq.body = {
        title: 'Test Notification',
        message: 'Test message'
        // Missing empIds and sendToAll
      };

      // Act
      await notificationController.createNotification(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Either empIds array or sendToAll=true must be provided'
      });
    });

    it('should return 400 when no valid employees found', async () => {
      // Arrange
      mockReq.body = {
        title: 'Test Notification',
        message: 'Test message',
        empIds: ['INVALID_EMP']
      };

      prisma.employee.findMany.mockResolvedValue([]);

      // Act
      await notificationController.createNotification(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No valid employees found to send notification to'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        title: 'Test Notification',
        message: 'Test message',
        empIds: ['EMP001']
      };

      const dbError = new Error('Database connection failed');
      prisma.employee.findMany.mockRejectedValue(dbError);

      // Act
      await notificationController.createNotification(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating notification',
        error: dbError.message
      });
      });
  });

  describe('getActiveEmployees', () => {
    it('should retrieve active employees successfully', async () => {
      // Arrange
      const mockEmployees = [
        {
          id: 'EMP001',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript',
          empPhone: '+1234567890'
        },
        {
          id: 'EMP002',
          empName: 'Jane Smith',
          empEmail: 'jane@example.com',
          empTechnology: 'React',
          empPhone: '+0987654321'
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await notificationController.getActiveEmployees(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          empRole: 'employee'
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empTechnology: true,
          empPhone: true
        },
        orderBy: {
          empName: 'asc'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active employees retrieved successfully',
        data: mockEmployees,
        total: mockEmployees.length
      });
      });

    it('should handle empty employee list', async () => {
      // Arrange
      const mockEmployees = [];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await notificationController.getActiveEmployees(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active employees retrieved successfully',
        data: [],
        total: 0
      });
    });
  });

  describe('getAllNotifications', () => {
    it('should retrieve all notifications successfully', async () => {
      // Arrange
      const mockNotifications = [
        {
          id: 'notif1',
          title: 'Important Update',
          message: 'Please check your email',
          empId: 'EMP001',
          isActive: true,
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      // Act
      await notificationController.getAllNotifications(mockReq, mockRes);

      // Assert
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'All notifications retrieved successfully',
        data: mockNotifications,
        total: mockNotifications.length
      });
    });

    it('should filter notifications by employee ID', async () => {
      // Arrange
      mockReq.query = { empId: 'EMP001' };

      const mockNotifications = [];

      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      // Act
      await notificationController.getAllNotifications(mockReq, mockRes);

      // Assert
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { empId: 'EMP001' },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });

    it('should filter notifications by active status', async () => {
      // Arrange
      mockReq.query = { isActive: 'true' };

      const mockNotifications = [];

      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      // Act
      await notificationController.getAllNotifications(mockReq, mockRes);

      // Assert
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      // Arrange
      mockReq.params = { id: 'notif1' };
      mockReq.body = {
        title: 'Updated Title',
        message: 'Updated message',
        isActive: false
      };

      const mockNotification = {
        id: 'notif1',
        title: 'Updated Title',
        message: 'Updated message',
        isActive: false,
        employee: {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript'
        }
      };

      prisma.notification.update.mockResolvedValue(mockNotification);

      // Act
      await notificationController.updateNotification(mockReq, mockRes);

      // Assert
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: {
          title: 'Updated Title',
          message: 'Updated message',
          isActive: false
        },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification updated successfully',
        notification: mockNotification
      });
      });
  });

  describe('inactivateNotification', () => {
    it('should inactivate notification successfully', async () => {
      // Arrange
      mockReq.params = { id: 'notif1' };

      prisma.notification.update.mockResolvedValue({ id: 'notif1', isActive: false });

      // Act
      await notificationController.inactivateNotification(mockReq, mockRes);

      // Assert
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        data: { isActive: false }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification inactive successfully'
      });
      });
  });

  describe('getNotificationById', () => {
    it('should retrieve notification by ID successfully', async () => {
      // Arrange
      mockReq.params = { id: 'notif1' };

      const mockNotification = {
        id: 'notif1',
        title: 'Important Update',
        message: 'Please check your email',
        empId: 'EMP001',
        isActive: true,
        employee: {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript'
        }
      };

      prisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      await notificationController.getNotificationById(mockReq, mockRes);

      // Assert
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'notif1' },
        include: {
          employee: {
            select: {
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification retrieved successfully',
        notification: mockNotification
      });
    });

    it('should return 404 when notification not found', async () => {
      // Arrange
      mockReq.params = { id: 'NONEXISTENT' };

      prisma.notification.findUnique.mockResolvedValue(null);

      // Act
      await notificationController.getNotificationById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification not found'
      });
    });
  });
});


