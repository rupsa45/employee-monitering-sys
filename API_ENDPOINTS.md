# 🔗 API Endpoints Documentation - Employee Tracking System

## 📋 **API Base URL**
```
http://localhost:8000
```

---

## 🔐 **Authentication Endpoints**

### **Admin Authentication**
- ✅ `POST /admin/adminRegister` — **NEW:** Admin registration (public)
- ✅ `POST /admin/adminLogin` — Admin login (public)

### **Employee Authentication**
- ✅ `POST /employee/login` — Employee login only (public)

---

## 👥 **Employee Management**

### **Admin Employee Management**
- ✅ `POST /admin/createEmployee` — Create employee (admin only)
- ✅ `GET /admin/empDashBoard` — Employee dashboard (admin only)
- ✅ `PATCH /employee/setNewPassword/:id` — Set new password for employee (admin only)
- ✅ `POST /employee/emailForReset` — Send password reset email (admin only)
- ✅ `PATCH /employee/editProfile/:id` — Edit employee profile (admin only)

---

## 📅 **Leave Management**

### **Admin Leave Management**
- ✅ `GET /admin/showEmpLeaves` — View leave requests (admin only)
- ✅ `PATCH /admin/empLeavePermit/:leaveId` — Approve/reject leaves (admin only)

### **Employee Leave Management**
- ✅ `POST /empLeave/empLeave/:id` — Apply for leave (employee only)
- ✅ `GET /empLeave/getLeaveHistory/:empId` — Get leave history (employee only)
- ✅ `GET /empLeave/getLeaveBalance/:empId` — Get leave balance (employee only)
- ✅ `PUT /empLeave/cancelLeave/:leaveId` — Cancel leave request (employee only)

---

## ⏰ **Timesheet Management**

### **Employee Timesheet Operations**
- ✅ `GET /timeSheet/clockIn/:id` — Clock in (employee only)
- ✅ `PATCH /timeSheet/clockOut/:id` — Clock out (employee only)
- ✅ `POST /timeSheet/breakStart/:id` — Start break (employee only)
- ✅ `POST /timeSheet/breakEnd/:id` — End break (employee only)
- ✅ `GET /timeSheet/currentStatus/:id` — Get current status (employee only)

### **Admin Timesheet Management**
- ✅ `GET /admin-timesheet/all-timesheets` — All timesheets (admin only)
- ✅ `GET /admin-timesheet/today-summary` — Today's summary (admin only)
- ✅ `GET /admin-timesheet/employee-timesheet/:empId` — Employee timesheet (admin only)
- ✅ `GET /admin-timesheet/activity-snapshots` — Activity snapshots (admin only)
- ✅ `POST /admin-timesheet/update-activity-snapshot` — Update snapshots (admin only)

---

## 📋 **Task Management**

### **Admin Task Management (FULL ACCESS)**
- ✅ `POST /tasks/create` — **NEW:** Create task with employee assignments (admin only)
- ✅ `GET /tasks/all` — **NEW:** Get all tasks with filtering (admin only)
- ✅ `GET /tasks/:taskId` — **NEW:** Get specific task details (admin only)
- ✅ `PUT /tasks/:taskId` — **NEW:** Update task details and assignments (admin only)
- ✅ `DELETE /tasks/:taskId` — **NEW:** Soft delete task (admin only)
- ✅ `PATCH /tasks/:taskId/status` — **NEW:** Update task status (admin only)

### **Employee Task Management (LIMITED ACCESS)**
- ✅ `GET /emp-tasks/my-tasks` — **NEW:** Get assigned tasks (employee only)
- ✅ `GET /emp-tasks/my-tasks/:taskId` — **NEW:** Get specific task details (employee only)
- ✅ `PATCH /emp-tasks/my-tasks/:taskId/status` — **NEW:** Update task status (employee only)
- ✅ `GET /emp-tasks/my-task-stats` — **NEW:** Get task statistics (employee only)

---

## 🏢 **Bench Management**

