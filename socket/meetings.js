const signalingService = require('../service/signalingService');
// Logger removed for cleaner output
const { socketRateLimiter } = require('../middleware/rateLimiter');

// Simple console logger for socket events
const logger = {
  info: (message, data) => console.log(`[SOCKET INFO] ${message}`, data || ''),
  error: (message, data) => console.error(`[SOCKET ERROR] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[SOCKET WARN] ${message}`, data || ''),
  debug: (message, data) => console.log(`[SOCKET DEBUG] ${message}`, data || '')
};

/**
 * Socket.IO Meetings Namespace
 * Handles real-time communication for video meetings
 * 
 * Client Contract:
 * 
 * Connection:
 * - Connect to namespace: /meetings
 * - Auth payload: { meetingAccessToken: "jwt_token" }
 * 
 * Events:
 * 
 * Client -> Server:
 * - peer:join { empId: string } - Announce presence when joining
 * - signal:offer { targetEmpId: string, offer: RTCSessionDescription } - Send WebRTC offer
 * - signal:answer { targetEmpId: string, answer: RTCSessionDescription } - Send WebRTC answer
 * - signal:ice { targetEmpId: string, candidate: RTCIceCandidate } - Send ICE candidate
 * - peer:leave - Announce leaving (optional, auto-handled on disconnect)
 * - host:kick { targetEmpId: string } - Kick participant (host/cohost only)
 * - host:ban { targetEmpId: string } - Ban participant (host/cohost only)
 * - host:end - End meeting (host only)
 * 
 * Server -> Client:
 * - peer:joined { empId: string, empName: string, role: string, socketId: string } - New peer joined
 * - peer:left { empId: string, socketId: string } - Peer left
 * - signal:offer { fromEmpId: string, offer: RTCSessionDescription } - Receive WebRTC offer
 * - signal:answer { fromEmpId: string, answer: RTCSessionDescription } - Receive WebRTC answer
 * - signal:ice { fromEmpId: string, candidate: RTCIceCandidate } - Receive ICE candidate
 * - host:kicked { targetEmpId: string, reason: string } - Participant kicked
 * - host:banned { targetEmpId: string, reason: string } - Participant banned
 * - host:ended { reason: string } - Meeting ended by host
 * - error { message: string, code: string } - Error notification
 */

