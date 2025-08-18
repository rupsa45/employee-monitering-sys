const { PrismaClient } = require('@prisma/client');
const { generateShortcode } = require('../../utils/shortcode');

const prisma = new PrismaClient();

describe('Meeting Models', () => {
  let testEmployee;
  let testTimeSheet;

  beforeAll(async () => {
    // Create a test employee
    testEmployee = await prisma.employee.create({
      data: {
        empName: 'Test Employee',
        empEmail: 'test.employee@company.com',
        empPhone: '1234567890',
        empPassword: 'hashedpassword',
        confirmPassword: 'hashedpassword',
        empTechnology: 'React',
        empGender: 'MALE'
      }
    });

    // Create a test timesheet
    testTimeSheet = await prisma.timeSheet.create({
      data: {
        empId: testEmployee.id,
        clockIn: '09:00:00',
        status: 'PRESENT'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.meetingEvent.deleteMany({
      where: { empId: testEmployee.id }
    });
    await prisma.meetingRecording.deleteMany({
      where: { createdById: testEmployee.id }
    });
    await prisma.meetingParticipant.deleteMany({
      where: { empId: testEmployee.id }
    });
    await prisma.meeting.deleteMany({
      where: { hostId: testEmployee.id }
    });
    await prisma.timeSheet.delete({
      where: { id: testTimeSheet.id }
    });
    await prisma.employee.delete({
      where: { id: testEmployee.id }
    });
    await prisma.$disconnect();
  });

  describe('Meeting Model', () => {
    test('should create a meeting with required fields', async () => {
      const meeting = await prisma.meeting.create({
        data: {
          title: 'Test Meeting',
          description: 'A test meeting',
          type: 'BASIC',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'SCHEDULED'
        }
      });

      expect(meeting).toBeDefined();
      expect(meeting.title).toBe('Test Meeting');
      expect(meeting.type).toBe('BASIC');
      expect(meeting.hostId).toBe(testEmployee.id);
      expect(meeting.status).toBe('SCHEDULED');
      expect(meeting.isPersistent).toBe(false);

      // Clean up
      await prisma.meeting.delete({ where: { id: meeting.id } });
    });

    test('should enforce unique room code constraint', async () => {
      const roomCode = generateShortcode();
      
      // Create first meeting
      const meeting1 = await prisma.meeting.create({
        data: {
          title: 'First Meeting',
          type: 'BASIC',
          hostId: testEmployee.id,
          roomCode: roomCode,
          status: 'SCHEDULED'
        }
      });

      // Try to create second meeting with same room code
      await expect(
        prisma.meeting.create({
          data: {
            title: 'Second Meeting',
            type: 'BASIC',
            hostId: testEmployee.id,
            roomCode: roomCode,
            status: 'SCHEDULED'
          }
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.meeting.delete({ where: { id: meeting1.id } });
    });

    test('should create meeting with optional fields', async () => {
      const scheduledStart = new Date();
      const scheduledEnd = new Date(scheduledStart.getTime() + 3600000); // 1 hour later

      const meeting = await prisma.meeting.create({
        data: {
          title: 'Scheduled Meeting',
          type: 'NORMAL',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'SCHEDULED',
          scheduledStart: scheduledStart,
          scheduledEnd: scheduledEnd,
          isPersistent: true
        }
      });

      expect(meeting.scheduledStart).toEqual(scheduledStart);
      expect(meeting.scheduledEnd).toEqual(scheduledEnd);
      expect(meeting.isPersistent).toBe(true);

      // Clean up
      await prisma.meeting.delete({ where: { id: meeting.id } });
    });
  });

  describe('MeetingParticipant Model', () => {
    let testMeeting;

    beforeEach(async () => {
      testMeeting = await prisma.meeting.create({
        data: {
          title: 'Participant Test Meeting',
          type: 'BASIC',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'SCHEDULED'
        }
      });
    });

    afterEach(async () => {
      await prisma.meeting.delete({ where: { id: testMeeting.id } });
    });

    test('should create a meeting participant', async () => {
      const participant = await prisma.meetingParticipant.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          role: 'PARTICIPANT',
          joinedAt: new Date(),
          attendanceSec: 0,
          isBanned: false
        }
      });

      expect(participant).toBeDefined();
      expect(participant.meetingId).toBe(testMeeting.id);
      expect(participant.empId).toBe(testEmployee.id);
      expect(participant.role).toBe('PARTICIPANT');
      expect(participant.isBanned).toBe(false);

      // Clean up
      await prisma.meetingParticipant.delete({ where: { id: participant.id } });
    });

    test('should enforce unique meetingId + empId constraint', async () => {
      // Create first participant
      const participant1 = await prisma.meetingParticipant.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          role: 'PARTICIPANT'
        }
      });

      // Try to create second participant with same meeting and employee
      await expect(
        prisma.meetingParticipant.create({
          data: {
            meetingId: testMeeting.id,
            empId: testEmployee.id,
            role: 'COHOST'
          }
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.meetingParticipant.delete({ where: { id: participant1.id } });
    });

    test('should link participant to timesheet', async () => {
      const participant = await prisma.meetingParticipant.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          role: 'PARTICIPANT',
          timeSheetId: testTimeSheet.id
        }
      });

      expect(participant.timeSheetId).toBe(testTimeSheet.id);

      // Clean up
      await prisma.meetingParticipant.delete({ where: { id: participant.id } });
    });
  });

  describe('MeetingRecording Model', () => {
    let testMeeting;

    beforeEach(async () => {
      testMeeting = await prisma.meeting.create({
        data: {
          title: 'Recording Test Meeting',
          type: 'NORMAL',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'LIVE'
        }
      });
    });

    afterEach(async () => {
      await prisma.meeting.delete({ where: { id: testMeeting.id } });
    });

    test('should create a meeting recording', async () => {
      const recording = await prisma.meetingRecording.create({
        data: {
          meetingId: testMeeting.id,
          startedAt: new Date(),
          cloudinaryUrl: 'https://res.cloudinary.com/test/video/upload/test.mp4',
          publicId: 'test_public_id',
          bytes: 1024000,
          format: 'mp4',
          createdById: testEmployee.id
        }
      });

      expect(recording).toBeDefined();
      expect(recording.meetingId).toBe(testMeeting.id);
      expect(recording.cloudinaryUrl).toBe('https://res.cloudinary.com/test/video/upload/test.mp4');
      expect(recording.publicId).toBe('test_public_id');
      expect(recording.bytes).toBe(1024000);
      expect(recording.format).toBe('mp4');
      expect(recording.createdById).toBe(testEmployee.id);

      // Clean up
      await prisma.meetingRecording.delete({ where: { id: recording.id } });
    });

    test('should create recording without optional fields', async () => {
      const recording = await prisma.meetingRecording.create({
        data: {
          meetingId: testMeeting.id,
          startedAt: new Date()
        }
      });

      expect(recording).toBeDefined();
      expect(recording.cloudinaryUrl).toBeNull();
      expect(recording.publicId).toBeNull();
      expect(recording.bytes).toBeNull();
      expect(recording.format).toBeNull();
      expect(recording.createdById).toBeNull();

      // Clean up
      await prisma.meetingRecording.delete({ where: { id: recording.id } });
    });
  });

  describe('MeetingEvent Model', () => {
    let testMeeting;

    beforeEach(async () => {
      testMeeting = await prisma.meeting.create({
        data: {
          title: 'Event Test Meeting',
          type: 'BASIC',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'LIVE'
        }
      });
    });

    afterEach(async () => {
      await prisma.meeting.delete({ where: { id: testMeeting.id } });
    });

    test('should create a meeting event', async () => {
      const event = await prisma.meetingEvent.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          type: 'JOIN',
          data: { timestamp: new Date().toISOString() }
        }
      });

      expect(event).toBeDefined();
      expect(event.meetingId).toBe(testMeeting.id);
      expect(event.empId).toBe(testEmployee.id);
      expect(event.type).toBe('JOIN');
      expect(event.data).toEqual({ timestamp: expect.any(String) });

      // Clean up
      await prisma.meetingEvent.delete({ where: { id: event.id } });
    });

    test('should create event without employee', async () => {
      const event = await prisma.meetingEvent.create({
        data: {
          meetingId: testMeeting.id,
          type: 'MEETING_START',
          data: { reason: 'Scheduled start' }
        }
      });

      expect(event).toBeDefined();
      expect(event.empId).toBeNull();
      expect(event.type).toBe('MEETING_START');

      // Clean up
      await prisma.meetingEvent.delete({ where: { id: event.id } });
    });
  });

  describe('Relationships', () => {
    let testMeeting;

    beforeEach(async () => {
      testMeeting = await prisma.meeting.create({
        data: {
          title: 'Relationship Test Meeting',
          type: 'BASIC',
          hostId: testEmployee.id,
          roomCode: generateShortcode(),
          status: 'LIVE'
        }
      });
    });

    afterEach(async () => {
      await prisma.meeting.delete({ where: { id: testMeeting.id } });
    });

    test('should include related data when querying meeting', async () => {
      // Create participant
      const participant = await prisma.meetingParticipant.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          role: 'PARTICIPANT'
        }
      });

      // Create recording
      const recording = await prisma.meetingRecording.create({
        data: {
          meetingId: testMeeting.id,
          startedAt: new Date(),
          createdById: testEmployee.id
        }
      });

      // Create event
      const event = await prisma.meetingEvent.create({
        data: {
          meetingId: testMeeting.id,
          empId: testEmployee.id,
          type: 'JOIN'
        }
      });

      // Query meeting with relations
      const meetingWithRelations = await prisma.meeting.findUnique({
        where: { id: testMeeting.id },
        include: {
          host: true,
          participants: {
            include: {
              employee: true,
              timeSheet: true
            }
          },
          recordings: {
            include: {
              createdBy: true
            }
          },
          events: {
            include: {
              employee: true
            }
          }
        }
      });

      expect(meetingWithRelations).toBeDefined();
      expect(meetingWithRelations.host.id).toBe(testEmployee.id);
      expect(meetingWithRelations.participants).toHaveLength(1);
      expect(meetingWithRelations.recordings).toHaveLength(1);
      expect(meetingWithRelations.events).toHaveLength(1);

      // Clean up
      await prisma.meetingEvent.delete({ where: { id: event.id } });
      await prisma.meetingRecording.delete({ where: { id: recording.id } });
      await prisma.meetingParticipant.delete({ where: { id: participant.id } });
    });
  });
});



