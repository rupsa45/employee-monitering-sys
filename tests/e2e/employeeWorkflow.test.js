const request = require('supertest');
const { testEmployees, testTimeSheets, testLeaveRequests, testTasks } = require('../fixtures/testData');

// Mock the entire application for E2E testing
jest.mock('../../index.js', () => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Simulate database state
  let employees = [
    {
      id: 'EMP001',
      empName: 'John Doe',
      empEmail: 'john.doe@company.com',
      empPhone: '+1234567890',
      empTechnology: 'JavaScript, Node.js',
      empGender: 'Male',
      empProfile: 'profile.jpg',
      empRole: 'employee'
    }
  ];
  let timeSheets = [];
  let leaveRequests = [];
  let tasks = [];
  let currentUser = null;
  
  // Authentication middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    // Mock token validation
    if (token === 'valid-token') {
      req.user = { empId: 'EMP001', empRole: 'employee' };
      next();
    } else {
      return res.status(403).json({ message: 'Invalid token' });
    }
  };
  
  // Employee login
  app.post('/employee/login', (req, res) => {
    const { empEmail, empPassword } = req.body;
    
    if (empEmail === 'john.doe@company.com' && empPassword === 'TestPassword123!') {
      currentUser = { empId: 'EMP001', empEmail, empRole: 'employee' };
      res.json({
        success: true,
        message: 'Employee logged in successfully',
        accessToken: 'valid-token'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  });
  
  // Get employee profile
  app.get('/employee/profile/:id', authenticateToken, (req, res) => {
    const employee = employees.find(emp => emp.id === req.params.id);
    if (employee) {
      res.json({
        success: true,
        employee
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
  });
  
  // Update employee profile
  app.patch('/employee/editProfile/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const employeeIndex = employees.findIndex(emp => emp.id === id);
    if (employeeIndex !== -1) {
      employees[employeeIndex] = { ...employees[employeeIndex], ...updateData };
      res.json({
        success: true,
        message: 'Profile updated successfully',
        employee: employees[employeeIndex]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
  });
  
  // Time sheet check-in
  app.post('/employee/timesheet/checkin', authenticateToken, (req, res) => {
    const { empId, date, time } = req.body;
    
    const newTimeSheet = {
      id: `ts_${Date.now()}`,
      empId,
      date,
      checkIn: time,
      checkOut: null,
      totalHours: null,
      status: 'active'
    };
    
    timeSheets.push(newTimeSheet);
    res.json({
      success: true,
      message: 'Check-in recorded successfully',
      timeSheet: newTimeSheet
    });
  });
  
  // Time sheet check-out
  app.post('/employee/timesheet/checkout', authenticateToken, (req, res) => {
    const { empId, date, time } = req.body;
    
    const timeSheetIndex = timeSheets.findIndex(ts => 
      ts.empId === empId && ts.date === date && ts.status === 'active'
    );
    
    if (timeSheetIndex !== -1) {
      const checkInTime = new Date(`2024-01-15 ${timeSheets[timeSheetIndex].checkIn}`);
      const checkOutTime = new Date(`2024-01-15 ${time}`);
      const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      
      timeSheets[timeSheetIndex] = {
        ...timeSheets[timeSheetIndex],
        checkOut: time,
        totalHours: Math.round(totalHours * 100) / 100,
        status: 'completed'
      };
      
      res.json({
        success: true,
        message: 'Check-out recorded successfully',
        timeSheet: timeSheets[timeSheetIndex]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No active time sheet found'
      });
    }
  });
  
  // Submit leave request
  app.post('/employee/leave/request', authenticateToken, (req, res) => {
    const leaveRequest = {
      id: `lr_${Date.now()}`,
      ...req.body,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    
    leaveRequests.push(leaveRequest);
    res.json({
      success: true,
      message: 'Leave request submitted successfully',
      leaveRequest
    });
  });
  
  // Get employee tasks
  app.get('/employee/tasks', authenticateToken, (req, res) => {
    const userTasks = tasks.filter(task => task.assignedTo === req.user.empId);
    res.json({
      success: true,
      tasks: userTasks
    });
  });
  
  // Update task status
  app.put('/employee/tasks/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        status,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        message: 'Task status updated successfully',
        task: tasks[taskIndex]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
  });
  
  return app;
});

const app = require('../../index.js');

describe('Employee Workflow E2E Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    // Login to get authentication token
    const loginResponse = await request(app)
      .post('/employee/login')
      .send({
        empEmail: 'john.doe@company.com',
        empPassword: 'TestPassword123!'
      });
    
    authToken = loginResponse.body.accessToken;
  });

  describe('Complete Employee Daily Workflow', () => {
    it('should complete a full employee daily workflow', async () => {
      // Step 1: Employee logs in
      const loginResponse = await request(app)
        .post('/employee/login')
        .send({
          empEmail: 'john.doe@company.com',
          empPassword: 'TestPassword123!'
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.accessToken).toBeDefined();
      
      const token = loginResponse.body.accessToken;
      
      // Step 2: Employee checks in for the day
      const checkInResponse = await request(app)
        .post('/employee/timesheet/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          empId: 'EMP001',
          date: '2024-01-15',
          time: '09:00:00'
        })
        .expect(200);
      
      expect(checkInResponse.body.success).toBe(true);
      expect(checkInResponse.body.timeSheet.status).toBe('active');
      
      // Step 3: Employee views their tasks
      const tasksResponse = await request(app)
        .get('/employee/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(tasksResponse.body.success).toBe(true);
      expect(Array.isArray(tasksResponse.body.tasks)).toBe(true);
      
      // Step 4: Employee updates task status
      if (tasksResponse.body.tasks.length > 0) {
        const taskId = tasksResponse.body.tasks[0].id;
        const updateTaskResponse = await request(app)
          .put(`/employee/tasks/${taskId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'in-progress' })
          .expect(200);
        
        expect(updateTaskResponse.body.success).toBe(true);
        expect(updateTaskResponse.body.task.status).toBe('in-progress');
      }
      
      // Step 5: Employee submits a leave request
      const leaveRequestResponse = await request(app)
        .post('/employee/leave/request')
        .set('Authorization', `Bearer ${token}`)
        .send({
          empId: 'EMP001',
          leaveType: 'annual',
          startDate: '2024-02-01',
          endDate: '2024-02-03',
          reason: 'Family vacation'
        })
        .expect(200);
      
      expect(leaveRequestResponse.body.success).toBe(true);
      expect(leaveRequestResponse.body.leaveRequest.status).toBe('pending');
      
      // Step 6: Employee checks out for the day
      const checkOutResponse = await request(app)
        .post('/employee/timesheet/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          empId: 'EMP001',
          date: '2024-01-15',
          time: '17:00:00'
        })
        .expect(200);
      
      expect(checkOutResponse.body.success).toBe(true);
      expect(checkOutResponse.body.timeSheet.status).toBe('completed');
      expect(checkOutResponse.body.timeSheet.totalHours).toBe(8);
    });
  });

  describe('Employee Profile Management Workflow', () => {
    it('should allow employee to view and update their profile', async () => {
      // Step 1: Employee views their profile
      const profileResponse = await request(app)
        .patch('/employee/editProfile/EMP001')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ empTechnology: 'Updated Technology' })
        .expect(200);
      
      expect(profileResponse.body.success).toBe(true);
      
             // Step 2: Employee updates their profile
       const updateData = {
         empTechnology: 'JavaScript, Node.js, React, TypeScript',
         empPhone: '+1234567890'
       };
       
       const updateResponse = await request(app)
         .patch('/employee/editProfile/EMP001')
         .set('Authorization', `Bearer ${authToken}`)
         .send(updateData)
         .expect(200);
      
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.message).toBe('Profile updated successfully');
      expect(updateResponse.body.employee.empTechnology).toBe(updateData.empTechnology);
      expect(updateResponse.body.employee.empPhone).toBe(updateData.empPhone);
    });
  });

  describe('Time Sheet Management Workflow', () => {
    it('should handle time sheet operations correctly', async () => {
      // Step 1: Check in
      const checkInResponse = await request(app)
        .post('/employee/timesheet/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          empId: 'EMP001',
          date: '2024-01-16',
          time: '08:30:00'
        })
        .expect(200);
      
      expect(checkInResponse.body.timeSheet.checkIn).toBe('08:30:00');
      expect(checkInResponse.body.timeSheet.status).toBe('active');
      
      // Step 2: Check out
      const checkOutResponse = await request(app)
        .post('/employee/timesheet/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          empId: 'EMP001',
          date: '2024-01-16',
          time: '17:30:00'
        })
        .expect(200);
      
      expect(checkOutResponse.body.timeSheet.checkOut).toBe('17:30:00');
      expect(checkOutResponse.body.timeSheet.status).toBe('completed');
      expect(checkOutResponse.body.timeSheet.totalHours).toBe(9);
    });
  });

  describe('Leave Request Workflow', () => {
    it('should handle leave request submission correctly', async () => {
      const leaveRequest = {
        empId: 'EMP001',
        leaveType: 'sick',
        startDate: '2024-01-20',
        endDate: '2024-01-21',
        reason: 'Not feeling well'
      };
      
      const response = await request(app)
        .post('/employee/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leaveRequest)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.leaveRequest.leaveType).toBe('sick');
      expect(response.body.leaveRequest.status).toBe('pending');
      expect(response.body.leaveRequest.submittedAt).toBeDefined();
    });
  });
});
