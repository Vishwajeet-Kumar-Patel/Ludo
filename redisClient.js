const { createClient } = require('redis');

let client = null;
let isConnected = false;

async function initRedis() {
    try {
        client = createClient({ 
            url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: false // Don't try to reconnect
            }
        });
        
        client.on('error', err => {
            console.log('⚠️  Redis not available:', err.message);
            isConnected = false;
        });
        
        await client.connect();
        isConnected = true;
        console.log('✅ Redis connected successfully');
    } catch (error) {
        console.log('⚠️  Redis connection failed. Running without Redis cache.');
        console.log('   To use Redis, please install and start Redis server:');
        console.log('   - Windows: Download from https://github.com/microsoftarchive/redis/releases');
        console.log('   - Or use Docker: docker run -d -p 6379:6379 redis');
        client = null;
        isConnected = false;
    }
}

// Initialize Redis (but don't block if it fails)
initRedis();

// Export wrapper functions that work with or without Redis
module.exports = {
    get: async (key) => {
        if (!isConnected || !client) return null;
        try {
            return await client.get(key);
        } catch (error) {
            console.log('Redis GET failed:', error.message);
            return null;
        }
    },
    
    set: async (key, value, options) => {
        if (!isConnected || !client) return false;
        try {
            await client.set(key, value, options);
            return true;
        } catch (error) {
            console.log('Redis SET failed:', error.message);
            return false;
        }
    },
    
    del: async (key) => {
        if (!isConnected || !client) return false;
        try {
            await client.del(key);
            return true;
        } catch (error) {
            console.log('Redis DEL failed:', error.message);
            return false;
        }
    },
    
    exists: async (key) => {
        if (!isConnected || !client) return false;
        try {
            return await client.exists(key);
        } catch (error) {
            console.log('Redis EXISTS failed:', error.message);
            return false;
        }
    },
    
    hSet: async (key, field, value) => {
        if (!isConnected || !client) return false;
        try {
            await client.hSet(key, field, value);
            return true;
        } catch (error) {
            console.log('Redis HSET failed:', error.message);
            return false;
        }
    },
    
    hGet: async (key, field) => {
        if (!isConnected || !client) return null;
        try {
            return await client.hGet(key, field);
        } catch (error) {
            console.log('Redis HGET failed:', error.message);
            return null;
        }
    },
    
    hGetAll: async (key) => {
        if (!isConnected || !client) return {};
        try {
            return await client.hGetAll(key);
        } catch (error) {
            console.log('Redis HGETALL failed:', error.message);
            return {};
        }
    },
    
    isConnected: () => isConnected,
    
    client // Export raw client for advanced usage
};