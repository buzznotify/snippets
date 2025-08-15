import redisService from './RedisService.js';
import { CacheStrategyFactory } from './CacheStrategy.js';
import syncQueue from './SyncQueue.js';

/**
 * Main Cache Service - Provides clean interface for cache operations
 * Implements cache-first architecture with background DB sync
 */
class CacheService {
    constructor() {
        this.redis = redisService;
        this.syncQueue = syncQueue;

        // Create a database service for fallback operations
        const dbService = {
            fetch: async (key, fetchFunction) => {
                // When Redis fails, directly call the provided fetch function
                if (fetchFunction && typeof fetchFunction === 'function') {
                    return await fetchFunction();
                }
                return null;
            }
        };

        // Initialize cache strategies with database service
        this.strategyFactory = new CacheStrategyFactory(this.syncQueue, dbService);
        this.writeBehindStrategy = this.strategyFactory.getStrategy('write-behind');
        this.readThroughStrategy = this.strategyFactory.getStrategy('read-through');

        // Cache key prefixes for different data types
        this.keyPrefixes = {
            USER: 'user',
            SNIPPET: 'snippet',
            USER_SNIPPETS: 'user_snippets',
            SESSION: 'session',
            API_RESPONSE: 'api_response',
        };

        // TTL configurations
        this.ttlConfig = {
            USER: 3600,           // 1 hour
            SNIPPET: null,        // No TTL (source of truth)
            USER_SNIPPETS: 1800,  // 30 minutes
            SESSION: 7200,        // 2 hours
            API_RESPONSE: 900,    // 15 minutes
        };
    }

    /**
     * Check if cache is available
     */
    isAvailable() {
        return this.redis.isAvailable();
    }

    /**
     * Get cache status
     */
    getStatus() {
        return {
            redis: this.redis.getStatus(),
            syncQueue: this.syncQueue.getStats(),
            isAvailable: this.isAvailable(),
        };
    }

    // ==================== USER OPERATIONS ====================

    /**
     * Cache user data (Write-Behind pattern)
     */
    async cacheUser(userId, userData) {
        const key = this.generateKey(this.keyPrefixes.USER, userId);
        return await this.writeBehindStrategy.execute('set', key, userData, this.ttlConfig.USER);
    }

