# Postman Testing Guide for Employee Timesheet Routes

## Overview
This guide provides step-by-step instructions for testing the employee timesheet functionality using Postman. The timesheet system includes clock-in, clock-out, break management, and status checking features.

## Base URL
```
http://localhost:3000/timeSheet
```

## Authentication Requirements
All timesheet endpoints require:
1. **JWT Token** in the Authorization header: `Bearer <your-jwt-token>`
2. **Employee Role** - Only employees can access these endpoints

## Prerequisites
1. **Employee Account**: You need a valid employee account in the database
2. **JWT Token**: Obtain a valid JWT token by logging in as an employee
3. **Employee ID**: Know the employee ID you want to test with

## Step 1: Get Authentication Token

### Login as Employee
**Endpoint:** `POST http://localhost:3000/employee/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
    "empEmail": "employee@company.com",
    "empPassword": "your_password"
}
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Login successful!",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userData": {
        "id": "EMP001",
        "empName": "John Doe",
        "empEmail": "employee@company.com"
    }
}
```

**Save the token** for use in subsequent requests.

## Step 2: Test Timesheet Endpoints

### 1. Get Current Status
**Purpose:** Check if employee is currently clocked in and on break

**Endpoint:** `GET http://localhost:3000/timeSheet/currentStatus/{employeeId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `GET http://localhost:3000/timeSheet/currentStatus/EMP001`

**Expected Response (Not Clocked In):**
```json
{
    "success": true,
    "message": "No timesheet found for today",
    "data": {
        "isClockedIn": false,
        "isOnBreak": false,
        "clockInTime": null,
        "breakStartTime": null,
        "totalBreakTime": 0
    }
}
```

**Expected Response (Clocked In):**
```json
{
    "success": true,
    "message": "Current status retrieved successfully",
    "data": {
        "isClockedIn": true,
        "isOnBreak": false,
        "clockInTime": "2024-01-15 09:00:00",
        "breakStartTime": null,
        "totalBreakTime": 0
    }
}
```

### 2. Clock In
**Purpose:** Start the work day for an employee

**Endpoint:** `GET http://localhost:3000/timeSheet/clockIn/{employeeId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `GET http://localhost:3000/timeSheet/clockIn/EMP001`

**Expected Response (Success):**
```json
{
    "success": true,
    "message": "Clock in successful!",
    "clockInTime": "2024-01-15 09:00:00"
}
```

**Expected Response (Already Clocked In):**
```json
{
    "success": false,
    "message": "Already clocked in today"
}
```

### 3. Start Break
**Purpose:** Start a break during work hours

**Endpoint:** `POST http://localhost:3000/timeSheet/breakStart/{timesheetId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `POST http://localhost:3000/timeSheet/breakStart/1`

**Expected Response (Success):**
```json
{
    "success": true,
    "message": "Break started successfully!",
    "breakStartTime": "2024-01-15 12:00:00"
}
```

**Expected Response (Break Already Started):**
```json
{
    "success": false,
    "message": "Break already started. Please end current break first."
}
```

### 4. End Break
**Purpose:** End the current break

**Endpoint:** `POST http://localhost:3000/timeSheet/breakEnd/{timesheetId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `POST http://localhost:3000/timeSheet/breakEnd/1`

**Expected Response (Success):**
```json
{
    "success": true,
    "message": "Break ended successfully!",
    "breakEndTime": "2024-01-15 12:30:00",
    "breakDuration": 30
}
```

**Expected Response (No Break Started):**
```json
{
    "success": false,
    "message": "No break started. Please start a break first."
}
```

### 5. Clock Out
**Purpose:** End the work day for an employee

**Endpoint:** `PATCH http://localhost:3000/timeSheet/clockOut/{employeeId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `PATCH http://localhost:3000/timeSheet/clockOut/EMP001`

**Expected Response (Success):**
```json
{
    "success": true,
    "message": "Clock out successful!",
    "clockOutTime": "2024-01-15 17:00:00",
    "workHours": 8.0
}
```

**Expected Response (Not Clocked In):**
```json
{
    "success": false,
    "message": "Please clock in first"
}
```

