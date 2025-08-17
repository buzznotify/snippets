/**
 * CacheInitializer - Initialize and warm cache on application startup
 * 
 * Features:
 * - Automatic cache warming on startup
 * - Graceful handling of cold starts
 * - Background synchronization
 */

import cacheManager from './CacheManager.js';
import backgroundProcessor from './BackgroundProcessor.js';
import { connectToDB } from '../../backend/database/db.js';

class CacheInitializer {
    constructor() {
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize cache system
     */
    async initialize() {
        if (this.isInitialized) {
            return { success: true, message: 'Cache already initialized' };
        }

        if (this.initPromise) {
            return await this.initPromise;
        }

        this.initPromise = this._doInitialize();
        const result = await this.initPromise;
        this.isInitialized = result.success;

        return result;
    }

    /**
     * Perform actual initialization
     */
    async _doInitialize() {
        try {
            console.log('🚀 Starting cache initialization...');

            // 1. Connect to database
            await connectToDB();

            // 2. Initialize cache manager
            await cacheManager.initialize();

            // 3. Check if cache is available
            if (!cacheManager.isAvailable()) {
                console.warn('⚠️ Cache is not available, running in degraded mode');
                return {
                    success: true,
                    degraded: true,
                    message: 'Running without cache'
                };
            }

            // 4. Warm cache in background (non-blocking)
            this.warmCacheInBackground();

            console.log('✅ Cache initialization completed');

            return {
                success: true,
                message: 'Cache initialized successfully'
            };

        } catch (error) {
            console.error('❌ Cache initialization failed:', error);
            this.initPromise = null;

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Warm cache in background
     */
    async warmCacheInBackground() {
        try {
            console.log('🔥 Starting background cache warming...');

            // Import dynamically to avoid circular dependencies
            const { warmAllUsersCache } = await import('../../backend/snippet/services/snippet.js');

            // Start warming cache
            const result = await warmAllUsersCache();

            if (result.success) {
                console.log(`✅ Cache warmed successfully: ${result.count} snippets for ${result.users} users`);
            } else {
                console.warn('⚠️ Cache warming failed:', result.error);
            }

        } catch (error) {
            console.error('❌ Background cache warming error:', error);
            // Don't throw - this is a background operation
        }
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            cacheAvailable: cacheManager.isAvailable(),
            cacheStats: cacheManager.getStats(),
            backgroundJobs: backgroundProcessor.getStats()
        };
    }

    /**
     * Shutdown cache system gracefully
     */
    async shutdown() {
        console.log('Shutting down cache system...');

        try {
            // Clear background jobs
            const clearedJobs = backgroundProcessor.clearQueue();
            console.log(`Cleared ${clearedJobs} background jobs`);

            // Close cache connections
            await cacheManager.close();

            this.isInitialized = false;
            this.initPromise = null;

            console.log('Cache system shutdown complete');

        } catch (error) {
            console.error('Error during cache shutdown:', error);
        }
    }
}

// Export singleton instance
const cacheInitializer = new CacheInitializer();

// Auto-initialize on module load (non-blocking)
if (process.env.NODE_ENV !== 'test') {
    // Don't wait for initialization to complete
    cacheInitializer.initialize().catch(err => {
        console.error('Failed to auto-initialize cache:', err);
    });
}

export default cacheInitializer;

