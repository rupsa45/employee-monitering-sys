const { testEmployees } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findMany: jest.fn()
    }
  }
}));
jest.mock('../../../utils/benchLogger/benchLogger');

// Import the controller
const benchController = require('../../../admin_app/controller/benchController');
const { prisma } = require('../../../config/prismaConfig');
// Logger removed for cleaner output

describe('Bench Controller', () => {
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

  describe('empWorkingList', () => {
    it('should retrieve current employee list successfully', async () => {
      // Arrange
      const mockEmployees = [
        {
          id: 'EMP001',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empRole: 'employee',
          updatedAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'EMP002',
          empName: 'Jane Smith',
          empEmail: 'jane@example.com',
          empRole: 'employee',
          updatedAt: new Date('2024-01-15T11:00:00Z')
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.empWorkingList(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          empRole: 'employee',
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empRole: true,
          updatedAt: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Current employee list retrieved',
        empData: mockEmployees
      });
      expect(benchLogger.log).toHaveBeenCalledWith('info', 'Current employee list retrieved');
    });

    it('should handle empty employee list', async () => {
      // Arrange
      const mockEmployees = [];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.empWorkingList(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Current employee list retrieved',
        empData: []
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.employee.findMany.mockRejectedValue(dbError);

      // Act
      await benchController.empWorkingList(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: `Error: ${dbError.message}`
      });
      expect(benchLogger.log).toHaveBeenCalledWith('error', `Error: ${dbError.message}`);
    });
  });

  describe('searchEmployee', () => {
    it('should search employees by name successfully', async () => {
      // Arrange
      mockReq.params = { letter: 'john' };

      const mockEmployees = [
        {
          id: 'EMP001',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empRole: 'employee'
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { empName: { contains: 'john', mode: 'insensitive' } },
            { empEmail: { contains: 'john', mode: 'insensitive' } }
          ],
          empRole: 'employee',
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empRole: true
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Searched employees',
        empData: mockEmployees
      });
      expect(benchLogger.log).toHaveBeenCalledWith('info', 'Searched employees');
    });

    it('should search employees by email successfully', async () => {
      // Arrange
      mockReq.params = { letter: 'jane@example' };

      const mockEmployees = [
        {
          id: 'EMP002',
          empName: 'Jane Smith',
          empEmail: 'jane@example.com',
          empRole: 'employee'
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { empName: { contains: 'jane@example', mode: 'insensitive' } },
            { empEmail: { contains: 'jane@example', mode: 'insensitive' } }
          ],
          empRole: 'employee',
          isActive: true
        },
        select: {
          id: true,
          empName: true,
          empEmail: true,
          empRole: true
        }
      });
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      mockReq.params = { letter: 'JOHN' };

      const mockEmployees = [
        {
          id: 'EMP001',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empRole: 'employee'
        }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { empName: { contains: 'JOHN', mode: 'insensitive' } },
            { empEmail: { contains: 'JOHN', mode: 'insensitive' } }
          ],
          empRole: 'employee',
          isActive: true
        },
        select: expect.any(Object)
      });
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockReq.params = { letter: 'nonexistent' };

      const mockEmployees = [];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Searched employees',
        empData: []
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.params = { letter: 'test' };

      const dbError = new Error('Database connection failed');
      prisma.employee.findMany.mockRejectedValue(dbError);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: `Error: ${dbError.message}`
      });
      expect(benchLogger.log).toHaveBeenCalledWith('error', `Error: ${dbError.message}`);
    });

    it('should handle special characters in search', async () => {
      // Arrange
      mockReq.params = { letter: 'test@email.com' };

      const mockEmployees = [];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { empName: { contains: 'test@email.com', mode: 'insensitive' } },
            { empEmail: { contains: 'test@email.com', mode: 'insensitive' } }
          ],
          empRole: 'employee',
          isActive: true
        },
        select: expect.any(Object)
      });
    });

    it('should handle empty search parameter', async () => {
      // Arrange
      mockReq.params = { letter: '' };

      const mockEmployees = [];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await benchController.searchEmployee(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { empName: { contains: '', mode: 'insensitive' } },
            { empEmail: { contains: '', mode: 'insensitive' } }
          ],
          empRole: 'employee',
          isActive: true
        },
        select: expect.any(Object)
      });
    });
  });
});


