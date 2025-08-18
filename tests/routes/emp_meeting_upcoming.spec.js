const request = require('supertest');
const express = require('express');
const empMeetingRoute = require('../../employee_app/routes/empMeetingRoute');
const meetingSchedulingService = require('../../service/meetingSchedulingService');
const { authentication } = require('../../middleware/authToken');

// Mock dependencies
jest.mock('../../service/meetingSchedulingService');
jest.mock('../../middleware/authToken');

describe('Employee Meeting Upcoming Routes', () => {
  let app;
  let mockEmployeeUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock employee user
    mockEmployeeUser = {
      id: 'emp1',
      role: 'EMPLOYEE',
      empName: 'John Doe',
      empEmail: 'john@company.com'
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/emp/meetings', empMeetingRoute);

    // Mock authentication middleware
    authentication.mockImplementation((req, res, next) => {
      req.user = mockEmployeeUser;
      next();
    });
  });

  describe('GET /emp/meetings/upcoming', () => {
    it('should get upcoming meetings successfully', async () => {
      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Upcoming Meeting 1',
          scheduledStart: '2024-01-01T10:00:00.000Z',
          host: {
            id: 'host1',
            empName: 'Host User',
            empEmail: 'host@company.com'
          }
        },
        {
          id: 'meeting2',
          title: 'Upcoming Meeting 2',
          scheduledStart: '2024-01-01T14:00:00.000Z',
          host: {
            id: 'host2',
            empName: 'Host User 2',
            empEmail: 'host2@company.com'
          }
        }
      ];

      meetingSchedulingService.getUpcomingMeetings.mockResolvedValue(mockMeetings);

      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 60 })
        .expect(200);

      expect(meetingSchedulingService.getUpcomingMeetings).toHaveBeenCalledWith({
        empId: 'emp1',
        minutesAhead: 60
      });

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Upcoming meetings retrieved successfully');
      expect(response.body.data.meetings).toEqual(mockMeetings);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.minutesAhead).toBe(60);
    });

    it('should use default minutesAhead when not provided', async () => {
      const mockMeetings = [];

      meetingSchedulingService.getUpcomingMeetings.mockResolvedValue(mockMeetings);

      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .expect(200);

      expect(meetingSchedulingService.getUpcomingMeetings).toHaveBeenCalledWith({
        empId: 'emp1',
        minutesAhead: 30
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data.minutesAhead).toBe(30);
    });

    it('should return 400 for invalid minutesAhead (too low)', async () => {
      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Minutes ahead must be between 1 and 1440 (24 hours)');
      expect(meetingSchedulingService.getUpcomingMeetings).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid minutesAhead (too high)', async () => {
      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 1500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Minutes ahead must be between 1 and 1440 (24 hours)');
      expect(meetingSchedulingService.getUpcomingMeetings).not.toHaveBeenCalled();
    });

    it('should return 400 for non-numeric minutesAhead', async () => {
      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Minutes ahead must be between 1 and 1440 (24 hours)');
      expect(meetingSchedulingService.getUpcomingMeetings).not.toHaveBeenCalled();
    });

    it('should handle empty upcoming meetings', async () => {
      const mockMeetings = [];

      meetingSchedulingService.getUpcomingMeetings.mockResolvedValue(mockMeetings);

      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should handle service errors', async () => {
      meetingSchedulingService.getUpcomingMeetings.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/emp/meetings/upcoming')
        .query({ minutesAhead: 30 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve upcoming meetings');
      expect(response.body.error).toBe('Database connection failed');
    });
  });
});

