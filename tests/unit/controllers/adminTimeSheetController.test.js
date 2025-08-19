const moment = require('moment');
const { testEmployees, testTimeSheets } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    timeSheet: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    employee: {
      count: jest.fn()
    },
    activitySnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));
jest.mock('../../../utils/adminLogger/adminLogger');

// Import the controller
const adminTimeSheetController = require('../../../admin_app/controller/adminTimeSheetController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Admin TimeSheet Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {},
      params: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getAllEmployeeTimeSheets', () => {
    it('should retrieve all employee timesheets successfully', async () => {
      // Arrange
      const mockTimeSheets = [
        {
          id: 'ts1',
          empId: 'EMP001',
          clockIn: '09:00:00',
          clockOut: '17:00:00',
          hoursLoggedIn: 8,
          status: 'PRESENT',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);

      // Act
      await adminTimeSheetController.getAllEmployeeTimeSheets(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
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
        message: 'All employee timesheets retrieved successfully',
        data: mockTimeSheets,
        total: mockTimeSheets.length
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', 'All employee timesheets retrieved successfully');
    });

    it('should filter timesheets by date range', async () => {
      // Arrange
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockTimeSheets = [];
      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);

      // Act
      await adminTimeSheetController.getAllEmployeeTimeSheets(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });

    it('should filter timesheets by employee ID', async () => {
      // Arrange
      mockReq.query = { empId: 'EMP001' };
      const mockTimeSheets = [];
      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);

      // Act
      await adminTimeSheetController.getAllEmployeeTimeSheets(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          empId: 'EMP001'
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.timeSheet.findMany.mockRejectedValue(dbError);

      // Act
      await adminTimeSheetController.getAllEmployeeTimeSheets(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving timesheets',
        error: dbError.message
      });
      expect(adminLogger.log).toHaveBeenCalledWith('error', `Error: ${dbError.message}`);
    });
  });

  describe('getTodayAttendanceSummary', () => {
    it('should retrieve today\'s attendance summary successfully', async () => {
      // Arrange
      const mockTimeSheets = [
        {
          id: 'ts1',
          clockIn: '09:00:00',
          clockOut: '17:00:00',
          status: 'PRESENT',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);
      prisma.employee.count.mockResolvedValue(10);

      // Act
      await adminTimeSheetController.getTodayAttendanceSummary(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          },
          isActive: true
        },
        include: expect.any(Object)
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Today\'s attendance summary retrieved successfully',
        summary: expect.objectContaining({
          totalEmployees: 10,
          clockedInToday: 0,
          completedToday: 1,
          onBreak: 0,
          present: 1,
          absent: 0,
          halfDay: 0,
          late: 0
        }),
        timeSheets: mockTimeSheets
      });
    });

    it('should handle empty timesheet data', async () => {
      // Arrange
      prisma.timeSheet.findMany.mockResolvedValue([]);
      prisma.employee.count.mockResolvedValue(0);

      // Act
      await adminTimeSheetController.getTodayAttendanceSummary(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Today\'s attendance summary retrieved successfully',
        summary: expect.objectContaining({
          totalEmployees: 0,
          clockedInToday: 0,
          completedToday: 0,
          onBreak: 0,
          present: 0,
          absent: 0,
          halfDay: 0,
          late: 0
        }),
        timeSheets: []
      });
    });
  });

  describe('getEmployeeActivitySnapshot', () => {
    it('should retrieve employee activity snapshots successfully', async () => {
      // Arrange
      mockReq.query = { empId: 'EMP001' };
      const mockSnapshots = [
        {
          id: 'snap1',
          empId: 'EMP001',
          date: new Date('2024-01-15'),
          lastActivity: '2024-01-15 10:30:00',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.activitySnapshot.findMany.mockResolvedValue(mockSnapshots);

      // Act
      await adminTimeSheetController.getEmployeeActivitySnapshot(mockReq, mockRes);

      // Assert
      expect(prisma.activitySnapshot.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          empId: 'EMP001',
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        include: expect.any(Object),
        orderBy: {
          date: 'desc'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee activity snapshots retrieved successfully',
        data: mockSnapshots,
        total: mockSnapshots.length
      });
    });

    it('should use today\'s date when no date is provided', async () => {
      // Arrange
      const mockSnapshots = [];
      prisma.activitySnapshot.findMany.mockResolvedValue(mockSnapshots);

      // Act
      await adminTimeSheetController.getEmployeeActivitySnapshot(mockReq, mockRes);

      // Assert
      expect(prisma.activitySnapshot.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });

  describe('updateActivitySnapshot', () => {
    it('should create new activity snapshot when none exists', async () => {
      // Arrange
      mockReq.body = {
        empId: 'EMP001',
        date: '2024-01-15'
      };

      prisma.activitySnapshot.findFirst.mockResolvedValue(null);
      prisma.activitySnapshot.create.mockResolvedValue({
        id: 'snap1',
        empId: 'EMP001',
        date: new Date('2024-01-15'),
        lastActivity: '2024-01-15 10:30:00'
      });

      // Act
      await adminTimeSheetController.updateActivitySnapshot(mockReq, mockRes);

      // Assert
      expect(prisma.activitySnapshot.create).toHaveBeenCalledWith({
        data: {
          empId: 'EMP001',
          date: expect.any(Date),
          lastActivity: expect.any(String)
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Activity snapshot updated successfully',
        data: expect.any(Object)
      });
    });

    it('should update existing activity snapshot', async () => {
      // Arrange
      mockReq.body = {
        empId: 'EMP001',
        date: '2024-01-15'
      };

      const existingSnapshot = {
        id: 'snap1',
        empId: 'EMP001',
        date: new Date('2024-01-15'),
        lastActivity: '2024-01-15 09:00:00'
      };

      prisma.activitySnapshot.findFirst.mockResolvedValue(existingSnapshot);
      prisma.activitySnapshot.update.mockResolvedValue({
        ...existingSnapshot,
        lastActivity: '2024-01-15 10:30:00'
      });

      // Act
      await adminTimeSheetController.updateActivitySnapshot(mockReq, mockRes);

      // Assert
      expect(prisma.activitySnapshot.update).toHaveBeenCalledWith({
        where: { id: 'snap1' },
        data: {
          lastActivity: expect.any(String)
        }
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = { empId: 'EMP001' }; // Missing date

      // Act
      await adminTimeSheetController.updateActivitySnapshot(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee ID and date are required'
      });
    });
  });

  describe('getEmployeeDetailedTimeSheet', () => {
    it('should retrieve detailed timesheet for specific employee', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };
      const mockTimeSheets = [
        {
          id: 'ts1',
          empId: 'EMP001',
          hoursLoggedIn: 8,
          totalBreakTime: 60,
          status: 'PRESENT',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ];

      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);

      // Act
      await adminTimeSheetController.getEmployeeDetailedTimeSheet(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: {
          empId: 'EMP001',
          isActive: true
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee detailed timesheet retrieved successfully',
        data: {
          timeSheets: mockTimeSheets,
          totals: expect.objectContaining({
            totalHours: 8,
            totalBreakTime: 60,
            totalDays: 1,
            presentDays: 1,
            absentDays: 0,
            halfDays: 0,
            lateDays: 0
          }),
          employee: mockTimeSheets[0].employee
        }
      });
    });

    it('should filter by date range when provided', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockTimeSheets = [];
      prisma.timeSheet.findMany.mockResolvedValue(mockTimeSheets);

      // Act
      await adminTimeSheetController.getEmployeeDetailedTimeSheet(mockReq, mockRes);

      // Assert
      expect(prisma.timeSheet.findMany).toHaveBeenCalledWith({
        where: {
          empId: 'EMP001',
          isActive: true,
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });
});


