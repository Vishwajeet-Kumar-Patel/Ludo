const Friend = require('../models/Friend');
const logger = require('../config/logger');

/**
 * Send friend request
 */
exports.sendFriendRequest = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;

        if (!toUserId) {
            return res.status(400).json({ error: 'toUserId is required' });
        }

        if (fromUserId === toUserId) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const request = await Friend.sendRequest(fromUserId, toUserId);

        res.status(201).json({
            message: 'Friend request sent successfully',
            request
        });
    } catch (error) {
        logger.error('Send friend request error:', error);
        
        if (error.message.includes('already')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to send friend request' });
    }
};

/**
 * Accept friend request
 */
exports.acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;

        const request = await Friend.acceptRequest(requestId, userId);

        res.json({
            message: 'Friend request accepted',
            request
        });
    } catch (error) {
        logger.error('Accept friend request error:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to accept friend request' });
    }
};

/**
 * Reject friend request
 */
exports.rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;

        const request = await Friend.rejectRequest(requestId, userId);

        res.json({
            message: 'Friend request rejected',
            request
        });
    } catch (error) {
        logger.error('Reject friend request error:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to reject friend request' });
    }
};

/**
 * Get pending friend requests
 */
exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await Friend.getPendingRequests(userId);

        res.json(requests);
    } catch (error) {
        logger.error('Get pending requests error:', error);
        res.status(500).json({ error: 'Failed to get pending requests' });
    }
};

/**
 * Get sent friend requests
 */
exports.getSentRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await Friend.getSentRequests(userId);

        res.json(requests);
    } catch (error) {
        logger.error('Get sent requests error:', error);
        res.status(500).json({ error: 'Failed to get sent requests' });
    }
};

/**
 * Get friends list
 */
exports.getFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        const friends = await Friend.getFriends(userId);

        res.json(friends);
    } catch (error) {
        logger.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to get friends' });
    }
};

/**
 * Remove friend
 */
exports.removeFriend = async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendId } = req.params;

        await Friend.removeFriend(userId, friendId);

        res.json({ message: 'Friend removed successfully' });
    } catch (error) {
        logger.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
};

/**
 * Search users
 */
exports.searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const users = await Friend.searchUsers(userId, q);

        res.json(users);
    } catch (error) {
        logger.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};
