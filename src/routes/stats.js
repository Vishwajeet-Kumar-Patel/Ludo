const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// User statistics
router.get('/me', statsController.getMyStats);
router.get('/user/:userId', statsController.getUserStats);
router.get('/rank', statsController.getMyRank);

// Leaderboards
router.get('/leaderboard', statsController.getLeaderboard);
router.get('/top-players', statsController.getTopPlayers);

// Game history
router.get('/history/me', statsController.getMyGameHistory);
router.get('/history/recent', statsController.getRecentGames);
router.get('/game/:roomId', statsController.getGameDetails);

module.exports = router;
