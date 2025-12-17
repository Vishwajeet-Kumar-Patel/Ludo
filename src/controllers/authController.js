const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

class AuthController {
    static async register(req, res) {
        try {
            const { username, email, password, displayName } = req.body;

            // Validation
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Check if user exists
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ error: 'Email already exists' });
            }

            // Create user
            const user = await User.create({ username, email, password, displayName });

            // Generate token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            logger.info(`New user registered: ${username}`);

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name
                },
                token
            });
        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            // Find user
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Verify password
            const isValidPassword = await User.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Update online status
            await User.updateOnlineStatus(user.id, true);

            // Generate token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            logger.info(`User logged in: ${username}`);

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    coins: user.coins,
                    gems: user.gems,
                    level: user.level
                },
                token
            });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    static async logout(req, res) {
        try {
            const userId = req.user.userId;
            await User.updateOnlineStatus(userId, false);
            
            logger.info(`User logged out: ${userId}`);
            res.json({ message: 'Logout successful' });
        } catch (error) {
            logger.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await User.getProfile(userId);

            if (!profile) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ profile });
        } catch (error) {
            logger.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }
}

module.exports = AuthController;
