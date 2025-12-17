const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./config/logger');
const database = require('./config/database');
const redis = require('./services/redisService');

// Socket handlers
const GameSocketHandler = require('./sockets/gameSocket');
const ClubSocketHandler = require('./sockets/clubSocket');
const WebRTCSocketHandler = require('./sockets/webrtcSocket');

// Routes
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/clubs');
const statsRoutes = require('./routes/stats');
const friendRoutes = require('./routes/friends');
const healthRoutes = require('./routes/index');

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors(config.cors)); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api', healthRoutes);

// Serve static files (optional)
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize Socket.IO handlers
const gameHandler = new GameSocketHandler(io);
const clubHandler = new ClubSocketHandler(io);
const webrtcHandler = new WebRTCSocketHandler(io);

// Main socket connection
io.on('connection', (socket) => {
    gameHandler.handleConnection(socket);
});

// Club namespace
io.of('/clubs').on('connection', (socket) => {
    clubHandler.handleConnection(socket);
});

// WebRTC namespace
io.of('/webrtc').on('connection', (socket) => {
    webrtcHandler.handleConnection(socket);
});

// Initialize services
async function initialize() {
    try {
        // Connect to database
        await database.connect();
        
        // Connect to Redis
        await redis.connect();
        
        logger.info('✅ All services initialized successfully');
    } catch (error) {
        logger.error('❌ Service initialization failed:', error);
        process.exit(1);
    }
}

// Start server
async function start() {
    try {
        await initialize();
        
        httpServer.listen(config.port, config.host, () => {
            logger.info(`🎮 Ludo Game Server running on ${config.host}:${config.port}`);
            logger.info(`📝 Environment: ${config.env}`);
            logger.info(`🔌 Socket.IO namespaces: / (game), /clubs, /webrtc`);
            logger.info(`🌐 API available at http://${config.host}:${config.port}/api`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing server');
    httpServer.close(async () => {
        await database.close();
        await redis.close();
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing server');
    httpServer.close(async () => {
        await database.close();
        await redis.close();
        logger.info('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
start();

module.exports = { app, io, httpServer };