**Expected Response (Already Clocked Out):**
```json
{
    "success": false,
    "message": "Already clocked out today"
}
```

## Complete Testing Workflow

### Scenario 1: Full Work Day with Break
1. **Get Current Status** - Verify employee is not clocked in
2. **Clock In** - Start the work day
3. **Get Current Status** - Verify employee is clocked in
4. **Start Break** - Begin lunch break
5. **Get Current Status** - Verify employee is on break
6. **End Break** - End lunch break
7. **Get Current Status** - Verify employee is back to work
8. **Clock Out** - End the work day
9. **Get Current Status** - Verify employee is clocked out

### Scenario 2: Error Handling
1. **Try to Clock Out without Clocking In** - Should return error
2. **Try to Clock In Twice** - Should return "Already clocked in" error
3. **Try to Start Break without Clocking In** - Should return error
4. **Try to End Break without Starting One** - Should return error

## Important Notes

### Timesheet ID vs Employee ID
- **Clock In/Out/Current Status**: Use `employeeId` (e.g., "EMP001")
- **Break Start/End**: Use `timesheetId` (numeric ID from database)

### How to Get Timesheet ID
After clocking in, you can find the timesheet ID by:
1. Checking the database directly
2. Using admin endpoints to view employee timesheets
3. The timesheet ID is typically a sequential number (1, 2, 3, etc.)

### Time Calculations
- **Work Hours**: Calculated as difference between clock-in and clock-out times
- **Break Duration**: Calculated in minutes between break start and end times
- **All times**: Stored in 'YYYY-MM-DD HH:mm:ss' format

### Daily Reset
- Each day starts fresh - previous day's timesheet doesn't affect today
- You can only have one active timesheet per day per employee
- Clock-in/out status resets daily

## Common Error Responses

### 401 Unauthorized
```json
{
    "success": false,
    "message": "Authentication Error!"
}
```
**Solution:** Check your JWT token and ensure it's valid

### 403 Forbidden
```json
{
    "success": false,
    "message": "Access denied. Employee access required."
}
```
**Solution:** Ensure you're logged in as an employee, not admin

### 404 Not Found
```json
{
    "success": false,
    "message": "Timesheet not found"
}
```
**Solution:** Check if the timesheet ID exists in the database

### 500 Internal Server Error
```json
{
    "success": false,
    "message": "Error!",
    "error": "Database connection failed"
}
```
**Solution:** Check server logs and database connectivity

## Testing Tips

1. **Use Environment Variables** in Postman:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: Your JWT token
   - `employee_id`: Your employee ID

2. **Create a Collection** with all timesheet endpoints for easy testing

3. **Use Pre-request Scripts** to automatically set headers:
   ```javascript
   pm.request.headers.add({
       key: 'Authorization',
       value: 'Bearer ' + pm.environment.get('auth_token')
   });
   ```

4. **Test Edge Cases**:
   - Multiple clock-ins on same day
   - Multiple breaks
   - Clock-out without break
   - Invalid employee/timesheet IDs

5. **Monitor Logs** in your application to see detailed error messages

# Admin Timesheet Routes Testing

## Overview
This section covers the admin timesheet management endpoints that allow administrators to monitor and manage employee timesheets, view attendance summaries, and track employee activity.

## Base URL for Admin Routes
```
http://localhost:3000/admin-timesheet
```

## Authentication Requirements
All admin timesheet endpoints require:
1. **JWT Token** in the Authorization header: `Bearer <your-jwt-token>`
2. **Admin Role** - Only administrators can access these endpoints

## Prerequisites
1. **Admin Account**: You need a valid admin account in the database
2. **JWT Token**: Obtain a valid JWT token by logging in as an admin
3. **Employee Data**: Ensure there are employee timesheets in the database to view

## Step 1: Get Admin Authentication Token

### Login as Admin
**Endpoint:** `POST http://localhost:3000/admin/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
    "adminEmail": "admin@company.com",
    "adminPassword": "your_admin_password"
}
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Login successful!",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userData": {
        "id": "ADM001",
        "adminName": "Admin User",
        "adminEmail": "admin@company.com"
    }
}
```

**Save the token** for use in subsequent requests.

