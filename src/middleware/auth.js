const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authMiddleware;
