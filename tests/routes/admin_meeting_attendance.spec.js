const request = require('supertest');
const express = require('express');
const meetingRoute = require('../../admin_app/routes/meetingRoute');
const meetingService = require('../../service/meetingService');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../service/meetingService');
jest.mock('../../middleware/authToken');

describe('Admin Meeting Attendance Route', () => {
  let app;
  let mockAdminUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock admin user
    mockAdminUser = {
      id: 'admin1',
      role: 'ADMIN',
      empName: 'Admin User',
      empEmail: 'admin@company.com'
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/admin/meetings', meetingRoute);

    // Mock authentication middleware
    authentication.mockImplementation((req, res, next) => {
      req.user = mockAdminUser;
      next();
    });
  });

  describe('GET /admin/meetings/:id/attendance', () => {
    it('should return meeting attendance report successfully', async () => {
      const mockAttendanceReport = {
        meeting: {
          id: 'meeting1',
          title: 'Test Meeting',
          roomCode: 'ABC123',
          status: 'ENDED',
          host: {
            id: 'host1',
            empName: 'Host User',
            empEmail: 'host@example.com'
          }
        },
        summary: {
          totalParticipants: 3,
          activeParticipants: 1,
          totalAttendanceSeconds: 7200,
          totalAttendanceMinutes: 120,
          totalAttendanceHours: 2.0,
          linkedTimeSheets: 2,
          linkRate: 67
        },
        participants: [
          {
            id: 'participant1',
            empId: 'emp1',
            role: 'PARTICIPANT',
            joinedAt: '2024-01-01T10:00:00.000Z',
            leftAt: '2024-01-01T11:00:00.000Z',
            attendanceSec: 3600,
            attendanceMinutes: 60,
            isActive: false,
            timeSheetId: 'timesheet1',
            employee: {
              id: 'emp1',
              empName: 'John Doe',
              empEmail: 'john@example.com',
              empTechnology: 'React'
            },
            timeSheet: {
              id: 'timesheet1',
              clockIn: '09:00',
              clockOut: '17:00',
              status: 'PRESENT'
            }
          }
        ]
      };

      meetingService.getMeetingAttendance.mockResolvedValue(mockAttendanceReport);

      const response = await request(app)
        .get('/admin/meetings/meeting1/attendance')
        .expect(200);

      expect(meetingService.getMeetingAttendance).toHaveBeenCalledWith('meeting1');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Meeting attendance retrieved successfully');
      expect(response.body.data).toEqual(mockAttendanceReport);
    });

    it('should return 400 when meeting ID is empty string', async () => {
      const response = await request(app)
        .get('/admin/meetings/ /attendance')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting ID is required');
      expect(meetingService.getMeetingAttendance).not.toHaveBeenCalled();
    });

    it('should return 404 when meeting not found', async () => {
      meetingService.getMeetingAttendance.mockRejectedValue(new Error('Meeting not found'));

      const response = await request(app)
        .get('/admin/meetings/nonexistent/attendance')
        .expect(404);

      expect(meetingService.getMeetingAttendance).toHaveBeenCalledWith('nonexistent');
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Meeting not found');
    });

    it('should return 500 when service throws unexpected error', async () => {
      meetingService.getMeetingAttendance.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/admin/meetings/meeting1/attendance')
        .expect(500);

      expect(meetingService.getMeetingAttendance).toHaveBeenCalledWith('meeting1');
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get meeting attendance');
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle empty attendance report', async () => {
      const mockEmptyReport = {
        meeting: {
          id: 'meeting1',
          title: 'Empty Meeting',
          roomCode: 'EMPTY',
          status: 'ENDED',
          host: {
            id: 'host1',
            empName: 'Host User',
            empEmail: 'host@example.com'
          }
        },
        summary: {
          totalParticipants: 0,
          activeParticipants: 0,
          totalAttendanceSeconds: 0,
          totalAttendanceMinutes: 0,
          totalAttendanceHours: 0,
          linkedTimeSheets: 0,
          linkRate: 0
        },
        participants: []
      };

      meetingService.getMeetingAttendance.mockResolvedValue(mockEmptyReport);

      const response = await request(app)
        .get('/admin/meetings/meeting1/attendance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalParticipants).toBe(0);
      expect(response.body.data.participants).toHaveLength(0);
    });

    it('should handle attendance report with mixed timesheet links', async () => {
      const mockMixedReport = {
        meeting: {
          id: 'meeting1',
          title: 'Mixed Meeting',
          roomCode: 'MIXED',
          status: 'ENDED',
          host: {
            id: 'host1',
            empName: 'Host User',
            empEmail: 'host@example.com'
          }
        },
        summary: {
          totalParticipants: 2,
          activeParticipants: 0,
          totalAttendanceSeconds: 5400,
          totalAttendanceMinutes: 90,
          totalAttendanceHours: 1.5,
          linkedTimeSheets: 1,
          linkRate: 50
        },
        participants: [
          {
            id: 'participant1',
            empId: 'emp1',
            role: 'PARTICIPANT',
            joinedAt: new Date('2024-01-01T10:00:00Z'),
            leftAt: new Date('2024-01-01T11:30:00Z'),
            attendanceSec: 5400,
            attendanceMinutes: 90,
            isActive: false,
            timeSheetId: 'timesheet1',
            employee: {
              id: 'emp1',
              empName: 'John Doe',
              empEmail: 'john@example.com',
              empTechnology: 'React'
            },
            timeSheet: {
              id: 'timesheet1',
              clockIn: '09:00',
              clockOut: '17:00',
              status: 'PRESENT'
            }
          },
          {
            id: 'participant2',
            empId: 'emp2',
            role: 'PARTICIPANT',
            joinedAt: new Date('2024-01-01T10:00:00Z'),
            leftAt: new Date('2024-01-01T11:30:00Z'),
            attendanceSec: 5400,
            attendanceMinutes: 90,
            isActive: false,
            timeSheetId: null,
            employee: {
              id: 'emp2',
              empName: 'Jane Smith',
              empEmail: 'jane@example.com',
              empTechnology: 'Node.js'
            },
            timeSheet: null
          }
        ]
      };

      meetingService.getMeetingAttendance.mockResolvedValue(mockMixedReport);

      const response = await request(app)
        .get('/admin/meetings/meeting1/attendance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalParticipants).toBe(2);
      expect(response.body.data.summary.linkedTimeSheets).toBe(1);
      expect(response.body.data.summary.linkRate).toBe(50);
      expect(response.body.data.participants[0].timeSheetId).toBe('timesheet1');
      expect(response.body.data.participants[1].timeSheetId).toBeNull();
    });
  });
});
