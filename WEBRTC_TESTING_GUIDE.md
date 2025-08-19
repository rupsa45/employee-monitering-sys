# 🖥️ WebRTC Testing Guide - Employee Monitoring System

## 📋 **Overview**

This comprehensive guide will help you test all WebRTC functionality in your employee monitoring system using Postman. The system includes:

- **Video Meetings**: Real-time WebRTC video/audio communication
- **Screen Sharing**: Browser-based screen sharing capabilities  
- **Meeting Recording**: Client-side recording with Cloudinary storage
- **Host Controls**: Kick/ban participants, end meetings
- **Attendance Tracking**: Automatic timesheet linking

## 🚀 **Prerequisites**

### **1. Environment Setup**
```bash
# Start the backend server
cd employee-monitering-sys
npm run dev

# Verify server is running on http://localhost:8000
```

### **2. Database Setup**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Seed test data
npm run prisma:studio
```

### **3. Postman Collection Setup**
- Create a new collection: `Employee Monitoring System - WebRTC`
- Set base URL: `http://localhost:8000`
- Create environment variables for tokens

## 🔐 **Step 1: Authentication Setup**

### **1.1 Admin Registration**
```http
POST {{baseUrl}}/admin/adminRegister
Content-Type: application/json

{
  "empName": "Admin User",
  "empEmail": "admin@tellis.com",
  "empPhone": "1234567890",
  "empPassword": "Admin@123",
  "confirmPassword": "Admin@123",
  "empTechnology": "Management",
  "empGender": "MALE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Admin Registered Successfully",
  "admin": {
    "id": "admin123",
    "empName": "Admin User",
    "empEmail": "admin@tellis.com",
    "empRole": "admin"
  }
}
```

### **1.2 Admin Login**
```http
POST {{baseUrl}}/admin/adminLogin
Content-Type: application/json

{
  "empEmail": "admin@tellis.com",
  "empPassword": "Admin@123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Admin logged in successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "empId": "admin123",
    "empEmail": "admin@tellis.com",
    "empRole": "admin"
  }
}
```

**Save the token:**
- Set environment variable: `adminToken` = `{{accessToken}}`

### **1.3 Create Test Employee**
```http
POST {{baseUrl}}/admin/createEmployee
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "empName": "Test Employee",
  "empEmail": "employee@tellis.com",
  "empPhone": "9876543210",
  "empPassword": "Employee@123",
  "confirmPassword": "Employee@123",
  "empTechnology": "JavaScript",
  "empGender": "MALE"
}
```

### **1.4 Employee Login**
```http
POST {{baseUrl}}/employee/login
Content-Type: application/json

{
  "empEmail": "employee@tellis.com",
  "empPassword": "Employee@123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "empId": "emp123",
    "empEmail": "employee@tellis.com",
    "empRole": "employee"
  }
}
```

**Save the token:**
- Set environment variable: `employeeToken` = `{{accessToken}}`

## 🎥 **Step 2: Meeting Management Testing**

### **2.1 Create Meeting (Admin)**
```http
POST {{baseUrl}}/admin/meetings
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "hostId": "admin123",
  "title": "Test WebRTC Meeting",
  "description": "Testing WebRTC functionality",
  "type": "NORMAL",
  "scheduledStart": "2024-01-15T10:00:00Z",
  "scheduledEnd": "2024-01-15T11:00:00Z",
  "password": "meeting123",
  "isPersistent": false
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Meeting created successfully",
  "data": {
    "id": "meeting123",
    "roomCode": "ABC123",
    "title": "Test WebRTC Meeting",
    "hostId": "admin123",
    "status": "SCHEDULED",
    "scheduledStart": "2024-01-15T10:00:00Z",
    "scheduledEnd": "2024-01-15T11:00:00Z"
  }
}
```

**Save the meeting data:**
- Set environment variable: `meetingId` = `{{data.id}}`
- Set environment variable: `roomCode` = `{{data.roomCode}}`

### **2.2 List Admin Meetings**
```http
GET {{baseUrl}}/admin/meetings?status=SCHEDULED&page=1&limit=10
Authorization: Bearer {{adminToken}}
```

