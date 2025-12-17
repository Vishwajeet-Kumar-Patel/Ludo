const db = require('../config/database');

class ClubMessage {
    static async create({ clubId, userId, message, messageType = 'text' }) {
        const query = `
            INSERT INTO club_messages (club_id, user_id, message, message_type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(query, [clubId, userId, message, messageType]);
        return result.rows[0];
    }

    static async getMessages(clubId, limit = 100, offset = 0) {
        const query = `
            SELECT cm.*, u.username, u.display_name, u.avatar_url
            FROM club_messages cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.club_id = $1
            ORDER BY cm.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await db.query(query, [clubId, limit, offset]);
        return result.rows.reverse(); // Return in chronological order
    }

    static async deleteMessage(messageId, userId) {
        const query = 'DELETE FROM club_messages WHERE id = $1 AND user_id = $2';
        const result = await db.query(query, [messageId, userId]);
        return result.rowCount > 0;
    }
}

module.exports = ClubMessage;
