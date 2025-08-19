# 🔗 Electron App Integration

This document explains how the API integrates with the Electron desktop application for employee monitoring.

## 📋 **Integration Overview**

The API now includes endpoints to handle data from the Electron app:
- **Screenshots**: Automatic screen captures every 5 minutes
- **Application Usage**: Real-time app tracking and activity monitoring
- **Idle Time**: System idle time detection and reporting

## 🚀 **New API Endpoints**

### **1. Screenshot Management**
```
POST /screenshots/upload
GET /screenshots/employee/:empId
DELETE /screenshots/:id
```

### **2. Application Usage Tracking**
```
POST /agent-working-apps/set
GET /agent-working-apps/employee/:empId
GET /agent-working-apps/summary
```

### **3. Idle Time Tracking**
```
POST /agent-idle-time/add
GET /agent-idle-time/employee/:empId
GET /agent-idle-time/summary
```

## 🗄️ **Database Schema Updates**

### **New Models Added:**

#### **Screenshot Model**
```prisma
model Screenshot {
  id        String   @id @default(cuid())
  imageUrl  String   // Cloudinary URL
  publicId  String   // Cloudinary public ID
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  empId     String
  employee  Employee @relation(fields: [empId], references: [id], onDelete: Cascade)
}
```

#### **AgentWorkingApp Model**
```prisma
model AgentWorkingApp {
  id          String   @id @default(cuid())
  appName     String
  appPath     String?
  appOpenAt   DateTime
  appCloseAt  DateTime
  keysPressed Int      @default(0)
  mouseClicks Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  empId       String
  employee    Employee @relation(fields: [empId], references: [id], onDelete: Cascade)
}
```

#### **AgentIdleTime Model**
```prisma
model AgentIdleTime {
  id        String   @id @default(cuid())
  from      DateTime
  to        DateTime
  duration  Int      // Duration in milliseconds
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  empId     String
  employee  Employee @relation(fields: [empId], references: [id], onDelete: Cascade)
}
```

## ☁️ **Cloudinary Integration**

### **Setup Requirements:**
1. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **Environment Variables**:
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

### **Features:**
- **Automatic Upload**: Screenshots uploaded to Cloudinary
- **Optimization**: Images optimized for storage and delivery
- **Secure URLs**: HTTPS URLs for all uploaded images
- **Cleanup**: Automatic deletion from Cloudinary when screenshots are deleted

## 🔧 **Setup Instructions**

### **1. Install Dependencies**
```bash
npm install cloudinary
```

### **2. Database Migration**
```bash
npm run prisma:generate
npm run prisma:migrate
```

### **3. Environment Configuration**
Add these variables to your `.env` file:
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### **4. Start the Server**
```bash
npm start
```

## 📊 **Data Flow**

### **From Electron App to API:**

1. **Screenshot Capture** (Every 5 minutes):
   ```
   Electron → POST /screenshots/upload → Cloudinary → Database
   ```

2. **Application Usage** (Real-time):
   ```
   Electron → POST /agent-working-apps/set → Database
   ```

3. **Idle Time Detection** (When idle > 10 minutes):
   ```
   Electron → POST /agent-idle-time/add → Database
   ```

### **API Response Format:**
```json
{
  "success": true,
  "message": "Data saved successfully",
  "data": {
    // Response data
  }
}
```

## 🔐 **Security Features**

### **File Upload Security:**
- **File Type Validation**: Only image files accepted
- **File Size Limit**: 10MB maximum
- **Virus Scanning**: Cloudinary provides built-in security
- **Secure URLs**: HTTPS URLs for all uploaded content

### **Data Validation:**
- **Employee Verification**: All requests verify employee exists
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Robust error handling and logging

## 📈 **Monitoring & Analytics**

### **Admin Dashboard Features:**
- **Screenshot Gallery**: View all employee screenshots
- **App Usage Analytics**: Track application usage patterns
- **Idle Time Reports**: Monitor employee productivity
- **Real-time Data**: Live updates from Electron apps

### **Employee Features:**
- **Personal Screenshots**: View own screenshots
- **Activity Summary**: Personal productivity insights
- **Privacy Controls**: Manage personal data

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Screenshot Upload Fails:**
   - Check Cloudinary credentials
   - Verify file size and format
   - Check network connectivity

2. **Database Connection Issues:**
   - Verify DATABASE_URL
   - Run database migrations
   - Check PostgreSQL service

3. **CORS Errors:**
   - Verify CORS configuration
   - Check Electron app URL
   - Ensure proper headers

### **Debug Mode:**
```bash
NODE_ENV=development npm start
```

## 📝 **API Documentation**

### **Screenshot Upload:**
```javascript
POST /screenshots/upload
Content-Type: multipart/form-data

{
  "agentId": "employee_id",
  "files": "screenshot_file"
}
```

### **App Usage Data:**
```javascript
POST /agent-working-apps/set
Content-Type: application/json

{
  "agentId": "employee_id",
  "appData": {
    "appName": "Chrome",
    "appPath": "/Applications/Chrome.app",
    "appOpenAt": "2024-01-01T10:00:00Z",
    "appCloseAt": "2024-01-01T11:00:00Z",
    "keysPressed": 150,
    "mouseClicks": 25
  }
}
```

### **Idle Time Data:**
```javascript
POST /agent-idle-time/add
Content-Type: application/json

{
  "agentId": "employee_id",
  "from": "2024-01-01T10:00:00Z",
  "to": "2024-01-01T10:15:00Z"
}
```

## 🎉 **Integration Complete!**

The API is now fully integrated with the Electron app and ready to handle:
- ✅ Screenshot uploads with Cloudinary
- ✅ Real-time application usage tracking
- ✅ Idle time monitoring
- ✅ Comprehensive data analytics
- ✅ Secure data storage and retrieval

Your employee monitoring system is now complete and ready for production! 🚀
