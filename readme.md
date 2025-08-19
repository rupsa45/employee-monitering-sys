# 🚀 Employee Tracking System - Application Workflow

## 📋 **System Overview**

The Employee Tracking System is a comprehensive web application built with **Node.js**, **Express.js**, and **PostgreSQL** using **Prisma ORM**. It provides complete employee management, attendance tracking, leave management, and task management with **role-based access control**.

## 👥 **User Roles & Access Control**

### **🔐 Admin Users**
- **Registration**: Public admin registration available
- **Login**: Admin login with role verification
- **Permissions**: Full system access and management capabilities
- **Employee Management**: Create, view, and manage employee accounts
- **Task Management**: Create, assign, update, and delete tasks
- **Attendance Monitoring**: View all employee timesheets and activity
- **Leave Management**: Approve/reject employee leave requests
- **System Administration**: Complete administrative control

### **👤 Employee Users**
- **Registration**: **NOT ALLOWED** - Only admins can create employee accounts
- **Login**: Employee login with role verification
- **Permissions**: Limited access to personal data and assigned tasks
- **Profile Management**: Update personal information and passwords
- **Attendance**: Clock in/out and manage breaks
- **Leave Requests**: Apply for and track leave requests
- **Task Management**: **VIEW ONLY + STATUS UPDATE** - Can only view assigned tasks and update status

## 🔄 **Core Workflow**

### **1. System Initialization**
```
1. Admin Registration (Public)
   ├── Anyone can register as admin
   ├── Email uniqueness validation
   ├── Password confirmation
   └── Role automatically set to 'admin'

2. Admin Login
   ├── JWT token generation
   ├── Role-based access control
   └── Admin dashboard access
```

### **2. Employee Management Workflow**
```
1. Admin Creates Employee Account
   ├── Admin authentication required
   ├── Employee details input
   ├── Password generation
   ├── Role set to 'employee'
   └── Account activation

2. Employee Login
   ├── Email/password authentication
   ├── JWT token with role information
   ├── Employee dashboard access
   └── Personal data access
```

### **3. Attendance Tracking Workflow**
```
1. Employee Clock In
   ├── IP address recording
   ├── Timestamp logging
   ├── Status update to 'PRESENT'
   └── Activity snapshot creation

2. Break Management
   ├── Break start recording
   ├── Break duration tracking
   ├── Break end recording
   └── Total break time calculation

3. Employee Clock Out
   ├── Work hours calculation
   ├── Status finalization
   ├── Daily summary generation
   └── Activity snapshot update

4. Admin Monitoring
   ├── Real-time attendance view
   ├── Break status monitoring
   ├── Performance metrics
   └── Activity snapshots
```

### **4. Leave Management Workflow**
```
1. Employee Leave Request
   ├── Leave type selection (Casual/Sick/Other)
   ├── Date range specification
   ├── Reason/message input
   └── Status set to 'PENDING'

2. Admin Review
   ├── Leave request notification
   ├── Request details review
   ├── Approval/rejection decision
   └── Status update

3. Employee Notification
   ├── Leave status update
   ├── Balance adjustment
   └── Confirmation message
```

### **5. Task Management Workflow with Role-Based Access Control**

#### **🔐 Admin Task Management (FULL ACCESS)**
```
1. Task Creation
   ├── Title and description input
   ├── Employee assignment (multiple employees possible)
   ├── Due date setting
   ├── Status set to 'PENDING'
   └── Task activation

2. Task Assignment
   ├── Select employees (only employees, not admins)
   ├── Many-to-many relationship creation
   ├── Assignment notification
   └── Task visibility setup

3. Task Monitoring
   ├── View all tasks with filtering
   ├── Track progress across teams
   ├── Monitor due dates and deadlines
   └── Performance analytics

4. Task Management
   ├── Update task details
   ├── Modify assignments
   ├── Change due dates
   ├── Update task status
   └── Soft delete tasks
```

