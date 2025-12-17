const UserStats = require('../models/UserStats');
const GameHistory = require('../models/GameHistory');
const logger = require('../config/logger');

/**
 * Get user's own statistics
 */
exports.getMyStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await UserStats.getUserStats(userId);

        if (!stats) {
            return res.json({
                games_played: 0,
                games_won: 0,
                total_score: 0,
                highest_score: 0,
                tokens_completed: 0,
                win_rate: 0
            });
        }

        res.json(stats);
    } catch (error) {
        logger.error('Get my stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
};

/**
 * Get user statistics by user ID
 */
exports.getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;

        const stats = await UserStats.getUserStats(userId);

        if (!stats) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(stats);
    } catch (error) {
        logger.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
};

/**
 * Get leaderboard
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { sortBy = 'games_won', limit = 50 } = req.query;

        const leaderboard = await UserStats.getLeaderboard(
            sortBy,
            Math.min(parseInt(limit), 100)
        );

        res.json(leaderboard);
    } catch (error) {
        logger.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
};

/**
 * Get user's rank
 */
exports.getMyRank = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sortBy = 'games_won' } = req.query;

        const rank = await UserStats.getUserRank(userId, sortBy);

        res.json({ rank: rank || 'Unranked' });
    } catch (error) {
        logger.error('Get rank error:', error);
        res.status(500).json({ error: 'Failed to get rank' });
    }
};

/**
 * Get top players
 */
exports.getTopPlayers = async (req, res) => {
    try {
        const { 
            metric = 'win_rate', 
            limit = 10,
            minGames = 5 
        } = req.query;

        const topPlayers = await UserStats.getTopPlayers(
            metric,
            Math.min(parseInt(limit), 50),
            parseInt(minGames)
        );

        res.json(topPlayers);
    } catch (error) {
        logger.error('Get top players error:', error);
        res.status(500).json({ error: 'Failed to get top players' });
    }
};

/**
 * Get user's game history
 */
exports.getMyGameHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        const games = await GameHistory.getUserGames(
            userId,
            Math.min(parseInt(limit), 50),
            parseInt(offset)
        );

        res.json(games);
    } catch (error) {
        logger.error('Get game history error:', error);
        res.status(500).json({ error: 'Failed to get game history' });
    }
};

/**
 * Get game details
 */
exports.getGameDetails = async (req, res) => {
    try {
        const { roomId } = req.params;

        const game = await GameHistory.getGameByRoomId(roomId);

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json(game);
    } catch (error) {
        logger.error('Get game details error:', error);
        res.status(500).json({ error: 'Failed to get game details' });
    }
};

/**
 * Get recent games
 */
exports.getRecentGames = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const games = await GameHistory.getRecentGames(
            Math.min(parseInt(limit), 50)
        );

        res.json(games);
    } catch (error) {
        logger.error('Get recent games error:', error);
        res.status(500).json({ error: 'Failed to get recent games' });
    }
};
