# 🔄 Admin & Employee Data Flow Architecture

## 🏗️ **System Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              👥 USER ROLES & ACCESS                                │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                              ADMIN USER                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  Employee Mgmt  │  │  Task Mgmt      │  │  Reports &      │            │   │
│  │  │                 │  │                 │  │  Analytics      │            │   │
│  │  │ • Create Emp    │  │ • Create Tasks  │  │ • Dashboard     │            │   │
│  │  │ • Edit Profiles │  │ • Assign Tasks  │  │ • Timesheets    │            │   │
│  │  │ • View All      │  │ • Track Progress│  │ • Screenshots   │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                            EMPLOYEE USER                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  Self Service   │  │  Task Work      │  │  Time Tracking  │            │   │
│  │  │                 │  │                 │  │                 │            │   │
│  │  │ • View Profile  │  │ • View Tasks    │  │ • Clock In/Out  │            │   │
│  │  │ • Apply Leave   │  │ • Update Status │  │ • Break Time    │            │   │
│  │  │ • Notifications │  │ • Submit Work   │  │ • View History  │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 **ADMIN DATA FLOWS**

### **1. Admin Authentication**
```
Admin Browser → Frontend → POST /admin/adminLogin → Auth Middleware → Admin Controller → Database
```

### **2. Employee Management**
```
Admin Browser → Frontend → POST /admin/createEmployee → Admin Controller → Database → Email Notification
```

### **3. Task Management**
```
Admin Browser → Frontend → POST /tasks/create → Task Controller → Database → Employee Notifications
```

### **4. Dashboard & Reports**
```
Admin Browser → Frontend → GET /admin/empDashBoard → Admin Controller → Database → Statistics
```

## 🔄 **EMPLOYEE DATA FLOWS**

### **1. Employee Authentication**
```
Employee Browser → Frontend → POST /employee/login → Auth Middleware → Employee Controller → Database
```

### **2. Task Management**
```
Employee Browser → Frontend → GET /emp-tasks/my-tasks → Task Controller → Database → Task List
```

### **3. Leave Application**
```
Employee Browser → Frontend → POST /empLeave/empLeave/:id → Leave Controller → Database → Admin Notification
```

### **4. Time Tracking**
```
Employee Browser → Frontend → GET /timeSheet/clockIn/:id → Timesheet Controller → Database → Success Response
```

## 🔄 **ELECTRON INTEGRATION FLOWS**

### **1. Screenshot Upload**
```
Electron App → POST /screenshots/upload → Screenshot Controller → Cloudinary → Database
```

### **2. App Tracking**
```
Electron App → POST /agent-working-apps/set → App Tracker Controller → Database
```

### **3. Idle Time Tracking**
```
Electron App → POST /agent-idle-time/add → Idle Time Controller → Database
```

## 📊 **FOLDER STRUCTURE MAPPING**

### **Admin Routes** (`/admin_app/`)
- `/admin/adminLogin` - Admin authentication
- `/admin/createEmployee` - Create employee
- `/admin/empDashBoard` - Employee dashboard
- `/tasks/create` - Create tasks
- `/tasks/all` - Get all tasks
- `/screenshots/employee/:empId` - View screenshots
- `/agent-working-apps/summary` - App usage summary

### **Employee Routes** (`/employee_app/`)
- `/employee/login` - Employee login
- `/employee/notifications/:id` - Get notifications
- `/empLeave/empLeave/:id` - Apply for leave
- `/timeSheet/clockIn/:id` - Clock in
- `/emp-tasks/my-tasks` - Get assigned tasks
- `/emp-tasks/my-tasks/:taskId/status` - Update task status

### **Electron Routes** (`/admin_app/`)
- `/screenshots/upload` - Upload screenshots
- `/agent-working-apps/set` - Set app tracking data
- `/agent-idle-time/add` - Add idle time data

## 🔐 **AUTHENTICATION FLOW**

```
Request → Auth Middleware → JWT Verification → Role Check → Controller → Database
```

## 📈 **KEY DATA FLOWS**

### **Admin Perspective:**
1. **Authentication** → Admin login with elevated privileges
2. **Employee Management** → Create, edit, view all employees
3. **Task Management** → Create, assign, track all tasks
4. **Reports & Analytics** → View comprehensive dashboards
5. **Leave Management** → Approve/reject employee leave requests
6. **Monitoring** → Access screenshots, app usage, idle time data

### **Employee Perspective:**
1. **Authentication** → Employee login with limited privileges
2. **Self Service** → View/edit own profile, apply for leave
3. **Task Work** → View assigned tasks, update status
4. **Time Tracking** → Clock in/out, manage breaks
5. **Notifications** → Receive task assignments, reminders
6. **Background Monitoring** → Electron app tracks activity

### **System Integration:**
1. **Real-time Communication** → Socket.io for instant updates
2. **Automated Notifications** → Cron jobs for reminders
3. **Desktop Integration** → Electron for monitoring
4. **Data Persistence** → PostgreSQL for all data
5. **File Storage** → Cloudinary for screenshots
6. **Security** → JWT tokens, role-based access

This architecture ensures **separation of concerns**, **secure access control**, and **scalable data flow** for both admin and employee users!