#### **👤 Employee Task Management (LIMITED ACCESS)**
```
1. Task Viewing
   ├── View only assigned tasks
   ├── See task details and descriptions
   ├── View co-workers on same task
   ├── Check due dates and deadlines
   └── Access task statistics

2. Status Updates
   ├── Update task status progression
   ├── PENDING → IN_PROGRESS → COMPLETED
   ├── Status change logging
   └── Progress tracking

3. Task Information
   ├── Cannot create new tasks
   ├── Cannot modify task details
   ├── Cannot change assignments
   ├── Cannot delete tasks
   └── View-only access to task management
```

### **6. Activity Monitoring Workflow**
```
1. Daily Activity Tracking
   ├── Work hours calculation
   ├── Break time monitoring
   ├── Net work hours computation
   ├── Attendance status tracking
   └── Activity snapshot creation

2. Admin Monitoring
   ├── Real-time activity view
   ├── Performance metrics
   ├── Historical data access
   ├── Productivity analysis
   └── Activity reporting
```

### **7. Video Meeting Workflow**
```
1. Meeting Creation (Admin)
   ├── Admin creates meeting with title, type, schedule
   ├── System generates unique room code
   ├── Optional password protection
   └── Meeting status: SCHEDULED

2. Meeting Participation
   ├── Employees join via room code
   ├── Automatic timesheet linking
   ├── WebRTC peer connection setup
   ├── Real-time audio/video communication
   └── Screen sharing capabilities

3. Meeting Management
   ├── Host controls (kick/ban participants)
   ├── Meeting recording (client-side)
   ├── Attendance tracking
   └── Meeting end with attendance recalculation

4. Meeting Analytics
   ├── Comprehensive attendance reports
   ├── Timesheet correlation
   ├── Participation statistics
   └── Meeting effectiveness metrics
```

### **8. Notification System Workflow**
```
1. Notification Creation
   ├── Admin creates notifications
   ├── Target employee selection
   ├── Message composition
   └── Notification delivery

2. Employee Notification Access
   ├── View personal notifications
   ├── Notification status tracking
   ├── Message history
   └── Read/unread status
```

## 🔐 **Security & Authentication**

### **JWT Token Structure**
```javascript
{
  "userData": {
    "empId": "employee_id",
    "empEmail": "employee@email.com",
    "empRole": "admin" | "employee"
  },
  "iat": "issued_at_timestamp",
  "exp": "expiration_timestamp"
}
```

### **Role-Based Middleware**
```javascript
// Admin-only access
authService.isAdmin(req, res, next)

// Employee-only access
authService.isEmployee(req, res, next)

// Authentication required
authentication(req, res, next)
```

### **Access Control Matrix**

| **Feature** | **Admin** | **Employee** |
|-------------|-----------|--------------|
| **Registration** | ✅ Public | ❌ Not Allowed |
| **Login** | ✅ | ✅ |
| **Employee Creation** | ✅ | ❌ |
| **Profile Management** | ✅ Own | ✅ Own |
| **Attendance Tracking** | ✅ View All | ✅ Own Only |
| **Leave Management** | ✅ Approve/Reject | ✅ Apply/View |
| **Task Creation** | ✅ | ❌ |
| **Task Assignment** | ✅ | ❌ |
| **Task Viewing** | ✅ All Tasks | ✅ Assigned Only |
| **Task Updates** | ✅ Full Access | ✅ Status Only |
| **Task Deletion** | ✅ | ❌ |
| **Activity Monitoring** | ✅ All Employees | ❌ |
| **Notifications** | ✅ Create/Manage | ✅ View Own |

## 📊 **Data Flow**

### **Task Management Data Flow**
```
1. Admin Task Creation
   Admin → Task Controller → Prisma → PostgreSQL
   ├── Validate input data
   ├── Check employee existence
   ├── Create task record
   ├── Establish many-to-many relationships
   └── Return success response

2. Employee Task Access
   Employee → Employee Task Controller → Prisma → PostgreSQL
   ├── Verify employee authentication
   ├── Filter tasks by assignment
   ├── Return only assigned tasks
   └── Include co-worker information

3. Task Status Updates
   Employee → Employee Task Controller → Prisma → PostgreSQL
   ├── Verify task assignment
   ├── Validate status progression
   ├── Update task status
   └── Log status change
```

