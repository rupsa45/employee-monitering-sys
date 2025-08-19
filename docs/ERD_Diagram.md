# 🗄️ Employee Tracking System - ERD Diagram

## 📊 **Entity Relationship Diagram**

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           EMPLOYEE TRACKING SYSTEM ERD                                        │
│                                           PostgreSQL + Prisma Schema                                         │
│                                    Complete with Task Management System                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    EMPLOYEES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     empName (String, NOT NULL)                                                                               │
│     empEmail (String, UNIQUE, NOT NULL)                                                                      │
│     empPhone (Int, NOT NULL)                                                                                 │
│     empPassword (String, NOT NULL)                                                                           │
│     confirmPassword (String, NOT NULL)                                                                       │
│     empRole (String, DEFAULT: "employee")                                                                    │
│     empTechnology (String, NOT NULL)                                                                         │
│     empProfile (String, DEFAULT: "")                                                                         │
│     empGender (EmpGender ENUM: MALE|FEMALE|OTHER, NOT NULL)                                                  │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        │ (One Employee can have many TimeSheets)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                  TIMESHEETS                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│ FK: empId (String, NOT NULL) → EMPLOYEES.id                                                                  │
│     clockIn (String, DEFAULT: "")                                                                            │
│     clockOut (String, DEFAULT: "")                                                                           │
│     clockinIP (String, DEFAULT: "")                                                                          │
│     hoursLoggedIn (Int, DEFAULT: 0)                                                                          │
│     workingFrom (String, DEFAULT: "office")                                                                  │
│     breakStart (String, DEFAULT: "")                                                                         │
│     breakEnd (String, DEFAULT: "")                                                                           │
│     totalBreakTime (Int, DEFAULT: 0)                                                                         │
│     totalWorkingDays (Int, DEFAULT: 0)                                                                       │
│     dayPresent (String, DEFAULT: "0")                                                                        │
│     halfDay (Int, DEFAULT: 0)                                                                                │
│     dayAbsent (String, DEFAULT: "0")                                                                         │
│     holidays (String, DEFAULT: "0")                                                                          │
│     dayLate (String, DEFAULT: "")                                                                            │
│     status (AttendanceStatus ENUM: PRESENT|ABSENT|HALFDAY|LATE, DEFAULT: ABSENT)                            │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    EMPLOYEES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     empName (String, NOT NULL)                                                                               │
│     empEmail (String, UNIQUE, NOT NULL)                                                                      │
│     empPhone (Int, NOT NULL)                                                                                 │
│     empPassword (String, NOT NULL)                                                                           │
│     confirmPassword (String, NOT NULL)                                                                       │
│     empRole (String, DEFAULT: "employee")                                                                    │
│     empTechnology (String, NOT NULL)                                                                         │
│     empProfile (String, DEFAULT: "")                                                                         │
│     empGender (EmpGender ENUM: MALE|FEMALE|OTHER, NOT NULL)                                                  │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        │ (One Employee can have many Leave Requests)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   EMP_LEAVES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│ FK: empId (String, NOT NULL) → EMPLOYEES.id                                                                  │
│     casualLeaves (Int, DEFAULT: 10)                                                                          │
│     sickLeave (Int, DEFAULT: 10)                                                                             │
│     otherLeaves (Int, DEFAULT: 10)                                                                           │
│     totalLeave (Int, DEFAULT: 0)                                                                             │
│     leaveType (LeaveType ENUM: CASUAL|SICK|OTHER, DEFAULT: CASUAL)                                           │
│     status (LeaveStatus ENUM: PENDING|APPROVE|REJECT, DEFAULT: PENDING)                                      │
│     message (String, DEFAULT: "")                                                                            │
│     startDate (DateTime, NOT NULL)                                                                           │
│     endDate (DateTime, NOT NULL)                                                                             │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    EMPLOYEES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     empName (String, NOT NULL)                                                                               │
│     empEmail (String, UNIQUE, NOT NULL)                                                                      │
│     empPhone (Int, NOT NULL)                                                                                 │
│     empPassword (String, NOT NULL)                                                                           │
│     confirmPassword (String, NOT NULL)                                                                       │
│     empRole (String, DEFAULT: "employee")                                                                    │
│     empTechnology (String, NOT NULL)                                                                         │
│     empProfile (String, DEFAULT: "")                                                                         │
│     empGender (EmpGender ENUM: MALE|FEMALE|OTHER, NOT NULL)                                                  │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        │ (One Employee can have many Notifications)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                 NOTIFICATIONS                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│ FK: empId (String, NOT NULL) → EMPLOYEES.id                                                                  │
│     title (String, NOT NULL)                                                                                 │
│     message (String, NOT NULL)                                                                               │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    EMPLOYEES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     empName (String, NOT NULL)                                                                               │
│     empEmail (String, UNIQUE, NOT NULL)                                                                      │
│     empPhone (Int, NOT NULL)                                                                                 │
│     empPassword (String, NOT NULL)                                                                           │
│     confirmPassword (String, NOT NULL)                                                                       │
│     empRole (String, DEFAULT: "employee")                                                                    │
│     empTechnology (String, NOT NULL)                                                                         │
│     empProfile (String, DEFAULT: "")                                                                         │
│     empGender (EmpGender ENUM: MALE|FEMALE|OTHER, NOT NULL)                                                  │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        │ (One Employee can have many Activity Snapshots)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              ACTIVITY_SNAPSHOTS                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│ FK: empId (String, NOT NULL) → EMPLOYEES.id                                                                  │
│     date (DateTime, NOT NULL)                                                                                │
│     totalWorkHours (Int, DEFAULT: 0)                                                                         │
│     totalBreakTime (Int, DEFAULT: 0)                                                                         │
│     netWorkHours (Int, DEFAULT: 0)                                                                           │
│     clockInTime (String, DEFAULT: "")                                                                        │
│     clockOutTime (String, DEFAULT: "")                                                                       │
│     isCurrentlyWorking (Boolean, DEFAULT: false)                                                             │
│     isOnBreak (Boolean, DEFAULT: false)                                                                      │
│     breakSessions (Json[], DEFAULT: [])                                                                      │
│     attendanceStatus (AttendanceStatus ENUM: PRESENT|ABSENT|HALFDAY|LATE, DEFAULT: ABSENT)                  │
│     workingFrom (WorkingLocation ENUM: OFFICE|REMOTE|HYBRID, DEFAULT: OFFICE)                                │
│     lastActivity (String, DEFAULT: "")                                                                       │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
│     UNIQUE: [empId, date]                                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    EMPLOYEES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     empName (String, NOT NULL)                                                                               │
│     empEmail (String, UNIQUE, NOT NULL)                                                                      │
│     empPhone (Int, NOT NULL)                                                                                 │
│     empPassword (String, NOT NULL)                                                                           │
│     confirmPassword (String, NOT NULL)                                                                       │
│     empRole (String, DEFAULT: "employee")                                                                    │
│     empTechnology (String, NOT NULL)                                                                         │
│     empProfile (String, DEFAULT: "")                                                                         │
│     empGender (EmpGender ENUM: MALE|FEMALE|OTHER, NOT NULL)                                                  │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ N:M
                                        │ (Many Employees can be assigned to Many Tasks)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                      TASKS                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PK: id (String, cuid())                                                                                      │
