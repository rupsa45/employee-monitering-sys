const { testEmployees, testTasks } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../config/prismaConfig', () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));
jest.mock('../../../utils/adminLogger/adminLogger');

// Import the controller
const taskController = require('../../../admin_app/controller/taskController');
const { prisma } = require('../../../config/prismaConfig');
const adminLogger = require('../../../utils/adminLogger/adminLogger');

describe('Task Controller', () => {
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

  describe('createTask', () => {
    it('should create task successfully', async () => {
      // Arrange
      mockReq.body = {
        title: 'Implement User Authentication',
        description: 'Create login and registration functionality',
        assignedTo: ['EMP001', 'EMP002'],
        dueDate: '2024-02-01'
      };

      const mockEmployees = [
        { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com' },
        { id: 'EMP002', empName: 'Jane Smith', empEmail: 'jane@example.com' }
      ];

      const mockTask = {
        id: 'task1',
        title: 'Implement User Authentication',
        description: 'Create login and registration functionality',
        status: 'PENDING',
        dueDate: new Date('2024-02-01'),
        assignedEmployees: mockEmployees,
        createdAt: new Date()
      };

      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.task.create.mockResolvedValue(mockTask);

      // Act
      await taskController.createTask(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['EMP001', 'EMP002'] },
          isActive: true,
          empRole: 'employee'
        },
        select: { id: true, empName: true, empEmail: true }
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Implement User Authentication',
          description: 'Create login and registration functionality',
          dueDate: expect.any(Date),
          assignedEmployees: {
            connect: [
              { id: 'EMP001' },
              { id: 'EMP002' }
            ]
          }
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task created successfully',
        task: {
          id: mockTask.id,
          title: mockTask.title,
          description: mockTask.description,
          status: mockTask.status,
          dueDate: mockTask.dueDate,
          assignedEmployees: mockTask.assignedEmployees,
          createdAt: mockTask.createdAt
        }
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', 'Task "Implement User Authentication" created successfully by admin');
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        title: 'Test Task'
        // Missing description, assignedTo, dueDate
      };

      // Act
      await taskController.createTask(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, description, assigned employees, and due date are required'
      });
    });

    it('should return 400 when assigned employees not found', async () => {
      // Arrange
      mockReq.body = {
        title: 'Test Task',
        description: 'Test description',
        assignedTo: ['EMP001', 'INVALID_EMP'],
        dueDate: '2024-02-01'
      };

      const mockEmployees = [
        { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com' }
      ];

      prisma.employee.findMany.mockResolvedValue(mockEmployees);

      // Act
      await taskController.createTask(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'One or more assigned employees not found or are not valid employees'
      });
    });
  });

  describe('getAllTasks', () => {
    it('should retrieve all tasks successfully', async () => {
      // Arrange
      const mockTasks = [
        {
          id: 'task1',
          title: 'Implement User Authentication',
          description: 'Create login and registration functionality',
          status: 'PENDING',
          dueDate: new Date('2024-02-01'),
          assignedEmployees: [
            { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com', empTechnology: 'JavaScript' }
          ]
        }
      ];

      prisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      await taskController.getAllTasks(mockReq, mockRes);

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          assignedEmployees: {
            select: {
              id: true,
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
        message: 'Tasks retrieved successfully',
        data: mockTasks,
        total: mockTasks.length
      });
    });

    it('should filter tasks by status', async () => {
      // Arrange
      mockReq.query = { status: 'pending' };

      const mockTasks = [];

      prisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      await taskController.getAllTasks(mockReq, mockRes);

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { isActive: true, status: 'PENDING' },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });

    it('should filter tasks by assigned employee', async () => {
      // Arrange
      mockReq.query = { assignedTo: 'EMP001' };

      const mockTasks = [];

      prisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      await taskController.getAllTasks(mockReq, mockRes);

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          assignedEmployees: {
            some: {
              id: 'EMP001'
            }
          }
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });

  describe('getTaskById', () => {
    it('should retrieve task by ID successfully', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };

      const mockTask = {
        id: 'task1',
        title: 'Implement User Authentication',
        description: 'Create login and registration functionality',
        status: 'PENDING',
        dueDate: new Date('2024-02-01'),
        assignedEmployees: [
          { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com', empTechnology: 'JavaScript' }
        ]
      };

      prisma.task.findFirst.mockResolvedValue(mockTask);

      // Act
      await taskController.getTaskById(mockReq, mockRes);

      // Assert
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task1', isActive: true },
        include: {
          assignedEmployees: {
            select: {
              id: true,
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
        message: 'Task retrieved successfully',
        task: mockTask
      });
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      mockReq.params = { taskId: 'NONEXISTENT' };

      prisma.task.findFirst.mockResolvedValue(null);

      // Act
      await taskController.getTaskById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      });
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };
      mockReq.body = {
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'IN_PROGRESS',
        dueDate: '2024-02-15'
      };

      const mockTask = {
        id: 'task1',
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'IN_PROGRESS',
        dueDate: new Date('2024-02-15'),
        assignedEmployees: []
      };

      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue(mockTask);

      // Act
      await taskController.updateTask(mockReq, mockRes);

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task1' },
        data: {
          title: 'Updated Task Title',
          description: 'Updated description',
          status: 'IN_PROGRESS',
          dueDate: expect.any(Date)
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
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
        message: 'Task updated successfully',
        task: mockTask
      });
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      mockReq.params = { taskId: 'NONEXISTENT' };

      prisma.task.findUnique.mockResolvedValue(null);

      // Act
      await taskController.updateTask(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };

      const mockTask = {
        id: 'task1',
        title: 'Test Task'
      };

      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.delete.mockResolvedValue(mockTask);

      // Act
      await taskController.deleteTask(mockReq, mockRes);

      // Assert
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task1' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task deleted successfully',
        task: mockTask
      });
      expect(adminLogger.log).toHaveBeenCalledWith('info', 'Task "Test Task" deleted successfully by admin');
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      mockReq.params = { taskId: 'NONEXISTENT' };

      prisma.task.findUnique.mockResolvedValue(null);

      // Act
      await taskController.deleteTask(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      });
    });
  });

  describe('getEmployeeTasks', () => {
    it('should retrieve tasks for specific employee successfully', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };

      const mockEmployee = {
        id: 'EMP001',
        empName: 'John Doe',
        empEmail: 'john@example.com'
      };

      const mockTasks = [
        {
          id: 'task1',
          title: 'Implement User Authentication',
          description: 'Create login and registration functionality',
          status: 'PENDING',
          dueDate: new Date('2024-02-01'),
          assignedEmployees: [mockEmployee]
        }
      ];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      await taskController.getEmployeeTasks(mockReq, mockRes);

      // Assert
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'EMP001',
          empRole: 'employee',
          isActive: true
        },
        select: { id: true, empName: true, empEmail: true }
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          assignedEmployees: {
            some: {
              id: 'EMP001'
            }
          },
          isActive: true
        },
        include: {
          assignedEmployees: {
            select: {
              id: true,
              empName: true,
              empEmail: true,
              empTechnology: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee tasks retrieved successfully',
        employee: mockEmployee,
        data: mockTasks,
        total: mockTasks.length
      });
    });

    it('should return 404 when employee not found', async () => {
      // Arrange
      mockReq.params = { empId: 'NONEXISTENT' };

      prisma.employee.findUnique.mockResolvedValue(null);

      // Act
      await taskController.getEmployeeTasks(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found or not authorized'
      });
    });

    it('should filter tasks by status', async () => {
      // Arrange
      mockReq.params = { empId: 'EMP001' };
      mockReq.query = { status: 'pending' };

      const mockEmployee = { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com' };
      const mockTasks = [];

      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      await taskController.getEmployeeTasks(mockReq, mockRes);

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          assignedEmployees: {
            some: {
              id: 'EMP001'
            }
          },
          isActive: true,
          status: 'PENDING'
        },
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };
      mockReq.body = {
        status: 'IN_PROGRESS',
        empId: 'EMP001'
      };

      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        assignedEmployees: [
          { id: 'EMP001', empRole: 'employee' }
        ]
      };

      const mockUpdatedTask = {
        ...mockTask,
        status: 'IN_PROGRESS',
        assignedEmployees: [
          { id: 'EMP001', empName: 'John Doe', empEmail: 'john@example.com', empTechnology: 'JavaScript' }
        ]
      };

      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue(mockUpdatedTask);

      // Act
      await taskController.updateTaskStatus(mockReq, mockRes);

      // Assert
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task1',
          isActive: true,
          assignedEmployees: {
            some: {
              id: 'EMP001',
              empRole: 'employee'
            }
          }
        }
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task1' },
        data: { status: 'IN_PROGRESS' },
        include: {
          assignedEmployees: {
            select: {
              id: true,
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
        message: 'Task status updated successfully',
        task: mockUpdatedTask
      });
    });

    it('should return 400 when status is missing', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };
      mockReq.body = { empId: 'EMP001' };

      // Act
      await taskController.updateTaskStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status is required'
      });
    });

    it('should return 400 when status is invalid', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };
      mockReq.body = {
        status: 'INVALID_STATUS',
        empId: 'EMP001'
      };

      // Act
      await taskController.updateTaskStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid status. Must be PENDING, IN_PROGRESS, or COMPLETED'
      });
    });

    it('should return 404 when task not found or not assigned', async () => {
      // Arrange
      mockReq.params = { taskId: 'task1' };
      mockReq.body = {
        status: 'IN_PROGRESS',
        empId: 'EMP001'
      };

      prisma.task.findFirst.mockResolvedValue(null);

      // Act
      await taskController.updateTaskStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    });
  });
});


