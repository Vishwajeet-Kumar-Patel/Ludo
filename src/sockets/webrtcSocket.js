const logger = require('../config/logger');
const config = require('../config');

class WebRTCSocketHandler {
    constructor(io) {
        this.io = io;
        this.webrtcNamespace = io.of('/webrtc');
        this.rooms = new Map(); // roomId -> Set of socketIds
        this.users = new Map(); // socketId -> { userId, roomId, username }
    }

    handleConnection(socket) {
        logger.info(`WebRTC client connected: ${socket.id}`);

        // Room management
        socket.on('join_voice', (data) => this.handleJoinVoice(socket, data));
        socket.on('leave_voice', (data) => this.handleLeaveVoice(socket, data));
        
        // WebRTC signaling
        socket.on('offer', (data) => this.handleOffer(socket, data));
        socket.on('answer', (data) => this.handleAnswer(socket, data));
        socket.on('ice_candidate', (data) => this.handleICECandidate(socket, data));
        
        // Call status
        socket.on('mute', (data) => this.handleMute(socket, data));
        socket.on('unmute', (data) => this.handleUnmute(socket, data));
        
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    async handleJoinVoice(socket, data) {
        try {
            const { roomId, userId, username } = data;

            // Store user info
            this.users.set(socket.id, { userId, roomId, username });

            // Add to room
            if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, new Set());
            }
            this.rooms.get(roomId).add(socket.id);

            // Join Socket.IO room
            socket.join(`voice_${roomId}`);

            // Get existing participants
            const existingParticipants = Array.from(this.rooms.get(roomId))
                .filter(id => id !== socket.id)
                .map(id => {
                    const user = this.users.get(id);
                    return {
                        socketId: id,
                        userId: user.userId,
                        username: user.username
                    };
                });

            // Send existing participants to new user
            socket.emit('existing_participants', {
                participants: existingParticipants,
                iceServers: [
                    config.webrtc.stunServer,
                    config.webrtc.turnServer
                ]
            });

            // Notify existing participants about new user
            socket.to(`voice_${roomId}`).emit('new_participant', {
                socketId: socket.id,
                userId,
                username
            });

            logger.info(`User ${userId} joined voice room ${roomId}`);
        } catch (error) {
            logger.error('Join voice error:', error);
            socket.emit('voice_error', { message: 'Failed to join voice chat' });
        }
    }

    async handleLeaveVoice(socket, data) {
        try {
            const userInfo = this.users.get(socket.id);
            if (!userInfo) return;

            const { roomId } = userInfo;
            
            // Remove from room
            if (this.rooms.has(roomId)) {
                this.rooms.get(roomId).delete(socket.id);
                
                // Delete room if empty
                if (this.rooms.get(roomId).size === 0) {
                    this.rooms.delete(roomId);
                }
            }

            // Leave Socket.IO room
            socket.leave(`voice_${roomId}`);

            // Notify others
            socket.to(`voice_${roomId}`).emit('participant_left', {
                socketId: socket.id,
                userId: userInfo.userId,
                username: userInfo.username
            });

            // Clean up
            this.users.delete(socket.id);

            logger.info(`User ${userInfo.userId} left voice room ${roomId}`);
        } catch (error) {
            logger.error('Leave voice error:', error);
        }
    }

    async handleOffer(socket, data) {
        try {
            const { targetSocketId, offer } = data;
            const sender = this.users.get(socket.id);

            if (!sender) {
                socket.emit('voice_error', { message: 'User not found' });
                return;
            }

            // Forward offer to target peer
            this.webrtcNamespace.to(targetSocketId).emit('offer', {
                from: socket.id,
                offer,
                userId: sender.userId,
                username: sender.username
            });

            logger.info(`Offer sent from ${socket.id} to ${targetSocketId}`);
        } catch (error) {
            logger.error('Offer error:', error);
            socket.emit('voice_error', { message: 'Failed to send offer' });
        }
    }

    async handleAnswer(socket, data) {
        try {
            const { targetSocketId, answer } = data;
            const sender = this.users.get(socket.id);

            if (!sender) {
                socket.emit('voice_error', { message: 'User not found' });
                return;
            }

            // Forward answer to target peer
            this.webrtcNamespace.to(targetSocketId).emit('answer', {
                from: socket.id,
                answer,
                userId: sender.userId,
                username: sender.username
            });

            logger.info(`Answer sent from ${socket.id} to ${targetSocketId}`);
        } catch (error) {
            logger.error('Answer error:', error);
            socket.emit('voice_error', { message: 'Failed to send answer' });
        }
    }

    async handleICECandidate(socket, data) {
        try {
            const { targetSocketId, candidate } = data;

            // Forward ICE candidate to target peer
            this.webrtcNamespace.to(targetSocketId).emit('ice_candidate', {
                from: socket.id,
                candidate
            });

            logger.debug(`ICE candidate sent from ${socket.id} to ${targetSocketId}`);
        } catch (error) {
            logger.error('ICE candidate error:', error);
        }
    }

    async handleMute(socket, data) {
        try {
            const userInfo = this.users.get(socket.id);
            if (!userInfo) return;

            const { roomId } = userInfo;
            
            // Notify others in room
            socket.to(`voice_${roomId}`).emit('participant_muted', {
                socketId: socket.id,
                userId: userInfo.userId,
                username: userInfo.username
            });

            logger.info(`User ${userInfo.userId} muted in room ${roomId}`);
        } catch (error) {
            logger.error('Mute error:', error);
        }
    }

    async handleUnmute(socket, data) {
        try {
            const userInfo = this.users.get(socket.id);
            if (!userInfo) return;

            const { roomId } = userInfo;
            
            // Notify others in room
            socket.to(`voice_${roomId}`).emit('participant_unmuted', {
                socketId: socket.id,
                userId: userInfo.userId,
                username: userInfo.username
            });

            logger.info(`User ${userInfo.userId} unmuted in room ${roomId}`);
        } catch (error) {
            logger.error('Unmute error:', error);
        }
    }

    handleDisconnect(socket) {
        try {
            const userInfo = this.users.get(socket.id);
            if (!userInfo) return;

            const { roomId, userId, username } = userInfo;

            // Remove from room
            if (this.rooms.has(roomId)) {
                this.rooms.get(roomId).delete(socket.id);
                
                if (this.rooms.get(roomId).size === 0) {
                    this.rooms.delete(roomId);
                }
            }

            // Notify others
            socket.to(`voice_${roomId}`).emit('participant_left', {
                socketId: socket.id,
                userId,
                username
            });

            // Clean up
            this.users.delete(socket.id);

            logger.info(`WebRTC client disconnected: ${socket.id}, userId: ${userId}`);
        } catch (error) {
            logger.error('WebRTC disconnect error:', error);
        }
    }
}

module.exports = WebRTCSocketHandler;