│     title (String, NOT NULL)                                                                                 │
│     description (String, NOT NULL)                                                                           │
│     status (TaskStatus ENUM: PENDING|IN_PROGRESS|COMPLETED, DEFAULT: PENDING)                                │
│     dueDate (DateTime, NOT NULL)                                                                             │
│     isActive (Boolean, DEFAULT: true)                                                                        │
│     createdAt (DateTime, DEFAULT: now())                                                                     │
│     updatedAt (DateTime, UPDATED AT)                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    ENUMS                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ EmpGender: MALE | FEMALE | OTHER                                                                             │
│ AttendanceStatus: PRESENT | ABSENT | HALFDAY | LATE                                                          │
│ LeaveType: CASUAL | SICK | OTHER                                                                             │
│ LeaveStatus: PENDING | APPROVE | REJECT                                                                      │
│ WorkingLocation: OFFICE | REMOTE | HYBRID                                                                    │
│ TaskStatus: PENDING | IN_PROGRESS | COMPLETED                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔗 **Relationship Details**

### **1. EMPLOYEES → TIMESHEETS (1:N)**
- **Relationship**: One Employee can have many TimeSheets
- **Foreign Key**: `timesheets.empId` references `employees.id`
- **Cascade**: When an employee is deleted, all their timesheets are deleted
- **Purpose**: Track daily attendance and work hours

### **2. EMPLOYEES → EMP_LEAVES (1:N)**
- **Relationship**: One Employee can have many Leave Requests
- **Foreign Key**: `emp_leaves.empId` references `employees.id`
- **Cascade**: When an employee is deleted, all their leave requests are deleted
- **Purpose**: Manage employee leave applications and approvals

### **3. EMPLOYEES → NOTIFICATIONS (1:N)**
- **Relationship**: One Employee can have many Notifications
- **Foreign Key**: `notifications.empId` references `employees.id`
- **Cascade**: When an employee is deleted, all their notifications are deleted
- **Purpose**: Send and manage notifications to employees

### **4. EMPLOYEES → ACTIVITY_SNAPSHOTS (1:N)**
- **Relationship**: One Employee can have many Activity Snapshots
- **Foreign Key**: `activity_snapshots.empId` references `employees.id`
- **Cascade**: When an employee is deleted, all their activity snapshots are deleted
- **Unique Constraint**: `[empId, date]` ensures one snapshot per employee per day
- **Purpose**: Track daily activity and performance metrics

