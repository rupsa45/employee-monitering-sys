const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://go.tellistechnologies.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mock admin login to generate a token
app.post('/admin/adminLogin', (req, res) => {
  const { empEmail, empPassword } = req.body;
  
  // Mock admin credentials for testing
  if (empEmail === 'admin@test.com' && empPassword === 'password123') {
    const token = jwt.sign(
      {
        userData: {
          empId: 'admin123',
          empEmail: 'admin@test.com',
          empRole: 'admin'
        }
      },
      '11379211', // Using the same SECRET_KEY from your .env
      { expiresIn: '1h' }
    );
    
    res.json({
      success: true,
      message: 'Admin logged in successfully',
      accessToken: token
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Mock dashboard endpoints for testing
app.get('/admin/dashboard/overview', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard overview retrieved successfully',
    data: {
      summary: {
        totalEmployees: 25,
        todayAttendance: 20,
        weekAttendance: 120,
        pendingLeaves: 3,
        activeTasks: 15
      },
      recentActivities: [
        {
          id: 'timesheet123',
          clockIn: '09:00',
          clockOut: '17:00',
          status: 'PRESENT',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ]
    }
  });
});

app.get('/admin/dashboard/employees', (req, res) => {
  const { page = 1, limit = 10, search, technology } = req.query;
  
  res.json({
    success: true,
    message: 'Employee management data retrieved successfully',
    data: {
      employees: [
        {
          id: 'emp123',
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empPhone: '+1234567890',
          empTechnology: 'JavaScript',
          empGender: 'MALE',
          empProfile: 'profile.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          status: {
            isClockedIn: true,
            hasPendingLeave: false,
            hasActiveTask: true,
            attendanceStatus: 'PRESENT'
          }
        }
      ],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 3,
        totalEmployees: 25,
        limit: parseInt(limit)
      },
      technologyStats: [
        {
          empTechnology: 'JavaScript',
          _count: {
            empTechnology: 10
          }
        }
      ]
    }
  });
});

app.get('/admin/dashboard/attendance', (req, res) => {
  res.json({
    success: true,
    message: 'Attendance analytics retrieved successfully',
    data: {
      summary: {
        totalDays: 200,
        presentDays: 180,
        absentDays: 15,
        lateDays: 3,
        halfDays: 2,
        attendanceRate: '90.00'
      },
      dailyBreakdown: {
        '2024-01-01': {
          present: 20,
          absent: 2,
          late: 1,
          halfDay: 0,
          total: 23
        }
      },
      employeeAttendance: [
        {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript',
          present: 20,
          absent: 1,
          late: 0,
          halfDay: 0,
          total: 21
        }
      ]
    }
  });
});

app.get('/admin/dashboard/tasks', (req, res) => {
  res.json({
    success: true,
    message: 'Task management data retrieved successfully',
    data: {
      tasks: [
        {
          id: 'task123',
          title: 'Implement User Authentication',
          description: 'Add JWT authentication to the API',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: '2024-02-01T00:00:00Z',
          assignedEmployees: [
            {
              id: 'emp123',
              empName: 'John Doe',
              empEmail: 'john@example.com',
              empTechnology: 'JavaScript'
            }
          ]
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 2,
        totalTasks: 15,
        limit: 10
      },
      statistics: {
        statusDistribution: [
          {
            status: 'PENDING',
            _count: {
              status: 5
            }
          }
        ],
        priorityDistribution: [
          {
            priority: 'HIGH',
            _count: {
              priority: 8
            }
          }
        ]
      }
    }
  });
});

app.get('/admin/dashboard/leaves', (req, res) => {
  res.json({
    success: true,
    message: 'Leave management data retrieved successfully',
    data: {
      leaves: [
        {
          id: 'leave123',
          leaveType: 'CASUAL',
          status: 'PENDING',
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-02-03T00:00:00Z',
          duration: 3,
          message: 'Family vacation',
          employee: {
            empName: 'John Doe',
            empEmail: 'john@example.com',
            empTechnology: 'JavaScript'
          }
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalLeaves: 3,
        limit: 10
      },
      statistics: {
        statusDistribution: [
          {
            status: 'PENDING',
            _count: {
              status: 3
            }
          }
        ],
        leaveTypeDistribution: [
          {
            leaveType: 'CASUAL',
            _count: {
              leaveType: 2
            }
          }
        ]
      }
    }
  });
});

app.get('/admin/dashboard/performance', (req, res) => {
  res.json({
    success: true,
    message: 'Performance analytics retrieved successfully',
    data: {
      attendance: {
        totalDays: 200,
        presentDays: 180,
        absentDays: 15,
        lateDays: 3,
        attendanceRate: '90.00'
      },
      tasks: {
        totalAssigned: 50,
        completed: 40,
        inProgress: 8,
        pending: 2,
        completionRate: '80.00'
      },
      productivity: {
        averageWorkHours: '8.5',
        totalWorkHours: 1700
      },
      employeePerformance: [
        {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript',
          attendance: {
            present: 20,
            absent: 1,
            late: 0,
            total: 21
          },
          tasks: {
            completed: 15,
            inProgress: 2,
            pending: 1,
            total: 18
          },
          workHours: 168
        }
      ]
    }
  });
});

app.get('/admin/dashboard/monitoring', (req, res) => {
  res.json({
    success: true,
    message: 'Real-time monitoring data retrieved successfully',
    data: {
      currentTime: new Date().toISOString(),
      onlineEmployees: [
        {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          empTechnology: 'JavaScript',
          clockInTime: '09:00',
          workHours: 1.5
        }
      ],
      onBreakEmployees: [
        {
          empName: 'Jane Smith',
          empEmail: 'jane@example.com',
          empTechnology: 'Python',
          breakStartTime: '12:00',
          breakDuration: 30
        }
      ],
      recentActivities: [
        {
          empName: 'John Doe',
          empEmail: 'john@example.com',
          action: 'Clock In',
          timestamp: new Date().toISOString()
        }
      ],
      systemStats: {
        totalEmployees: 25,
        todayAttendance: 20,
        onlineCount: 15,
        onBreakCount: 3,
        pendingTasks: 5,
        pendingLeaves: 2
      }
    }
  });
});

const PORT = 9000;

app.listen(PORT, () => {
  console.log(`Dashboard test server running on http://localhost:${PORT}`);
  console.log('');
  console.log('=== Test Steps ===');
  console.log('1. Get admin token:');
  console.log('   POST http://localhost:9000/admin/adminLogin');
  console.log('   Body: { "empEmail": "admin@test.com", "empPassword": "password123" }');
  console.log('');
  console.log('2. Test dashboard endpoints:');
  console.log('   GET http://localhost:9000/admin/dashboard/overview');
  console.log('   GET http://localhost:9000/admin/dashboard/employees');
  console.log('   GET http://localhost:9000/admin/dashboard/attendance');
  console.log('   GET http://localhost:9000/admin/dashboard/tasks');
  console.log('   GET http://localhost:9000/admin/dashboard/leaves');
  console.log('   GET http://localhost:9000/admin/dashboard/performance');
  console.log('   GET http://localhost:9000/admin/dashboard/monitoring');
  console.log('');
  console.log('3. Add Authorization header to all requests:');
  console.log('   Authorization: Bearer <token-from-step-1>');
});