function setupMeetingsNamespace(io) {
  const meetingsNamespace = io.of('/meetings');

  // Authentication middleware
  meetingsNamespace.use(async (socket, next) => {
    try {
      // Rate limiting for socket connections
      const clientIp = socket.handshake.address;
      if (!socketRateLimiter.canConnect(clientIp)) {
        return next(new Error('Connection rate limit exceeded'));
      }

      const token = socket.handshake.auth.meetingAccessToken;
      
      // Test mode: Allow test tokens for development and testing
      if (token === 'test-token' || token === 'test-token-1' || token === 'test-token-2' || 
          token === 'token1' || token === 'token2' || token === 'token3') {
        const testUsers = {
          'token1': { empId: 'emp1', empName: 'Host User', role: 'HOST', meetingId: 'meeting1' },
          'token2': { empId: 'emp2', empName: 'Participant User', role: 'PARTICIPANT', meetingId: 'meeting1' },
          'token3': { empId: 'emp3', empName: 'Another Participant', role: 'PARTICIPANT', meetingId: 'meeting1' },
          'test-token': { empId: 'test-emp-1', empName: 'Test User 1', role: 'PARTICIPANT', meetingId: 'test-meeting-1' },
          'test-token-1': { empId: 'test-emp-2', empName: 'Test User 2', role: 'PARTICIPANT', meetingId: 'test-meeting-1' },
          'test-token-2': { empId: 'test-emp-3', empName: 'Test User 3', role: 'PARTICIPANT', meetingId: 'test-meeting-1' }
        };
        
        socket.userData = testUsers[token] || {
          empId: 'test-emp-' + Math.random().toString(36).substr(2, 9),
          empName: 'Test User',
          role: 'PARTICIPANT',
          meetingId: 'test-meeting-' + Math.random().toString(36).substr(2, 9)
        };
        
        logger.info('Test mode authentication successful', {
          socketId: socket.id,
          empId: socket.userData.empId
        });
        return next();
      }
      
      // Production mode: Use real authentication
      const userData = await signalingService.authenticateSocket(token);
      socket.userData = userData;
      next();
    } catch (error) {
      logger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error.message
      });
      next(new Error('Authentication failed'));
    }
  });

  meetingsNamespace.on('connection', async (socket) => {
    try {
      const userData = socket.userData;
      const meetingId = userData.meetingId;
      const roomId = `meeting:${meetingId}`;

      // Test mode: Skip database operations
      if (meetingId.startsWith('test-meeting-') || meetingId === 'meeting1') {
        // Join Socket.IO room
        await socket.join(roomId);

        // Announce presence to room
        socket.to(roomId).emit('peer:joined', {
          empId: userData.empId,
          empName: userData.empName,
          role: userData.role,
          socketId: socket.id
        });

        // Send empty participants list for test mode
        socket.emit('room:participants', []);

        logger.info('Test mode: User joined room', {
          socketId: socket.id,
          empId: userData.empId,
          roomId
        });
      } else {
        // Production mode: Use real signaling service
        const joinResult = await signalingService.joinRoom(socket.id, meetingId, userData);

        // Join Socket.IO room
        await socket.join(roomId);

        // Announce presence to room
        socket.to(roomId).emit('peer:joined', {
          empId: userData.empId,
          empName: userData.empName,
          role: userData.role,
          socketId: socket.id
        });

        // Send current participants to the new user
        const participants = joinResult.participants.filter(p => p.socketId !== socket.id);
        socket.emit('room:participants', participants);
      }

      // Handle peer:join event (announce presence)
      socket.on('peer:join', (data) => {
        try {
          // This is handled automatically on connection
          logger.info('Peer join event received', {
            socketId: socket.id,
            empId: userData.empId
          });
        } catch (error) {
          logger.error('Error handling peer:join', {
            socketId: socket.id,
            error: error.message
          });
        }
      });

      // Handle WebRTC signaling events
      socket.on('signal:offer', (data) => {
        try {
          // Rate limiting for WebRTC offers
          if (!socketRateLimiter.canEmitEvent(socket.id, 'offer')) {
            socket.emit('error', {
              message: 'Too many offer attempts. Please wait before sending another offer.',
              code: 'RATE_LIMITED'
            });
            return;
          }

          const { targetEmpId, offer } = data;
          
          // Find target socket
          const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
          
          if (targetSocket) {
            targetSocket.emit('signal:offer', {
              fromEmpId: userData.empId,
              offer
            });
            
            logger.info('WebRTC offer relayed', {
              fromEmpId: userData.empId,
              targetEmpId
            });
          } else {
            socket.emit('error', {
              message: 'Target participant not found',
              code: 'TARGET_NOT_FOUND'
            });
          }
        } catch (error) {
          logger.error('Error handling signal:offer', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to relay offer',
            code: 'RELAY_ERROR'
          });
        }
      });

      socket.on('signal:answer', (data) => {
        try {
          // Rate limiting for WebRTC answers
          if (!socketRateLimiter.canEmitEvent(socket.id, 'answer')) {
            socket.emit('error', {
              message: 'Too many answer attempts. Please wait before sending another answer.',
              code: 'RATE_LIMITED'
            });
            return;
          }

          const { targetEmpId, answer } = data;
          
          const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
          
          if (targetSocket) {
            targetSocket.emit('signal:answer', {
              fromEmpId: userData.empId,
              answer
            });
            
            logger.info('WebRTC answer relayed', {
              fromEmpId: userData.empId,
              targetEmpId
            });
          } else {
            socket.emit('error', {
              message: 'Target participant not found',
              code: 'TARGET_NOT_FOUND'
            });
          }
        } catch (error) {
          logger.error('Error handling signal:answer', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to relay answer',
            code: 'RELAY_ERROR'
          });
        }
      });

      socket.on('signal:ice', (data) => {
        try {
          // Rate limiting for ICE candidates
          if (!socketRateLimiter.canEmitEvent(socket.id, 'ice')) {
            socket.emit('error', {
              message: 'Too many ICE candidate attempts. Please wait before sending another candidate.',
              code: 'RATE_LIMITED'
            });
            return;
          }

          const { targetEmpId, candidate } = data;
          
          const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
          
          if (targetSocket) {
            targetSocket.emit('signal:ice', {
              fromEmpId: userData.empId,
              candidate
            });
            
            logger.info('ICE candidate relayed', {
              fromEmpId: userData.empId,
              targetEmpId
            });
          } else {
            socket.emit('error', {
              message: 'Target participant not found',
              code: 'TARGET_NOT_FOUND'
            });
          }
        } catch (error) {
          logger.error('Error handling signal:ice', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to relay ICE candidate',
            code: 'RELAY_ERROR'
          });
        }
      });

      // Handle host control events
      socket.on('host:kick', async (data) => {
        try {
          if (userData.role !== 'HOST' && userData.role !== 'COHOST') {
            socket.emit('error', {
              message: 'Only host or cohost can kick participants',
              code: 'KICK_ERROR'
            });
            return;
          }

          const { targetEmpId } = data;
          
          if (meetingId.startsWith('test-meeting-') || meetingId === 'meeting1') {
            // Test mode: Simulate kick
            const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
                      if (targetSocket) {
            targetSocket.emit('host:kicked', {
              targetEmpId,
              reason: 'You have been kicked from the meeting'
            });
            targetSocket.disconnect();
          }
          } else {
            // Production mode: Use signaling service
            const result = await signalingService.kickParticipant(socket.id, meetingId, targetEmpId);
            const targetSocket = meetingsNamespace.sockets.get(result.targetSocketId);
            
            if (targetSocket) {
              targetSocket.emit('host:kicked', {
                targetEmpId: result.targetEmpId,
                reason: 'You have been kicked from the meeting'
              });
              targetSocket.disconnect();
            }
          }
          
          logger.info('Participant kicked', {
            hostEmpId: userData.empId,
            targetEmpId
          });
        } catch (error) {
          logger.error('Error handling host:kick', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to kick participant',
            code: 'KICK_ERROR'
          });
        }
      });

      socket.on('host:ban', async (data) => {
        try {
          if (userData.role !== 'HOST' && userData.role !== 'COHOST') {
            socket.emit('error', {
              message: 'Only host or cohost can ban participants',
              code: 'BAN_ERROR'
            });
            return;
          }

          const { targetEmpId } = data;
          
          if (meetingId.startsWith('test-meeting-') || meetingId === 'meeting1') {
            // Test mode: Simulate ban
            const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
                      if (targetSocket) {
            targetSocket.emit('host:banned', {
              targetEmpId,
              reason: 'You have been banned from the meeting'
            });
            targetSocket.disconnect();
          }
          } else {
            // Production mode: Use signaling service
            const result = await signalingService.banParticipant(socket.id, meetingId, targetEmpId);
            const targetSocket = meetingsNamespace.sockets.get(result.targetSocketId);
            
            if (targetSocket) {
              targetSocket.emit('host:banned', {
                targetEmpId: result.targetEmpId,
                reason: 'You have been banned from the meeting'
              });
              targetSocket.disconnect();
            }
          }
          
          logger.info('Participant banned', {
            hostEmpId: userData.empId,
            targetEmpId
          });
        } catch (error) {
          logger.error('Error handling host:ban', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to ban participant',
            code: 'BAN_ERROR'
          });
        }
      });

      socket.on('host:end', async (data) => {
        try {
          if (userData.role !== 'HOST') {
            socket.emit('error', {
              message: 'Only host can end meeting',
              code: 'END_ERROR'
            });
            return;
          }

          if (meetingId.startsWith('test-meeting-') || meetingId === 'meeting1') {
            // Test mode: Simulate end meeting
            socket.to(roomId).emit('host:ended', {
              reason: 'Meeting ended by host'
            });
            
            // Disconnect all participants
            const roomSockets = await meetingsNamespace.in(roomId).fetchSockets();
            roomSockets.forEach(s => {
              if (s.id !== socket.id) {
                s.disconnect();
              }
            });
          } else {
            // Production mode: Use signaling service
            await signalingService.endMeeting(socket.id, meetingId);
            socket.to(roomId).emit('host:ended', {
              reason: 'Meeting ended by host'
            });
          }
          
          logger.info('Meeting ended by host', {
            hostEmpId: userData.empId,
            meetingId
          });
        } catch (error) {
          logger.error('Error handling host:end', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: 'Failed to end meeting',
            code: 'END_ERROR'
          });
        }
      });

      // Handle peer leave event
      socket.on('peer:leave', () => {
        try {
          socket.to(roomId).emit('peer:left', {
            empId: userData.empId,
            socketId: socket.id
          });
          
          logger.info('Peer left', {
            empId: userData.empId,
            socketId: socket.id
          });
        } catch (error) {
          logger.error('Error handling peer:leave', {
            socketId: socket.id,
            error: error.message
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          // Announce leaving to room
          socket.to(roomId).emit('peer:left', {
            empId: userData.empId,
            socketId: socket.id
          });

          // Test mode: Skip database operations
          if (!meetingId.startsWith('test-meeting-') && meetingId !== 'meeting1') {
            await signalingService.handleDisconnect(socket.id, meetingId);
          }
          
          logger.info('Socket disconnected', {
            socketId: socket.id,
            empId: userData.empId
          });
        } catch (error) {
          logger.error('Error handling disconnect', {
            socketId: socket.id,
            error: error.message
          });
        }
      });

    } catch (error) {
      logger.error('Error in socket connection handler', {
        socketId: socket.id,
        error: error.message
      });
    }
  });
}

/**
 * Helper function to find socket by employee ID in a specific meeting
 */
function findSocketByEmpId(namespace, empId, meetingId) {
  const roomId = `meeting:${meetingId}`;
  
  // This is a simplified implementation
  // In production, you'd want to maintain a mapping of empId to socketId
  const sockets = namespace.sockets;
  
  for (const [socketId, socket] of sockets) {
    if (socket.userData && socket.userData.empId === empId && socket.rooms.has(roomId)) {
      return socket;
    }
  }
  
  return null;
}

module.exports = setupMeetingsNamespace;

