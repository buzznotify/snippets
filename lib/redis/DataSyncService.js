import '../env.js'; // Load environment variables first
import { connectToDB } from '../../backend/database/db.js';
import { syncExistingSnippetsToCache } from '../../backend/snippet/services/snippet-cached.js';
import { syncExistingUsersToCache } from '../../backend/user/services/user-cached.js';
import cacheService from './CacheService.js';

/**
 * Data Sync Service - Migrates existing database data to Redis cache
 * Ensures all existing data is available in cache for immediate access
 */
class DataSyncService {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialize the data sync service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log(' Initializing Data Sync Service...');

            // Connect to database
            await connectToDB();
            console.log(' Database connected');

            // Wait for Redis to be ready
            await this.waitForRedis();
            console.log(' Redis ready');

            this.isInitialized = true;
            console.log(' Data Sync Service initialized');

        } catch (error) {
            console.error(' Failed to initialize Data Sync Service:', error);
            throw error;
        }
    }

    /**
     * Wait for Redis to be available
     */
    async waitForRedis(timeout = 30000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (cacheService.isAvailable()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Redis not available within timeout');
    }

    /**
     * Sync all existing data to cache
     */
    async syncAllData() {
        try {
            console.log(' Starting full data sync to cache...');

            await this.initialize();

            const results = {
                users: null,
                snippets: null,
                totalTime: 0
            };

            const startTime = Date.now();

            // Sync users first
            console.log('\n👥 Syncing users...');
            results.users = await syncExistingUsersToCache();

            // Sync snippets
            console.log('\n Syncing snippets...');
            results.snippets = await syncExistingSnippetsToCache();

            results.totalTime = Date.now() - startTime;

            console.log('\n Full data sync completed!');
            console.log(' Results:', JSON.stringify(results, null, 2));

            return results;

        } catch (error) {
            console.error(' Full data sync failed:', error);
            throw error;
        }
    }

    /**
     * Sync only users to cache
     */
    async syncUsers() {
        try {
            console.log('👥 Syncing users to cache...');
            await this.initialize();
            return await syncExistingUsersToCache();
        } catch (error) {
            console.error(' User sync failed:', error);
            throw error;
        }
    }

    /**
     * Sync only snippets to cache
     */
    async syncSnippets() {
        try {
            console.log(' Syncing snippets to cache...');
            await this.initialize();
            return await syncExistingSnippetsToCache();
        } catch (error) {
            console.error(' Snippet sync failed:', error);
            throw error;
        }
    }

    /**
     * Get sync status and statistics
     */
    async getSyncStatus() {
        try {
            await this.initialize();

            const cacheStats = await cacheService.getStats();
            const userStats = await this.getUserSyncStats();
            const snippetStats = await this.getSnippetSyncStats();

            return {
                isInitialized: this.isInitialized,
                cacheStatus: cacheService.getStatus(),
                userSync: userStats,
                snippetSync: snippetStats,
                cacheStats: cacheStats
            };

        } catch (error) {
            console.error('Error getting sync status:', error);
            return null;
        }
    }

    /**
     * Get user sync statistics
     */
    async getUserSyncStats() {
        try {
            return await cacheService.redis.executeOperation(async (client) => {
                const userCount = await client.keys('user:*').then(keys => keys.length);
                const emailCount = await client.keys('user:email:*').then(keys => keys.length);
                const sessionCount = await client.keys('session:*').then(keys => keys.length);

                return {
                    userCount,
                    emailCount,
                    sessionCount,
                    totalUserKeys: userCount + emailCount + sessionCount
                };
            });
        } catch (error) {
            console.error('Error getting user sync stats:', error);
            return null;
        }
    }

    /**
     * Get snippet sync statistics
     */
    async getSnippetSyncStats() {
        try {
            return await cacheService.redis.executeOperation(async (client) => {
                const snippetCount = await client.keys('snippet:*').then(keys => keys.length);
                const userSnippetsCount = await client.keys('user_snippets:*').then(keys => keys.length);

                return {
                    snippetCount,
                    userSnippetsCount,
                    totalSnippetKeys: snippetCount + userSnippetsCount
                };
            });
        } catch (error) {
            console.error('Error getting snippet sync stats:', error);
            return null;
        }
    }

    /**
     * Verify data consistency between cache and database
     */
    async verifyDataConsistency() {
        try {
            console.log('🔍 Verifying data consistency...');
            await this.initialize();

            const results = {
                users: { cached: 0, db: 0, consistent: false },
                snippets: { cached: 0, db: 0, consistent: false }
            };

            // Check user consistency
            return await cacheService.redis.executeOperation(async (client) => {
                const cachedUsers = await client.keys('user:*').then(keys => keys.length);
                const dbUsers = await client.keys('user:email:*').then(keys => keys.length);
                results.users = { cached: cachedUsers, db: dbUsers, consistent: cachedUsers > 0 && dbUsers > 0 };

                // Check snippet consistency
                const cachedSnippets = await client.keys('snippet:*').then(keys => keys.length);
                const dbSnippets = await client.keys('user_snippets:*').then(keys => keys.length);
                results.snippets = { cached: cachedSnippets, db: dbSnippets, consistent: cachedSnippets > 0 && dbSnippets > 0 };

                console.log(' Consistency check results:', JSON.stringify(results, null, 2));
                return results;
            });

        } catch (error) {
            console.error('Error verifying data consistency:', error);
            return null;
        }
    }

    /**
     * Clear all cached data (use with caution)
     */
    async clearAllCache() {
        try {
            console.log('Clearing all cache data...');
            await this.initialize();

            const result = await cacheService.clearAll();
            console.log(' All cache cleared');

            return result;

        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    }

    /**
     * Health check for the sync service
     */
    async healthCheck() {
        try {
            const status = await this.getSyncStatus();
            const consistency = await this.verifyDataConsistency();

            return {
                service: 'DataSyncService',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                isInitialized: this.isInitialized,
                cacheAvailable: cacheService.isAvailable(),
                syncStatus: status,
                dataConsistency: consistency
            };

        } catch (error) {
            return {
                service: 'DataSyncService',
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                isInitialized: this.isInitialized,
                cacheAvailable: cacheService.isAvailable()
            };
        }
    }
}

// Export singleton instance
export default new DataSyncService();
