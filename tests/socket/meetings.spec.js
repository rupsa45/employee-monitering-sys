const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: createClient } = require('socket.io-client');
const setupMeetingsNamespace = require('../../socket/meetings');
const signalingService = require('../../service/signalingService');
const meetingAuthService = require('../../service/meetingAuthService');

// Mock dependencies
jest.mock('../../service/signalingService');
jest.mock('../../service/meetingAuthService');
jest.mock('../../config/prismaConfig', () => ({
  prisma: {
    meeting: {
      findUnique: jest.fn()
    },
    meetingParticipant: {
      updateMany: jest.fn()
    }
  }
}));

const { prisma } = require('../../config/prismaConfig');

describe('Socket.IO Meetings Namespace', () => {
  let server;
  let io;
  let client1;
  let client2;
  let client3;
  let port;

  const mockUserData1 = {
    empId: 'emp1',
    meetingId: 'meeting1',
    role: 'HOST',
    empName: 'Host User'
  };

  const mockUserData2 = {
    empId: 'emp2',
    meetingId: 'meeting1',
    role: 'PARTICIPANT',
    empName: 'Participant User'
  };

  const mockUserData3 = {
    empId: 'emp3',
    meetingId: 'meeting1',
    role: 'PARTICIPANT',
    empName: 'Another Participant'
  };

  const mockMeeting = {
    id: 'meeting1',
    status: 'LIVE',
    participants: [
      {
        empId: 'emp1',
        isBanned: false,
        employee: { empName: 'Host User' }
      },
      {
        empId: 'emp2',
        isBanned: false,
        employee: { empName: 'Participant User' }
      }
    ]
  };

  beforeAll((done) => {
    server = createServer();
    io = new Server(server);
    setupMeetingsNamespace(io);
    
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    meetingAuthService.verifyMeetingAccessToken.mockImplementation((token) => {
      if (token === 'token1') return mockUserData1;
      if (token === 'token2') return mockUserData2;
      if (token === 'token3') return mockUserData3;
      throw new Error('Invalid token');
    });

    // Mock signaling service
    signalingService.authenticateSocket.mockImplementation((token) => {
      if (token === 'token1') return mockUserData1;
      if (token === 'token2') return mockUserData2;
      if (token === 'token3') return mockUserData3;
      throw new Error('Invalid token');
    });

    signalingService.joinRoom.mockImplementation((socketId, meetingId, userData) => {
      return {
        roomId: `meeting:${meetingId}`,
        userData,
        participants: []
      };
    });

    signalingService.handleDisconnect.mockResolvedValue();
    signalingService.kickParticipant.mockResolvedValue({ targetSocketId: 'socket2', targetEmpId: 'emp2' });
    signalingService.banParticipant.mockResolvedValue({ targetSocketId: 'socket2', targetEmpId: 'emp2', banned: true });
    signalingService.endMeeting.mockResolvedValue({ meetingId: 'meeting1' });

    // Mock Prisma
    prisma.meeting.findUnique.mockResolvedValue(mockMeeting);
    prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    if (client1) client1.close();
    if (client2) client2.close();
    if (client3) client3.close();
  });

  describe('Authentication', () => {
    test('should authenticate with valid token', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        expect(client1.connected).toBe(true);
        done();
      });

      client1.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should reject connection with invalid token', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'invalid' }
      });

      client1.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication failed');
        done();
      });
    });

    test('should reject connection without token', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`);

      client1.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication failed');
        done();
      });
    });
  });

  describe('Room Management', () => {
    test('should join room and receive participants list', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client1.on('room:participants', (participants) => {
          expect(participants).toEqual([]);
          done();
        });
      });
    });

    test('should announce new peer to room', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client1.on('peer:joined', (data) => {
          expect(data.empId).toBe('emp2');
          expect(data.empName).toBe('Participant User');
          expect(data.role).toBe('PARTICIPANT');
          done();
        });
      });
    });

    test('should announce peer leaving', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client1.on('peer:left', (data) => {
            expect(data.empId).toBe('emp2');
            done();
          });

          client2.close();
        });
      });
    });
  });

  describe('WebRTC Signaling', () => {
    test('should relay WebRTC offer', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          const mockOffer = { type: 'offer', sdp: 'mock-sdp' };

          client2.on('signal:offer', (data) => {
            expect(data.fromEmpId).toBe('emp1');
            expect(data.offer).toEqual(mockOffer);
            done();
          });

          client1.emit('signal:offer', {
            targetEmpId: 'emp2',
            offer: mockOffer
          });
        });
      });
    });

    test('should relay WebRTC answer', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          const mockAnswer = { type: 'answer', sdp: 'mock-sdp' };

          client1.on('signal:answer', (data) => {
            expect(data.fromEmpId).toBe('emp2');
            expect(data.answer).toEqual(mockAnswer);
            done();
          });

          client2.emit('signal:answer', {
            targetEmpId: 'emp1',
            answer: mockAnswer
          });
        });
      });
    });

    test('should relay ICE candidates', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          const mockCandidate = { candidate: 'mock-candidate', sdpMLineIndex: 0 };

          client2.on('signal:ice', (data) => {
            expect(data.fromEmpId).toBe('emp1');
            expect(data.candidate).toEqual(mockCandidate);
            done();
          });

          client1.emit('signal:ice', {
            targetEmpId: 'emp2',
            candidate: mockCandidate
          });
        });
      });
    });

    test('should handle target not found error', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client1.on('error', (error) => {
          expect(error.message).toBe('Target participant not found');
          expect(error.code).toBe('TARGET_NOT_FOUND');
          done();
        });

        client1.emit('signal:offer', {
          targetEmpId: 'nonexistent',
          offer: { type: 'offer', sdp: 'mock-sdp' }
        });
      });
    });
  });

  describe('Host Controls', () => {
    test('should allow host to kick participant', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client2.on('host:kicked', (data) => {
            expect(data.targetEmpId).toBe('emp2');
            expect(data.reason).toBe('You have been kicked from the meeting');
            done();
          });

          client1.emit('host:kick', { targetEmpId: 'emp2' });
        });
      });
    });

    test('should allow host to ban participant', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client2.on('host:banned', (data) => {
            expect(data.targetEmpId).toBe('emp2');
            expect(data.reason).toBe('You have been banned from the meeting');
            done();
          });

          client1.emit('host:ban', { targetEmpId: 'emp2' });
        });
      });
    });

    test('should allow host to end meeting', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client1.on('host:ended', (data) => {
            expect(data.reason).toBe('Meeting ended by host');
            done();
          });

          client2.on('host:ended', (data) => {
            expect(data.reason).toBe('Meeting ended by host');
          });

          client1.emit('host:end');
        });
      });
    });

    test('should prevent non-host from kicking', (done) => {
      client2 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token2' }
      });

      client2.on('connect', () => {
        client2.on('error', (error) => {
          expect(error.message).toBe('Only host or cohost can kick participants');
          expect(error.code).toBe('KICK_ERROR');
          done();
        });

        client2.emit('host:kick', { targetEmpId: 'emp1' });
      });
    });

    test('should prevent non-host from banning', (done) => {
      client2 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token2' }
      });

      client2.on('connect', () => {
        client2.on('error', (error) => {
          expect(error.message).toBe('Only host or cohost can ban participants');
          expect(error.code).toBe('BAN_ERROR');
          done();
        });

        client2.emit('host:ban', { targetEmpId: 'emp1' });
      });
    });

    test('should prevent non-host from ending meeting', (done) => {
      client2 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token2' }
      });

      client2.on('connect', () => {
        client2.on('error', (error) => {
          expect(error.message).toBe('Only host can end meeting');
          expect(error.code).toBe('END_ERROR');
          done();
        });

        client2.emit('host:end');
      });
    });
  });

  describe('Multiple Participants', () => {
    test('should handle multiple participants in same room', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client3 = createClient(`http://localhost:${port}/meetings`, {
            auth: { meetingAccessToken: 'token3' }
          });

          let joinCount = 0;
          client1.on('peer:joined', (data) => {
            joinCount++;
            if (joinCount === 2) {
              expect(data.empId).toBe('emp3');
              done();
            }
          });
        });
      });
    });

    test('should relay signals between multiple participants', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        client2 = createClient(`http://localhost:${port}/meetings`, {
          auth: { meetingAccessToken: 'token2' }
        });

        client2.on('connect', () => {
          client3 = createClient(`http://localhost:${port}/meetings`, {
            auth: { meetingAccessToken: 'token3' }
          });

          client3.on('connect', () => {
            const mockOffer = { type: 'offer', sdp: 'mock-sdp' };

            client3.on('signal:offer', (data) => {
              expect(data.fromEmpId).toBe('emp1');
              expect(data.offer).toEqual(mockOffer);
              done();
            });

            client1.emit('signal:offer', {
              targetEmpId: 'emp3',
              offer: mockOffer
            });
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle signaling service errors', (done) => {
      signalingService.joinRoom.mockRejectedValue(new Error('Database error'));

      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('error', (error) => {
        expect(error.message).toBe('Failed to join meeting');
        expect(error.code).toBe('JOIN_ERROR');
        done();
      });
    });

    test('should handle relay errors', (done) => {
      client1 = createClient(`http://localhost:${port}/meetings`, {
        auth: { meetingAccessToken: 'token1' }
      });

      client1.on('connect', () => {
        // Mock findSocketByEmpId to throw error
        const originalFindSocket = require('../../socket/meetings').findSocketByEmpId;
        require('../../socket/meetings').findSocketByEmpId = jest.fn().mockImplementation(() => {
          throw new Error('Socket lookup error');
        });

        client1.on('error', (error) => {
          expect(error.message).toBe('Failed to relay offer');
          expect(error.code).toBe('RELAY_ERROR');
          
          // Restore original function
          require('../../socket/meetings').findSocketByEmpId = originalFindSocket;
          done();
        });

        client1.emit('signal:offer', {
          targetEmpId: 'emp2',
          offer: { type: 'offer', sdp: 'mock-sdp' }
        });
      });
    });
  });
});
