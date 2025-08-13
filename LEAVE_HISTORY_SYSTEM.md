# 📋 Leave History System

A comprehensive leave management system for the Employee Tracking System that provides detailed leave history, filtering capabilities, approval status tracking, and leave balance monitoring.

## 🚀 **Features**

### **1. Comprehensive Leave History**
- ✅ **View all leave requests** with detailed information
- ✅ **Advanced filtering** by date range, status, leave type, year, and month
- ✅ **Pagination support** for large datasets
- ✅ **Sorting options** by various fields
- ✅ **Working days calculation** (excluding weekends)

### **2. Approval Status Tracking**
- ✅ **Real-time status updates** (PENDING, APPROVE, REJECT, CANCELLED)
- ✅ **Status color coding** for visual identification
- ✅ **Leave type icons** for quick recognition
- ✅ **Formatted dates** for better readability

### **3. Leave Balance Monitoring**
- ✅ **Year-wise balance tracking**
- ✅ **Type-wise balance** (Casual, Sick, Other)
- ✅ **Utilization percentage** calculation
- ✅ **Pending requests count**
- ✅ **Detailed statistics** by month and type

### **4. Advanced Filtering & Search**
- ✅ **Date range filtering**
- ✅ **Status-based filtering**
- ✅ **Leave type filtering**
- ✅ **Year and month filtering**
- ✅ **Combined filters** support

## 🏗️ **API Endpoints**

### **1. Get Leave History**
```http
GET /empLeave/getLeaveHistory/:empId
```

#### **Query Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | string | Start date filter (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | End date filter (YYYY-MM-DD) | `2024-12-31` |
| `status` | string | Status filter | `PENDING`, `APPROVE`, `REJECT`, `CANCELLED` |
| `leaveType` | string | Leave type filter | `CASUAL`, `SICK`, `OTHER` |
| `year` | number | Year filter | `2024` |
| `month` | number | Month filter (1-12) | `3` |
| `page` | number | Page number for pagination | `1` |
| `limit` | number | Items per page | `10` |
| `sortBy` | string | Sort field | `createdAt`, `startDate`, `status` |
| `sortOrder` | string | Sort order | `asc`, `desc` |

#### **Response Example**
```json
{
  "success": true,
  "message": "Leave history retrieved successfully",
  "data": {
    "employee": {
      "id": "emp123",
      "empName": "John Doe",
      "empEmail": "john@company.com"
    },
    "leaves": [
      {
        "id": "leave123",
        "leaveType": "CASUAL",
        "startDate": "2024-03-15T00:00:00.000Z",
        "endDate": "2024-03-16T00:00:00.000Z",
        "status": "APPROVE",
        "message": "Personal work",
        "duration": 2,
        "workingDays": 2,
        "formattedStartDate": "15 Mar 2024",
        "formattedEndDate": "16 Mar 2024",
        "appliedOn": "10 Mar 2024 14:30",
        "statusColor": "#28a745",
        "leaveTypeIcon": "🎉"
      }
    ],
    "statistics": {
      "totalLeaves": 5,
      "totalDays": 12,
      "approvedDays": 8,
      "pendingDays": 2,
      "rejectedDays": 1,
      "cancelledDays": 1,
      "byType": {
        "CASUAL": { "total": 6, "approved": 4, "pending": 1, "rejected": 1, "cancelled": 0 },
        "SICK": { "total": 4, "approved": 3, "pending": 1, "rejected": 0, "cancelled": 0 },
        "OTHER": { "total": 2, "approved": 1, "pending": 0, "rejected": 0, "cancelled": 1 }
      },
      "byMonth": [...]
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "applied": {
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "status": "APPROVE"
      }
    }
  }
}
```

### **2. Get Leave Balance**
```http
GET /empLeave/getLeaveBalance/:empId
```

#### **Query Parameters**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `year` | number | Year for balance calculation | `2024` |

