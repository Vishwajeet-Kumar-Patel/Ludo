const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

module.exports = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
    
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'ludo_game',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        pool: {
            min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
            max: parseInt(process.env.DB_POOL_MAX, 10) || 10
        }
    },
    
    redis: {
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        password: process.env.REDIS_PASSWORD,
        ttl: parseInt(process.env.REDIS_TTL, 10) || 3600
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    },
    
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3BucketName: process.env.S3_BUCKET_NAME
    },
    
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    },
    
    webrtc: {
        turnServer: {
            urls: process.env.TURN_SERVER_URL || 'turn:your-turn-server.com:3478',
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_PASSWORD
        },
        stunServer: {
            urls: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302'
        }
    },
    
    game: {
        maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM, 10) || 4,
        roomTimeout: parseInt(process.env.ROOM_TIMEOUT, 10) || 1800000, // 30 minutes
        turnTimeout: parseInt(process.env.TURN_TIMEOUT, 10) || 30000, // 30 seconds
        reconnectionTimeout: parseInt(process.env.RECONNECTION_TIMEOUT, 10) || 60000 // 1 minute
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log'
    }
};
