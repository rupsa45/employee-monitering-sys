# Phase 7: Scheduling & Email Reminders

## Overview

Phase 7 implements comprehensive meeting scheduling capabilities with email notifications and reminders. This phase adds the ability to send meeting invites to employees, schedule meetings with date range filtering, and automatically send reminders for upcoming meetings.

## Features Implemented

### 1. Meeting Invite System

**Email Invitations:**
- Send personalized meeting invites to selected employees
- Custom HTML email templates with meeting details
- Automatic participant creation when invites are sent
- Support for custom messages in invites

**Invite Process:**
- Validates meeting exists and is active
- Finds active employees from provided IDs
- Creates or updates meeting participants
- Sends individual email invites
- Tracks successful and failed email deliveries

### 2. Scheduled Meetings Management

**Date Range Filtering:**
- Filter meetings by scheduled start/end dates
- Support for status and host filtering
- Pagination for large result sets
- Ordered by scheduled start time

**Scheduling Features:**
- View all scheduled meetings with detailed information
- Filter by meeting status (SCHEDULED, LIVE, ENDED, CANCELED)
- Filter by meeting host
- Date range queries for calendar views

### 3. Upcoming Meetings for Employees

**Employee Dashboard:**
- Get upcoming meetings within specified time range
- Default 30-minute lookahead, configurable up to 24 hours
- Shows meetings where employee is host or participant
- Includes meeting details and host information

### 4. Automated Reminder System

**Smart Reminders:**
- Send reminders for meetings starting soon
- Configurable reminder timing (default: 15 minutes ahead)
- Automatic email delivery to all participants
- Tracks reminder delivery success/failure

## API Endpoints

### Admin Endpoints

#### POST /admin/meetings/:id/remind
**Purpose:** Send meeting invites to selected employees

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "empIds": ["emp1", "emp2", "emp3"],
  "message": "Custom invite message (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meeting invites sent successfully",
  "data": {
    "meetingId": "meeting1",
    "totalInvites": 3,
    "successfulEmails": 3,
    "failedEmails": 0,
    "employees": [
      {
        "id": "emp1",
        "name": "John Doe",
        "email": "john@company.com"
      }
    ]
  }
}
```

#### GET /admin/meetings
**Purpose:** Get scheduled meetings with filters

**Authentication:** Required (Admin only)

**Query Parameters:**
- `from`: Start date (ISO string)
- `to`: End date (ISO string)
- `status`: Meeting status filter
- `hostId`: Host ID filter
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Scheduled meetings retrieved successfully",
  "data": {
    "meetings": [
      {
        "id": "meeting1",
        "title": "Team Standup",
        "scheduledStart": "2024-01-01T10:00:00.000Z",
        "scheduledEnd": "2024-01-01T11:00:00.000Z",
        "status": "SCHEDULED",
        "host": {
          "id": "host1",
          "empName": "John Manager",
          "empEmail": "john@company.com"
        },
        "participants": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### POST /admin/meetings/reminders
**Purpose:** Send meeting reminders for upcoming meetings

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "minutesAhead": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Meeting reminders sent successfully",
  "data": {
    "totalMeetings": 2,
    "totalReminders": 5,
    "successfulReminders": 4
  }
}
```

### Employee Endpoints

#### GET /emp/meetings/upcoming
**Purpose:** Get upcoming meetings for employee

**Authentication:** Required (Employee only)

**Query Parameters:**
- `minutesAhead`: Minutes ahead to look (default: 30, max: 1440)

**Response:**
```json
{
  "success": true,
  "message": "Upcoming meetings retrieved successfully",
  "data": {
    "meetings": [
      {
        "id": "meeting1",
        "title": "Team Standup",
        "scheduledStart": "2024-01-01T10:00:00.000Z",
        "host": {
          "id": "host1",
          "empName": "John Manager",
          "empEmail": "john@company.com"
        }
      }
    ],
    "count": 1,
    "minutesAhead": 30
  }
}
```

## Email Templates

### Meeting Invitation Email

The system generates professional HTML emails with:

**Features:**
- Responsive design with modern styling
- Meeting details prominently displayed
- Room code highlighted for easy access
- Custom message support
- Host information
- Meeting timing and type

**Template Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Modern, responsive CSS */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Meeting Invitation</h1>
    </div>
    <div class="content">
      <p>Hello [Employee Name],</p>
      <p>[Custom Message]</p>
      <div class="meeting-details">
        <h3>Meeting Details:</h3>
        <p><strong>Title:</strong> [Meeting Title]</p>
        <p><strong>Host:</strong> [Host Name]</p>
        <p><strong>Type:</strong> [Meeting Type]</p>
        <p><strong>Scheduled Start:</strong> [Start Time]</p>
        <p><strong>Scheduled End:</strong> [End Time]</p>
        <p><strong>Room Code:</strong> <span class="room-code">[ROOM_CODE]</span></p>
        <p><strong>Description:</strong> [Description]</p>
      </div>
    </div>
  </div>
