/**
 * CacheManager - Simple, clean, and reliable cache management
 * 
 * Features:
 * - Connection pooling with Redis
 * - Read-through caching for snippets
 * - Smart invalidation strategies
 * - Background sync support
 * - Circuit breaker pattern for resilience
 */

import Redis from 'ioredis';
import { env } from '../env.js';

class CacheManager {
    constructor() {
        this.pool = [];
        this.poolSize = parseInt(env.REDIS_POOL_SIZE || '5', 10);
        this.maxPoolSize = parseInt(env.REDIS_MAX_POOL_SIZE || '10', 10);
        this.isInitialized = false;
        this.circuitBreaker = {
            isOpen: false,
            failures: 0,
            lastFailure: null,
            threshold: 5,
            resetTimeout: 30000
        };

        // Cache configuration
        this.ttl = {
            snippet: 3600,        // 1 hour for snippet data
            snippetIndex: 3600,   // 1 hour for user+keyName index
            warmCache: 7200,      // 2 hours for warm cache entries
        };

        // Initialize on first use
        this.initPromise = null;
    }

    /**
     * Get Redis configuration
     */
    getRedisConfig() {
        return {
            host: env.REDIS_HOST || '127.0.0.1',
            port: parseInt(env.REDIS_PORT || '6379', 10),
            username: env.REDIS_USERNAME,
            password: env.REDIS_PASSWORD,
            db: parseInt(env.REDIS_DB || '0', 10),

            // Connection settings
            lazyConnect: false,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 50, 2000),
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },

