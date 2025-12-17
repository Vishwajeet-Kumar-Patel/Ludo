const ClubMessage = require('../models/ClubMessage');
const Club = require('../models/Club');
const logger = require('../config/logger');

class ClubSocketHandler {
    constructor(io) {
        this.io = io;
        this.clubNamespace = io.of('/clubs');
        this.userSockets = new Map(); // userId -> socketId
    }

    handleConnection(socket) {
        logger.info(`Club client connected: ${socket.id}`);

        socket.on('join_club', (data) => this.handleJoinClub(socket, data));
        socket.on('leave_club', (data) => this.handleLeaveClub(socket, data));
        socket.on('club_message', (data) => this.handleClubMessage(socket, data));
        socket.on('typing', (data) => this.handleTyping(socket, data));
        socket.on('get_messages', (data) => this.handleGetMessages(socket, data));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    async handleJoinClub(socket, data) {
        try {
            const { clubId, userId, username } = data;

            // Verify user is a member
            const isMember = await Club.isMember(clubId, userId);
            if (!isMember) {
                socket.emit('club_error', { message: 'You are not a member of this club' });
                return;
            }

            // Join room
            const roomName = `club_${clubId}`;
            socket.join(roomName);
            
            // Store user mapping
            this.userSockets.set(`${clubId}_${userId}`, socket.id);
            socket.clubId = clubId;
            socket.userId = userId;

            // Notify others
            socket.to(roomName).emit('user_joined_club', {
                userId,
                username,
                timestamp: new Date().toISOString()
            });

            // Send recent messages to joining user
            const messages = await ClubMessage.getMessages(clubId, 50);
            socket.emit('initial_messages', { messages });

            logger.info(`User ${userId} joined club ${clubId}`);
        } catch (error) {
            logger.error('Join club error:', error);
            socket.emit('club_error', { message: 'Failed to join club' });
        }
    }

    async handleLeaveClub(socket, data) {
        try {
            const { clubId, userId, username } = data;
            const roomName = `club_${clubId}`;
            
            socket.leave(roomName);
            this.userSockets.delete(`${clubId}_${userId}`);

            socket.to(roomName).emit('user_left_club', {
                userId,
                username,
                timestamp: new Date().toISOString()
            });

            logger.info(`User ${userId} left club ${clubId}`);
        } catch (error) {
            logger.error('Leave club error:', error);
        }
    }

    async handleClubMessage(socket, data) {
        try {
            const { clubId, userId, message, messageType = 'text' } = data;

            // Verify user is a member
            const isMember = await Club.isMember(clubId, userId);
            if (!isMember) {
                socket.emit('club_error', { message: 'You are not a member of this club' });
                return;
            }

            // Save message to database
            const savedMessage = await ClubMessage.create({
                clubId,
                userId,
                message,
                messageType
            });

            // Broadcast to all club members
            const roomName = `club_${clubId}`;
            this.io.to(roomName).emit('new_club_message', {
                id: savedMessage.id,
                clubId,
                userId,
                message,
                messageType,
                timestamp: savedMessage.created_at
            });

            logger.info(`Message sent in club ${clubId} by user ${userId}`);
        } catch (error) {
            logger.error('Club message error:', error);
            socket.emit('club_error', { message: 'Failed to send message' });
        }
    }

    async handleTyping(socket, data) {
        try {
            const { clubId, userId, username, isTyping } = data;
            const roomName = `club_${clubId}`;
            
            socket.to(roomName).emit('user_typing', {
                userId,
                username,
                isTyping,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Typing indicator error:', error);
        }
    }

    async handleGetMessages(socket, data) {
        try {
            const { clubId, limit = 50, offset = 0 } = data;
            
            const messages = await ClubMessage.getMessages(clubId, limit, offset);
            socket.emit('messages_history', { messages, clubId });
        } catch (error) {
            logger.error('Get messages error:', error);
            socket.emit('club_error', { message: 'Failed to get messages' });
        }
    }

    handleDisconnect(socket) {
        try {
            if (socket.clubId && socket.userId) {
                const roomName = `club_${socket.clubId}`;
                socket.to(roomName).emit('user_disconnected', {
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });
                
                this.userSockets.delete(`${socket.clubId}_${socket.userId}`);
            }
            
            logger.info(`Club client disconnected: ${socket.id}`);
        } catch (error) {
            logger.error('Club disconnect error:', error);
        }
    }
}

module.exports = ClubSocketHandler;
