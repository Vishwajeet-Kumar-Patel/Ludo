const Club = require('../models/Club');
const logger = require('../config/logger');

class ClubController {
    static async createClub(req, res) {
        try {
            const { name, description, maxMembers, isPrivate } = req.body;
            const ownerId = req.user.userId;

            if (!name) {
                return res.status(400).json({ error: 'Club name is required' });
            }

            const club = await Club.create({
                name,
                description,
                ownerId,
                maxMembers,
                isPrivate
            });

            logger.info(`Club created: ${name} by user ${ownerId}`);
            res.status(201).json({ club });
        } catch (error) {
            logger.error('Create club error:', error);
            res.status(500).json({ error: 'Failed to create club' });
        }
    }

    static async getClub(req, res) {
        try {
            const { clubId } = req.params;
            const club = await Club.findById(clubId);

            if (!club) {
                return res.status(404).json({ error: 'Club not found' });
            }

            res.json({ club });
        } catch (error) {
            logger.error('Get club error:', error);
            res.status(500).json({ error: 'Failed to get club' });
        }
    }

    static async getAllClubs(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const clubs = await Club.findAll(parseInt(limit), parseInt(offset));
            res.json({ clubs });
        } catch (error) {
            logger.error('Get all clubs error:', error);
            res.status(500).json({ error: 'Failed to get clubs' });
        }
    }

    static async joinClub(req, res) {
        try {
            const { clubId } = req.params;
            const userId = req.user.userId;

            const club = await Club.findById(clubId);
            if (!club) {
                return res.status(404).json({ error: 'Club not found' });
            }

            const member = await Club.addMember(clubId, userId);
            
            logger.info(`User ${userId} joined club ${clubId}`);
            res.json({ message: 'Joined club successfully', member });
        } catch (error) {
            logger.error('Join club error:', error);
            res.status(500).json({ error: 'Failed to join club' });
        }
    }

    static async leaveClub(req, res) {
        try {
            const { clubId } = req.params;
            const userId = req.user.userId;

            await Club.removeMember(clubId, userId);
            
            logger.info(`User ${userId} left club ${clubId}`);
            res.json({ message: 'Left club successfully' });
        } catch (error) {
            logger.error('Leave club error:', error);
            res.status(500).json({ error: 'Failed to leave club' });
        }
    }

    static async getClubMembers(req, res) {
        try {
            const { clubId } = req.params;
            const members = await Club.getMembers(clubId);
            res.json({ members });
        } catch (error) {
            logger.error('Get club members error:', error);
            res.status(500).json({ error: 'Failed to get members' });
        }
    }

    static async getUserClubs(req, res) {
        try {
            const userId = req.user.userId;
            const clubs = await Club.getUserClubs(userId);
            res.json({ clubs });
        } catch (error) {
            logger.error('Get user clubs error:', error);
            res.status(500).json({ error: 'Failed to get user clubs' });
        }
    }
}

module.exports = ClubController;
