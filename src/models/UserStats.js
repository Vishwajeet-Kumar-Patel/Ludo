const database = require('../config/database');
const logger = require('../config/logger');

class UserStats {
    /**
     * Update user statistics after a game
     */
    static async updateStats(userId, gameResult) {
        try {
            const { won, score, tokensFinished } = gameResult;

            const query = `
                INSERT INTO user_stats (
                    user_id, 
                    games_played, 
                    games_won, 
                    total_score, 
                    highest_score,
                    tokens_completed
                ) VALUES ($1, 1, $2, $3, $3, $4)
                ON CONFLICT (user_id) DO UPDATE SET
                    games_played = user_stats.games_played + 1,
                    games_won = user_stats.games_won + $2,
                    total_score = user_stats.total_score + $3,
                    highest_score = GREATEST(user_stats.highest_score, $3),
                    tokens_completed = user_stats.tokens_completed + $4,
                    last_played = NOW()
                RETURNING *
            `;

            const result = await database.query(query, [
                userId,
                won ? 1 : 0,
                score,
                tokensFinished
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating user stats:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(userId) {
        try {
            const query = `
                SELECT 
                    us.*,
                    u.username,
                    ROUND((us.games_won::float / NULLIF(us.games_played, 0) * 100), 2) as win_rate
                FROM user_stats us
                JOIN users u ON u.id = us.user_id
                WHERE us.user_id = $1
            `;

            const result = await database.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard
     */
    static async getLeaderboard(sortBy = 'games_won', limit = 50) {
        try {
            const validSortColumns = ['games_won', 'total_score', 'highest_score', 'tokens_completed'];
            
            if (!validSortColumns.includes(sortBy)) {
                sortBy = 'games_won';
            }

            const query = `
                SELECT 
                    us.*,
                    u.username,
                    ROUND((us.games_won::float / NULLIF(us.games_played, 0) * 100), 2) as win_rate,
                    ROW_NUMBER() OVER (ORDER BY us.${sortBy} DESC) as rank
                FROM user_stats us
                JOIN users u ON u.id = us.user_id
                WHERE us.games_played > 0
                ORDER BY us.${sortBy} DESC
                LIMIT $1
            `;

            const result = await database.query(query, [limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get user rank
     */
    static async getUserRank(userId, sortBy = 'games_won') {
        try {
            const validSortColumns = ['games_won', 'total_score', 'highest_score'];
            
            if (!validSortColumns.includes(sortBy)) {
                sortBy = 'games_won';
            }

            const query = `
                WITH ranked_users AS (
                    SELECT 
                        user_id,
                        ROW_NUMBER() OVER (ORDER BY ${sortBy} DESC) as rank
                    FROM user_stats
                    WHERE games_played > 0
                )
                SELECT rank FROM ranked_users WHERE user_id = $1
            `;

            const result = await database.query(query, [userId]);
            return result.rows[0]?.rank || null;
        } catch (error) {
            logger.error('Error getting user rank:', error);
            throw error;
        }
    }

    /**
     * Get top players by various metrics
     */
    static async getTopPlayers(metric = 'win_rate', limit = 10, minGames = 5) {
        try {
            let query;

            if (metric === 'win_rate') {
                query = `
                    SELECT 
                        us.*,
                        u.username,
                        ROUND((us.games_won::float / NULLIF(us.games_played, 0) * 100), 2) as win_rate
                    FROM user_stats us
                    JOIN users u ON u.id = us.user_id
                    WHERE us.games_played >= $1
                    ORDER BY win_rate DESC
                    LIMIT $2
                `;
            } else if (metric === 'average_score') {
                query = `
                    SELECT 
                        us.*,
                        u.username,
                        ROUND(us.total_score::float / NULLIF(us.games_played, 0), 2) as average_score
                    FROM user_stats us
                    JOIN users u ON u.id = us.user_id
                    WHERE us.games_played >= $1
                    ORDER BY average_score DESC
                    LIMIT $2
                `;
            } else {
                query = `
                    SELECT 
                        us.*,
                        u.username
                    FROM user_stats us
                    JOIN users u ON u.id = us.user_id
                    WHERE us.games_played >= $1
                    ORDER BY us.${metric} DESC
                    LIMIT $2
                `;
            }

            const result = await database.query(query, [minGames, limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error getting top players:', error);
            throw error;
        }
    }
}

module.exports = UserStats;
