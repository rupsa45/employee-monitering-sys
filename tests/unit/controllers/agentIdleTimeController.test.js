const { testEmployees } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findUnique: jest.fn()
    },
    agentIdleTime: {
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
const agentIdleTimeController = require('../../../admin_app/controller/agentIdleTimeController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Agent Idle Time Controller', () => {
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

  describe('addAgentIdleTime', () => {
    it('should successfully add agent idle time data', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.body = {
        agentId: validEmployee.empId,
        from: '2024-01-15T10:00:00Z',
        to: '2024-01-15T10:30:00Z'
      };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockIdleTime = {
        id: 'idle1',
        from: new Date('2024-01-15T10:00:00Z'),
        to: new Date('2024-01-15T10:30:00Z'),
        duration: 1800000, // 30 minutes in milliseconds
        empId: validEmployee.empId
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentIdleTime.create.mockResolvedValue(mockIdleTime);

      // Act
      await agentIdleTimeController.addAgentIdleTime(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: validEmployee.empId }
      });
      expect(prisma.agentIdleTime.create).toHaveBeenCalledWith({
        data: {
          from: expect.any(Date),
          to: expect.any(Date),
          duration: 1800000,
          empId: validEmployee.empId
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Idle time data saved successfully',
        data: {
          id: mockIdleTime.id,
          from: mockIdleTime.from,
          to: mockIdleTime.to,
          duration: mockIdleTime.duration,
          durationMinutes: 30
        }
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', expect.stringContaining('Idle time recorded for employee'));
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'NONEXISTENT',
        from: '2024-01-15T10:00:00Z',
        to: '2024-01-15T10:30:00Z'
      };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await agentIdleTimeController.addAgentIdleTime(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    it('should return 400 when required time fields are missing', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        from: '2024-01-15T10:00:00Z'
        // Missing 'to' field
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // Act
      await agentIdleTimeController.addAgentIdleTime(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'From and to times are required'
      });
    });

    it('should return 400 when time range is invalid', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        from: '2024-01-15T10:30:00Z',
        to: '2024-01-15T10:00:00Z' // End time before start time
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // Act
      await agentIdleTimeController.addAgentIdleTime(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid time range: end time must be after start time'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        agentId: 'EMP001',
        from: '2024-01-15T10:00:00Z',
        to: '2024-01-15T10:30:00Z'
      };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe' };
      const dbError = new Error('Database connection failed');

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentIdleTime.create.mockRejectedValue(dbError);

      // Act
      await agentIdleTimeController.addAgentIdleTime(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error saving idle time data',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Add idle time error: ${dbError.message}`);
    });
  });

  describe('getEmployeeIdleTime', () => {
    it('should retrieve employee idle time with pagination', async () => {
      // Arrange
      const { validEmployee } = testEmployees;
      mockReq.params = { empId: validEmployee.empId };
      mockReq.query = { page: '1', limit: '10' };

      const mockEmployee = {
        id: validEmployee.empId,
        empName: validEmployee.firstName + ' ' + validEmployee.lastName
      };

      const mockIdleTimes = [
        {
          id: 'idle1',
          from: new Date('2024-01-15T10:00:00Z'),
          to: new Date('2024-01-15T10:30:00Z'),
          duration: 1800000,
          createdAt: new Date()
        }
      ];

      const mockSummary = {
        _sum: { duration: 1800000 },
        _count: 1
      };

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentIdleTime.findMany.mockResolvedValue(mockIdleTimes);
      prisma.agentIdleTime.count.mockResolvedValue(1);
      prisma.agentIdleTime.aggregate.mockResolvedValue(mockSummary);

      // Act
      await agentIdleTimeController.getEmployeeIdleTime(mockReq, mockRes);

      // Assert
      expect(prisma.agentIdleTime.findMany).toHaveBeenCalledWith({
        where: {
          empId: validEmployee.empId,
          isActive: true
        },
        orderBy: {
          from: 'desc'
        },
        skip: 0,
        take: 10,
        select: {
          id: true,
          from: true,
          to: true,
          duration: true,
          createdAt: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Idle time retrieved successfully',
        data: {
          idleTimes: expect.arrayContaining([
            expect.objectContaining({
              durationMinutes: 30
            })
          ]),
          summary: {
            totalIdleSessions: 1,
            totalIdleMinutes: 30,
            averageIdleMinutes: 30
          },
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalIdleTimes: 1,
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
      const mockIdleTimes = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.agentIdleTime.findMany.mockResolvedValue(mockIdleTimes);
      prisma.agentIdleTime.count.mockResolvedValue(0);
      prisma.agentIdleTime.aggregate.mockResolvedValue({ _sum: { duration: 0 }, _count: 0 });

      // Act
      await agentIdleTimeController.getEmployeeIdleTime(mockReq, mockRes);

      // Assert
      expect(prisma.agentIdleTime.findMany).toHaveBeenCalledWith({
        where: {
          empId: 'EMP001',
          isActive: true,
          from: {
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
      await agentIdleTimeController.getEmployeeIdleTime(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });
  });

  describe('getAllIdleTimeSummary', () => {
    it('should retrieve idle time summary for all employees', async () => {
      // Arrange
      const mockSummary = [
        {
          empId: 'EMP001',
          _sum: { duration: 1800000 },
          _count: 2
        }
      ];

      const mockEmployee = {
        id: 'EMP001',
        empName: 'John Doe',
        empEmail: 'john@example.com',
        empTechnology: 'JavaScript'
      };

      prisma.agentIdleTime.groupBy.mockResolvedValue(mockSummary);
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // Act
      await agentIdleTimeController.getAllIdleTimeSummary(mockReq, mockRes);

      // Assert
      expect(prisma.agentIdleTime.groupBy).toHaveBeenCalledWith({
        by: ['empId'],
        where: { isActive: true },
        _sum: { duration: true },
        _count: true
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Idle time summary retrieved successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            employee: mockEmployee,
            totalIdleSessions: 2,
            totalIdleMinutes: 30,
            averageIdleMinutes: 15
          })
        ])
      });
    });

    it('should filter by date when provided', async () => {
      // Arrange
      mockReq.query = { date: '2024-01-15' };
      const mockSummary = [];

      prisma.agentIdleTime.groupBy.mockResolvedValue(mockSummary);

      // Act
      await agentIdleTimeController.getAllIdleTimeSummary(mockReq, mockRes);

      // Assert
      expect(prisma.agentIdleTime.groupBy).toHaveBeenCalledWith({
        by: ['empId'],
        where: {
          isActive: true,
          from: {
            gte: expect.any(Date),
            lt: expect.any(Date)
          }
        },
        _sum: { duration: true },
        _count: true
      });
    });

    it('should handle empty summary data', async () => {
      // Arrange
      const mockSummary = [];

      prisma.agentIdleTime.groupBy.mockResolvedValue(mockSummary);

      // Act
      await agentIdleTimeController.getAllIdleTimeSummary(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Idle time summary retrieved successfully',
        data: []
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.agentIdleTime.groupBy.mockRejectedValue(dbError);

      // Act
      await agentIdleTimeController.getAllIdleTimeSummary(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving idle time summary',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Get idle time summary error: ${dbError.message}`);
    });
  });
});