### **2.3 Get Meeting Details (Admin)**
```http
GET {{baseUrl}}/admin/meetings/{{meetingId}}
Authorization: Bearer {{adminToken}}
```

### **2.4 Start Meeting (Admin)**
```http
POST {{baseUrl}}/admin/meetings/{{meetingId}}/start
Authorization: Bearer {{adminToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Meeting started successfully",
  "data": {
    "id": "meeting123",
    "status": "LIVE",
    "startedAt": "2024-01-15T10:00:00Z"
  }
}
```

## 👥 **Step 3: Employee Meeting Participation Testing**

### **3.1 List Employee Meetings**
```http
GET {{baseUrl}}/emp/meetings?status=LIVE&page=1&limit=10
Authorization: Bearer {{employeeToken}}
```

### **3.2 Get Upcoming Meetings**
```http
GET {{baseUrl}}/emp/meetings/upcoming?minutesAhead=60
Authorization: Bearer {{employeeToken}}
```

### **3.3 Get Meeting by Room Code**
```http
GET {{baseUrl}}/emp/meetings/{{roomCode}}
Authorization: Bearer {{employeeToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Meeting details retrieved successfully",
  "data": {
    "id": "meeting123",
    "roomCode": "ABC123",
    "title": "Test WebRTC Meeting",
    "status": "LIVE",
    "host": {
      "empName": "Admin User",
      "empEmail": "admin@tellis.com"
    },
    "canJoin": true,
    "requiresPassword": true
  }
}
```

### **3.4 Join Meeting**
```http
POST {{baseUrl}}/emp/meetings/{{roomCode}}/join
Authorization: Bearer {{employeeToken}}
Content-Type: application/json

{
  "password": "meeting123",
  "timeSheetId": "timesheet123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully joined meeting",
  "data": {
    "meetingAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "iceConfiguration": [
      {
        "urls": "stun:stun.l.google.com:19302"
      }
    ],
    "participant": {
      "empId": "emp123",
      "empName": "Test Employee",
      "role": "PARTICIPANT"
    }
  }
}
```

**Save the meeting access token:**
- Set environment variable: `meetingAccessToken` = `{{data.meetingAccessToken}}`

### **3.5 Get Meeting Access Token (Alternative)**
```http
POST {{baseUrl}}/emp/meetings/{{roomCode}}/access-token
Authorization: Bearer {{employeeToken}}
Content-Type: application/json

{
  "password": "meeting123"
}
```

### **3.6 Leave Meeting**
```http
POST {{baseUrl}}/emp/meetings/{{roomCode}}/leave
Authorization: Bearer {{employeeToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully left meeting",
  "data": {
    "attendanceDuration": 1800,
    "attendanceDurationMinutes": 30
  }
}
```

## 🎬 **Step 4: Meeting Recording Testing**

### **4.1 Upload Recording**
```http
POST {{baseUrl}}/emp/meetings/{{meetingId}}/recordings
Authorization: Bearer {{employeeToken}}
Content-Type: multipart/form-data

// Form Data:
file: [Select a video file (WebM, MP4, etc.)]
startedAt: 2024-01-15T10:00:00Z
endedAt: 2024-01-15T10:30:00Z
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Recording uploaded successfully",
  "data": {
    "id": "recording123",
    "startedAt": "2024-01-15T10:00:00Z",
    "endedAt": "2024-01-15T10:30:00Z",
    "durationSec": 1800,
    "cloudinaryUrl": "https://res.cloudinary.com/...",
    "publicId": "meetings/meeting123/recording_123",
    "bytes": 1024000,
    "format": "video/webm"
  }
}
```

**Save the recording ID:**
- Set environment variable: `recordingId` = `{{data.id}}`

### **4.2 Get Meeting Recordings**
```http
GET {{baseUrl}}/emp/meetings/{{meetingId}}/recordings?page=1&limit=10
Authorization: Bearer {{employeeToken}}
```

