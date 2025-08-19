# 🔄 Data Flow Architecture - Employee Tracking System

## 🏗️ **Complete System Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER INTERACTION                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🌐 FRONTEND APPLICATIONS                               │
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│  │   Web Dashboard │    │  Mobile App     │    │  Admin Panel    │                │
│  │   (React/Vue)   │    │   (React Native)│    │   (React)       │                │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                │
│           │                       │                       │                        │
│           └───────────────────────┼───────────────────────┘                        │
│                                   │                                                │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🖥️  ELECTRON APPLICATION                              │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Main Process (main.js)                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  Window Manager │  │  IPC Handler     │  │  App Tracker    │            │   │
│  │  │                 │  │                 │  │                 │            │   │
│  │  │ • Create Window │  │ • Handle Events │  │ • Track Apps    │            │   │
│  │  │ • Window Events │  │ • API Calls     │  │ • Screenshots   │            │   │
│  │  │ • System Tray   │  │ • Data Sync     │  │ • Idle Time     │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                      Renderer Process (renderer.js)                        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  UI Components  │  │  State Manager  │  │  API Client     │            │   │
│  │  │                 │  │                 │  │                 │            │   │
│  │  │ • Dashboard UI  │  │ • Local State   │  │ • HTTP Requests │            │   │
│  │  │ • Settings UI   │  │ • Data Cache    │  │ • WebSocket     │            │   │
│  │  │ • Notifications │  │ • User Prefs    │  │ • Real-time     │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Background Services                                  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  App Tracker    │  │  Screenshot     │  │  Idle Monitor   │            │   │
│  │  │                 │  │  Service        │  │                 │            │   │
│  │  │ • active-win    │  │ • desktopCapturer│  │ • Global Input  │            │   │
│  │  │ • Process List  │  │ • Image Upload  │  │ • Timer Service │            │   │
│  │  │ • Usage Stats   │  │ • Cloudinary    │  │ • Power Monitor │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🌐 EXPRESS.JS API SERVER                              │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                              API Routes                                     │   │
│  │                                                                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │   │
│  │  │  Employee Routes│  │  Admin Routes   │  │  Electron Routes│            │   │
│  │  │                 │  │                 │  │                 │            │   │
│  │  │ • /empLeave/*   │  │ • /admin/*      │  │ • /screenshot   │            │   │
│  │  │ • /attendance/* │  │ • /tasks/*      │  │ • /agent-apps   │            │   │
│  │  │ • /profile/*    │  │ • /reports/*    │  │ • /idle-time    │            │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                                │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🔐 AUTHENTICATION LAYER                               │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  JWT Token      │  │  Session        │  │  Rate Limiting  │                    │
│  │  Validation     │  │  Management     │  │                 │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • Token Verify  │  │ • Session Store │  │ • Request Limit │                    │
│  │ • Token Refresh │  │ • Session Clean │  │ • IP Blocking   │                    │
│  │ • Token Blacklist│  │ • Auto Logout   │  │ • DDoS Protection│                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              👥 ROLE-BASED AUTHORIZATION                           │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Employee Auth  │  │  Admin Auth     │  │  Super Admin    │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • Leave Access  │  │ • Task Access   │  │ • System Access │                    │
│  │ • Profile Access│  │ • Report Access │  │ • User Mgmt     │                    │
│  │ • Attendance    │  │ • Analytics     │  │ • Settings      │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🧠 CONTROLLER LOGIC                                   │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Employee       │  │  Admin          │  │  Electron       │                    │
│  │  Controllers    │  │  Controllers    │  │  Controllers    │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • empLeaveCtrl  │  │ • taskCtrl      │  │ • screenshotCtrl│                    │
│  │ • attendanceCtrl│  │ • reportCtrl    │  │ • appTrackerCtrl│                    │
│  │ • profileCtrl   │  │ • analyticsCtrl │  │ • idleTimeCtrl  │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🔧 SERVICE LAYER                                      │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Business       │  │  Notification   │  │  Scheduled      │                    │
│  │  Services       │  │  Services       │  │  Services       │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • Leave Service │  │ • Email Service │  │ • Cron Jobs     │                    │
│  │ • Task Service  │  │ • SMS Service   │  │ • Reminders     │                    │
│  │ • Report Service│  │ • Push Service  │  │ • Cleanup Jobs  │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🗄️  PRISMA ORM LAYER                                  │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Database       │  │  Query          │  │  Transaction    │                    │
│  │  Models         │  │  Builder        │  │  Management     │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • Employee      │  │ • Prisma Client │  │ • ACID          │                    │
│  │ • Leave         │  │ • Query Opt     │  │ • Rollback      │                    │
│  │ • Task          │  │ • Relations     │  │ • Connection    │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└───────────────────────────────────┼────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              🐘 POSTGRESQL DATABASE                                │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  Core Tables    │  │  Audit Tables   │  │  Analytics      │                    │
│  │                 │  │                 │  │  Tables         │                    │
│  │                 │  │                 │  │                 │                    │
│  │ • employees     │  │ • audit_logs    │  │ • analytics     │                    │
│  │ • emp_leaves    │  │ • activity_logs │  │ • metrics       │                    │
│  │ • tasks         │  │ • error_logs    │  │ • reports       │                    │
│  │ • notifications │  │ • access_logs   │  │ • dashboards    │                    │
│  │ • screenshots   │  │ • session_logs  │  │ • trends        │                    │
│  │ • agent_apps    │  │ • security_logs │  │ • forecasts     │                    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 **Detailed Request-Response Flow**

### **1. User Login Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Electron  │    │   Express   │    │  Controller │    │ PostgreSQL  │
│             │    │             │    │   API       │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ POST /login       │                   │                   │                   │
       │ {email, password} │                   │                   │                   │
       │──────────────────▶│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ POST /api/login   │                   │                   │
       │                   │ {email, password} │                   │                   │
       │                   │──────────────────▶│                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │ Auth Middleware   │                   │
       │                   │                   │ • Validate Input  │                   │
       │                   │                   │ • Check Rate Limit│                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │ Login Controller  │                   │
       │                   │                   │ • Hash Password   │                   │
       │                   │                   │ • Generate JWT    │                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │ Prisma Query      │
       │                   │                   │                   │ • Find Employee   │
       │                   │                   │                   │ • Check Password  │
       │                   │                   │                   │──────────────────▶│
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ SELECT * FROM employees 
       │                   │                   │                   │                   │ WHERE email = 'user@example.com'
       │                   │                   │                   │                   │◀──────────────────
       │                   │                   │                   │                   │
       │                   │                   │                   │ Employee Data     │
       │                   │                   │                   │◀──────────────────│
       │                   │                   │                   │                   │
       │                   │                   │ JWT Token         │                   │
       │                   │                   │◀──────────────────│                   │
       │                   │                   │                   │                   │
       │                   │ {token, user}     │                   │                   │
       │                   │◀──────────────────│                   │                   │
       │                   │                   │                   │                   │
       │ {token, user}     │                   │                   │                   │
       │◀──────────────────│                   │                   │                   │
       │                   │                   │                   │                   │
```

### **2. Leave Application Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Electron  │    │   Express   │    │  Controller │    │ PostgreSQL  │
│             │    │             │    │   API       │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ POST /leave       │                   │                   │                   │
       │ {leaveData}       │                   │                   │                   │
       │──────────────────▶│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ POST /empLeave    │                   │                   │
       │                   │ {leaveData}       │                   │                   │
       │                   │──────────────────▶│                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │ Auth Middleware   │                   │
       │                   │                   │ • Verify JWT      │                   │
       │                   │                   │ • Check Role      │                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │ Leave Controller  │                   │
       │                   │                   │ • Validate Dates  │                   │
       │                   │                   │ • Check Balance   │                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │ Prisma Create     │
       │                   │                   │                   │ • Insert Leave    │
       │                   │                   │                   │──────────────────▶│
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ INSERT INTO emp_leaves 
       │                   │                   │                   │                   │ (empId, leaveType, startDate, endDate, status)
       │                   │                   │                   │                   │ VALUES (...)
       │                   │                   │                   │                   │◀──────────────────
       │                   │                   │                   │                   │
       │                   │                   │                   │ Leave Record      │
       │                   │                   │                   │◀──────────────────│
       │                   │                   │                   │                   │
       │                   │                   │ Notification      │                   │
       │                   │                   │ • Email Admin     │                   │
       │                   │                   │ • In-app Notify   │                   │
       │                   │                   │◀──────────────────│                   │
       │                   │                   │                   │                   │
       │                   │ {success, leave}  │                   │                   │
       │                   │◀──────────────────│                   │                   │
       │                   │                   │                   │                   │
       │ {success, leave}  │                   │                   │                   │
       │◀──────────────────│                   │                   │                   │
       │                   │                   │                   │                   │
```

### **3. Electron App Tracking Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Electron  │    │   Express   │    │  Controller │    │ PostgreSQL  │    │  Cloudinary │
│   App       │    │   API       │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ Track App Usage   │                   │                   │                   │
       │ • active-win      │                   │                   │                   │
       │ • Process List    │                   │                   │                   │
       │──────────────────▶│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ POST /agent-apps  │                   │                   │
       │                   │ {appData}         │                   │                   │
       │                   │──────────────────▶│                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │ App Tracker Ctrl  │                   │
       │                   │                   │ • Validate Data   │                   │
       │                   │                   │ • Process Stats   │                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │ Prisma Create     │
       │                   │                   │                   │ • Insert App Data │
       │                   │                   │                   │──────────────────▶│
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ INSERT INTO agent_working_apps 
       │                   │                   │                   │                   │ (empId, appName, appPath, appOpenAt, appCloseAt)
       │                   │                   │                   │                   │◀──────────────────
       │                   │                   │                   │                   │
       │                   │                   │                   │ App Record        │
       │                   │                   │                   │◀──────────────────│
       │                   │                   │                   │                   │
       │                   │                   │ {success, stats}  │                   │
       │                   │                   │◀──────────────────│                   │
       │                   │                   │                   │                   │
       │                   │ {success, stats}  │                   │                   │
       │                   │◀──────────────────│                   │                   │
       │                   │                   │                   │                   │
       │ {success, stats}  │                   │                   │                   │
       │◀──────────────────│                   │                   │                   │
       │                   │                   │                   │                   │
```

### **4. Screenshot Upload Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Electron  │    │   Express   │    │  Controller │    │ PostgreSQL  │    │  Cloudinary │
│   App       │    │   API       │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │                   │
       │ Capture Screenshot│                   │                   │                   │
       │ • desktopCapturer │                   │                   │                   │
       │ • Image Buffer    │                   │                   │                   │
       │──────────────────▶│                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │ POST /screenshot  │                   │                   │
       │                   │ {imageBuffer}     │                   │                   │
       │                   │──────────────────▶│                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │ Screenshot Ctrl   │                   │
       │                   │                   │ • Validate Image  │                   │
       │                   │                   │ • Upload to Cloud │                   │
       │                   │                   │──────────────────▶│                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ Upload Image
       │                   │                   │                   │                   │──────────────────▶
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ {url, publicId}
       │                   │                   │                   │                   │◀──────────────────
       │                   │                   │                   │                   │
       │                   │                   │                   │ Prisma Create     │
       │                   │                   │                   │ • Insert Record   │
       │                   │                   │                   │──────────────────▶│
       │                   │                   │                   │                   │
       │                   │                   │                   │                   │ INSERT INTO screenshots 
       │                   │                   │                   │                   │ (empId, imageUrl, publicId)
       │                   │                   │                   │                   │◀──────────────────
       │                   │                   │                   │                   │
       │                   │                   │                   │ Screenshot Record │
       │                   │                   │                   │◀──────────────────│
       │                   │                   │                   │                   │
       │                   │                   │ {success, url}    │                   │
       │                   │                   │◀──────────────────│                   │
       │                   │                   │                   │                   │
       │                   │ {success, url}    │                   │                   │
       │                   │◀──────────────────│                   │                   │
       │                   │                   │                   │                   │
       │ {success, url}    │                   │                   │                   │
       │◀──────────────────│                   │                   │                   │
       │                   │                   │                   │                   │
```

## 🔧 **Key Components & Technologies**

### **Frontend Layer**
- **Web Dashboard**: React.js/Vue.js with Material-UI/Ant Design
- **Mobile App**: React Native for iOS/Android
- **Admin Panel**: React.js with advanced analytics
- **Electron App**: Desktop application for employee tracking

### **API Layer**
- **Express.js**: RESTful API server
- **JWT Authentication**: Token-based authentication
- **Role-based Authorization**: Employee, Admin, Super Admin roles
- **Rate Limiting**: Request throttling and DDoS protection

### **Service Layer**
- **Business Services**: Leave, Task, Report management
- **Notification Services**: Email, SMS, Push notifications
- **Scheduled Services**: Cron jobs, reminders, cleanup

### **Data Layer**
- **Prisma ORM**: Type-safe database queries
- **PostgreSQL**: Primary database
- **Redis**: Session storage and caching
- **Cloudinary**: Image storage for screenshots

### **External Services**
- **Email Service**: Nodemailer with SMTP
- **SMS Service**: Twilio integration
- **Push Notifications**: WebSocket for real-time updates
- **File Storage**: Cloudinary for images

## 🚀 **Performance Optimizations**

### **Caching Strategy**
- **Redis Cache**: Session data, frequently accessed data
- **CDN**: Static assets, images
- **Browser Cache**: API responses, static files

### **Database Optimization**
- **Indexing**: Primary keys, foreign keys, frequently queried fields
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized Prisma queries

### **Real-time Updates**
- **WebSocket**: Real-time notifications, live updates
- **Server-Sent Events**: Live data streaming
- **Polling**: Fallback for real-time updates

This architecture ensures scalability, security, and performance for the Employee Tracking System! 🎯