    /**
     * Get user from cache (Read-Through pattern)
     */
    async getUser(userId, dbFetchFunction) {
        const key = this.generateKey(this.keyPrefixes.USER, userId);
        return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.USER);
    }

    /**
     * Update user in cache
     */
    async updateUser(userId, userData) {
        const key = this.generateKey(this.keyPrefixes.USER, userId);
        return await this.writeBehindStrategy.execute('update', key, userData, this.ttlConfig.USER);
    }

    /**
     * Delete user from cache
     */
    async deleteUser(userId) {
        const key = this.generateKey(this.keyPrefixes.USER, userId);
        return await this.writeBehindStrategy.execute('delete', key);
    }

    // ==================== SNIPPET OPERATIONS ====================

    /**
     * Cache snippet data (Write-Behind pattern)
     */
    async cacheSnippet(snippetId, snippetData) {
        const key = this.generateKey(this.keyPrefixes.SNIPPET, snippetId);
        return await this.writeBehindStrategy.execute('set', key, snippetData, this.ttlConfig.SNIPPET);
    }

    /**
     * Get snippet from cache (Read-Through pattern)
     */
    async getSnippet(snippetId, dbFetchFunction) {
        const key = this.generateKey(this.keyPrefixes.SNIPPET, snippetId);
        return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.SNIPPET);
    }

    /**
     * Update snippet in cache
     */
    async updateSnippet(snippetId, snippetData) {
        const key = this.generateKey(this.keyPrefixes.SNIPPET, snippetId);
        return await this.writeBehindStrategy.execute('update', key, snippetData, this.ttlConfig.SNIPPET);
    }

    /**
     * Delete snippet from cache
     */
    async deleteSnippet(snippetId) {
        const key = this.generateKey(this.keyPrefixes.SNIPPET, snippetId);
        return await this.writeBehindStrategy.execute('delete', key);
    }

    // ==================== USER SNIPPETS COLLECTION ====================

    /**
     * Cache user's snippets collection
     */
    async cacheUserSnippets(userId, snippets) {
        const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
        return await this.writeBehindStrategy.execute('set', key, snippets, this.ttlConfig.USER_SNIPPETS);
    }

    /**
     * Get user's snippets from cache
     */
    async getUserSnippets(userId, dbFetchFunction) {
        const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
        return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.USER_SNIPPETS);
    }

    /**
     * Invalidate user's snippets cache when individual snippet changes
     */
    async invalidateUserSnippets(userId) {
        const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
        await this.redis.getClient().del(key);
        console.log(`Invalidated user snippets cache for user: ${userId}`);
    }

    // ==================== SESSION OPERATIONS ====================

    /**
     * Cache user session
     */
    async cacheSession(sessionId, sessionData) {
        const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
        return await this.writeBehindStrategy.execute('set', key, sessionData, this.ttlConfig.SESSION);
    }

    /**
     * Get session from cache
     */
    async getSession(sessionId) {
        try {
            const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
            const sessionData = await this.redis.getClient().get(key);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.warn('Failed to get session from cache:', error.message);
            return null; // Return null to trigger JWT verification
        }
    }

    /**
     * Delete session from cache
     */
    async deleteSession(sessionId) {
        const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
        return await this.writeBehindStrategy.execute('delete', key);
    }

    // ==================== API RESPONSE CACHING ====================

    /**
     * Cache API response
     */
    async cacheApiResponse(cacheKey, responseData) {
        const key = this.generateKey(this.keyPrefixes.API_RESPONSE, cacheKey);
        return await this.writeBehindStrategy.execute('set', key, responseData, this.ttlConfig.API_RESPONSE);
    }

    /**
     * Get cached API response
     */
    async getCachedApiResponse(cacheKey) {
        const key = this.generateKey(this.keyPrefixes.API_RESPONSE, cacheKey);
        return await this.readThroughStrategy.execute('get', key, () => null, this.ttlConfig.API_RESPONSE);
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk cache operations for better performance
     */
    async bulkCache(operations) {
        if (!this.redis.isAvailable()) {
            throw new Error('Cache unavailable for bulk operations');
        }

        try {
            const pipeline = this.redis.getClient().pipeline();
            const syncJobs = [];

            for (const { key, data, ttl } of operations) {
                const serializedData = JSON.stringify(data);
                pipeline.set(key, serializedData);

                if (ttl) {
                    pipeline.expire(key, ttl);
                }

                // Only queue sync job for new data, not cache population
                if (data && data._id && (!data.created_at || new Date(data.created_at) > new Date(Date.now() - 60000))) {
                    syncJobs.push({
                        operation: 'set',
                        key,
                        data,
                        timestamp: Date.now(),
                    });
                }
            }

            // Execute all Redis operations
            await pipeline.exec();

            // Queue bulk sync job only if there are actual sync operations
            if (syncJobs.length > 0) {
                await this.syncQueue.addJob('bulk-sync', { operations: syncJobs });
            }

            return { success: true, operationsCount: operations.length, syncedCount: syncJobs.length };
        } catch (error) {
            console.error('Bulk cache operation failed:', error);
            throw error;
        }
    }

    /**
     * Populate cache with existing data (no sync jobs)
     */
    async populateCache(operations) {
        if (!this.redis.isAvailable()) {
            throw new Error('Cache unavailable for population');
        }

        try {
            const pipeline = this.redis.getClient().pipeline();

            for (const { key, data, ttl } of operations) {
                const serializedData = JSON.stringify(data);
                pipeline.set(key, serializedData);

                if (ttl) {
                    pipeline.expire(key, ttl);
                }
            }

            // Execute all Redis operations without queuing sync jobs
            await pipeline.exec();

            return { success: true, operationsCount: operations.length };
        } catch (error) {
            console.error('Cache population failed:', error);
            throw error;
        }
    }

    /**
     * Bulk delete operations
     */
    async bulkDelete(keys) {
        if (!this.redis.isAvailable()) {
            throw new Error('Cache unavailable for bulk operations');
        }

        try {
            // Delete from cache
            await this.redis.getClient().del(...keys);

            // Queue bulk sync jobs
            const syncJobs = keys.map(key => ({
                operation: 'delete',
                key,
                timestamp: Date.now(),
            }));

            await this.syncQueue.addJob('bulk-sync', { operations: syncJobs });

            return { success: true, deletedCount: keys.length };
        } catch (error) {
            console.error('Bulk delete operation failed:', error);
            throw error;
        }
    }

    // ==================== CACHE INVALIDATION ====================

    /**
     * Invalidate cache by pattern
     */
    async invalidateByPattern(pattern) {
        try {
            await this.syncQueue.addJob('cache-invalidate', { pattern });
            return { success: true, pattern };
        } catch (error) {
            console.error('Cache invalidation failed:', error);
            throw error;
        }
    }

    /**
     * Invalidate specific keys
     */
    async invalidateKeys(keys) {
        try {
            await this.syncQueue.addJob('cache-invalidate', { keys });
            return { success: true, keysCount: keys.length };
        } catch (error) {
            console.error('Cache invalidation failed:', error);
            throw error;
        }
    }

    /**
     * Clear all cache (use with caution)
     */
    async clearAll() {
        if (!this.redis.isAvailable()) {
            throw new Error('Cache unavailable');
        }

        try {
            await this.redis.getClient().flushdb();
            console.log('All cache cleared');
            return { success: true, message: 'All cache cleared' };
        } catch (error) {
            console.error('Cache clear failed:', error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Generate cache key
     */
    generateKey(prefix, identifier) {
        return `${prefix}:${identifier}`;
    }

    /**
     * Generate cache key for user-specific data
     */
    generateUserKey(prefix, userId, identifier = null) {
        if (identifier) {
            return `${prefix}:${userId}:${identifier}`;
        }
        return `${prefix}:${userId}`;
    }

    /**
     * Check if key exists in cache
     */
    async keyExists(key) {
        if (!this.redis.isAvailable()) {
            return false;
        }

        try {
            const exists = await this.redis.getClient().exists(key);
            return exists === 1;
        } catch (error) {
            console.error('Key existence check failed:', error);
            return false;
        }
    }

    /**
     * Get TTL for a key
     */
    async getTTL(key) {
        if (!this.redis.isAvailable()) {
            return -1;
        }

        try {
            return await this.redis.getClient().ttl(key);
        } catch (error) {
            console.error('TTL check failed:', error);
            return -1;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        if (!this.redis.isAvailable()) {
            return null;
        }

        try {
            const info = await this.redis.getClient().info();
            const keyspace = await this.redis.getClient().info('keyspace');

            return {
                info: info.split('\r\n').filter(line => line && !line.startsWith('#')),
                keyspace: keyspace.split('\r\n').filter(line => line && !line.startsWith('#')),
                status: this.getStatus(),
            };
        } catch (error) {
            console.error('Cache stats failed:', error);
            return null;
        }
    }

    /**
     * Gracefully close cache service
     */
    async close() {
        try {
            await this.syncQueue.close();
            await this.redis.close();
            console.log('Cache service closed gracefully');
        } catch (error) {
            console.error('Error closing cache service:', error);
        }
    }
}

// Export singleton instance
export default new CacheService();