## Step 2: Test Admin Timesheet Endpoints

### 1. Get All Employee Timesheets
**Purpose:** Retrieve all employee timesheets with optional filtering

**Endpoint:** `GET http://localhost:3000/admin-timesheet/all-timesheets`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Query Parameters (Optional):**
- `startDate`: Start date for filtering (YYYY-MM-DD)
- `endDate`: End date for filtering (YYYY-MM-DD)
- `empId`: Specific employee ID to filter

**Example:** `GET http://localhost:3000/admin-timesheet/all-timesheets?startDate=2024-01-01&endDate=2024-01-31&empId=EMP001`

**Expected Response:**
```json
{
    "success": true,
    "message": "All employee timesheets retrieved successfully",
    "data": [
        {
            "id": 1,
            "empId": "EMP001",
            "clockIn": "2024-01-15 09:00:00",
            "clockOut": "2024-01-15 17:00:00",
            "breakStart": "2024-01-15 12:00:00",
            "breakEnd": "2024-01-15 12:30:00",
            "hoursLoggedIn": 8.0,
            "totalBreakTime": 30,
            "status": "PRESENT",
            "isActive": true,
            "createdAt": "2024-01-15T09:00:00.000Z",
            "employee": {
                "empName": "John Doe",
                "empEmail": "john.doe@company.com",
                "empTechnology": "React"
            }
        }
    ],
    "total": 1
}
```

### 2. Get Today's Attendance Summary
**Purpose:** Get a comprehensive summary of today's attendance for admin dashboard

**Endpoint:** `GET http://localhost:3000/admin-timesheet/today-summary`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example:** `GET http://localhost:3000/admin-timesheet/today-summary`

**Expected Response:**
```json
{
    "success": true,
    "message": "Today's attendance summary retrieved successfully",
    "summary": {
        "totalEmployees": 50,
        "clockedInToday": 35,
        "completedToday": 25,
        "onBreak": 5,
        "present": 30,
        "absent": 15,
        "halfDay": 3,
        "late": 2
    },
    "timeSheets": [
        {
            "id": 1,
            "empId": "EMP001",
            "clockIn": "2024-01-15 09:00:00",
            "clockOut": null,
            "status": "PRESENT",
            "employee": {
                "empName": "John Doe",
                "empEmail": "john.doe@company.com",
                "empTechnology": "React"
            }
        }
    ]
}
```

### 3. Get Employee Detailed Timesheet
**Purpose:** Get detailed timesheet information for a specific employee

**Endpoint:** `GET http://localhost:3000/admin-timesheet/employee-timesheet/{empId}`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Query Parameters (Optional):**
- `startDate`: Start date for filtering (YYYY-MM-DD)
- `endDate`: End date for filtering (YYYY-MM-DD)

**Example:** `GET http://localhost:3000/admin-timesheet/employee-timesheet/EMP001?startDate=2024-01-01&endDate=2024-01-31`

**Expected Response:**
```json
{
    "success": true,
    "message": "Employee detailed timesheet retrieved successfully",
    "data": {
        "timeSheets": [
            {
                "id": 1,
                "empId": "EMP001",
                "clockIn": "2024-01-15 09:00:00",
                "clockOut": "2024-01-15 17:00:00",
                "hoursLoggedIn": 8.0,
                "totalBreakTime": 30,
                "status": "PRESENT",
                "employee": {
                    "empName": "John Doe",
                    "empEmail": "john.doe@company.com",
                    "empTechnology": "React"
                }
            }
        ],
        "totals": {
            "totalHours": 160.0,
            "totalBreakTime": 600,
            "totalDays": 20,
            "presentDays": 18,
            "absentDays": 1,
            "halfDays": 0,
            "lateDays": 1
        },
        "employee": {
            "empName": "John Doe",
            "empEmail": "john.doe@company.com",
            "empTechnology": "React"
        }
    }
}
```

### 4. Get Employee Activity Snapshots
**Purpose:** Retrieve employee activity snapshots for monitoring

**Endpoint:** `GET http://localhost:3000/admin-timesheet/activity-snapshots`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Query Parameters (Optional):**
- `empId`: Specific employee ID to filter
- `date`: Specific date to filter (YYYY-MM-DD)

