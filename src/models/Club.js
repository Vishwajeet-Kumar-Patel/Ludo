const db = require('../config/database');

class Club {
    static async create({ name, description, ownerId, maxMembers, isPrivate }) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            // Create club
            const clubQuery = `
                INSERT INTO clubs (name, description, owner_id, max_members, is_private)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const clubResult = await client.query(clubQuery, [
                name, description, ownerId, maxMembers || 50, isPrivate || false
            ]);
            const club = clubResult.rows[0];
            
            // Add owner as admin member
            const memberQuery = `
                INSERT INTO club_members (club_id, user_id, role)
                VALUES ($1, $2, 'admin')
            `;
            await client.query(memberQuery, [club.id, ownerId]);
            
            await client.query('COMMIT');
            return club;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findById(clubId) {
        const query = `
            SELECT c.*, u.username as owner_username,
                   COUNT(DISTINCT cm.user_id) as member_count
            FROM clubs c
            JOIN users u ON c.owner_id = u.id
            LEFT JOIN club_members cm ON c.id = cm.club_id
            WHERE c.id = $1
            GROUP BY c.id, u.username
        `;
        const result = await db.query(query, [clubId]);
        return result.rows[0];
    }

    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT c.*, u.username as owner_username,
                   COUNT(DISTINCT cm.user_id) as member_count
            FROM clubs c
            JOIN users u ON c.owner_id = u.id
            LEFT JOIN club_members cm ON c.id = cm.club_id
            WHERE c.is_private = false
            GROUP BY c.id, u.username
            ORDER BY c.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await db.query(query, [limit, offset]);
        return result.rows;
    }

    static async addMember(clubId, userId, role = 'member') {
        const query = `
            INSERT INTO club_members (club_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (club_id, user_id) DO NOTHING
            RETURNING *
        `;
        const result = await db.query(query, [clubId, userId, role]);
        return result.rows[0];
    }

    static async removeMember(clubId, userId) {
        const query = 'DELETE FROM club_members WHERE club_id = $1 AND user_id = $2';
        await db.query(query, [clubId, userId]);
    }

    static async getMembers(clubId) {
        const query = `
            SELECT cm.*, u.username, u.display_name, u.avatar_url, u.is_online
            FROM club_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.club_id = $1
            ORDER BY cm.joined_at
        `;
        const result = await db.query(query, [clubId]);
        return result.rows;
    }

    static async isMember(clubId, userId) {
        const query = 'SELECT * FROM club_members WHERE club_id = $1 AND user_id = $2';
        const result = await db.query(query, [clubId, userId]);
        return result.rows.length > 0;
    }

    static async getUserClubs(userId) {
        const query = `
            SELECT c.*, COUNT(DISTINCT cm2.user_id) as member_count
            FROM clubs c
            JOIN club_members cm ON c.id = cm.club_id
            LEFT JOIN club_members cm2 ON c.id = cm2.club_id
            WHERE cm.user_id = $1
            GROUP BY c.id
            ORDER BY cm.joined_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

module.exports = Club;
