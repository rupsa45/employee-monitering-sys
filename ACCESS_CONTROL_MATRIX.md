# 🔐 Access Control Matrix

| Feature | Admin | Employee |
|---------|-------|----------|
| **Registration** | ✅ | ❌ |
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
| **Reports & Analytics** | ✅ Generate/View | ✅ View Own |
| **System Settings** | ✅ | ❌ |
| **User Management** | ✅ Team Members | ❌ |
| **Data Export** | ✅ Team Data | ✅ Own Data |
| **Screenshots** | ✅ View Team | ✅ View Own |
| **App Usage Tracking** | ✅ View Team | ✅ View Own |
| **Idle Time Monitoring** | ✅ View Team | ✅ View Own |
| **API Access** | ✅ Full | ✅ Limited |
| **Database Access** | ✅ Read/Write | ✅ Read Own |
| **Logs & Audit** | ✅ View Team | ❌ |

## 📊 Legend
- ✅ **Allowed**: User can perform this action
- ❌ **Not Allowed**: User cannot perform this action
- **Own**: User can only access their own data
- **Team**: User can access team/department data
- **All**: User can access all data in the system