**Example:** `GET http://localhost:3000/admin-timesheet/activity-snapshots?empId=EMP001&date=2024-01-15`

**Expected Response:**
```json
{
    "success": true,
    "message": "Employee activity snapshots retrieved successfully",
    "data": [
        {
            "id": 1,
            "empId": "EMP001",
            "date": "2024-01-15T00:00:00.000Z",
            "lastActivity": "2024-01-15 16:30:00",
            "employee": {
                "empName": "John Doe",
                "empEmail": "john.doe@company.com",
                "empTechnology": "React"
            }
        }
    ],
    "total": 1
}
```

### 5. Update Activity Snapshot
**Purpose:** Create or update an employee's activity snapshot

**Endpoint:** `POST http://localhost:3000/admin-timesheet/update-activity-snapshot`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
    "empId": "EMP001",
    "date": "2024-01-15"
}
```

**Expected Response (Success):**
```json
{
    "success": true,
    "message": "Activity snapshot updated successfully",
    "data": {
        "id": 1,
        "empId": "EMP001",
        "date": "2024-01-15T00:00:00.000Z",
        "lastActivity": "2024-01-15 16:30:00"
    }
}
```

**Expected Response (Missing Required Fields):**
```json
{
    "success": false,
    "message": "Employee ID and date are required"
}
```

## Complete Admin Testing Workflow

### Scenario 1: Daily Admin Monitoring
1. **Get Today's Summary** - Check overall attendance status
2. **Get All Timesheets** - View detailed timesheet data
3. **Get Activity Snapshots** - Monitor employee activity
4. **Update Activity Snapshot** - Record employee activity

### Scenario 2: Employee-Specific Analysis
1. **Get Employee Detailed Timesheet** - Analyze specific employee performance
2. **Get Activity Snapshots** - Check employee activity patterns
3. **Get All Timesheets** - Compare with other employees

### Scenario 3: Date Range Analysis
1. **Get All Timesheets** - Use date range filters
2. **Get Employee Detailed Timesheet** - Use date range filters
3. **Get Activity Snapshots** - Use date filters

## Admin-Specific Error Responses

### 403 Forbidden (Admin Access Required)
```json
{
    "success": false,
    "message": "Access denied. Admin access required."
}
```
**Solution:** Ensure you're logged in as an admin, not employee

### 400 Bad Request (Missing Parameters)
```json
{
    "success": false,
    "message": "Employee ID and date are required"
}
```
**Solution:** Provide all required parameters in the request

### 404 Not Found (No Data)
```json
{
    "success": true,
    "message": "All employee timesheets retrieved successfully",
    "data": [],
    "total": 0
}
```
**Solution:** No timesheet data exists for the specified criteria

## Admin Testing Tips

1. **Use Environment Variables** in Postman:
   - `base_url`: `http://localhost:3000`
   - `admin_auth_token`: Your admin JWT token
   - `employee_id`: Test employee ID

2. **Create Admin Collection** with all admin timesheet endpoints

3. **Test Data Scenarios**:
   - Empty database (no timesheets)
   - Single employee timesheet
   - Multiple employees with various statuses
   - Date range filtering
   - Employee-specific filtering

4. **Monitor Dashboard Metrics**:
   - Total employees vs present employees
   - Break time calculations
   - Attendance patterns
   - Activity monitoring

## Database Schema Reference

### Timesheet System Fields:
- `empId`: Employee ID (string)
- `clockIn`: Clock-in timestamp
- `clockOut`: Clock-out timestamp
- `breakStart`: Break start timestamp
- `breakEnd`: Break end timestamp
- `hoursLoggedIn`: Total work hours (decimal)
- `totalBreakTime`: Total break duration in minutes
- `status`: Attendance status (PRESENT, ABSENT, HALFDAY, LATE)
- `isActive`: Whether the timesheet is active
- `createdAt`: Timesheet creation date

### Activity Snapshot Fields:
- `empId`: Employee ID (string)
- `date`: Activity date
- `lastActivity`: Last activity timestamp
- `isActive`: Whether the snapshot is active
