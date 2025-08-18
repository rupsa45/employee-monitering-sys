# 🎯 Task Notification System

A comprehensive notification system for the Employee Tracking System that automatically sends notifications when tasks are assigned, updated, or due.

## 📋 **System Overview**

The Task Notification System provides automatic notifications for:
- **Task Assignment**: When admins assign tasks to employees
- **Task Updates**: When task status changes or employees are reassigned
- **Due Date Reminders**: Automated reminders for upcoming task deadlines
- **Weekly Reports**: Summary reports sent to admins

## 🚀 **Features**

### **1. Automatic Task Assignment Notifications**
- ✅ **In-App Notifications**: Real-time notifications in the application
- ✅ **Email Notifications**: Professional HTML emails sent to assigned employees
- ✅ **Multi-Employee Support**: Notifications sent to all assigned team members
- ✅ **Task Details**: Complete task information including title, description, and due date

### **2. Task Status Update Notifications**
- ✅ **Admin Notifications**: Admins are notified when employees update task status
- ✅ **Status Tracking**: Tracks status changes from PENDING → IN_PROGRESS → COMPLETED
- ✅ **Employee Context**: Includes employee information who made the change

### **3. Automated Reminder System**
- ✅ **Daily Reminders**: Automatic reminders for tasks due tomorrow
- ✅ **Hourly Reminders**: During business hours (9 AM - 6 PM) on weekdays
- ✅ **Smart Filtering**: Only reminds for PENDING and IN_PROGRESS tasks

### **4. Weekly Summary Reports**
- ✅ **Admin Reports**: Comprehensive weekly task summary sent to all admins
- ✅ **Statistics**: Task completion rates, status breakdown, and performance metrics
- ✅ **Visual Reports**: Beautiful HTML email with charts and task lists

## 🏗️ **Architecture**

### **Core Services**

#### **1. TaskNotificationService** (`service/taskNotificationService.js`)
```javascript
// Main notification service
TaskNotificationService.sendTaskAssignmentNotifications(task, employees, action)
TaskNotificationService.sendTaskStatusUpdateNotification(task, employee, oldStatus, newStatus)
TaskNotificationService.sendTaskReminderNotifications()
```

#### **2. ScheduledNotificationService** (`service/scheduledNotificationService.js`)
```javascript
// Automated scheduled notifications
ScheduledNotificationService.sendDailyTaskReminders()
ScheduledNotificationService.sendWeeklyTaskSummary()
```

#### **3. Cron Jobs** (`scheduler/cronJobs.js`)
```javascript
// Automated scheduling
initializeCronJobs() // Starts all scheduled tasks
stopCronJobs()      // Stops all scheduled tasks
getCronJobStatus()  // Gets status of all cron jobs
```

### **Database Integration**

#### **Notification Model**
```prisma
model Notification {
  id        String   @id @default(cuid())
  title     String
  message   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  empId     String
  employee  Employee @relation(fields: [empId], references: [id], onDelete: Cascade)
}
```

## 📧 **Email Templates**

### **Task Assignment Email**
- **Subject**: "New Task assigned: [Task Title]"
- **Content**: Professional HTML template with task details
- **Features**: 
  - Task title and description
  - Due date and status
  - Employee name and personalization
  - Direct link to dashboard
  - Responsive design

### **Weekly Summary Email**
- **Subject**: "Weekly Task Summary Report"
- **Content**: Comprehensive report with statistics
- **Features**:
  - Task completion statistics
  - Visual charts and progress indicators
  - List of all tasks created this week
  - Performance metrics

## ⏰ **Scheduled Jobs**

### **Daily Task Reminders**
- **Schedule**: Every day at 9:00 AM (IST)
- **Purpose**: Remind employees about tasks due tomorrow
- **Target**: Employees with PENDING or IN_PROGRESS tasks

### **Weekly Task Summary**
- **Schedule**: Every Sunday at 10:00 AM (IST)
- **Purpose**: Send comprehensive weekly report to admins
- **Target**: All active admin users

### **Hourly Reminders**
- **Schedule**: Every hour from 9 AM to 6 PM on weekdays
- **Purpose**: Business hours reminders for urgent tasks
- **Target**: Employees with upcoming deadlines

## 🔧 **Configuration**

### **Environment Variables**
```env
# Email Configuration
EMAIL="your-email@company.com"
PASS="your-email-password"
SMTP_HOST="smtp.company.com"  # Optional
SMTP_PORT=587                 # Optional
SMTP_SECURE=false             # Optional

# Logging Configuration
LOG_LEVEL="info"
NODE_ENV="production"
```

### **Timezone Configuration**
- **Default**: Asia/Kolkata (Indian Standard Time)
- **Configurable**: Can be changed in `scheduler/cronJobs.js`

## 🧪 **Testing Endpoints**

### **Manual Testing Routes**

#### **1. Test Task Assignment Notification**
```http
POST /notification-test/test-task-notification
Content-Type: application/json

{
  "taskId": "task-id-here"
}
```

#### **2. Test Daily Reminders**
```http
POST /notification-test/test-daily-reminders
```

