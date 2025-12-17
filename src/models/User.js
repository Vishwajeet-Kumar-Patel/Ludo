const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    static async create({ username, email, password, displayName }) {
        const passwordHash = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, display_name, coins, gems, level, created_at
        `;
        const result = await db.query(query, [username, email, passwordHash, displayName || username]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await db.query(query, [username]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    static async updateOnlineStatus(userId, isOnline) {
        const query = `
            UPDATE users 
            SET is_online = $1, last_seen = CURRENT_TIMESTAMP
            WHERE id = $2
        `;
        await db.query(query, [isOnline, userId]);
    }

    static async updateCoins(userId, amount) {
        const query = `
            UPDATE users 
            SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING coins
        `;
        const result = await db.query(query, [amount, userId]);
        return result.rows[0];
    }

    static async verifyPassword(password, passwordHash) {
        return await bcrypt.compare(password, passwordHash);
    }

    static async getProfile(userId) {
        const query = `
            SELECT 
                u.id, u.username, u.display_name, u.avatar_url, u.coins, u.gems, 
                u.level, u.experience, u.is_online, u.created_at,
                COALESCE(s.games_played, 0) as games_played,
                COALESCE(s.games_won, 0) as games_won,
                COALESCE(s.games_lost, 0) as games_lost,
                COALESCE(s.win_streak, 0) as win_streak,
                COALESCE(s.best_win_streak, 0) as best_win_streak
            FROM users u
            LEFT JOIN user_stats s ON u.id = s.user_id
            WHERE u.id = $1
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = User;
