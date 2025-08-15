import redisService from './RedisService.js';

/**
 * Base Cache Strategy Class - Abstract base for all cache strategies
 * Implements Template Method pattern for consistent behavior
 */
class BaseCacheStrategy {
    constructor() {
        this.redis = redisService;
    }

    /**
     * Template method for cache operations
     */
    async execute(operation, ...args) {
        if (!this.redis.isAvailable()) {
            return this.fallback(operation, ...args);
        }

        try {
            return await this.performOperation(operation, ...args);
        } catch (error) {
            console.error(`Cache operation failed: ${operation}`, error);
            return this.fallback(operation, ...args);
        }
    }

    /**
     * Abstract method to be implemented by subclasses
     */
    async performOperation(operation, ...args) {
        throw new Error('performOperation must be implemented by subclass');
    }

    /**
     * Fallback method when cache is unavailable
     */
    async fallback(operation, ...args) {
        console.warn(`Cache fallback for operation: ${operation}`);
        // This will be overridden by specific strategies
        throw new Error('Fallback not implemented');
    }

    /**
     * Generate cache key
     */
    generateKey(prefix, identifier) {
        return `${prefix}:${identifier}`;
    }

    /**
     * Set TTL for cache entries
     */
    async setTTL(key, ttl) {
        if (ttl && ttl > 0) {
            await this.redis.getClient().expire(key, ttl);
        }
    }
}

/**
 * Write-Behind Cache Strategy - Cache first, then sync to DB in background
 * Perfect for your cache-first requirement
 */
class WriteBehindCacheStrategy extends BaseCacheStrategy {
    constructor(syncQueue) {
        super();
        this.syncQueue = syncQueue;
    }

    /**
     * Perform cache-first write operation
     */
    async performOperation(operation, ...args) {
        switch (operation) {
            case 'set':
                return await this.set(...args);
            case 'get':
                return await this.get(...args);
            case 'delete':
                return await this.delete(...args);
            case 'update':
                return await this.update(...args);
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Set data in cache immediately (Write-Behind pattern)
     */
    async set(key, data, ttl = null) {
        // 1. Store in cache immediately
        const serializedData = JSON.stringify(data);
        await this.redis.getClient().set(key, serializedData);

        // 2. Set TTL if specified
        if (ttl) {
            await this.setTTL(key, ttl);
        }

        // 3. Queue background sync to DB
        await this.queueSync('set', key, data);

        return { success: true, message: 'Data cached successfully' };
    }

    /**
     * Get data from cache
     */
    async get(key) {
        const data = await this.redis.getClient().get(key);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    }

    /**
     * Update data in cache
     */
    async update(key, data, ttl = null) {
        // 1. Update cache immediately
        const serializedData = JSON.stringify(data);
        await this.redis.getClient().set(key, serializedData);

        // 2. Set TTL if specified
        if (ttl) {
            await this.setTTL(key, ttl);
        }

        // 3. Queue background sync to DB
        await this.queueSync('update', key, data);

        return { success: true, message: 'Data updated successfully' };
    }

    /**
     * Delete data from cache
     */
    async delete(key) {
        await this.redis.getClient().del(key);

        // Queue background sync to DB
        await this.queueSync('delete', key);

        return { success: true, message: 'Data deleted successfully' };
    }

    /**
     * Queue background sync operation
     */
    async queueSync(operation, key, data = null) {
        try {
            // Check if this is a duplicate sync job by looking at the key pattern
            // If the key contains an ID that's already in the database, skip syncing
            if (operation === 'set' && key.includes('snippet:') && data && data._id) {
                // For snippets, check if this is a new creation or just cache population
                // Only sync if this is actually new data
                const isNewData = !data.created_at || !data.updated_at ||
                    new Date(data.created_at) > new Date(Date.now() - 60000); // Within last minute

                if (!isNewData) {
                    // This is existing data being cached, don't sync
                    return;
                }
            }

            const syncJob = {
                operation,
                key,
                data,
                timestamp: Date.now(),
                retryCount: 0,
            };

            await this.syncQueue.addJob('sync-to-db', syncJob, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            });

            // Only log for actual sync operations, not cache population
            if (operation === 'set' && data && data._id) {
                console.log(`Sync job queued: ${operation} for key: ${key}`);
            }
        } catch (error) {
            console.error('Failed to queue sync job:', error);
            // Don't fail the main operation if sync queuing fails
        }
    }

    /**
     * Fallback to direct DB operation when cache is unavailable
     */
    async fallback(operation, ...args) {
        console.warn(`Cache unavailable, falling back to DB for operation: ${operation}`);
        // This will be handled by the service layer
        throw new Error('Cache unavailable - fallback required');
    }
}

/**
 * Read-Through Cache Strategy - Check cache first, fallback to DB
 */
class ReadThroughCacheStrategy extends BaseCacheStrategy {
    constructor(dbService) {
        super();
        this.dbService = dbService;
    }

    /**
     * Perform read-through operation
     */
    async performOperation(operation, ...args) {
        if (operation === 'get') {
            return await this.get(...args);
        }
        throw new Error(`Unsupported operation: ${operation}`);
    }

    /**
     * Get data with read-through pattern
     */
    async get(key, dbFetchFunction, ttl = 3600) {
        // 1. Try cache first
        let data = await this.redis.getClient().get(key);

        if (data) {
            return JSON.parse(data);
        }

        // 2. Cache miss - fetch from DB
        try {
            data = await dbFetchFunction();

            if (data) {
                // 3. Store in cache for future requests
                const serializedData = JSON.stringify(data);
                await this.redis.getClient().set(key, serializedData);
                await this.setTTL(key, ttl);
            }

            return data;
        } catch (error) {
            console.error('DB fetch failed:', error);
            throw error;
        }
    }

    /**
     * Fallback to direct DB operation
     */
    async fallback(operation, ...args) {
        if (operation === 'get' && this.dbService) {
            try {
                // Extract the fetch function from args
                const [key, dbFetchFunction, ttl] = args;
                if (dbFetchFunction && typeof dbFetchFunction === 'function') {
                    console.log('Cache unavailable, falling back to database for key:', key);
                    return await this.dbService.fetch(key, dbFetchFunction);
                }
            } catch (error) {
                console.error('Database fallback failed:', error);
                throw error;
            }
        }

        // For authentication operations, we need to handle the fallback differently
        if (operation === 'get' && args[0] && args[0].includes('session:')) {
            // This is a session lookup, return null to trigger manual JWT verification
            return null;
        }

        throw new Error('Fallback not available');
    }
}

/**
 * Cache Strategy Factory - Creates appropriate strategy based on operation type
 */
class CacheStrategyFactory {
    constructor(syncQueue, dbService) {
        this.syncQueue = syncQueue;
        this.dbService = dbService;
    }

    /**
     * Get appropriate cache strategy
     */
    getStrategy(operationType = 'write-behind') {
        switch (operationType) {
            case 'write-behind':
                return new WriteBehindCacheStrategy(this.syncQueue);
            case 'read-through':
                return new ReadThroughCacheStrategy(this.dbService);
            default:
                return new WriteBehindCacheStrategy(this.syncQueue);
        }
    }
}

export {
    BaseCacheStrategy,
    WriteBehindCacheStrategy,
    ReadThroughCacheStrategy,
    CacheStrategyFactory,
};
