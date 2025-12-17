const { Pool } = require('pg');
const config = require('./index');

class Database {
    constructor() {
        this.pool = new Pool(config.database);
        this.isConnected = false;
    }

    async connect() {
        try {
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL connected successfully');
            this.isConnected = true;
            client.release();
            await this.createTables();
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            this.isConnected = false;
        }
    }

    async createTables() {
        const createTablesQuery = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                avatar_url VARCHAR(500),
                coins INTEGER DEFAULT 0,
                gems INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                experience INTEGER DEFAULT 0,
                is_online BOOLEAN DEFAULT FALSE,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Clubs table
            CREATE TABLE IF NOT EXISTS clubs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                max_members INTEGER DEFAULT 50,
                is_private BOOLEAN DEFAULT FALSE,
                club_icon VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Club members table
            CREATE TABLE IF NOT EXISTS club_members (
                id SERIAL PRIMARY KEY,
                club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(club_id, user_id)
            );

            -- Club chat messages table
            CREATE TABLE IF NOT EXISTS club_messages (
                id SERIAL PRIMARY KEY,
                club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Game history table
            CREATE TABLE IF NOT EXISTS game_history (
                id SERIAL PRIMARY KEY,
                room_id VARCHAR(50) NOT NULL,
                game_mode VARCHAR(50),
                win_amount INTEGER,
                join_amount INTEGER,
                winner_id INTEGER REFERENCES users(id),
                players JSONB NOT NULL,
                game_data JSONB,
                started_at TIMESTAMP,
                ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                duration INTEGER
            );

            -- User stats table
            CREATE TABLE IF NOT EXISTS user_stats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                games_lost INTEGER DEFAULT 0,
                total_coins_won INTEGER DEFAULT 0,
                total_coins_lost INTEGER DEFAULT 0,
                win_streak INTEGER DEFAULT 0,
                best_win_streak INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Friend requests table
            CREATE TABLE IF NOT EXISTS friend_requests (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(sender_id, receiver_id)
            );

            -- Friends table
            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, friend_id)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
            CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
            CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON club_messages(club_id);
            CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history(room_id);
            CREATE INDEX IF NOT EXISTS idx_game_history_winner_id ON game_history(winner_id);
            CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
        `;

        try {
            await this.pool.query(createTablesQuery);
            console.log('✅ Database tables created/verified');
        } catch (error) {
            console.error('❌ Failed to create tables:', error.message);
        }
    }

    async query(text, params) {
        try {
            const result = await this.pool.query(text, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async getClient() {
        return await this.pool.connect();
    }

    async close() {
        await this.pool.end();
        console.log('Database connection closed');
    }
}

module.exports = new Database();