### **4.3 Get Recording Statistics**
```http
GET {{baseUrl}}/emp/meetings/{{meetingId}}/recordings/stats
Authorization: Bearer {{employeeToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Recording statistics retrieved successfully",
  "data": {
    "totalRecordings": 1,
    "totalDuration": 1800,
    "totalSize": 1024000,
    "averageDuration": 1800,
    "formats": {
      "video/webm": 1
    }
  }
}
```

### **4.4 Delete Recording**
```http
DELETE {{baseUrl}}/emp/meetings/{{meetingId}}/recordings/{{recordingId}}
Authorization: Bearer {{employeeToken}}
```

## 👑 **Step 5: Host Controls Testing**

### **5.1 Kick Participant (Admin)**
```http
POST {{baseUrl}}/admin/meetings/{{meetingId}}/kick
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "empId": "emp123"
}
```

### **5.2 Ban Participant (Admin)**
```http
POST {{baseUrl}}/admin/meetings/{{meetingId}}/ban
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "empId": "emp123"
}
```

### **5.3 Get Meeting Attendance Report**
```http
GET {{baseUrl}}/admin/meetings/{{meetingId}}/attendance
Authorization: Bearer {{adminToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Meeting attendance retrieved successfully",
  "data": {
    "meeting": {
      "id": "meeting123",
      "title": "Test WebRTC Meeting"
    },
    "participants": [
      {
        "empId": "emp123",
        "empName": "Test Employee",
        "joinedAt": "2024-01-15T10:00:00Z",
        "leftAt": "2024-01-15T10:30:00Z",
        "duration": 1800,
        "status": "LEFT"
      }
    ],
    "summary": {
      "totalParticipants": 1,
      "averageDuration": 1800,
      "totalDuration": 1800
    }
  }
}
```

### **5.4 End Meeting (Admin)**
```http
POST {{baseUrl}}/admin/meetings/{{meetingId}}/end
Authorization: Bearer {{adminToken}}
```

### **5.5 Cancel Meeting (Admin)**
```http
POST {{baseUrl}}/admin/meetings/{{meetingId}}/cancel
Authorization: Bearer {{adminToken}}
```

## 🔧 **Step 6: WebRTC Connection Testing**

### **6.1 Socket.IO Connection Test**

Create a simple HTML file to test WebRTC connections:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebRTC Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>WebRTC Connection Test</h1>
    <div id="status">Connecting...</div>
    <div id="peers"></div>
    
    <script>
        // Replace with your meeting access token
        const meetingAccessToken = 'YOUR_MEETING_ACCESS_TOKEN';
        
        const socket = io('http://localhost:8000/meetings', {
            auth: { meetingAccessToken }
        });
        
        socket.on('connect', () => {
            document.getElementById('status').textContent = 'Connected to signaling server';
            console.log('Connected to signaling server');
        });
        
        socket.on('peer:joined', (data) => {
            console.log('Peer joined:', data);
            document.getElementById('peers').innerHTML += `<div>Peer joined: ${data.empName}</div>`;
        });
        
        socket.on('peer:left', (data) => {
            console.log('Peer left:', data);
            document.getElementById('peers').innerHTML += `<div>Peer left: ${data.empId}</div>`;
        });
        
        socket.on('error', (data) => {
            console.error('Socket error:', data);
            document.getElementById('status').textContent = 'Error: ' + data.message;
        });
        
        socket.on('disconnect', () => {
            document.getElementById('status').textContent = 'Disconnected';
            console.log('Disconnected from signaling server');
        });
    </script>