### **Employee Search & Working List**
- ✅ `GET /bench/empWorkingList` — Get employee working list (admin only)
- ✅ `GET /bench/searchEmployee/:letter` — Search employees by letter (admin only)

---

## 🔔 **Notifications**

### **Employee Notifications**
- ✅ `GET /employee/notifications/:id` — Get notifications (employee only)

### **Admin Notifications**
- ✅ `GET /notification/active-employees` — Get active employees (admin only)
- ✅ `POST /notification/createNotification/:id` — Create notification (admin only)
- ✅ `PATCH /notification/updateNotification/:id` — Update notification (admin only)
- ✅ `DELETE /notification/inactiveNotification/:id` — Deactivate notification (admin only)

### **Notification Testing (Development)**
- ✅ `POST /notification-test/test-task-notification` — Test task notification (admin only)
- ✅ `POST /notification-test/test-daily-reminders` — Test daily reminders (admin only)
- ✅ `POST /notification-test/test-weekly-summary` — Test weekly summary (admin only)
- ✅ `GET /notification-test/notification-stats` — Get notification stats (admin only)

---

## 🖥️ **Electron App Integration**

### **Screenshot Management**
- ✅ `POST /screenshots/upload` — Upload screenshot (employee only)
- ✅ `GET /screenshots/employee/:empId` — Get employee screenshots (admin only)
- ✅ `DELETE /screenshots/:id` — Delete screenshot (admin only)

### **Application Tracking**
- ✅ `POST /agent-working-apps/set` — Track application usage (employee only)
- ✅ `GET /agent-working-apps/employee/:empId` — Get app usage data (admin only)
- ✅ `GET /agent-working-apps/summary` — Get all working apps summary (admin only)

### **Idle Time Monitoring**
- ✅ `POST /agent-idle-time/add` — Track idle time (employee only)
- ✅ `GET /agent-idle-time/employee/:empId` — Get idle time data (admin only)
- ✅ `GET /agent-idle-time/summary` — Get all idle time summary (admin only)

---

## 📊 **Reports & Analytics**

> **Note:** Report endpoints are not yet implemented in the current codebase.
> These would be future additions for comprehensive reporting functionality.

---

## ⚙️ **System Administration**

> **Note:** System administration endpoints are not yet implemented in the current codebase.
> These would be future additions for system management functionality.

---

## 🔍 **Search & Filter**

> **Note:** Global search endpoints are not yet implemented in the current codebase.
> Basic employee search is available via `/bench/searchEmployee/:letter`.

---

## 📁 **File Management**

> **Note:** File management endpoints are not yet implemented in the current codebase.
> These would be future additions for file upload/download functionality.

---

## 📈 **Data Export/Import**

> **Note:** Data export/import endpoints are not yet implemented in the current codebase.
> These would be future additions for data management functionality.

---

## 🔐 **Security & Audit**

> **Note:** Security and audit endpoints are not yet implemented in the current codebase.
> These would be future additions for security monitoring functionality.

---

## 📝 **Request/Response Examples**

### **Admin Login**
```http
POST /admin/adminLogin
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "securepassword"
}
```

### **Employee Clock In**
```http
GET /timeSheet/clockIn/emp123
Authorization: Bearer <jwt_token>
```

### **Create Task**
```http
POST /tasks/create
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "title": "Complete Project Documentation",
  "description": "Update all project documentation",
  "assignedEmployees": ["emp123", "emp456"],
  "dueDate": "2024-01-15",
  "priority": "HIGH"
}
```

---

## 🔒 **Authentication & Authorization**

### **JWT Token Format**
```javascript
// Token Structure
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "emp123",
    "role": "EMPLOYEE",
    "teamId": "team456",
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

### **Required Headers**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📊 **Response Format**

### **Success Response**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🚀 **Rate Limiting**

- **Public Endpoints**: 100 requests per hour
- **Authenticated Endpoints**: 1000 requests per hour
- **Admin Endpoints**: 5000 requests per hour
- **Super Admin Endpoints**: 10000 requests per hour

---

## 🔧 **Status Codes**

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

This comprehensive API documentation covers all endpoints in your Employee Tracking System! 🔗
