const { createClient } = require('redis');
const config = require('../config');
const logger = require('../config/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.lockPrefix = 'lock:';
        this.lockTTL = 10; // 10 seconds default lock TTL
    }

    async connect() {
        try {
            this.client = createClient({ 
                url: config.redis.url,
                password: config.redis.password,
                socket: {
                    connectTimeout: 5000,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis: Max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });
            
            this.client.on('error', err => {
                logger.error('Redis error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis: Connecting...');
            });

            this.client.on('ready', () => {
                logger.info('✅ Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                logger.warn('Redis: Reconnecting...');
            });
            
            await this.client.connect();
        } catch (error) {
            logger.error('Redis connection failed:', error);
            this.client = null;
            this.isConnected = false;
        }
    }

    // ========== ATOMIC OPERATIONS ==========
    
    /**
     * Acquire a distributed lock (for preventing race conditions)
     */
    async acquireLock(key, ttl = this.lockTTL) {
        if (!this.isConnected || !this.client) return null;
        
        try {
            const lockKey = this.lockPrefix + key;
            const lockValue = Date.now() + Math.random();
            
            const result = await this.client.set(lockKey, lockValue, {
                NX: true, // Only set if not exists
                EX: ttl   // Expire after ttl seconds
            });
            
            if (result === 'OK') {
                return lockValue; // Return lock token
            }
            return null;
        } catch (error) {
            logger.error('Failed to acquire lock:', error);
            return null;
        }
    }

    /**
     * Release a distributed lock
     */
    async releaseLock(key, lockValue) {
        if (!this.isConnected || !this.client || !lockValue) return false;
        
        try {
            const lockKey = this.lockPrefix + key;
            
            // Lua script for atomic check-and-delete
            const script = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
            `;
            
            const result = await this.client.eval(script, {
                keys: [lockKey],
                arguments: [String(lockValue)]
            });
            
            return result === 1;
        } catch (error) {
            logger.error('Failed to release lock:', error);
            return false;
        }
    }

    /**
     * Atomic increment with expiry
     */
    async incrWithExpiry(key, ttl = config.redis.ttl) {
        if (!this.isConnected || !this.client) return null;
        
        try {
            const multi = this.client.multi();
            multi.incr(key);
            multi.expire(key, ttl);
            const results = await multi.exec();
            return results[0];
        } catch (error) {
            logger.error('Failed to increment with expiry:', error);
            return null;
        }
    }

    // ========== BASIC OPERATIONS ==========
    
    async get(key) {
        if (!this.isConnected || !this.client) return null;
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error('Redis GET failed:', error);
            return null;
        }
    }
    
    async set(key, value, options = {}) {
        if (!this.isConnected || !this.client) return false;
        try {
            const ttl = options.EX || config.redis.ttl;
            await this.client.set(key, value, { EX: ttl });
            return true;
        } catch (error) {
            logger.error('Redis SET failed:', error);
            return false;
        }
    }
    
    async del(key) {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis DEL failed:', error);
            return false;
        }
    }

    async delPattern(pattern) {
        if (!this.isConnected || !this.client) return false;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            logger.error('Redis DEL pattern failed:', error);
            return false;
        }
    }
    
    async exists(key) {
        if (!this.isConnected || !this.client) return false;
        try {
            return await this.client.exists(key);
        } catch (error) {
            logger.error('Redis EXISTS failed:', error);
            return false;
        }
    }
    
    async hSet(key, field, value) {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.hSet(key, field, value);
            return true;
        } catch (error) {
            logger.error('Redis HSET failed:', error);
            return false;
        }
    }
    
    async hGet(key, field) {
        if (!this.isConnected || !this.client) return null;
        try {
            return await this.client.hGet(key, field);
        } catch (error) {
            logger.error('Redis HGET failed:', error);
            return null;
        }
    }
    
    async hGetAll(key) {
        if (!this.isConnected || !this.client) return {};
        try {
            return await this.client.hGetAll(key);
        } catch (error) {
            logger.error('Redis HGETALL failed:', error);
            return {};
        }
    }

    async hDel(key, field) {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.hDel(key, field);
            return true;
        } catch (error) {
            logger.error('Redis HDEL failed:', error);
            return false;
        }
    }

    async expire(key, seconds) {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.expire(key, seconds);
            return true;
        } catch (error) {
            logger.error('Redis EXPIRE failed:', error);
            return false;
        }
    }

    async ttl(key) {
        if (!this.isConnected || !this.client) return -1;
        try {
            return await this.client.ttl(key);
        } catch (error) {
            logger.error('Redis TTL failed:', error);
            return -1;
        }
    }

    async ping() {
        if (!this.isConnected || !this.client) return false;
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            return false;
        }
    }

    getClient() {
        return this.client;
    }

    isHealthy() {
        return this.isConnected && this.client !== null;
    }

    async close() {
        if (this.client) {
            await this.client.quit();
            logger.info('Redis connection closed');
        }
    }
}

module.exports = new RedisClient();