#### **Response Example**
```json
{
  "success": true,
  "message": "Leave balance retrieved successfully",
  "data": {
    "employee": {
      "id": "emp123",
      "empName": "John Doe",
      "empEmail": "john@company.com"
    },
    "year": 2024,
    "balance": {
      "default": {
        "CASUAL": 10,
        "SICK": 10,
        "OTHER": 10
      },
      "used": {
        "CASUAL": 4,
        "SICK": 3,
        "OTHER": 1
      },
      "remaining": {
        "CASUAL": 6,
        "SICK": 7,
        "OTHER": 9
      },
      "utilization": {
        "CASUAL": 40,
        "SICK": 30,
        "OTHER": 10
      }
    },
    "statistics": {
      "total": { "approved": 8, "pending": 2, "rejected": 1, "cancelled": 1 },
      "byType": {
        "CASUAL": { "approved": 4, "pending": 1, "rejected": 1, "cancelled": 0 },
        "SICK": { "approved": 3, "pending": 1, "rejected": 0, "cancelled": 0 },
        "OTHER": { "approved": 1, "pending": 0, "rejected": 0, "cancelled": 1 }
      },
      "byMonth": [...]
    },
    "pendingRequests": 2,
    "summary": {
      "totalLeaves": 5,
      "approvedLeaves": 8,
      "pendingLeaves": 2,
      "rejectedLeaves": 1,
      "cancelledLeaves": 1
    }
  }
}
```

### **3. Cancel Leave Request**
```http
PUT /empLeave/cancelLeave/:leaveId
```

#### **Request Body**
```json
{
  "empId": "emp123"
}
```

## 🔍 **Filtering Examples**

### **1. Get All Approved Leaves**
```http
GET /empLeave/getLeaveHistory/emp123?status=APPROVE
```

### **2. Get Casual Leaves in March 2024**
```http
GET /empLeave/getLeaveHistory/emp123?year=2024&month=3&leaveType=CASUAL
```

### **3. Get Pending Leaves with Date Range**
```http
GET /empLeave/getLeaveHistory/emp123?status=PENDING&startDate=2024-01-01&endDate=2024-06-30
```

### **4. Get Leave History with Pagination**
```http
GET /empLeave/getLeaveHistory/emp123?page=2&limit=5&sortBy=startDate&sortOrder=desc
```

### **5. Get Leave Balance for Specific Year**
```http
GET /empLeave/getLeaveBalance/emp123?year=2023
```

## 📊 **Status Codes & Colors**

| Status | Color | Description |
|--------|-------|-------------|
| `PENDING` | `#ffc107` (Yellow) | Awaiting admin approval |
| `APPROVE` | `#28a745` (Green) | Approved by admin |
| `REJECT` | `#dc3545` (Red) | Rejected by admin |
| `CANCELLED` | `#6c757d` (Gray) | Cancelled by employee |

## 🎯 **Leave Type Icons**

| Leave Type | Icon | Description |
|------------|------|-------------|
| `CASUAL` | 🎉 | Casual/Personal leave |
| `SICK` | 🏥 | Sick/Medical leave |
| `OTHER` | 📋 | Other types of leave |

## 📈 **Statistics Breakdown**

### **Total Statistics**
- **Total Leaves**: Number of leave requests
- **Total Days**: Sum of all leave days
- **Approved Days**: Days approved by admin
- **Pending Days**: Days awaiting approval
- **Rejected Days**: Days rejected by admin
- **Cancelled Days**: Days cancelled by employee

### **Type-wise Statistics**
- **By Leave Type**: Breakdown for CASUAL, SICK, OTHER
- **Status Distribution**: Approved, Pending, Rejected, Cancelled for each type

### **Month-wise Statistics**
- **12-month breakdown**: Statistics for each month of the year
- **Trend Analysis**: Monthly leave patterns

## 🔧 **Configuration**

### **Default Leave Balance**
```javascript
const defaultBalance = {
    CASUAL: 10,  // 10 casual leaves per year
    SICK: 10,    // 10 sick leaves per year
    OTHER: 10    // 10 other leaves per year
};
```

### **Working Days Calculation**
- **Excludes weekends** (Saturday and Sunday)
- **Includes holidays** (can be customized)
- **Calculates actual working days** for each leave period

## 🚀 **Usage Examples**

### **Frontend Integration**

