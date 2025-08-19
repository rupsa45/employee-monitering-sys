const signalingService = require('../service/signalingService');
// Logger removed for cleaner output
const { socketRateLimiter } = require('../middleware/rateLimiter');

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
        logger.warn('Socket connection rate limited', {
          socketId: socket.id,
          ip: clientIp
        });
        return next(new Error('Connection rate limit exceeded'));
      }

      const token = socket.handshake.auth.meetingAccessToken;
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

      // Join the meeting room
      const joinResult = await signalingService.joinRoom(socket.id, meetingId, userData);
      const roomId = joinResult.roomId;

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

      logger.info('Socket connected to meeting', {
        socketId: socket.id,
        empId: userData.empId,
        meetingId,
        roomId,
        participantCount: participants.length + 1
      });

      // Handle peer:join event (announce presence)
      socket.on('peer:join', (data) => {
        try {
          logger.info('Peer joined announcement', {
            socketId: socket.id,
            empId: userData.empId,
            meetingId
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
            logger.warn('WebRTC offer rate limited', {
              socketId: socket.id,
              empId: userData.empId
            });
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
            
            logger.debug('WebRTC offer relayed', {
              fromSocketId: socket.id,
              toSocketId: targetSocket.id,
              fromEmpId: userData.empId,
              toEmpId: targetEmpId
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
            logger.warn('WebRTC answer rate limited', {
              socketId: socket.id,
              empId: userData.empId
            });
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
            
            logger.debug('WebRTC answer relayed', {
              fromSocketId: socket.id,
              toSocketId: targetSocket.id,
              fromEmpId: userData.empId,
              toEmpId: targetEmpId
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
          if (!socketRateLimiter.canEmitEvent(socket.id, 'ice-candidate')) {
            logger.warn('ICE candidate rate limited', {
              socketId: socket.id,
              empId: userData.empId
            });
            socket.emit('error', {
              message: 'Too many ICE candidate attempts. Please wait before sending more candidates.',
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
            
            logger.debug('ICE candidate relayed', {
              fromSocketId: socket.id,
              toSocketId: targetSocket.id,
              fromEmpId: userData.empId,
              toEmpId: targetEmpId
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

      // Handle host controls
      socket.on('host:kick', async (data) => {
        try {
          const { targetEmpId } = data;
          
          const kickResult = await signalingService.kickParticipant(socket.id, targetEmpId);
          
          // Notify room about the kick
          meetingsNamespace.to(roomId).emit('host:kicked', {
            targetEmpId,
            reason: 'Kicked by host'
          });
          
          // Disconnect the kicked participant
          const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
          if (targetSocket) {
            targetSocket.emit('host:kicked', {
              targetEmpId,
              reason: 'You have been kicked from the meeting'
            });
            targetSocket.disconnect();
          }
          
          logger.info('Participant kicked via socket', {
            kickerSocketId: socket.id,
            kickerEmpId: userData.empId,
            targetEmpId,
            meetingId
          });
        } catch (error) {
          logger.error('Error handling host:kick', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: error.message,
            code: 'KICK_ERROR'
          });
        }
      });

      socket.on('host:ban', async (data) => {
        try {
          const { targetEmpId } = data;
          
          const banResult = await signalingService.banParticipant(socket.id, targetEmpId);
          
          // Notify room about the ban
          meetingsNamespace.to(roomId).emit('host:banned', {
            targetEmpId,
            reason: 'Banned by host'
          });
          
          // Disconnect the banned participant
          const targetSocket = findSocketByEmpId(meetingsNamespace, targetEmpId, meetingId);
          if (targetSocket) {
            targetSocket.emit('host:banned', {
              targetEmpId,
              reason: 'You have been banned from the meeting'
            });
            targetSocket.disconnect();
          }
          
          logger.info('Participant banned via socket', {
            bannerSocketId: socket.id,
            bannerEmpId: userData.empId,
            targetEmpId,
            meetingId
          });
        } catch (error) {
          logger.error('Error handling host:ban', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: error.message,
            code: 'BAN_ERROR'
          });
        }
      });

      socket.on('host:end', async (data) => {
        try {
          await signalingService.endMeeting(socket.id);
          
          // Notify all participants that meeting ended
          meetingsNamespace.to(roomId).emit('host:ended', {
            reason: 'Meeting ended by host'
          });
          
          // Disconnect all participants
          const room = meetingsNamespace.adapter.rooms.get(roomId);
          if (room) {
            for (const socketId of room) {
              const participantSocket = meetingsNamespace.sockets.get(socketId);
              if (participantSocket) {
                participantSocket.disconnect();
              }
            }
          }
          
          logger.info('Meeting ended via socket', {
            hostSocketId: socket.id,
            hostEmpId: userData.empId,
            meetingId
          });
        } catch (error) {
          logger.error('Error handling host:end', {
            socketId: socket.id,
            error: error.message
          });
          socket.emit('error', {
            message: error.message,
            code: 'END_ERROR'
          });
        }
      });

      // Handle peer:leave event .
      socket.on('peer:leave', () => {
        try {
          logger.info('Peer leave announcement', {
            socketId: socket.id,
            empId: userData.empId,
            meetingId
          });
        } catch (error) {
          logger.error('Error handling peer:leave', {
            socketId: socket.id,
            error: error.message
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async (reason) => {
        try {
          // Announce to room that peer left
          socket.to(roomId).emit('peer:left', {
            empId: userData.empId,
            socketId: socket.id
          });
          
          // Clean up signaling service
          await signalingService.handleDisconnect(socket.id);
          
          logger.info('Socket disconnected from meeting', {
            socketId: socket.id,
            empId: userData.empId,
            meetingId,
            reason
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
      socket.emit('error', {
        message: 'Failed to join meeting',
        code: 'JOIN_ERROR'
      });
      socket.disconnect();
    }
  });

  return meetingsNamespace;
}

/**
 * Helper function to find socket by employee ID in a specific meeting
 * @param {Namespace} namespace - Socket.IO namespace
 * @param {string} empId - Employee ID
 * @param {string} meetingId - Meeting ID
 * @returns {Socket|null} Socket instance or null
 */
function findSocketByEmpId(namespace, empId, meetingId) {
  const roomId = `meeting:${meetingId}`;
  const room = namespace.adapter.rooms.get(roomId);
  
  if (room) {
    for (const socketId of room) {
      const socket = namespace.sockets.get(socketId);
      if (socket && socket.userData && socket.userData.empId === empId) {
        return socket;
      }
    }
  }
  
  return null;
}

module.exports = setupMeetingsNamespace;

