const database = require('../config/database');
const logger = require('../config/logger');

class Friend {
    /**
     * Send friend request
     */
    static async sendRequest(fromUserId, toUserId) {
        try {
            // Check if request already exists
            const checkQuery = `
                SELECT * FROM friend_requests
                WHERE (requester_id = $1 AND receiver_id = $2)
                   OR (requester_id = $2 AND receiver_id = $1)
            `;
            const existing = await database.query(checkQuery, [fromUserId, toUserId]);

            if (existing.rows.length > 0) {
                throw new Error('Friend request already exists');
            }

            // Check if already friends
            const friendCheck = `
                SELECT * FROM friends
                WHERE (user_id = $1 AND friend_id = $2)
                   OR (user_id = $2 AND friend_id = $1)
            `;
            const areFriends = await database.query(friendCheck, [fromUserId, toUserId]);

            if (areFriends.rows.length > 0) {
                throw new Error('Already friends');
            }

            const query = `
                INSERT INTO friend_requests (requester_id, receiver_id, status)
                VALUES ($1, $2, 'pending')
                RETURNING *
            `;

            const result = await database.query(query, [fromUserId, toUserId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Send friend request error:', error);
            throw error;
        }
    }

    /**
     * Accept friend request
     */
    static async acceptRequest(requestId, userId) {
        const client = await database.pool.connect();
        try {
            await client.query('BEGIN');

            // Get request details
            const requestQuery = `
                SELECT * FROM friend_requests
                WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            `;
            const request = await client.query(requestQuery, [requestId, userId]);

            if (request.rows.length === 0) {
                throw new Error('Friend request not found');
            }

            const { requester_id, receiver_id } = request.rows[0];

            // Update request status
            await client.query(
                `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
                [requestId]
            );

            // Add to friends table (both directions)
            await client.query(
                `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)`,
                [requester_id, receiver_id]
            );

            await client.query('COMMIT');
            return request.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Accept friend request error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reject friend request
     */
    static async rejectRequest(requestId, userId) {
        try {
            const query = `
                UPDATE friend_requests
                SET status = 'rejected', updated_at = NOW()
                WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
                RETURNING *
            `;

            const result = await database.query(query, [requestId, userId]);

            if (result.rows.length === 0) {
                throw new Error('Friend request not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Reject friend request error:', error);
            throw error;
        }
    }

    /**
     * Get pending friend requests
     */
    static async getPendingRequests(userId) {
        try {
            const query = `
                SELECT 
                    fr.*,
                    u.username as requester_username,
                    u.email as requester_email
                FROM friend_requests fr
                JOIN users u ON u.id = fr.requester_id
                WHERE fr.receiver_id = $1 AND fr.status = 'pending'
                ORDER BY fr.created_at DESC
            `;

            const result = await database.query(query, [userId]);
            return result.rows;
        } catch (error) {
            logger.error('Get pending requests error:', error);
            throw error;
        }
    }

    /**
     * Get sent friend requests
     */
    static async getSentRequests(userId) {
        try {
            const query = `
                SELECT 
                    fr.*,
                    u.username as receiver_username,
                    u.email as receiver_email
                FROM friend_requests fr
                JOIN users u ON u.id = fr.receiver_id
                WHERE fr.requester_id = $1 AND fr.status = 'pending'
                ORDER BY fr.created_at DESC
            `;

            const result = await database.query(query, [userId]);
            return result.rows;
        } catch (error) {
            logger.error('Get sent requests error:', error);
            throw error;
        }
    }

    /**
     * Get friends list
     */
    static async getFriends(userId) {
        try {
            const query = `
                SELECT 
                    f.friend_id as id,
                    u.username,
                    u.email,
                    u.is_online,
                    u.last_seen,
                    f.created_at as friends_since
                FROM friends f
                JOIN users u ON u.id = f.friend_id
                WHERE f.user_id = $1
                ORDER BY u.is_online DESC, u.username ASC
            `;

            const result = await database.query(query, [userId]);
            return result.rows;
        } catch (error) {
            logger.error('Get friends error:', error);
            throw error;
        }
    }

    /**
     * Remove friend
     */
    static async removeFriend(userId, friendId) {
        try {
            const query = `
                DELETE FROM friends
                WHERE (user_id = $1 AND friend_id = $2)
                   OR (user_id = $2 AND friend_id = $1)
            `;

            await database.query(query, [userId, friendId]);
            return true;
        } catch (error) {
            logger.error('Remove friend error:', error);
            throw error;
        }
    }

    /**
     * Search users to add as friends
     */
    static async searchUsers(currentUserId, searchQuery) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.is_online,
                    CASE 
                        WHEN f.friend_id IS NOT NULL THEN true
                        ELSE false
                    END as is_friend,
                    CASE
                        WHEN fr.id IS NOT NULL THEN fr.status
                        ELSE null
                    END as friend_request_status
                FROM users u
                LEFT JOIN friends f ON f.user_id = $1 AND f.friend_id = u.id
                LEFT JOIN friend_requests fr ON 
                    (fr.requester_id = $1 AND fr.receiver_id = u.id AND fr.status = 'pending')
                    OR (fr.requester_id = u.id AND fr.receiver_id = $1 AND fr.status = 'pending')
                WHERE u.id != $1
                  AND (u.username ILIKE $2 OR u.email ILIKE $2)
                LIMIT 20
            `;

            const result = await database.query(query, [
                currentUserId,
                `%${searchQuery}%`
            ]);

            return result.rows;
        } catch (error) {
            logger.error('Search users error:', error);
            throw error;
        }
    }

    /**
     * Check if users are friends
     */
    static async areFriends(userId1, userId2) {
        try {
            const query = `
                SELECT * FROM friends
                WHERE (user_id = $1 AND friend_id = $2)
                   OR (user_id = $2 AND friend_id = $1)
            `;

            const result = await database.query(query, [userId1, userId2]);
            return result.rows.length > 0;
        } catch (error) {
            logger.error('Check friends error:', error);
            throw error;
        }
    }
}

module.exports = Friend;