            // Performance settings
            enableOfflineQueue: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
            keepAlive: 30000,
        };
    }

    /**
     * Initialize connection pool
     */
    async initialize() {
        if (this.isInitialized) return;

        if (!this.initPromise) {
            this.initPromise = this._doInitialize();
        }

        await this.initPromise;
    }

    async _doInitialize() {
        try {
            console.log(`🚀 Initializing CacheManager with pool size: ${this.poolSize}`);

            // Create initial pool connections
            const promises = [];
            for (let i = 0; i < this.poolSize; i++) {
                promises.push(this.createConnection());
            }

            const connections = await Promise.all(promises);
            this.pool = connections.filter(conn => conn !== null);

            if (this.pool.length === 0) {
                throw new Error('Failed to create any Redis connections');
            }

            this.isInitialized = true;
            console.log(`✅ CacheManager initialized with ${this.pool.length} connections`);

            // Start background tasks
            this.startHealthCheck();
            this.startWarmCacheMaintenance();

        } catch (error) {
            console.error('❌ CacheManager initialization failed:', error);
            this.initPromise = null;
            throw error;
        }
    }

    /**
     * Create a new Redis connection
     */
    async createConnection() {
        try {
            const client = new Redis(this.getRedisConfig());

            // Wait for connection to be ready
            await new Promise((resolve, reject) => {
                client.once('ready', resolve);
                client.once('error', reject);

                setTimeout(() => reject(new Error('Connection timeout')), 5000);
            });

            // Set up error handling
            client.on('error', (err) => {
                console.error('Redis connection error:', err.message);
                this.handleConnectionError(err);
            });

            client.on('close', () => {
                this.removeConnection(client);
            });

            return client;
        } catch (error) {
            console.error('Failed to create Redis connection:', error);
            return null;
        }
    }

    /**
     * Get a connection from the pool
     */
    async getConnection() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Check circuit breaker
        if (this.circuitBreaker.isOpen) {
            throw new Error('Cache service is temporarily unavailable (circuit breaker open)');
        }

        // Find available connection
        const connection = this.pool.find(client =>
            client && client.status === 'ready'
        );

        if (connection) {
            return connection;
        }

        // Try to create new connection if under max pool size
        if (this.pool.length < this.maxPoolSize) {
            const newConnection = await this.createConnection();
            if (newConnection) {
                this.pool.push(newConnection);
                return newConnection;
            }
        }

        throw new Error('No available Redis connections');
    }

    /**
     * Execute operation with connection from pool
     */
    async execute(operation) {
        try {
            const client = await this.getConnection();
            const result = await operation(client);
            this.resetCircuitBreaker();
            return result;
        } catch (error) {
            this.handleConnectionError(error);
            throw error;
        }
    }

    /**
     * Handle connection errors and circuit breaker
     */
    handleConnectionError(error) {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();

        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold && !this.circuitBreaker.isOpen) {
            this.circuitBreaker.isOpen = true;
            console.warn('🔴 Circuit breaker opened - cache service suspended');

            // Reset circuit breaker after timeout
            setTimeout(() => {
                this.circuitBreaker.isOpen = false;
                this.circuitBreaker.failures = 0;
                console.log('🟢 Circuit breaker reset - cache service resumed');
            }, this.circuitBreaker.resetTimeout);
        }
    }

    /**
     * Reset circuit breaker on successful operation
     */
    resetCircuitBreaker() {
        if (this.circuitBreaker.failures > 0) {
            this.circuitBreaker.failures = 0;
            this.circuitBreaker.lastFailure = null;
        }
    }

    /**
     * Remove connection from pool
     */
    removeConnection(client) {
        const index = this.pool.indexOf(client);
        if (index > -1) {
            this.pool.splice(index, 1);
            console.log(`Connection removed from pool. Current pool size: ${this.pool.length}`);

            // Try to maintain minimum pool size
            if (this.pool.length < this.poolSize) {
                this.createConnection().then(newClient => {
                    if (newClient) {
                        this.pool.push(newClient);
                    }
                }).catch(err => {
                    console.error('Failed to replace connection:', err);
                });
            }
        }
    }

    /**
     * Check if cache is available
     */
    isAvailable() {
        return this.isInitialized && !this.circuitBreaker.isOpen && this.pool.length > 0;
    }

    /**
     * Health check for connections
     */
    startHealthCheck() {
        setInterval(async () => {
            if (!this.isAvailable()) return;

            try {
                await this.execute(async (client) => {
                    await client.ping();
                    return true;
                });
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Warm cache maintenance
     */
    startWarmCacheMaintenance() {
        // This will be called periodically to keep frequently accessed data warm
        setInterval(async () => {
            if (!this.isAvailable()) return;

            try {
                // Extend TTL for frequently accessed keys
                await this.extendFrequentlyAccessedKeys();
            } catch (error) {
                console.error('Warm cache maintenance failed:', error);
            }
        }, 60000); // Every minute
    }

    /**
     * Extend TTL for frequently accessed keys
     */
    async extendFrequentlyAccessedKeys() {
        try {
            await this.execute(async (client) => {
                // Get keys that are about to expire
                const cursor = '0';
                const pattern = 'snippet:*';
                const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);

                for (const key of keys) {
                    const ttl = await client.ttl(key);
                    // If key expires in less than 30 minutes, extend it
                    if (ttl > 0 && ttl < 1800) {
                        await client.expire(key, this.ttl.warmCache);
                    }
                }

                return true;
            });
        } catch (error) {
            console.error('Failed to extend frequently accessed keys:', error);
        }
    }

    /**
     * Generate cache keys
     */
    keys = {
        snippet: (id) => `snippet:${id}`,
        snippetByKey: (userId, keyName) => `snippet:user:${userId}:key:${keyName}`,
        userSnippets: (userId) => `user:${userId}:snippets`,
    };

    /**
     * Get snippet by ID with read-through cache
     */
    async getSnippet(snippetId, fetchFromDb) {
        if (!this.isAvailable()) {
            // Fallback to database if cache is unavailable
            return await fetchFromDb();
        }

        const key = this.keys.snippet(snippetId);

        try {
            // Try to get from cache
            const cached = await this.execute(async (client) => {
                return await client.get(key);
            });

            if (cached) {
                return JSON.parse(cached);
            }

            // Cache miss - fetch from database
            const data = await fetchFromDb();

            if (data) {
                // Cache the result
                await this.execute(async (client) => {
                    await client.setex(key, this.ttl.snippet, JSON.stringify(data));
                });
            }

            return data;
        } catch (error) {
            console.error('Cache operation failed, falling back to database:', error);
            return await fetchFromDb();
        }
    }

    /**
     * Get snippet by user+keyName with read-through cache
     */
    async getSnippetByKey(userId, keyName, fetchFromDb) {
        if (!this.isAvailable()) {
            return await fetchFromDb();
        }

        const indexKey = this.keys.snippetByKey(userId, keyName);

        try {
            // Try to get snippet ID from index
            const snippetId = await this.execute(async (client) => {
                return await client.get(indexKey);
            });

            if (snippetId) {
                // Get snippet data using the ID
                return await this.getSnippet(snippetId, async () => {
                    // If index exists but data doesn't, fetch from DB
                    const data = await fetchFromDb();
                    if (!data) {
                        // Clean up stale index
                        await this.execute(async (client) => {
                            await client.del(indexKey);
                        });
                    }
                    return data;
                });
            }

            // Cache miss - fetch from database
            const data = await fetchFromDb();

            if (data) {
                // Cache both the snippet and the index
                await this.execute(async (client) => {
                    const snippetKey = this.keys.snippet(data._id);

                    // Use pipeline for atomic operations
                    const pipeline = client.pipeline();
                    pipeline.setex(snippetKey, this.ttl.snippet, JSON.stringify(data));
                    pipeline.setex(indexKey, this.ttl.snippetIndex, String(data._id));
                    await pipeline.exec();
                });
            }

            return data;
        } catch (error) {
            console.error('Cache operation failed, falling back to database:', error);
            return await fetchFromDb();
        }
    }

    /**
     * Invalidate snippet cache on create/update/delete
     */
    async invalidateSnippet(snippetId, userId, keyName) {
        if (!this.isAvailable()) return;

        try {
            await this.execute(async (client) => {
                const pipeline = client.pipeline();

                // Delete snippet data
                if (snippetId) {
                    pipeline.del(this.keys.snippet(snippetId));
                }

                // Delete index entries
                if (userId && keyName) {
                    pipeline.del(this.keys.snippetByKey(userId, keyName));
                }

                // Delete user snippets list
                if (userId) {
                    pipeline.del(this.keys.userSnippets(userId));
                }

                await pipeline.exec();
            });
        } catch (error) {
            console.error('Failed to invalidate cache:', error);
        }
    }

    /**
     * Invalidate on snippet update (handle key rename)
     */
    async invalidateSnippetUpdate(snippetId, userId, oldKeyName, newKeyName) {
        if (!this.isAvailable()) return;

        try {
            await this.execute(async (client) => {
                const pipeline = client.pipeline();

                // Delete snippet data
                pipeline.del(this.keys.snippet(snippetId));

                // Delete old index if key changed
                if (oldKeyName && oldKeyName !== newKeyName) {
                    pipeline.del(this.keys.snippetByKey(userId, oldKeyName));
                }

                // Delete new index to ensure fresh data
                if (newKeyName) {
                    pipeline.del(this.keys.snippetByKey(userId, newKeyName));
                }

                // Delete user snippets list
                pipeline.del(this.keys.userSnippets(userId));

                await pipeline.exec();
            });
        } catch (error) {
            console.error('Failed to invalidate cache on update:', error);
        }
    }

    /**
     * Warm up cache for a user (background operation)
     */
    async warmUserCache(userId, snippets) {
        if (!this.isAvailable() || !snippets || snippets.length === 0) return;

        try {
            await this.execute(async (client) => {
                const pipeline = client.pipeline();

                for (const snippet of snippets) {
                    // Cache snippet data
                    const snippetKey = this.keys.snippet(snippet._id);
                    pipeline.setex(snippetKey, this.ttl.warmCache, JSON.stringify(snippet));

                    // Cache index
                    const indexKey = this.keys.snippetByKey(userId, snippet.keyName);
                    pipeline.setex(indexKey, this.ttl.warmCache, String(snippet._id));
                }

                await pipeline.exec();
            });

            console.log(`✅ Warmed cache for user ${userId} with ${snippets.length} snippets`);
        } catch (error) {
            console.error('Failed to warm user cache:', error);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        if (!this.isAvailable()) {
            return {
                available: false,
                poolSize: this.pool.length,
                circuitBreaker: this.circuitBreaker,
            };
        }

        try {
            const stats = await this.execute(async (client) => {
                const info = await client.info('memory');
                const dbSize = await client.dbsize();

                return {
                    memory: info,
                    keys: dbSize,
                };
            });

            return {
                available: true,
                poolSize: this.pool.length,
                maxPoolSize: this.maxPoolSize,
                circuitBreaker: this.circuitBreaker,
                ...stats,
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
            };
        }
    }

    /**
     * Close all connections
     */
    async close() {
        console.log('Closing CacheManager...');

        const promises = this.pool.map(client => {
            return client.quit().catch(err => {
                console.error('Error closing connection:', err);
            });
        });

        await Promise.all(promises);
        this.pool = [];
        this.isInitialized = false;

        console.log('CacheManager closed');
    }
}

// Export singleton instance
export default new CacheManager();