### **Authentication Data Flow**
```
1. Login Process
   User → Auth Controller → Prisma → PostgreSQL
   ├── Validate credentials
   ├── Generate JWT token
   ├── Include role information
   └── Return authenticated response

2. Route Protection
   Request → Auth Middleware → Role Check → Controller
   ├── Verify JWT token
   ├── Extract user role
   ├── Check route permissions
   └── Allow/deny access
```

## 🎯 **Key Features**

### **✅ Admin Features**
- **Public Registration**: Anyone can register as admin
- **Employee Management**: Create and manage employee accounts
- **Task Management**: Full CRUD operations on tasks
- **Attendance Monitoring**: View all employee timesheets
- **Leave Management**: Approve/reject leave requests
- **Activity Tracking**: Monitor employee performance
- **System Administration**: Complete system control

### **✅ Employee Features**
- **Login Only**: No self-registration
- **Profile Management**: Update personal information
- **Attendance Tracking**: Clock in/out and break management
- **Leave Requests**: Apply for and track leaves
- **Task Viewing**: See assigned tasks and co-workers
- **Status Updates**: Update task progress
- **Notifications**: View personal notifications

### **✅ System Features**
- **Role-Based Security**: Proper access control
- **JWT Authentication**: Secure token-based auth
- **Data Validation**: Comprehensive input validation
- **Error Handling**: Robust error management
- **Logging**: Detailed activity logging
- **Performance**: Optimized database queries
- **Scalability**: PostgreSQL with Prisma ORM

### **✅ Video Meeting Features**
- **WebRTC Video Meetings**: Real-time audio/video communication
- **Screen Sharing**: Browser-based screen sharing capabilities
- **Meeting Recording**: Client-side recording with Cloudinary storage
- **Host Controls**: Kick/ban participants, end meetings
- **Attendance Tracking**: Automatic timesheet linking and attendance reports
- **Room Management**: Unique room codes, password protection
- **Socket.IO Signaling**: Real-time WebRTC signaling
- **Meeting Analytics**: Comprehensive attendance and participation reports

## 🚀 **Deployment Workflow**

### **1. Environment Setup**
```bash
# Database setup
npm run prisma:generate
npm run prisma:migrate

# Environment variables
DATABASE_URL="postgresql://..."
SECRET_KEY="your-secret-key"
EMAIL="your-email@gmail.com"
PASS="your-app-password"
PORT=8000
```

### **2. Application Startup**
```bash
# Start application
npm start

# Verify endpoints
- Admin registration: POST /admin/adminRegister
- Admin login: POST /admin/adminLogin
- Employee creation: POST /admin/createEmployee
- Employee login: POST /employee/login
- Task management: Various /tasks/* endpoints
- Employee tasks: Various /emp-tasks/* endpoints
```

## 🎉 **Workflow Summary**

This workflow provides a complete solution for employee management, from admin registration to comprehensive employee oversight and task management, all built on a robust PostgreSQL database with Prisma ORM and **proper role-based access control**! 🚀

### **Key Workflow Highlights:**
- ✅ **Admin Registration**: Public admin registration functionality
- ✅ **Employee Creation**: Admin-only employee account creation
- ✅ **Role-Based Access**: Proper permissions for different user types
- ✅ **Task Management**: Complete task system with role-based access control
- ✅ **Attendance Tracking**: Comprehensive clock in/out and break management
- ✅ **Leave Management**: Complete leave application and approval workflow
- ✅ **Activity Monitoring**: Real-time employee performance tracking
- ✅ **Security**: JWT-based authentication with role verification
- ✅ **Scalability**: PostgreSQL with Prisma for optimal performance
