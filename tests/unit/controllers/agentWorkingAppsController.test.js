const { testEmployees } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn()
    },
    agentWorkingApp: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    }
  }
}));
jest.mock('../../../utils/adminLogger/adminLogger');

// Import the controller
const agentWorkingAppsController = require('../../../admin_app/controller/agentWorkingAppsController');
const { prisma } = require('../../../config/prismaConfig');
const adminLogger = require('../../../utils/adminLogger/adminLogger');

describe('Agent Working Apps Controller', () => {
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

  describe('setAgentWorkingApp', () => {
    it('should successfully set agent working app data', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.body = {
        agentId: validEmployee.empId,
        appData: {
          appName: 'Visual Studio Code',
          appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
          appOpenAt: '2024-01-15T10:00:00Z',
          appCloseAt: '2024-01-15T11:00:00Z',
          keysPressed: 150,
          mouseClicks: 25
        }
      };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockWorkingApp = {
        id: 'app1',
        appName: 'Visual Studio Code',
        appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
        appOpenAt: new Date('2024-01-15T10:00:00Z'),
        appCloseAt: new Date('2024-01-15T11:00:00Z'),
        keysPressed: 150,
        mouseClicks: 25,
        empId: validEmployee.empId
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.create.mockResolvedValue(mockWorkingApp);

      // Act
      await agentWorkingAppsController.setAgentWorkingApp(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: validEmployee.empId }
      });
      expect(prisma.agentWorkingApp.create).toHaveBeenCalledWith({
        data: {
          appName: 'Visual Studio Code',
          appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
          appOpenAt: expect.any(Date),
          appCloseAt: expect.any(Date),
          keysPressed: 150,
          mouseClicks: 25,
          empId: validEmployee.empId
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Working app data saved successfully',
        data: {
          id: mockWorkingApp.id,
          appName: mockWorkingApp.appName,
          appOpenAt: mockWorkingApp.appOpenAt,
          appCloseAt: mockWorkingApp.appCloseAt,
          keysPressed: mockWorkingApp.keysPressed,
          mouseClicks: mockWorkingApp.mouseClicks
        }
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', expect.stringContaining('Working app data saved for employee'));
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'NONEXISTENT',
        appData: {
          appName: 'Visual Studio Code',
          appOpenAt: '2024-01-15T10:00:00Z',
          appCloseAt: '2024-01-15T11:00:00Z'
        }
      };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await agentWorkingAppsController.setAgentWorkingApp(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    it('should return 400 when app data is invalid', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        appData: {
          appName: 'Visual Studio Code'
          // Missing required fields
        }
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // Act
      await agentWorkingAppsController.setAgentWorkingApp(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid app data provided'
      });
    });

    it('should handle optional app data fields', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        appData: {
          appName: 'Visual Studio Code',
          appOpenAt: '2024-01-15T10:00:00Z',
          appCloseAt: '2024-01-15T11:00:00Z'
          // Missing optional fields: appPath, keysPressed, mouseClicks
        }
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockWorkingApp = {
        id: 'app1',
        appName: 'Visual Studio Code',
        appPath: null,
        appOpenAt: new Date('2024-01-15T10:00:00Z'),
        appCloseAt: new Date('2024-01-15T11:00:00Z'),
        keysPressed: 0,
        mouseClicks: 0,
        empId: 'EMP001'
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.create.mockResolvedValue(mockWorkingApp);

      // Act
      await agentWorkingAppsController.setAgentWorkingApp(mockReq, mockRes);

      // Assert
      expect(prisma.agentWorkingApp.create).toHaveBeenCalledWith({
        data: {
          appName: 'Visual Studio Code',
          appPath: null,
          appOpenAt: expect.any(Date),
          appCloseAt: expect.any(Date),
          keysPressed: 0,
          mouseClicks: 0,
          empId: 'EMP001'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        appData: {
          appName: 'Visual Studio Code',
          appOpenAt: '2024-01-15T10:00:00Z',
          appCloseAt: '2024-01-15T11:00:00Z'
        }
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const dbError = new Error('Database connection failed');

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.create.mockRejectedValue(dbError);

      // Act
      await agentWorkingAppsController.setAgentWorkingApp(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error saving working app data',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Set working app error: ${dbError.message}`);
    });
  });

  describe('getEmployeeWorkingApps', () => {
    it('should retrieve employee working apps with pagination', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.params = { empId: validEmployee.empId };
      mockReq.query = { page: '1', limit: '10' };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockWorkingApps = [
        {
          id: 'app1',
          appName: 'Visual Studio Code',
          appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
          appOpenAt: new Date('2024-01-15T10:00:00Z'),
          appCloseAt: new Date('2024-01-15T11:00:00Z'),
          keysPressed: 150,
          mouseClicks: 25,
          createdAt: new Date()
        }
      ];

      const mockSummary = {
        _sum: { keysPressed: 150, mouseClicks: 25 },
        _count: 1
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.findMany.mockResolvedValue(mockWorkingApps);
      prisma.agentWorkingApp.count.mockResolvedValue(1);
      prisma.agentWorkingApp.aggregate.mockResolvedValue(mockSummary);

      // Act
      await agentWorkingAppsController.getEmployeeWorkingApps(mockReq, mockRes);

      // Assert
      expect(prisma.agentWorkingApp.findMany).toHaveBeenCalledWith({
        where: {
          empId: validEmployee.empId,
          isActive: true
        },
        orderBy: {
          appOpenAt: 'desc'
        },
        skip: 0,
        take: 10,
        select: {
          id: true,
          appName: true,
          appPath: true,
          appOpenAt: true,
          appCloseAt: true,
          keysPressed: true,
          mouseClicks: true,
          createdAt: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Working apps retrieved successfully',
        data: {
          workingApps: mockWorkingApps,
          summary: {
            totalApps: 1,
            totalKeysPressed: 150,
            totalMouseClicks: 25
          },
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalApps: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });

    it('should filter by date when provided', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };
      mockReq.query = { date: '2024-01-15' };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockWorkingApps = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.findMany.mockResolvedValue(mockWorkingApps);
      prisma.agentWorkingApp.count.mockResolvedValue(0);
      prisma.agentWorkingApp.aggregate.mockResolvedValue({ _sum: { keysPressed: 0, mouseClicks: 0 }, _count: 0 });

      // Act
      await agentWorkingAppsController.getEmployeeWorkingApps(mockReq, mockRes);

      // Assert
      expect(prisma.agentWorkingApp.findMany).toHaveBeenCalledWith({
        where: {
          empId: 'EMP001',
          isActive: true,
          appOpenAt: {
            gte: expect.any(Date),
            lt: expect.any(Date)
          }
        },
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number),
        select: expect.any(Object)
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.params = { empId: 'NONEXISTENT' };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await agentWorkingAppsController.getEmployeeWorkingApps(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    it('should handle empty working apps data', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const mockWorkingApps = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentWorkingApp.findMany.mockResolvedValue(mockWorkingApps);
      prisma.agentWorkingApp.count.mockResolvedValue(0);
      prisma.agentWorkingApp.aggregate.mockResolvedValue({ _sum: { keysPressed: 0, mouseClicks: 0 }, _count: 0 });

      // Act
      await agentWorkingAppsController.getEmployeeWorkingApps(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Working apps retrieved successfully',
        data: {
          workingApps: [],
          summary: {
            totalApps: 0,
            totalKeysPressed: 0,
            totalMouseClicks: 0
          },
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalApps: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    });
  });

  describe('getAllWorkingAppsSummary', () => {
    it('should retrieve working apps summary for all employees', async () => {
      // Arrange
      const mockSummary = [
        {
          empId: 'EMP001',
          _sum: { keysPressed: 300, mouseClicks: 50 },
          _count: 2
        }
      ];

      const mockEmployee = {
        id: 'EMP001',
        empName: 'John Doe',
        empEmail: 'john@example.com',
        empTechnology: 'JavaScript'
      };

      prisma.agentWorkingApp.groupBy.mockResolvedValue(mockSummary);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // Act
      await agentWorkingAppsController.getAllWorkingAppsSummary(mockReq, mockRes);

      // Assert
      expect(prisma.agentWorkingApp.groupBy).toHaveBeenCalledWith({
        by: ['empId'],
        where: { isActive: true },
        _sum: { keysPressed: true, mouseClicks: true },
        _count: true
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Working apps summary retrieved successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            employee: mockEmployee,
            totalApps: 2,
            totalKeysPressed: 300,
            totalMouseClicks: 50
          })
        ])
      });
    });

    it('should filter by date when provided', async () => {
      // Arrange
      mockReq.query = { date: '2024-01-15' };
      const mockSummary = [];

      prisma.agentWorkingApp.groupBy.mockResolvedValue(mockSummary);

      // Act
      await agentWorkingAppsController.getAllWorkingAppsSummary(mockReq, mockRes);

      // Assert
      expect(prisma.agentWorkingApp.groupBy).toHaveBeenCalledWith({
        by: ['empId'],
        where: {
          isActive: true,
          appOpenAt: {
            gte: expect.any(Date),
            lt: expect.any(Date)
          }
        },
        _sum: { keysPressed: true, mouseClicks: true },
        _count: true
      });
    });

    it('should handle empty summary data', async () => {
      // Arrange
      const mockSummary = [];

      prisma.agentWorkingApp.groupBy.mockResolvedValue(mockSummary);

      // Act
      await agentWorkingAppsController.getAllWorkingAppsSummary(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Working apps summary retrieved successfully',
        data: []
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.agentWorkingApp.groupBy.mockRejectedValue(dbError);

      // Act
      await agentWorkingAppsController.getAllWorkingAppsSummary(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving working apps summary',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Get working apps summary error: ${dbError.message}`);
    });
  });
});
