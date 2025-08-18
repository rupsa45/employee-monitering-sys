# Phase 6: Attendance ↔ Timesheet Link

## Overview

Phase 6 implements the integration between meeting attendance and the existing timesheet system. This allows administrators to track meeting participation in relation to employee work hours and provides comprehensive attendance reporting.

## Features Implemented

### 1. Automatic Timesheet Linking

When an employee joins a meeting, the system automatically attempts to link their participation to their active timesheet for that day.

**Logic:**
- If a `timeSheetId` is provided during join, it uses that
- If no `timeSheetId` is provided, the system searches for an active timesheet for the employee on the current date
- If no active timesheet is found, the `timeSheetId` remains `null`

### 2. Attendance Recalculation on Meeting End

When a meeting ends, the system automatically recalculates attendance for all still-connected participants.

**Process:**
- Finds all participants who joined but haven't left yet
- Calculates the duration from their join time to the meeting end time
- Updates their `attendanceSec` and sets `leftAt` to the meeting end time

### 3. Comprehensive Attendance Reports

Administrators can now get detailed attendance reports for any meeting.

**Report Includes:**
- Meeting details (title, room code, status, timing)
- Summary statistics (total participants, active participants, total attendance time)
- Timesheet linking statistics (how many participants have linked timesheets)
- Detailed participant list with:
  - Join/leave times
  - Attendance duration in seconds and minutes
  - Active status
  - Linked timesheet information
  - Employee details

## API Endpoints

### GET /admin/meetings/:id/attendance

**Purpose:** Get comprehensive attendance report for a meeting

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Meeting attendance retrieved successfully",
  "data": {
    "meeting": {
      "id": "meeting1",
      "title": "Team Standup",
      "roomCode": "ABC123",
      "status": "ENDED",
      "scheduledStart": "2024-01-01T10:00:00Z",
      "scheduledEnd": "2024-01-01T11:00:00Z",
      "actualStart": "2024-01-01T10:05:00Z",
      "actualEnd": "2024-01-01T10:55:00Z",
      "host": {
        "id": "host1",
        "empName": "John Manager",
        "empEmail": "john@company.com"
      }
    },
    "summary": {
      "totalParticipants": 5,
      "activeParticipants": 0,
      "totalAttendanceSeconds": 7200,
      "totalAttendanceMinutes": 120,
      "totalAttendanceHours": 2.0,
      "linkedTimeSheets": 4,
      "linkRate": 80
    },
    "participants": [
      {
        "id": "participant1",
        "empId": "emp1",
        "role": "PARTICIPANT",
        "joinedAt": "2024-01-01T10:05:00Z",
        "leftAt": "2024-01-01T10:45:00Z",
        "attendanceSec": 2400,
        "attendanceMinutes": 40,
        "isActive": false,
        "isBanned": false,
        "timeSheetId": "timesheet1",
        "employee": {
          "id": "emp1",
          "empName": "Alice Developer",
          "empEmail": "alice@company.com",
          "empTechnology": "React"
        },
        "timeSheet": {
          "id": "timesheet1",
          "clockIn": "09:00",
          "clockOut": "17:00",
          "status": "PRESENT",
          "createdAt": "2024-01-01T09:00:00Z"
        }
      }
    ]
  }
}
```

## Database Changes

### MeetingParticipant Model Updates

The `MeetingParticipant` model now includes:

```prisma
model MeetingParticipant {
  // ... existing fields ...
  
  // Optional link to the employee's timesheet for that day
  timeSheetId String?
  timeSheet TimeSheet? @relation(fields: [timeSheetId], references: [id])
  
  // ... existing fields ...
}
```

## Service Layer Updates

### meetingService.js

**New Methods:**
- `getMeetingAttendance(meetingId)` - Generates comprehensive attendance reports

**Updated Methods:**
- `markJoin()` - Now automatically links to active timesheet if no `timeSheetId` provided
- `endMeeting()` - Now recalculates attendance for still-connected participants

## Controller Updates

### meetingController.js

**New Method:**
- `getMeetingAttendance()` - Handles the attendance report endpoint

## Testing

### Unit Tests
- `tests/services/meetingAttendance.spec.js` - Tests for attendance and timesheet linking logic
- Updated `tests/services/meetingService.spec.js` - Tests for updated service methods

### Integration Tests
- `tests/routes/admin_meeting_attendance.spec.js` - Tests for the attendance API endpoint

## Usage Examples

### 1. Employee Joins Meeting (Automatic Timesheet Linking)

```javascript
// Employee joins without specifying timesheet
const result = await meetingService.markJoin({
  meetingId: 'meeting123',
  empId: 'emp456'
});

// System automatically finds and links to active timesheet
console.log(result.participant.timeSheetId); // "timesheet789"
```

### 2. Meeting Ends (Attendance Recalculation)

```javascript
// Host ends meeting
const result = await meetingService.endMeeting({
  meetingId: 'meeting123',
  byEmpId: 'host123'
});

// All active participants get their attendance updated
```

### 3. Admin Gets Attendance Report

```javascript
// Admin retrieves attendance report
const report = await meetingService.getMeetingAttendance('meeting123');

console.log(`Total participants: ${report.summary.totalParticipants}`);
console.log(`Total attendance: ${report.summary.totalAttendanceHours} hours`);
console.log(`Timesheet link rate: ${report.summary.linkRate}%`);
```

## Benefits

1. **Automatic Integration:** No manual work required to link meetings to timesheets
2. **Accurate Tracking:** Automatic attendance calculation ensures no time is lost
3. **Comprehensive Reporting:** Detailed insights into meeting participation
4. **Work Hour Correlation:** Ability to correlate meeting time with actual work hours
5. **Audit Trail:** Complete record of who attended what meetings and for how long

## Future Enhancements

1. **Analytics Dashboard:** Visual representation of meeting attendance patterns
2. **Productivity Metrics:** Correlation between meeting attendance and work output
3. **Automated Reports:** Scheduled reports for regular meetings
4. **Integration with Payroll:** Use attendance data for work hour calculations
5. **Meeting Effectiveness:** Track meeting outcomes vs. attendance

## Files Modified

- `service/meetingService.js` - Added attendance logic and timesheet linking
- `admin_app/controller/meetingController.js` - Added attendance endpoint
- `admin_app/routes/meetingRoute.js` - Added attendance route
- `tests/services/meetingAttendance.spec.js` - New unit tests
- `tests/routes/admin_meeting_attendance.spec.js` - New integration tests
- `tests/services/meetingService.spec.js` - Updated existing tests

## Testing Results

All tests pass successfully:
- **Unit Tests:** 7/7 passing
- **Integration Tests:** 6/6 passing  
- **Updated Service Tests:** 30/30 passing

**Total:** 43/43 tests passing ✅

