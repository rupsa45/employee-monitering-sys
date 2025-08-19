const empMeetingRecordingController = require('../../employee_app/controller/empMeetingRecordingController');
const { uploadFile, deleteFile } = require('../../service/cloudinaryClient');

// Mock dependencies
jest.mock('../../service/cloudinaryClient');
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn()
    },
    meetingRecording: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    employee: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('../../utils/logger');

const { prisma } = require('../../config/prismaConfig');

describe('EmpMeetingRecordingController', () => {
  let mockReq, mockRes, mockNext;

  const mockEmployee = {
    id: 'emp123',
    empName: 'John Doe',
    empEmail: 'john@example.com',
    role: 'employee'
  };

  const mockMeeting = {
    id: 'meeting123',
    title: 'Test Meeting',
    status: 'LIVE',
    hostId: 'host123',
    participants: [
      {
        empId: 'emp123',
        role: 'PARTICIPANT'
      }
    ]
  };

  const mockRecording = {
    id: 'recording123',
    meetingId: 'meeting123',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    endedAt: new Date('2024-01-01T11:00:00Z'),
    cloudinaryUrl: 'https://res.cloudinary.com/test/video/upload/test.mp4',
    publicId: 'meetings/meeting123/recording_123',
    bytes: 1024000,
    format: 'video/webm',
    createdById: 'emp123',
    createdAt: new Date(),
    createdBy: mockEmployee
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: { id: 'meeting123' },
      body: {},
      user: mockEmployee,
      file: {
        path: '/tmp/test-video.webm',
        size: 1024000,
        mimetype: 'video/webm'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('uploadRecording', () => {
    it('should upload recording successfully', async () => {
      const startedAt = '2024-01-01T10:00:00Z';
      const endedAt = '2024-01-01T11:00:00Z';
      
      mockReq.body = { startedAt, endedAt };
      
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      uploadFile.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/video/upload/test.mp4',
        public_id: 'meetings/meeting123/recording_123'
      });
      prisma.meetingRecording.create.mockResolvedValue(mockRecording);

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(prisma.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'meeting123' },
        include: {
          participants: {
            where: { empId: 'emp123' }
          }
        }
      });

      expect(uploadFile).toHaveBeenCalledWith('/tmp/test-video.webm', {
        resource_type: 'video',
        folder: 'meetings/meeting123',
        public_id: expect.stringContaining('recording_'),
        overwrite: false
      });

      expect(prisma.meetingRecording.create).toHaveBeenCalledWith({
        data: {
          meetingId: 'meeting123',
          startedAt: new Date(startedAt),
          endedAt: new Date(endedAt),
          cloudinaryUrl: 'https://res.cloudinary.com/test/video/upload/test.mp4',
          publicId: 'meetings/meeting123/recording_123',
          bytes: 1024000,
          format: 'video/webm',
          createdById: 'emp123'
        },
        include: {
          createdBy: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recording uploaded successfully',
        data: expect.objectContaining({
          id: 'recording123',
          durationSec: 3600,
          cloudinaryUrl: 'https://res.cloudinary.com/test/video/upload/test.mp4'
        })
      });
    });

    it('should return 400 when file is missing', async () => {
      mockReq.file = null;

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recording file is required'
      });
    });

    it('should return 400 when timestamps are missing', async () => {
      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Started and ended timestamps are required'
      });
    });

    it('should return 404 when meeting not found', async () => {
      mockReq.body = { startedAt: '2024-01-01T10:00:00Z', endedAt: '2024-01-01T11:00:00Z' };
      prisma.meeting.findUnique.mockResolvedValue(null);

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Meeting not found'
      });
    });

    it('should return 403 when user is not a participant', async () => {
      mockReq.body = { startedAt: '2024-01-01T10:00:00Z', endedAt: '2024-01-01T11:00:00Z' };
      const meetingWithoutParticipant = { ...mockMeeting, participants: [] };
      prisma.meeting.findUnique.mockResolvedValue(meetingWithoutParticipant);

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not a participant in this meeting'
      });
    });

    it('should return 400 when timestamps are invalid', async () => {
      mockReq.body = { startedAt: 'invalid-date', endedAt: '2024-01-01T11:00:00Z' };
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid timestamp format'
      });
    });

    it('should return 400 when end time is before start time', async () => {
      mockReq.body = { startedAt: '2024-01-01T11:00:00Z', endedAt: '2024-01-01T10:00:00Z' };
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);

      await empMeetingRecordingController.uploadRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'End time must be after start time'
      });
    });
  });

  describe('getMeetingRecordings', () => {
    it('should get recordings successfully', async () => {
      mockReq.query = { page: '1', limit: '10' };
      
      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingRecording.findMany.mockResolvedValue([mockRecording]);
      prisma.meetingRecording.count.mockResolvedValue(1);

      await empMeetingRecordingController.getMeetingRecordings(mockReq, mockRes);

      expect(prisma.meetingRecording.findMany).toHaveBeenCalledWith({
        where: { meetingId: 'meeting123' },
        include: {
          createdBy: {
            select: {
              id: true,
              empName: true,
              empEmail: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          recordings: expect.arrayContaining([
            expect.objectContaining({
              id: 'recording123',
              durationSec: 3600
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            totalCount: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          })
        }
      });
    });

    it('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await empMeetingRecordingController.getMeetingRecordings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Meeting not found'
      });
    });

    it('should return 403 when user is not a participant', async () => {
      const meetingWithoutParticipant = { ...mockMeeting, participants: [] };
      prisma.meeting.findUnique.mockResolvedValue(meetingWithoutParticipant);

      await empMeetingRecordingController.getMeetingRecordings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not a participant in this meeting'
      });
    });
  });

  describe('deleteRecording', () => {
    it('should delete recording successfully when user is creator', async () => {
      mockReq.params = { id: 'meeting123', recordingId: 'recording123' };
      
      const recordingWithMeeting = {
        ...mockRecording,
        meeting: mockMeeting
      };
      
      prisma.meetingRecording.findUnique.mockResolvedValue(recordingWithMeeting);
      deleteFile.mockResolvedValue();
      prisma.meetingRecording.delete.mockResolvedValue(mockRecording);

      await empMeetingRecordingController.deleteRecording(mockReq, mockRes);

      expect(deleteFile).toHaveBeenCalledWith('meetings/meeting123/recording_123');
      expect(prisma.meetingRecording.delete).toHaveBeenCalledWith({
        where: { id: 'recording123' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recording deleted successfully'
      });
    });

    it('should delete recording when user is meeting host', async () => {
      mockReq.params = { id: 'meeting123', recordingId: 'recording123' };
      mockReq.user.id = 'host123';
      
      const recordingWithMeeting = {
        ...mockRecording,
        createdById: 'emp123',
        meeting: { ...mockMeeting, hostId: 'host123' }
      };
      
      prisma.meetingRecording.findUnique.mockResolvedValue(recordingWithMeeting);
      deleteFile.mockResolvedValue();
      prisma.meetingRecording.delete.mockResolvedValue(mockRecording);

      await empMeetingRecordingController.deleteRecording(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Recording deleted successfully'
      });
    });

    it('should return 404 when recording not found', async () => {
      mockReq.params = { id: 'meeting123', recordingId: 'recording123' };
      prisma.meetingRecording.findUnique.mockResolvedValue(null);

      await empMeetingRecordingController.deleteRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recording not found'
      });
    });

    it('should return 403 when user is not creator or host', async () => {
      mockReq.params = { id: 'meeting123', recordingId: 'recording123' };
      mockReq.user.id = 'other123';
      
      const recordingWithMeeting = {
        ...mockRecording,
        createdById: 'emp123',
        meeting: { ...mockMeeting, hostId: 'host123' }
      };
      
      prisma.meetingRecording.findUnique.mockResolvedValue(recordingWithMeeting);

      await empMeetingRecordingController.deleteRecording(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You can only delete recordings you created or if you are the meeting host'
      });
    });
  });

  describe('getRecordingStats', () => {
    it('should get recording statistics successfully', async () => {
      const mockStats = {
        _count: { id: 5 },
        _sum: { bytes: 5120000 }
      };

      const mockCreatorStats = [
        {
          createdById: 'emp123',
          _count: { id: 3 },
          _sum: { bytes: 3072000 }
        },
        {
          createdById: 'emp456',
          _count: { id: 2 },
          _sum: { bytes: 2048000 }
        }
      ];

      const mockCreators = [
        { id: 'emp123', empName: 'John Doe', empEmail: 'john@example.com' },
        { id: 'emp456', empName: 'Jane Smith', empEmail: 'jane@example.com' }
      ];

      prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
      prisma.meetingRecording.aggregate.mockResolvedValue(mockStats);
      prisma.meetingRecording.groupBy.mockResolvedValue(mockCreatorStats);
      prisma.employee.findMany.mockResolvedValue(mockCreators);

      await empMeetingRecordingController.getRecordingStats(mockReq, mockRes);

      expect(prisma.meetingRecording.aggregate).toHaveBeenCalledWith({
        where: { meetingId: 'meeting123' },
        _count: { id: true },
        _sum: { bytes: true }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalRecordings: 5,
          totalBytes: 5120000,
          creators: expect.arrayContaining([
            expect.objectContaining({
              creator: expect.objectContaining({
                empName: 'John Doe'
              }),
              recordingCount: 3,
              totalBytes: 3072000
            })
          ])
        }
      });
    });

    it('should return 404 when meeting not found', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await empMeetingRecordingController.getRecordingStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Meeting not found'
      });
    });

    it('should return 403 when user is not a participant', async () => {
      const meetingWithoutParticipant = { ...mockMeeting, participants: [] };
      prisma.meeting.findUnique.mockResolvedValue(meetingWithoutParticipant);

      await empMeetingRecordingController.getRecordingStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not a participant in this meeting'
      });
    });
  });
});




