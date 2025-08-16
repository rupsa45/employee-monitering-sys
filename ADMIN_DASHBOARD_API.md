# Admin Dashboard API Documentation

## Overview
The Admin Dashboard API provides comprehensive endpoints for employee management, analytics, and real-time monitoring. All endpoints require admin authentication.

## Base URL
```
http://localhost:9000/admin/dashboard
```

## Authentication
All endpoints require a valid admin JWT token in the Authorization header:
```
Authorization: Bearer <your-admin-token>
```

## Endpoints

### 1. Dashboard Overview
**GET** `/overview`

Returns a comprehensive overview of the system including summary statistics and recent activities.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard overview retrieved successfully",
  "data": {
    "summary": {
      "totalEmployees": 25,
      "todayAttendance": 20,
      "weekAttendance": 120,
      "pendingLeaves": 3,
      "activeTasks": 15
    },
    "recentActivities": [
      {
        "id": "timesheet123",
        "clockIn": "09:00",
        "clockOut": "17:00",
        "status": "PRESENT",
        "employee": {
          "empName": "John Doe",
          "empEmail": "john@example.com",
          "empTechnology": "JavaScript"
        }
      }
    ]
  }
}
```

### 2. Employee Management
**GET** `/employees`

Returns paginated list of employees with filtering and search capabilities.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or email
- `technology` (optional): Filter by technology
- `status` (optional): Filter by status

**Example Request:**
```
GET /admin/dashboard/employees?page=1&limit=10&search=john&technology=JavaScript
```

**Response:**
```json
{
  "success": true,
  "message": "Employee management data retrieved successfully",
  "data": {
    "employees": [
      {
        "id": "emp123",
        "empName": "John Doe",
        "empEmail": "john@example.com",
        "empPhone": "+1234567890",
        "empTechnology": "JavaScript",
        "empGender": "MALE",
        "empProfile": "profile.jpg",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "status": {
          "isClockedIn": true,
          "hasPendingLeave": false,
          "hasActiveTask": true,
          "attendanceStatus": "PRESENT"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalEmployees": 25,
      "limit": 10
    },
    "technologyStats": [
      {
        "empTechnology": "JavaScript",
        "_count": {
          "empTechnology": 10
        }
      }
    ]
  }
}
```

### 3. Attendance Analytics
**GET** `/attendance`

Returns detailed attendance analytics with filtering by date range and employee.

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `employeeId` (optional): Specific employee ID

**Example Request:**
```
GET /admin/dashboard/attendance?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance analytics retrieved successfully",
  "data": {
    "summary": {
      "totalDays": 200,
      "presentDays": 180,
      "absentDays": 15,
      "lateDays": 3,
      "halfDays": 2,
      "attendanceRate": "90.00"
    },
    "dailyBreakdown": {
      "2024-01-01": {
        "present": 20,
        "absent": 2,
        "late": 1,
        "halfDay": 0,
        "total": 23
      }
    },
    "employeeAttendance": [
      {
        "empName": "John Doe",
        "empEmail": "john@example.com",
        "empTechnology": "JavaScript",
        "present": 20,
        "absent": 1,
        "late": 0,
        "halfDay": 0,
        "total": 21
      }
    ]
  }
}
```

### 4. Task Management
**GET** `/tasks`

Returns task management data with filtering and statistics.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH)
- `assignedTo` (optional): Filter by assigned employee ID

**Example Request:**
```
GET /admin/dashboard/tasks?status=PENDING&priority=HIGH
```

**Response:**
```json
{
  "success": true,
  "message": "Task management data retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "task123",
        "title": "Implement User Authentication",
        "description": "Add JWT authentication to the API",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "dueDate": "2024-02-01T00:00:00Z",
        "assignedEmployees": [
          {
            "id": "emp123",
            "empName": "John Doe",
            "empEmail": "john@example.com",
            "empTechnology": "JavaScript"
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalTasks": 15,
      "limit": 10
    },
    "statistics": {
      "statusDistribution": [
        {
          "status": "PENDING",
          "_count": {
            "status": 5
          }
        }
      ],
      "priorityDistribution": [
        {
          "priority": "HIGH",
          "_count": {
            "priority": 8
          }
        }
      ]
    }
  }
}
```

### 5. Leave Management
**GET** `/leaves`

Returns leave management data with filtering and statistics.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)
- `leaveType` (optional): Filter by leave type (CASUAL, SICK, OTHER)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Example Request:**
```
GET /admin/dashboard/leaves?status=PENDING&leaveType=CASUAL
```

**Response:**
```json
{
  "success": true,
  "message": "Leave management data retrieved successfully",
  "data": {
    "leaves": [
      {
        "id": "leave123",
        "leaveType": "CASUAL",
        "status": "PENDING",
        "startDate": "2024-02-01T00:00:00Z",
        "endDate": "2024-02-03T00:00:00Z",
        "duration": 3,
        "message": "Family vacation",
        "employee": {
          "empName": "John Doe",
          "empEmail": "john@example.com",
          "empTechnology": "JavaScript"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalLeaves": 3,
      "limit": 10
    },
    "statistics": {
      "statusDistribution": [
        {
          "status": "PENDING",
          "_count": {
            "status": 3
          }
        }
      ],
      "leaveTypeDistribution": [
        {
          "leaveType": "CASUAL",
          "_count": {
            "leaveType": 2
          }
        }
      ]
    }
  }
}
```

### 6. Performance Analytics
**GET** `/performance`

Returns performance analytics for employees with detailed metrics.

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `employeeId` (optional): Specific employee ID

**Example Request:**
```
GET /admin/dashboard/performance?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "message": "Performance analytics retrieved successfully",
  "data": {
    "attendance": {
      "totalDays": 200,
      "presentDays": 180,
      "absentDays": 15,
      "lateDays": 3,
      "attendanceRate": "90.00"
    },
    "tasks": {
      "totalAssigned": 50,
      "completed": 40,
      "inProgress": 8,
      "pending": 2,
      "completionRate": "80.00"
    },
    "productivity": {
      "averageWorkHours": "8.5",
      "totalWorkHours": 1700
    },
    "employeePerformance": [
      {
        "empName": "John Doe",
        "empEmail": "john@example.com",
        "empTechnology": "JavaScript",
        "attendance": {
          "present": 20,
          "absent": 1,
          "late": 0,
          "total": 21
        },
        "tasks": {
          "completed": 15,
          "inProgress": 2,
          "pending": 1,
          "total": 18
        },
        "workHours": 168
      }
    ]
  }
}
```

### 7. Real-time Monitoring
**GET** `/monitoring`

Returns real-time monitoring data including online employees and recent activities.

**Response:**
```json
{
  "success": true,
  "message": "Real-time monitoring data retrieved successfully",
  "data": {
    "currentTime": "2024-01-15T10:30:00Z",
    "onlineEmployees": [
      {
        "empName": "John Doe",
        "empEmail": "john@example.com",
        "empTechnology": "JavaScript",
        "clockInTime": "09:00",
        "workHours": 1.5
      }
    ],
    "onBreakEmployees": [
      {
        "empName": "Jane Smith",
        "empEmail": "jane@example.com",
        "empTechnology": "Python",
        "breakStartTime": "12:00",
        "breakDuration": 30
      }
    ],
    "recentActivities": [
      {
        "empName": "John Doe",
        "empEmail": "john@example.com",
        "action": "Clock In",
        "timestamp": "2024-01-15T09:00:00Z"
      }
    ],
    "systemStats": {
      "totalEmployees": 25,
      "todayAttendance": 20,
      "onlineCount": 15,
      "onBreakCount": 3,
      "pendingTasks": 5,
      "pendingLeaves": 2
    }
  }
}
```

## Error Responses

### Authentication Error
```json
{
  "success": false,
  "message": "Authentication Error!"
}
```

### Authorization Error
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

### Server Error
```json
{
  "success": false,
  "message": "Error retrieving dashboard data",
  "error": "Database connection failed"
}
```

## Usage Examples

### 1. Get Dashboard Overview
```bash
curl -X GET "http://localhost:9000/admin/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Search Employees
```bash
curl -X GET "http://localhost:9000/admin/dashboard/employees?search=john&technology=JavaScript" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Get Attendance Analytics
```bash
curl -X GET "http://localhost:9000/admin/dashboard/attendance?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Get Real-time Monitoring
```bash
curl -X GET "http://localhost:9000/admin/dashboard/monitoring" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Features

### ✅ **Dashboard Overview**
- Total employees count
- Today's and weekly attendance
- Pending leave requests
- Active tasks count
- Recent activities

### ✅ **Employee Management**
- Paginated employee list
- Search by name/email
- Filter by technology
- Real-time status (clocked in, on break, etc.)
- Technology distribution statistics

### ✅ **Attendance Analytics**
- Date range filtering
- Employee-specific analytics
- Daily breakdown
- Attendance rate calculation
- Employee-wise attendance summary

### ✅ **Task Management**
- Task list with pagination
- Status and priority filtering
- Assigned employee filtering
- Task statistics and distribution
- Priority analysis

### ✅ **Leave Management**
- Leave requests with pagination
- Status and type filtering
- Date range filtering
- Leave statistics
- Duration calculation

### ✅ **Performance Analytics**
- Attendance performance
- Task completion rates
- Productivity metrics
- Employee-wise performance
- Work hours analysis

### ✅ **Real-time Monitoring**
- Currently online employees
- Employees on break
- Recent activities (last 30 minutes)
- System statistics
- Live status updates

## Authentication Setup

To use these endpoints, you need to:

1. **Register an admin:**
```bash
POST /admin/adminRegister
{
  "empName": "Admin User",
  "empEmail": "admin@example.com",
  "empPhone": "1234567890",
  "empPassword": "password123",
  "confirmPassword": "password123",
  "empTechnology": "Management",
  "empGender": "MALE"
}
```

2. **Login to get token:**
```bash
POST /admin/adminLogin
{
  "empEmail": "admin@example.com",
  "empPassword": "password123"
}
```

3. **Use the token in all dashboard requests:**
```bash
Authorization: Bearer <token-from-login>
```

## Notes

- All endpoints require admin authentication
- Pagination is available for list endpoints
- Date filters use ISO 8601 format (YYYY-MM-DD)
- All timestamps are in ISO 8601 format
- Error responses include detailed error messages
- Real-time monitoring updates every 30 seconds
- Performance analytics default to current month if no date range provided

