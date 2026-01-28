/**
 * BackgroundProcessor - Handle heavy operations asynchronously
 * 
 * Features:
 * - Non-blocking cache warming
 * - Batch operations
 * - Error resilience
 * - Automatic retries
 */

import cacheManager from './CacheManager.js';

class BackgroundProcessor {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
    }

    /**
     * Add job to background queue
     */
    async addJob(type, data) {
        this.queue.push({
            id: this.generateJobId(),
            type,
            data,
            retries: 0,
            createdAt: Date.now(),
        });

        // Process queue if not already processing
        if (!this.processing) {
            this.processQueue();
        }
    }

    /**
     * Process background queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();

            try {
                await this.processJob(job);
            } catch (error) {
                console.error(`Failed to process job ${job.id}:`, error);

                // Retry logic
                if (job.retries < this.maxRetries) {
                    job.retries++;
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, job.retries - 1);

                    setTimeout(() => {
                        this.queue.push(job);
                        if (!this.processing) {
                            this.processQueue();
                        }
                    }, delay);
                }
            }
        }

        this.processing = false;
    }

    /**
     * Process individual job
     */
    async processJob(job) {
        console.log(`Processing background job: ${job.type}`);

        switch (job.type) {
            case 'warm-user-cache':
                await this.warmUserCache(job.data);
                break;

            case 'invalidate-user-cache':
                await this.invalidateUserCache(job.data);
                break;

            case 'batch-warm-cache':
                await this.batchWarmCache(job.data);
                break;

            default:
                console.warn(`Unknown job type: ${job.type}`);
        }
    }

    /**
     * Warm cache for a user
     */
    async warmUserCache({ userId, snippets }) {
        if (!snippets || snippets.length === 0) return;

        try {
            await cacheManager.warmUserCache(userId, snippets);
        } catch (error) {
            console.error(`Failed to warm cache for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Invalidate all cache for a user
     */
    async invalidateUserCache({ userId }) {
        if (!cacheManager.isAvailable()) return;

        try {
            await cacheManager.execute(async (client) => {
                // Use SCAN to find all keys for this user
                let cursor = '0';
                const pattern = `*:${userId}:*`;

                do {
                    const [nextCursor, keys] = await client.scan(
                        cursor,
                        'MATCH',
                        pattern,
                        'COUNT',
                        100
                    );

                    if (keys.length > 0) {
                        await client.del(...keys);
                    }

                    cursor = nextCursor;
                } while (cursor !== '0');
            });

            console.log(`Invalidated all cache for user ${userId}`);
        } catch (error) {
            console.error(`Failed to invalidate cache for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Batch warm cache for multiple users
     */
    async batchWarmCache({ users }) {
        if (!users || users.length === 0) return;

        console.log(`Batch warming cache for ${users.length} users`);

        // Process in chunks to avoid overwhelming the system
        const chunkSize = 10;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);

            await Promise.all(
                chunk.map(user =>
                    this.warmUserCache(user).catch(err => {
                        console.error(`Failed to warm cache for user ${user.userId}:`, err);
                    })
                )
            );

            // Small delay between chunks
            if (i + chunkSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('Batch cache warming completed');
    }

    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            jobs: this.queue.map(job => ({
                id: job.id,
                type: job.type,
                retries: job.retries,
                age: Date.now() - job.createdAt,
            })),
        };
    }

    /**
     * Clear the queue
     */
    clearQueue() {
        const count = this.queue.length;
        this.queue = [];
        return count;
    }
}

// Export singleton instance
export default new BackgroundProcessor();

