import Queue from 'bull';
import redisPoolService from './RedisPoolService.js';

/**
 * Background Sync Queue System - Handles database synchronization independently
 * Uses Bull queue for reliable job processing with retry mechanisms
 */
class SyncQueue {
    constructor() {
        this.queue = null;
        this.processors = new Map();
        this.initializeQueue();
    }

    /**
     * Initialize Bull queue with shared Redis connection pool
     */
    initializeQueue() {
        try {
            // Use Redis connection pool configuration
            const redisConfig = {
                redis: {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT || 6379,
                    username: process.env.REDIS_USERNAME,
                    password: process.env.REDIS_PASSWORD,
                    db: process.env.REDIS_DB || 0, // Use DB 0 for cloud Redis
                    // Connection pooling settings
                    lazyConnect: true,
                    maxRetriesPerRequest: 3,
                    retryDelayOnFailover: 100,
                    // Use connection pool limits
                    maxRetriesPerRequest: 3,
                    retryDelayOnFailover: 100,
                },
                defaultJobOptions: {
                    removeOnComplete: 100, // Keep last 100 completed jobs
                    removeOnFail: 50,      // Keep last 50 failed jobs
                    attempts: 3,           // Retry failed jobs 3 times
                    backoff: {
                        type: 'exponential',
                        delay: 2000,         // Start with 2 second delay
                    },
                },
            };

            this.queue = new Queue('db-sync', redisConfig);
            this.setupQueueHandlers();
            this.setupJobProcessors();

            console.log('Sync queue initialized successfully');
        } catch (error) {
            console.error('Failed to initialize sync queue:', error);
            throw error;
        }
    }