### **5. EMPLOYEES ↔ TASKS (N:M)**
- **Relationship**: Many Employees can be assigned to Many Tasks
- **Implementation**: Many-to-Many relationship using Prisma's implicit junction table
- **Purpose**: Admin can assign tasks to multiple employees
- **Features**: 
  - Assign multiple employees to a single task
  - Track task status (PENDING, IN_PROGRESS, COMPLETED)
  - Set due dates for task completion
  - Monitor task progress across teams
  - Team collaboration and shared responsibility

## 📋 **Key Features of the ERD**

### **🔐 Primary Keys**
- All entities use `cuid()` for ID generation (String type)
- Ensures globally unique identifiers
- Better for distributed systems

### **🔗 Foreign Keys**
- All relationships use proper foreign key constraints
- Cascade delete ensures data integrity
- Automatic cleanup when parent records are deleted

### **📊 Enums**
- **EmpGender**: MALE, FEMALE, OTHER
- **AttendanceStatus**: PRESENT, ABSENT, HALFDAY, LATE
- **LeaveType**: CASUAL, SICK, OTHER
- **LeaveStatus**: PENDING, APPROVE, REJECT
- **WorkingLocation**: OFFICE, REMOTE, HYBRID
- **TaskStatus**: PENDING, IN_PROGRESS, COMPLETED

### **⏰ Timestamps**
- All entities have `createdAt` and `updatedAt` fields
- Automatic timestamp management by Prisma
- Audit trail for all data changes

### **🔄 Soft Deletes**
- All entities have `isActive` boolean field
- Allows soft deletion without losing data
- Maintains referential integrity

### **📈 Unique Constraints**
- `employees.empEmail`: Ensures unique email addresses
- `activity_snapshots.[empId, date]`: One snapshot per employee per day

## 🎯 **Business Logic Representation**

### **Employee Management**
- **Registration**: Admin registration (public), Employee creation (admin-only)
- **Roles**: Admin and Employee roles with different permissions
- **Profile**: Personal information, technology, gender, profile picture

### **Attendance Tracking**
- **Clock In/Out**: Daily attendance recording
- **Break Management**: Start/end breaks with duration tracking
- **Status Calculation**: Automatic status based on work hours
- **IP Tracking**: Record clock-in IP addresses

### **Leave Management**
- **Leave Types**: Casual, Sick, Other leaves
- **Status Workflow**: Pending → Approve/Reject
- **Balance Tracking**: Track used and remaining leaves
- **Date Range**: Start and end dates for leave periods

### **Activity Monitoring**
- **Daily Snapshots**: One record per employee per day
- **Performance Metrics**: Work hours, break time, net hours
- **Status Tracking**: Current working status and break status
- **Historical Data**: Maintain activity history

### **Notification System**
- **Targeted Messages**: Send notifications to specific employees
- **Active/Inactive**: Manage notification visibility
- **Audit Trail**: Track notification creation and updates

### **Task Management**
- **Task Assignment**: Admin can assign tasks to multiple employees
- **Status Tracking**: PENDING → IN_PROGRESS → COMPLETED workflow
- **Due Date Management**: Set and track task deadlines
- **Team Collaboration**: Multiple employees can work on the same task
- **Progress Monitoring**: Track task completion across teams
- **Workflow Management**: Complete task lifecycle from creation to completion

## 🚀 **Database Benefits**

### **Performance**
- **Indexed Foreign Keys**: Fast relationship queries
- **Unique Constraints**: Efficient duplicate prevention
- **Enum Types**: Optimized storage and validation
- **Many-to-Many Relationships**: Efficient task assignment queries

### **Data Integrity**
- **Foreign Key Constraints**: Ensures referential integrity
- **Cascade Deletes**: Automatic cleanup of related data
- **Unique Constraints**: Prevents duplicate records
- **Enum Validation**: Ensures valid status values

### **Scalability**
- **Normalized Design**: Efficient storage and updates
- **Proper Relationships**: Optimized for complex queries
- **Audit Fields**: Complete change tracking
- **Flexible Task Assignment**: Supports team-based work

## 🎉 **Complete System Overview**

This ERD represents a **complete, scalable, and maintainable database design** for the Employee Tracking System with:

- ✅ **Comprehensive Employee Management** - Registration, roles, profiles
- ✅ **Advanced Attendance Tracking** - Clock in/out, breaks, status calculation
- ✅ **Complete Leave Management** - Application, approval, balance tracking
- ✅ **Real-time Activity Monitoring** - Performance metrics, historical data
- ✅ **Notification System** - Targeted communication
- ✅ **Task Management System** - Assignment, collaboration, progress tracking
- ✅ **Admin Registration** - Public admin registration functionality
- ✅ **Role-based Security** - Comprehensive access control
- ✅ **Data Integrity** - Proper constraints and relationships
- ✅ **Scalable Architecture** - PostgreSQL with Prisma ORM

The system is now ready for production use with full task management capabilities! 🚀

