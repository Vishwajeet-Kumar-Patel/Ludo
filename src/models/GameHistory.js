const database = require('../config/database');
const logger = require('../config/logger');

class GameHistory {
    /**
     * Create a new game record
     */
    static async createGame(roomId, players, gameSettings) {
        try {
            const query = `
                INSERT INTO game_history (
                    room_id, player_ids, game_settings, status, created_at
                ) VALUES ($1, $2, $3, $4, NOW())
                RETURNING *
            `;
            
            const result = await database.query(query, [
                roomId,
                JSON.stringify(players),
                JSON.stringify(gameSettings),
                'playing'
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating game:', error);
            throw error;
        }
    }

    /**
     * Record a game move
     */
    static async recordMove(roomId, userId, moveData) {
        try {
            const query = `
                UPDATE game_history
                SET 
                    moves = COALESCE(moves, '[]'::jsonb) || $1::jsonb,
                    updated_at = NOW()
                WHERE room_id = $2 AND status = 'playing'
                RETURNING *
            `;

            const move = {
                userId,
                timestamp: Date.now(),
                ...moveData
            };

            const result = await database.query(query, [
                JSON.stringify(move),
                roomId
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error recording move:', error);
            throw error;
        }
    }

    /**
     * Finish a game and record winner
     */
    static async finishGame(roomId, winnerId, finalStandings) {
        try {
            const query = `
                UPDATE game_history
                SET 
                    status = 'finished',
                    winner_id = $1,
                    final_standings = $2,
                    finished_at = NOW(),
                    updated_at = NOW()
                WHERE room_id = $3
                RETURNING *
            `;

            const result = await database.query(query, [
                winnerId,
                JSON.stringify(finalStandings),
                roomId
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error finishing game:', error);
            throw error;
        }
    }

    /**
     * Get user's game history
     */
    static async getUserGames(userId, limit = 10, offset = 0) {
        try {
            const query = `
                SELECT * FROM game_history
                WHERE player_ids::jsonb @> $1::jsonb
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const result = await database.query(query, [
                JSON.stringify([userId]),
                limit,
                offset
            ]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting user games:', error);
            throw error;
        }
    }

    /**
     * Get game details by room ID
     */
    static async getGameByRoomId(roomId) {
        try {
            const query = `
                SELECT * FROM game_history
                WHERE room_id = $1
            `;

            const result = await database.query(query, [roomId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting game by room ID:', error);
            throw error;
        }
    }

    /**
     * Get recent games
     */
    static async getRecentGames(limit = 20) {
        try {
            const query = `
                SELECT * FROM game_history
                ORDER BY created_at DESC
                LIMIT $1
            `;

            const result = await database.query(query, [limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error getting recent games:', error);
            throw error;
        }
    }

    /**
     * Abandon a game (when all players disconnect)
     */
    static async abandonGame(roomId) {
        try {
            const query = `
                UPDATE game_history
                SET 
                    status = 'abandoned',
                    finished_at = NOW(),
                    updated_at = NOW()
                WHERE room_id = $1 AND status = 'playing'
                RETURNING *
            `;

            const result = await database.query(query, [roomId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error abandoning game:', error);
            throw error;
        }
    }
}

module.exports = GameHistory;