#### **3. Test Weekly Summary**
```http
POST /notification-test/test-weekly-summary
```

#### **4. Get Notification Statistics**
```http
GET /notification-test/notification-stats
```

## 📊 **Monitoring & Logging**

### **Log Files**
- **Scheduled Tasks**: `logs/scheduled.log`
- **Scheduled Errors**: `logs/scheduled-error.log`
- **Notification Logs**: `logs/notification.log`

### **Log Levels**
- **INFO**: Successful operations
- **WARN**: Non-critical issues
- **ERROR**: Critical failures

## 🔄 **Integration Points**

### **Task Controller Integration**
```javascript
// In taskController.js - createTask
await TaskNotificationService.sendTaskAssignmentNotifications(
  task,
  task.assignedEmployees,
  'created'
);

// In taskController.js - updateTaskStatus
await TaskNotificationService.sendTaskStatusUpdateNotification(
  updatedTask,
  employee,
  task.status,
  status.toUpperCase()
);
```

### **Server Initialization**
```javascript
// In index.js
const { initializeCronJobs } = require('./scheduler/cronJobs');

// Initialize cron jobs when server starts
initializeCronJobs();
```

## 🚀 **Usage Examples**

### **Creating a Task with Notifications**
```javascript
// 1. Admin creates task
const task = await prisma.task.create({
  data: {
    title: "Implement User Authentication",
    description: "Add JWT-based authentication to the API",
    dueDate: new Date("2024-01-15"),
    assignedEmployees: {
      connect: [
        { id: "emp1" },
        { id: "emp2" }
      ]
    }
  }
});

// 2. Notifications are automatically sent
// - In-app notifications created for emp1 and emp2
// - Email notifications sent to emp1@company.com and emp2@company.com
```

### **Employee Updates Task Status**
```javascript
// 1. Employee updates task status
const updatedTask = await prisma.task.update({
  where: { id: taskId },
  data: { status: "IN_PROGRESS" }
});

// 2. Admin notification is automatically sent
// - In-app notification created for all admins
// - Email notification sent to admin@company.com
```

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Emails Not Sending**
- Check email configuration in `.env`
- Verify SMTP settings
- Check email provider limits

#### **2. Cron Jobs Not Running**
- Verify server timezone settings
- Check cron job initialization in logs
- Ensure server is running continuously

#### **3. Notifications Not Appearing**
- Check database connectivity
- Verify notification model in Prisma schema
- Check notification controller routes

### **Debug Commands**
```bash
# Check cron job status
curl http://localhost:8000/notification-test/notification-stats

# Test manual notification
curl -X POST http://localhost:8000/notification-test/test-task-notification \
  -H "Content-Type: application/json" \
  -d '{"taskId": "your-task-id"}'

# Check logs
tail -f logs/scheduled.log
tail -f logs/notification.log
```

## 📈 **Performance Considerations**

### **Optimization Features**
- **Batch Processing**: Multiple notifications sent in parallel
- **Error Handling**: Non-blocking error handling for individual emails
- **Logging**: Comprehensive logging for monitoring and debugging
- **Database Efficiency**: Optimized queries with proper indexing

### **Scalability**
- **Horizontal Scaling**: Can run multiple server instances
- **Queue System**: Ready for message queue integration
- **Rate Limiting**: Built-in email rate limiting
- **Caching**: Can be extended with Redis caching

## 🔒 **Security Features**

### **Data Protection**
- **Email Validation**: All email addresses are validated
- **SQL Injection Protection**: Using Prisma ORM
- **Error Handling**: No sensitive data in error messages
- **Logging Security**: No sensitive data in logs

### **Access Control**
- **Admin-Only Routes**: Test endpoints protected
- **Employee Validation**: Only valid employees receive notifications
- **Role-Based Access**: Different notifications for different roles

## 📝 **Future Enhancements**

### **Planned Features**
- [ ] **Push Notifications**: Mobile app notifications
- [ ] **Slack Integration**: Send notifications to Slack channels
- [ ] **Custom Templates**: Admin-configurable email templates
- [ ] **Notification Preferences**: User-configurable notification settings
- [ ] **Advanced Scheduling**: More flexible scheduling options
- [ ] **Analytics Dashboard**: Notification performance metrics

### **Integration Possibilities**
- [ ] **WebSocket**: Real-time notifications
- [ ] **Message Queues**: Redis/RabbitMQ for high-volume notifications
- [ ] **Third-party Services**: SendGrid, Mailgun integration
- [ ] **Mobile SDK**: Native mobile app notifications

---

## 🎉 **Getting Started**

1. **Install Dependencies**
   ```bash
   npm install node-cron
   ```

2. **Configure Environment**
   ```bash
   # Add to .env file
   EMAIL="your-email@company.com"
   PASS="your-email-password"
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Test Notifications**
   ```bash
   # Create a task and check notifications
   curl -X POST http://localhost:8000/notification-test/test-task-notification \
     -H "Content-Type: application/json" \
     -d '{"taskId": "your-task-id"}'
   ```

The Task Notification System is now fully integrated and ready to use! 🚀







