# 🗄️ Database Design (PostgreSQL + Prisma) - Employee Tracking System

## 📋 **Overview**

The Employee Tracking System uses **PostgreSQL** as the primary database with **Prisma ORM** for type-safe database operations. The schema is designed to handle employee management, time tracking, leave management, task assignments, and real-time monitoring through the Electron application.

---

## 🏗️ **Database Architecture**

### **Technology Stack**
- **Database**: PostgreSQL 14+
- **ORM**: Prisma Client
- **Migration Tool**: Prisma Migrate
- **Schema Language**: Prisma Schema (PSL)

### **Connection Configuration**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/employee_tracking_db"
```

---

## 📊 **Core Entity Relationships**

```
Employee (1) ←→ (N) TimeSheet
Employee (1) ←→ (N) EmpLeave
Employee (1) ←→ (N) Notification
Employee (1) ←→ (N) ActivitySnapshot
Employee (1) ←→ (N) Screenshot
Employee (1) ←→ (N) AgentWorkingApp
Employee (1) ←→ (N) AgentIdleTime
Employee (N) ←→ (N) Task (Many-to-Many)
```

---

## 🗂️ **Database Tables & Models**

### **1. 👥 Employee Management**

#### **`employees` Table**
```sql
CREATE TABLE employees (
  id              VARCHAR(25) PRIMARY KEY,
  empName         VARCHAR(255) NOT NULL,
  empEmail        VARCHAR(255) UNIQUE NOT NULL,
  empPhone        VARCHAR(20) NOT NULL,
  empPassword     VARCHAR(255) NOT NULL,
  confirmPassword VARCHAR(255) NOT NULL,
  empRole         VARCHAR(20) DEFAULT 'employee',
  empTechnology   VARCHAR(100) NOT NULL,
  empProfile      VARCHAR(255) DEFAULT '',
  empGender       emp_gender DEFAULT 'MALE',
  isActive        BOOLEAN DEFAULT true,
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);
```

**Key Features:**
- ✅ **CUID Primary Keys** - Globally unique, sortable IDs
- ✅ **Email Uniqueness** - Prevents duplicate accounts
- ✅ **Role-Based Access** - Employee/Admin role system
- ✅ **Soft Delete Support** - `isActive` flag for data retention
- ✅ **Audit Trail** - `createdAt` and `updatedAt` timestamps

---

### **2. ⏰ Time Tracking System**

#### **`timesheets` Table**
```sql
CREATE TABLE timesheets (
  id               VARCHAR(25) PRIMARY KEY,
  clockIn          VARCHAR(50) DEFAULT '',
  clockOut         VARCHAR(50) DEFAULT '',
  clockinIP        VARCHAR(45) DEFAULT '',
  hoursLoggedIn    INTEGER DEFAULT 0,
  workingFrom      VARCHAR(20) DEFAULT 'office',
  breakStart       VARCHAR(50) DEFAULT '',
  breakEnd         VARCHAR(50) DEFAULT '',
  totalBreakTime   INTEGER DEFAULT 0,
  totalWorkingDays INTEGER DEFAULT 0,
  dayPresent       VARCHAR(10) DEFAULT '0',
  halfDay          INTEGER DEFAULT 0,
  dayAbsent        VARCHAR(10) DEFAULT '0',
  holidays         VARCHAR(10) DEFAULT '0',
  dayLate          VARCHAR(10) DEFAULT '',
  status           attendance_status DEFAULT 'ABSENT',
  isActive         BOOLEAN DEFAULT true,
  createdAt        TIMESTAMP DEFAULT NOW(),
  updatedAt        TIMESTAMP DEFAULT NOW(),
  empId            VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Flexible Time Tracking** - Supports clock in/out, breaks
- ✅ **IP Address Logging** - Security and location tracking
- ✅ **Multiple Status Types** - Present, Absent, Half-day, Late
- ✅ **Break Management** - Track break sessions and total time
- ✅ **Working Location** - Office, Remote, Hybrid support

#### **`activity_snapshots` Table**
```sql
CREATE TABLE activity_snapshots (
  id                 VARCHAR(25) PRIMARY KEY,
  date               TIMESTAMP NOT NULL,
  totalWorkHours     INTEGER DEFAULT 0,
  totalBreakTime     INTEGER DEFAULT 0,
  netWorkHours       INTEGER DEFAULT 0,
  clockInTime        VARCHAR(50) DEFAULT '',
  clockOutTime       VARCHAR(50) DEFAULT '',
  isCurrentlyWorking BOOLEAN DEFAULT false,
  isOnBreak          BOOLEAN DEFAULT false,
  breakSessions      JSON[],
  attendanceStatus   attendance_status DEFAULT 'ABSENT',
  workingFrom        working_location DEFAULT 'OFFICE',
  lastActivity       VARCHAR(255) DEFAULT '',
  isActive           BOOLEAN DEFAULT true,
  createdAt          TIMESTAMP DEFAULT NOW(),
  updatedAt          TIMESTAMP DEFAULT NOW(),
  empId              VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(empId, date)
);
```

**Key Features:**
- ✅ **Daily Snapshots** - One record per employee per day
- ✅ **Real-time Status** - Current working/break status
- ✅ **JSON Break Sessions** - Detailed break tracking
- ✅ **Unique Constraint** - Prevents duplicate daily records
- ✅ **Activity Monitoring** - Last activity timestamp

---

### **3. 📅 Leave Management System**

#### **`emp_leaves` Table**
```sql
CREATE TABLE emp_leaves (
  id           VARCHAR(25) PRIMARY KEY,
  casualLeaves INTEGER DEFAULT 10,
  sickLeave    INTEGER DEFAULT 10,
  otherLeaves  INTEGER DEFAULT 10,
  totalLeave   INTEGER DEFAULT 0,
  leaveType    leave_type DEFAULT 'CASUAL',
  status       leave_status DEFAULT 'PENDING',
  message      TEXT DEFAULT '',
  startDate    TIMESTAMP NOT NULL,
  endDate      TIMESTAMP NOT NULL,
  isActive     BOOLEAN DEFAULT true,
  createdAt    TIMESTAMP DEFAULT NOW(),
  updatedAt    TIMESTAMP DEFAULT NOW(),
  empId        VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Leave Type Categories** - Casual, Sick, Other leaves
- ✅ **Approval Workflow** - Pending, Approved, Rejected status
- ✅ **Date Range Support** - Start and end dates for leave periods
- ✅ **Default Balances** - Pre-configured leave allowances
- ✅ **Message System** - Admin comments and notifications

---

### **4. 📋 Task Management System**

#### **`tasks` Table**
```sql
CREATE TABLE tasks (
  id          VARCHAR(25) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      task_status DEFAULT 'PENDING',
  dueDate     TIMESTAMP NOT NULL,
  isActive    BOOLEAN DEFAULT true,
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
);
```

#### **`_TaskAssignments` Junction Table**
```sql
CREATE TABLE _TaskAssignments (
  A VARCHAR(25) REFERENCES tasks(id) ON DELETE CASCADE,
  B VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY(A, B)
);
```

**Key Features:**
- ✅ **Many-to-Many Relationships** - Multiple employees per task
- ✅ **Task Status Tracking** - Pending, In Progress, Completed
- ✅ **Due Date Management** - Deadline tracking and notifications
- ✅ **Soft Delete Support** - Maintain task history

---

### **5. 🔔 Notification System**

#### **`notifications` Table**
```sql
CREATE TABLE notifications (
  id        VARCHAR(25) PRIMARY KEY,
  title     VARCHAR(255) NOT NULL,
  message   TEXT NOT NULL,
  isActive  BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  empId     VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Personalized Notifications** - Employee-specific messages
- ✅ **Active/Inactive Status** - Notification lifecycle management
- ✅ **Timestamp Tracking** - Notification delivery timing

---

### **6. 🖥️ Electron App Integration**

#### **`screenshots` Table**
```sql
CREATE TABLE screenshots (
  id        VARCHAR(25) PRIMARY KEY,
  imageUrl  VARCHAR(500) NOT NULL,
  publicId  VARCHAR(255) NOT NULL,
  isActive  BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  empId     VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Cloudinary Integration** - Cloud image storage
- ✅ **Public ID Tracking** - Easy image deletion and management
- ✅ **Employee Association** - Screenshot ownership

#### **`agent_working_apps` Table**
```sql
CREATE TABLE agent_working_apps (
  id          VARCHAR(25) PRIMARY KEY,
  appName     VARCHAR(255) NOT NULL,
  appPath     VARCHAR(500),
  appOpenAt   TIMESTAMP NOT NULL,
  appCloseAt  TIMESTAMP NOT NULL,
  keysPressed INTEGER DEFAULT 0,
  mouseClicks INTEGER DEFAULT 0,
  isActive    BOOLEAN DEFAULT true,
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW(),
  empId       VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Application Usage Tracking** - Monitor active applications
- ✅ **Input Activity Monitoring** - Key presses and mouse clicks
- ✅ **Time-based Sessions** - App open/close timestamps
- ✅ **Productivity Metrics** - User activity analysis

#### **`agent_idle_times` Table**
```sql
CREATE TABLE agent_idle_times (
  id        VARCHAR(25) PRIMARY KEY,
  from      TIMESTAMP NOT NULL,
  to        TIMESTAMP NOT NULL,
  duration  INTEGER NOT NULL,
  isActive  BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  empId     VARCHAR(25) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Key Features:**
- ✅ **Idle Time Tracking** - Monitor user inactivity
- ✅ **Duration Calculation** - Precise idle time measurement
- ✅ **Time Range Support** - Start and end timestamps

---

## 🔧 **Enums & Custom Types**

### **Employee Gender**
```sql
CREATE TYPE emp_gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
```

### **Attendance Status**
```sql
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'HALFDAY', 'LATE');
```

### **Leave Types**
```sql
CREATE TYPE leave_type AS ENUM ('CASUAL', 'SICK', 'OTHER');
```

### **Leave Status**
```sql
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVE', 'REJECT');
```

### **Working Location**
```sql
CREATE TYPE working_location AS ENUM ('OFFICE', 'REMOTE', 'HYBRID');
```

### **Task Status**
```sql
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
```

---

## 📈 **Indexing Strategy**

### **Primary Indexes**
- ✅ **CUID Primary Keys** - Globally unique, sortable identifiers
- ✅ **Email Uniqueness** - Fast employee lookups by email

### **Foreign Key Indexes**
- ✅ **Employee References** - All tables with `empId` foreign keys
- ✅ **Cascade Deletes** - Automatic cleanup on employee deletion

### **Composite Indexes**
- ✅ **Activity Snapshots** - `(empId, date)` unique constraint
- ✅ **Task Assignments** - `(taskId, empId)` primary key

### **Performance Indexes**
```sql
-- Employee lookups
CREATE INDEX idx_employees_email ON employees(empEmail);
CREATE INDEX idx_employees_role ON employees(empRole);
CREATE INDEX idx_employees_active ON employees(isActive);

-- Time tracking
CREATE INDEX idx_timesheets_emp_date ON timesheets(empId, createdAt);
CREATE INDEX idx_activity_snapshots_emp_date ON activity_snapshots(empId, date);

-- Leave management
CREATE INDEX idx_emp_leaves_emp_status ON emp_leaves(empId, status);
CREATE INDEX idx_emp_leaves_date_range ON emp_leaves(startDate, endDate);

-- Task management
CREATE INDEX idx_tasks_status_due ON tasks(status, dueDate);
CREATE INDEX idx_tasks_active ON tasks(isActive);

-- Electron tracking
CREATE INDEX idx_screenshots_emp_date ON screenshots(empId, createdAt);
CREATE INDEX idx_working_apps_emp_session ON agent_working_apps(empId, appOpenAt);
CREATE INDEX idx_idle_times_emp_range ON agent_idle_times(empId, from, to);
```

---

## 🔒 **Data Integrity & Constraints**

### **Referential Integrity**
- ✅ **Cascade Deletes** - Employee deletion removes all related data
- ✅ **Foreign Key Constraints** - Ensures data consistency
- ✅ **Unique Constraints** - Prevents duplicate records

### **Data Validation**
- ✅ **Email Format** - Valid email addresses only
- ✅ **Phone Format** - Standardized phone number format
- ✅ **Date Ranges** - Valid start/end dates for leaves
- ✅ **Status Transitions** - Valid status changes

### **Business Rules**
- ✅ **Leave Balance** - Cannot exceed allocated leave days
- ✅ **Time Tracking** - Clock out must be after clock in
- ✅ **Task Assignment** - Employees can be assigned to multiple tasks
- ✅ **Activity Monitoring** - Real-time status updates

---

## 🚀 **Performance Optimizations**

### **Query Optimization**
- ✅ **Selective Field Loading** - Use Prisma `select` for specific fields
- ✅ **Pagination Support** - Limit result sets for large datasets
- ✅ **Eager Loading** - Include related data when needed
- ✅ **Lazy Loading** - Load relationships on demand

### **Database Tuning**
- ✅ **Connection Pooling** - Efficient connection management
- ✅ **Query Caching** - Redis integration for frequent queries
- ✅ **Read Replicas** - Separate read/write operations
- ✅ **Partitioning** - Large tables by date ranges

---

## 📊 **Data Migration Strategy**

### **Prisma Migrations**
```bash
# Generate migration
npx prisma migrate dev --name add_new_feature

# Apply migrations
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset
```

### **Seed Data**
```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const admin = await prisma.employee.create({
    data: {
      empName: 'System Admin',
      empEmail: 'admin@company.com',
      empPhone: '+1234567890',
      empPassword: 'hashedPassword',
      confirmPassword: 'hashedPassword',
      empRole: 'admin',
      empTechnology: 'System Administration',
      empGender: 'MALE'
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🔍 **Monitoring & Analytics**

### **Database Metrics**
- ✅ **Query Performance** - Slow query monitoring
- ✅ **Connection Usage** - Pool utilization tracking
- ✅ **Storage Growth** - Table size monitoring
- ✅ **Index Usage** - Index effectiveness analysis

### **Business Analytics**
- ✅ **Employee Productivity** - Work hours and activity tracking
- ✅ **Leave Patterns** - Leave request analysis
- ✅ **Task Completion** - Project management metrics
- ✅ **System Usage** - Application monitoring data

---

## 🛡️ **Security Considerations**

### **Data Protection**
- ✅ **Password Hashing** - Bcrypt for secure password storage
- ✅ **JWT Tokens** - Secure authentication tokens
- ✅ **Input Validation** - SQL injection prevention
- ✅ **Data Encryption** - Sensitive data encryption

### **Access Control**
- ✅ **Role-Based Permissions** - Employee vs Admin access
- ✅ **Row-Level Security** - Employee data isolation
- ✅ **Audit Logging** - Track data modifications
- ✅ **Backup Strategy** - Regular data backups

---

## 📋 **Schema Evolution**

### **Version Control**
- ✅ **Migration History** - Track schema changes
- ✅ **Rollback Support** - Revert to previous versions
- ✅ **Environment Sync** - Consistent schemas across environments
- ✅ **Documentation** - Schema change documentation

### **Future Enhancements**
- ✅ **Department Management** - Organizational structure
- ✅ **Project Tracking** - Enhanced task management
- ✅ **Reporting Engine** - Advanced analytics
- ✅ **API Rate Limiting** - Usage tracking and limits

---

This comprehensive database design provides a solid foundation for your Employee Tracking System with scalability, performance, and maintainability in mind! 🗄️