</body>
</html>
```

## Service Layer

### meetingSchedulingService.js

**Key Methods:**

1. **`sendMeetingInvite({ meetingId, empIds, message })`**
   - Validates meeting and employees
   - Creates/updates participants
   - Sends individual email invites
   - Returns delivery statistics

2. **`getScheduledMeetings({ from, to, status, hostId, page, limit })`**
   - Filters meetings by date range and criteria
   - Supports pagination
   - Returns meetings with host and participant details

3. **`getUpcomingMeetings({ empId, minutesAhead })`**
   - Finds meetings starting within specified time
   - Includes meetings where employee is host or participant
   - Returns meeting details with host information

4. **`sendMeetingReminders({ minutesAhead })`**
   - Finds meetings starting soon
   - Sends reminder emails to all participants
   - Tracks delivery success/failure

5. **`generateInviteEmailHTML({ meeting, employee, host, message })`**
   - Generates professional HTML email content
   - Includes all meeting details
   - Supports custom messages

## Database Integration

### MeetingParticipant Management

**Automatic Participant Creation:**
- When invites are sent, participants are automatically created
- Uses `upsert` to handle existing participants
- Sets role to 'PARTICIPANT' for invited employees

**Query Optimization:**
- Efficient date range queries for scheduling
- Indexed queries for upcoming meetings
- Pagination support for large datasets

## Testing

### Unit Tests
- **`tests/services/meetingSchedulingService.spec.js`** - Service layer tests
  - Email invite functionality
  - Scheduled meetings filtering
  - Upcoming meetings queries
  - Reminder system
  - HTML template generation

### Integration Tests
- **`tests/routes/admin_meeting_scheduling.spec.js`** - Admin scheduling routes
  - Meeting invite endpoint
  - Scheduled meetings endpoint
  - Reminder endpoint
  - Error handling and validation

- **`tests/routes/emp_meeting_upcoming.spec.js`** - Employee upcoming meetings
  - Upcoming meetings endpoint
  - Parameter validation
  - Error scenarios

## Usage Examples

### 1. Send Meeting Invites

```javascript
// Admin sends invites to multiple employees
const inviteResult = await meetingSchedulingService.sendMeetingInvite({
  meetingId: 'meeting123',
  empIds: ['emp1', 'emp2', 'emp3'],
  message: 'Please join our weekly team standup meeting.'
});

console.log(`Sent ${inviteResult.successfulEmails} invites successfully`);
```

### 2. Get Scheduled Meetings

```javascript
// Admin gets meetings for next week
const scheduledMeetings = await meetingSchedulingService.getScheduledMeetings({
  from: new Date('2024-01-01'),
  to: new Date('2024-01-07'),
  status: 'SCHEDULED',
  page: 1,
  limit: 20
});

console.log(`Found ${scheduledMeetings.pagination.total} scheduled meetings`);
```

### 3. Get Upcoming Meetings

```javascript
// Employee checks upcoming meetings
const upcomingMeetings = await meetingSchedulingService.getUpcomingMeetings({
  empId: 'emp1',
  minutesAhead: 60
});

console.log(`You have ${upcomingMeetings.length} meetings in the next hour`);
```

### 4. Send Reminders

```javascript
// Admin sends reminders for meetings starting in 15 minutes
const reminderResult = await meetingSchedulingService.sendMeetingReminders({
  minutesAhead: 15
});

console.log(`Sent ${reminderResult.successfulReminders} reminders`);
```

## Benefits

1. **Automated Communication:** Reduces manual work for meeting coordination
2. **Professional Invites:** Beautiful, branded email templates
3. **Smart Scheduling:** Date range filtering for calendar integration
4. **Timely Reminders:** Automatic notifications prevent missed meetings
5. **Participant Management:** Automatic participant creation and tracking
6. **Scalable:** Handles multiple invites and reminders efficiently
7. **Trackable:** Detailed delivery statistics and error reporting

## Future Enhancements

1. **Calendar Integration:** Sync with Google Calendar, Outlook
2. **Recurring Meetings:** Support for weekly/monthly recurring meetings
3. **RSVP System:** Allow employees to accept/decline invites
4. **Meeting Templates:** Predefined meeting types with default settings
5. **Advanced Reminders:** Multiple reminder intervals (1 day, 1 hour, 15 min)
6. **Email Preferences:** Allow employees to set reminder preferences
7. **Meeting Analytics:** Track invite acceptance rates and attendance

## Files Modified

- `service/meetingSchedulingService.js` - New scheduling service
- `admin_app/controller/meetingController.js` - Added scheduling methods
- `admin_app/routes/meetingRoute.js` - Added scheduling routes
- `employee_app/controller/empMeetingController.js` - Added upcoming meetings
- `employee_app/routes/empMeetingRoute.js` - Added upcoming meetings route
- `tests/services/meetingSchedulingService.spec.js` - Service unit tests
- `tests/routes/admin_meeting_scheduling.spec.js` - Admin route tests
- `tests/routes/emp_meeting_upcoming.spec.js` - Employee route tests

## Testing Results

All tests pass successfully:
- **Service Tests:** 15/15 passing
- **Admin Route Tests:** 12/12 passing
- **Employee Route Tests:** 7/7 passing

**Total:** 34/34 tests passing ✅

