// Test data fixtures for employee monitoring system

// Employee test data
const testEmployees = {
  validEmployee: {
    empId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    password: 'TestPassword123!',
    phone: '+1234567890',
    department: 'Engineering',
    position: 'Software Developer',
    joiningDate: '2023-01-15',
    salary: 75000,
    status: 'active'
  },
  
  invalidEmployee: {
    empId: '',
    firstName: '',
    email: 'invalid-email',
    password: 'weak'
  },
  
  adminEmployee: {
    empId: 'ADMIN001',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@company.com',
    password: 'AdminPassword123!',
    phone: '+1234567890',
    department: 'IT',
    position: 'System Administrator',
    joiningDate: '2022-01-01',
    salary: 90000,
    status: 'active',
    role: 'admin'
  }
};

// Time sheet test data
const testTimeSheets = {
  validTimeSheet: {
    empId: 'EMP001',
    date: '2024-01-15',
    checkIn: '09:00:00',
    checkOut: '17:00:00',
    totalHours: 8,
    status: 'completed'
  },
  
  partialTimeSheet: {
    empId: 'EMP001',
    date: '2024-01-16',
    checkIn: '09:00:00',
    checkOut: null,
    totalHours: null,
    status: 'active'
  }
};

// Leave request test data
const testLeaveRequests = {
  validLeaveRequest: {
    empId: 'EMP001',
    leaveType: 'annual',
    startDate: '2024-02-01',
    endDate: '2024-02-03',
    reason: 'Family vacation',
    status: 'pending'
  },
  
  approvedLeaveRequest: {
    empId: 'EMP001',
    leaveType: 'sick',
    startDate: '2024-01-20',
    endDate: '2024-01-21',
    reason: 'Not feeling well',
    status: 'approved',
    approvedBy: 'ADMIN001',
    approvedAt: new Date().toISOString()
  }
};

// Task test data
const testTasks = {
  validTask: {
    title: 'Implement user authentication',
    description: 'Create login and registration system',
    assignedTo: 'EMP001',
    assignedBy: 'ADMIN001',
    priority: 'high',
    status: 'in-progress',
    dueDate: '2024-02-15'
  },
  
  completedTask: {
    title: 'Database setup',
    description: 'Set up PostgreSQL database',
    assignedTo: 'EMP001',
    assignedBy: 'ADMIN001',
    priority: 'medium',
    status: 'completed',
    dueDate: '2024-01-10',
    completedAt: new Date().toISOString()
  }
};

// Notification test data
const testNotifications = {
  validNotification: {
    empId: 'EMP001',
    title: 'New task assigned',
    message: 'You have been assigned a new task',
    type: 'task',
    status: 'unread'
  },
  
  readNotification: {
    empId: 'EMP001',
    title: 'Leave approved',
    message: 'Your leave request has been approved',
    type: 'leave',
    status: 'read',
    readAt: new Date().toISOString()
  }
};

// Authentication test data
const testAuth = {
  validLogin: {
    empEmail: 'john.doe@company.com',
    empPassword: 'TestPassword123!'
  },
  
  invalidLogin: {
    empEmail: 'john.doe@company.com',
    empPassword: 'WrongPassword'
  },
  
  validToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBJZCI6IkVNUDAwMSIsImlhdCI6MTcwNTQ0NzIwMCwiZXhwIjoxNzA1NTMzNjAwfQ.test-signature'
};

// Mock responses
const mockResponses = {
  success: {
    success: true,
    message: 'Operation completed successfully',
    data: {}
  },
  
  error: {
    success: false,
    message: 'An error occurred',
    error: 'Test error message'
  },
  
  validationError: {
    success: false,
    message: 'Validation failed',
    errors: [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password must be at least 8 characters' }
    ]
  }
};

module.exports = {
  testEmployees,
  testTimeSheets,
  testLeaveRequests,
  testTasks,
  testNotifications,
  testAuth,
  mockResponses
};