#### **1. React Component Example**
```jsx
import React, { useState, useEffect } from 'react';

const LeaveHistory = ({ empId }) => {
    const [leaveHistory, setLeaveHistory] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        leaveType: '',
        year: new Date().getFullYear(),
        page: 1
    });

    const fetchLeaveHistory = async () => {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`/empLeave/getLeaveHistory/${empId}?${params}`);
            const data = await response.json();
            setLeaveHistory(data.data);
        } catch (error) {
            console.error('Error fetching leave history:', error);
        }
    };

    useEffect(() => {
        fetchLeaveHistory();
    }, [filters, empId]);

    return (
        <div>
            {/* Filter Controls */}
            <div className="filters">
                <select 
                    value={filters.status} 
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVE">Approved</option>
                    <option value="REJECT">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                
                <select 
                    value={filters.leaveType} 
                    onChange={(e) => setFilters({...filters, leaveType: e.target.value})}
                >
                    <option value="">All Types</option>
                    <option value="CASUAL">Casual</option>
                    <option value="SICK">Sick</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>

            {/* Leave History Table */}
            {leaveHistory && (
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Applied On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaveHistory.leaves.map(leave => (
                            <tr key={leave.id}>
                                <td>
                                    <span>{leave.leaveTypeIcon}</span>
                                    {leave.leaveType}
                                </td>
                                <td>{leave.formattedStartDate}</td>
                                <td>{leave.formattedEndDate}</td>
                                <td>{leave.duration} days</td>
                                <td>
                                    <span 
                                        style={{color: leave.statusColor}}
                                    >
                                        {leave.status}
                                    </span>
                                </td>
                                <td>{leave.appliedOn}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};
```

#### **2. Leave Balance Dashboard**
```jsx
const LeaveBalance = ({ empId }) => {
    const [balance, setBalance] = useState(null);

    const fetchBalance = async () => {
        try {
            const response = await fetch(`/empLeave/getLeaveBalance/${empId}`);
            const data = await response.json();
            setBalance(data.data);
        } catch (error) {
            console.error('Error fetching leave balance:', error);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [empId]);

    return (
        <div className="leave-balance">
            {balance && (
                <>
                    <h3>Leave Balance for {balance.year}</h3>
                    
                    <div className="balance-cards">
                        {Object.entries(balance.balance.remaining).map(([type, remaining]) => (
                            <div key={type} className="balance-card">
                                <h4>{type}</h4>
                                <div className="balance-bar">
                                    <div 
                                        className="used" 
                                        style={{
                                            width: `${balance.balance.utilization[type]}%`,
                                            backgroundColor: balance.balance.utilization[type] > 80 ? '#dc3545' : '#28a745'
                                        }}
                                    />
                                </div>
                                <p>{remaining} days remaining</p>
                                <p>{balance.balance.utilization[type]}% used</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="summary">
                        <p>Pending Requests: {balance.pendingRequests}</p>
                        <p>Total Leaves: {balance.summary.totalLeaves}</p>
                    </div>
                </>
            )}
        </div>
    );
};
```

## 🛠️ **Error Handling**

### **Common Error Responses**

#### **1. Employee Not Found**
```json
{
  "success": false,
  "message": "Employee not found"
}
```

#### **2. Invalid Date Range**
```json
{
  "success": false,
  "message": "Start date cannot be after end date"
}
```

#### **3. Invalid Status**
```json
{
  "success": false,
  "message": "Invalid status provided"
}
```

## 📝 **Future Enhancements**

### **Planned Features**
- [ ] **Leave Calendar View**: Visual calendar with leave dates
- [ ] **Leave Overlap Detection**: Prevent overlapping leave requests
- [ ] **Leave Request Templates**: Predefined leave request templates
- [ ] **Leave Approval Workflow**: Multi-level approval process
- [ ] **Leave Analytics**: Advanced analytics and reporting
- [ ] **Mobile App Integration**: Native mobile app support

### **Integration Possibilities**
- [ ] **Calendar Integration**: Google Calendar, Outlook integration
- [ ] **Email Notifications**: Automated email notifications for leave status
- [ ] **Slack Integration**: Leave notifications in Slack channels
- [ ] **HR System Integration**: Integration with external HR systems

---

## 🎉 **Getting Started**

1. **Ensure Authentication**: All endpoints require valid authentication
2. **Employee Role**: User must have employee role to access these endpoints
3. **Database Setup**: Ensure Prisma schema is up to date
4. **Test Endpoints**: Use the provided examples to test functionality

The Leave History System is now fully integrated and ready to use! 🚀