    /**
     * Setup queue event handlers
     */
    setupQueueHandlers() {
        if (!this.queue) return;

        this.queue.on('ready', () => {
            console.log('Sync queue is ready');
        });

        this.queue.on('error', (error) => {
            console.error('Sync queue error:', error);
        });

        this.queue.on('failed', (job, error) => {
            console.error(`Job ${job.id} failed:`, error);
            console.error('Job data:', job.data);
        });

        this.queue.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
        });

        this.queue.on('stalled', (job) => {
            console.warn(`Job ${job.id} stalled, retrying...`);
        });

        this.queue.on('waiting', (jobId) => {
            console.log(`Job ${jobId} waiting to be processed`);
        });

        this.queue.on('active', (job) => {
            console.log(`Job ${job.id} started processing`);
        });
    }

    /**
     * Setup job processors for different sync operations
     */
    setupJobProcessors() {
        if (!this.queue) return;

        // Process sync-to-db jobs
        this.queue.process('sync-to-db', async (job) => {
            return await this.processSyncJob(job);
        });

        // Process bulk-sync jobs
        this.queue.process('bulk-sync', async (job) => {
            return await this.processBulkSyncJob(job);
        });

        // Process cache-invalidation jobs
        this.queue.process('cache-invalidate', async (job) => {
            return await this.processCacheInvalidationJob(job);
        });
    }

    /**
     * Process individual sync job
     */
    async processSyncJob(job) {
        const { operation, key, data, timestamp } = job.data;

        try {
            // Only log for actual sync operations, not cache population
            if (operation === 'set' && data && data._id) {
                console.log(`Processing sync job: ${operation} for key: ${key}`);
            }

            // Add delay to simulate background processing
            await this.simulateBackgroundProcessing();

            // Process based on operation type
            switch (operation) {
                case 'set':
                case 'update':
                    await this.syncToDatabase(key, data);
                    break;
                case 'delete':
                    await this.deleteFromDatabase(key);
                    break;
                default:
                    throw new Error(`Unknown sync operation: ${operation}`);
            }

            // Only log completion for actual sync operations
            if (operation === 'set' && data && data._id) {
                console.log(`Sync job completed: ${operation} for key: ${key}`);
            }
            return { success: true, operation, key, timestamp };

        } catch (error) {
            console.error(`Sync job failed: ${operation} for key: ${key}`, error);

            // Increment retry count
            job.data.retryCount = (job.data.retryCount || 0) + 1;

            // If max retries reached, log for manual intervention
            if (job.data.retryCount >= 3) {
                console.error(`Max retries reached for job: ${job.id}`);
                await this.logFailedJob(job);
            }

            throw error; // This will trigger retry mechanism
        }
    }

    /**
     * Process bulk sync job
     */
    async processBulkSyncJob(job) {
        const { operations } = job.data;

        try {
            console.log(`Processing bulk sync job with ${operations.length} operations`);

            const results = [];

            for (const operation of operations) {
                try {
                    await this.processSyncJob({ data: operation });
                    results.push({ success: true, operation });
                } catch (error) {
                    results.push({ success: false, operation, error: error.message });
                }
            }

            return { success: true, results };

        } catch (error) {
            console.error('Bulk sync job failed:', error);
            throw error;
        }
    }

    /**
     * Execute Redis operation with connection pooling
     */
    async executeRedisOperation(operation) {
        let connection = null;
        try {
            connection = await redisPoolService.getConnection();
            return await operation(connection);
        } finally {
            if (connection) {
                redisPoolService.returnConnection(connection);
            }
        }
    }

    /**
     * Process cache invalidation job
     */
    async processCacheInvalidationJob(job) {
        const { keys, pattern } = job.data;

        try {
            if (keys && keys.length > 0) {
                // Invalidate specific keys
                await this.executeRedisOperation(async (client) => {
                    for (const key of keys) {
                        await client.del(key);
                    }
                });
                console.log(`Invalidated ${keys.length} specific cache keys`);
            }

            if (pattern) {
                // Invalidate keys matching pattern
                await this.executeRedisOperation(async (client) => {
                    const matchingKeys = await client.keys(pattern);
                    if (matchingKeys.length > 0) {
                        await client.del(...matchingKeys);
                        console.log(`Invalidated ${matchingKeys.length} cache keys matching pattern: ${pattern}`);
                    }
                });
            }

            return { success: true, keysInvalidated: keys?.length || 0 };

        } catch (error) {
            console.error('Cache invalidation job failed:', error);
            throw error;
        }
    }

    /**
     * Sync data to database (placeholder - will be implemented by specific services)
     */
    async syncToDatabase(key, data) {
        // This is a placeholder - actual implementation will be in service layer
        // Only log for actual new data, not cache population
        if (data && data._id && (!data.created_at || new Date(data.created_at) > new Date(Date.now() - 60000))) {
            console.log(`Syncing to database: ${key}`, data);
        }

        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));

        // In real implementation, this would call the appropriate database service
        // await this.dbService.update(key, data);
    }

    /**
     * Delete data from database (placeholder)
     */
    async deleteFromDatabase(key) {
        console.log(`Deleting from database: ${key}`);

        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));

        // In real implementation, this would call the appropriate database service
        // await this.dbService.delete(key);
    }

    /**
     * Log failed job for manual intervention
     */
    async logFailedJob(job) {
        const failedJob = {
            id: job.id,
            data: job.data,
            failedAt: new Date().toISOString(),
            error: job.failedReason,
        };

        try {
            // Store failed job in Redis for manual review
            await this.executeRedisOperation(async (client) => {
                await client.lpush('failed-sync-jobs', JSON.stringify(failedJob));
            });
            console.error('Failed job logged for manual review:', failedJob);
        } catch (error) {
            console.error('Failed to log failed job:', error);
        }
    }

    /**
     * Simulate background processing delay
     */
    async simulateBackgroundProcessing() {
        // Random delay between 50-200ms to simulate real background processing
        const delay = Math.random() * 150 + 50;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Add job to sync queue
     */
    async addJob(jobType, data, options = {}) {
        if (!this.queue) {
            throw new Error('Sync queue not initialized');
        }

        const job = await this.queue.add(jobType, data, {
            ...this.queue.defaultJobOptions,
            ...options,
        });

        console.log(`Job added to sync queue: ${jobType} (ID: ${job.id})`);
        return job;
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        if (!this.queue) return null;

        try {
            const [waiting, active, completed, failed] = await Promise.all([
                this.queue.getWaiting(),
                this.queue.getActive(),
                this.queue.getCompleted(),
                this.queue.getFailed(),
            ]);

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length,
            };
        } catch (error) {
            console.error('Failed to get queue stats:', error);
            return null;
        }
    }

    /**
     * Clean up completed and failed jobs
     */
    async cleanup() {
        if (!this.queue) return;

        try {
            await this.queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean jobs older than 24 hours
            await this.queue.clean(24 * 60 * 60 * 1000, 'failed');
            console.log('Queue cleanup completed');
        } catch (error) {
            console.error('Queue cleanup failed:', error);
        }
    }

    /**
     * Gracefully close queue
     */
    async close() {
        if (this.queue) {
            await this.queue.close();
            console.log('Sync queue closed');
        }
    }
}

// Export singleton instance
export default new SyncQueue();