</body>
</html>
```

## 🧪 **Step 7: Comprehensive Test Scenarios**

### **Test Scenario 1: Complete Meeting Lifecycle**
1. ✅ Admin creates meeting
2. ✅ Admin starts meeting
3. ✅ Employee joins meeting
4. ✅ Employee uploads recording
5. ✅ Employee leaves meeting
6. ✅ Admin ends meeting
7. ✅ Verify attendance report

### **Test Scenario 2: Host Controls**
1. ✅ Admin creates and starts meeting
2. ✅ Multiple employees join meeting
3. ✅ Admin kicks one employee
4. ✅ Admin bans another employee
5. ✅ Verify kicked/banned employees cannot rejoin
6. ✅ Admin ends meeting

### **Test Scenario 3: Recording Management**
1. ✅ Employee joins meeting
2. ✅ Employee uploads multiple recordings
3. ✅ Employee views recording list
4. ✅ Employee checks recording statistics
5. ✅ Employee deletes a recording
6. ✅ Verify recording count decreases

### **Test Scenario 4: Error Handling**
1. ✅ Try to join non-existent meeting
2. ✅ Try to join with wrong password
3. ✅ Try to upload non-video file
4. ✅ Try to access admin endpoints as employee
5. ✅ Try to access employee endpoints as admin
6. ✅ Try to join ended meeting

## 🔍 **Step 8: Validation Checklist**

### **✅ Authentication & Authorization**
- [ ] Admin can register and login
- [ ] Employee can login (no self-registration)
- [ ] Admin can create employees
- [ ] JWT tokens work correctly
- [ ] Role-based access control works

### **✅ Meeting Management**
- [ ] Admin can create meetings
- [ ] Admin can start/end/cancel meetings
- [ ] Employees can view their meetings
- [ ] Room codes are unique
- [ ] Password protection works

### **✅ WebRTC Functionality**
- [ ] Meeting access tokens are generated
- [ ] ICE configuration is provided
- [ ] Socket.IO connection works
- [ ] Signaling events are received
- [ ] Peer discovery works

### **✅ Recording System**
- [ ] Video files can be uploaded
- [ ] File validation works (type, size)
- [ ] Cloudinary integration works
- [ ] Recording metadata is stored
- [ ] Recording statistics are accurate

### **✅ Host Controls**
- [ ] Admin can kick participants
- [ ] Admin can ban participants
- [ ] Kicked/banned users cannot rejoin
- [ ] Attendance tracking works
- [ ] Meeting attendance reports are accurate

### **✅ Error Handling**
- [ ] Invalid tokens are rejected
- [ ] Wrong passwords are rejected
- [ ] File upload errors are handled
- [ ] Database errors are handled
- [ ] Rate limiting works

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Cannot find module 'node-cron'"**
```bash
cd employee-monitering-sys
npm install
```

### **Issue 2: Database connection errors**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
npm run prisma:generate
npm run prisma:migrate
```

### **Issue 3: Cloudinary upload fails**
```bash
# Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
```

### **Issue 4: Socket.IO connection fails**
```bash
# Check server is running on correct port
# Verify CORS settings
# Check meeting access token is valid
```

### **Issue 5: WebRTC connection issues**
```bash
# Check ICE configuration
# Verify STUN servers are accessible
# Check firewall settings
```

## 📊 **Performance Testing**

### **Load Testing with Multiple Users**
1. Create multiple test employees
2. Have all join the same meeting
3. Test recording uploads simultaneously
4. Monitor server performance
5. Check database performance

### **File Upload Testing**
1. Test with different video formats
2. Test with large files (up to 500MB)
3. Test concurrent uploads
4. Monitor Cloudinary upload times

## 🎯 **Success Criteria**

Your WebRTC system is working correctly when:

✅ **All API endpoints return expected responses**  
✅ **Authentication and authorization work properly**  
✅ **Meetings can be created, joined, and managed**  
✅ **Recordings can be uploaded and retrieved**  
✅ **Host controls function correctly**  
✅ **Socket.IO signaling works**  
✅ **Error handling is robust**  
✅ **Performance is acceptable under load**  

## 📞 **Support**

If you encounter issues:

1. **Check the logs**: `npm run dev` shows detailed error messages
2. **Verify environment variables**: All required env vars must be set
3. **Test database connection**: Use Prisma Studio to verify data
4. **Check network connectivity**: Ensure ports are open and accessible
5. **Review this guide**: Follow the step-by-step testing process

---

**🎉 Congratulations!** If you've completed all tests successfully, your WebRTC system is ready for production use!
