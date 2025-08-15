import { EventEmitter } from 'events';
import redisPoolService from './RedisPoolService.js';

/**
 * Redis Service Class - Core caching layer with connection pooling and health monitoring
 * Implements SOLID principles with clean separation of concerns
 */
class RedisService extends EventEmitter {
    constructor() {
        super();

        // State management
        this.isConnected = false;
        this.isCircuitOpen = false;
        this.failureCount = 0;
        this.lastFailureTime = 0;

        // Health check interval
        this.healthCheckInterval = null;
        this.startHealthCheck();
    }

    /**
     * Get Redis client from the pool
     */
    async getClient() {
        try {
            const client = await redisPoolService.getConnection();
            this.isConnected = true;
            this.isCircuitOpen = false;
            this.failureCount = 0;
            return client;
        } catch (error) {
            console.error('Failed to get Redis client from pool:', error);
            this.handleFailure();
            throw error;
        }
    }

    /**
     * Return Redis client to the pool
     */
    returnClient(client) {
        if (client) {
            redisPoolService.returnConnection(client);
        }
    }

    /**
     * Execute Redis operation with automatic connection management
     */
    async executeOperation(operation) {
        let client = null;
        try {
            client = await redisPoolService.getConnection();
            const result = await operation(client);
            return result;
        } finally {
            if (client) {
                redisPoolService.returnConnection(client);
            }
        }
    }

    /**
     * Handle connection failures
     */
    handleFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= 5) {
            this.isCircuitOpen = true;
            console.log('Redis: Circuit breaker opened');
            this.emit('circuitOpened');

            // Close circuit breaker after timeout
            setTimeout(() => {
                this.isCircuitOpen = false;
                this.failureCount = 0;
                console.log('Redis: Circuit breaker closed');
                this.emit('circuitClosed');
            }, 30000); // 30 seconds
        }
    }

    /**
 * Check if Redis is available
 */
    isAvailable() {
        return redisPoolService.isInitialized && !this.isCircuitOpen;
    }

    /**
     * Wait for Redis to be ready
     */
    async waitForConnection(timeout = 10000) {
        if (this.isAvailable()) {
            return true;
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Redis connection timeout'));
            }, timeout);

            const checkConnection = () => {
                if (this.isAvailable()) {
                    clearTimeout(timer);
                    resolve(true);
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    /**
     * Simple connection check using ping
     */
    async checkConnection() {
        try {
            return await this.executeOperation(async (client) => {
                await client.ping();
                return true;
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Start health check monitoring
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            if (this.isAvailable()) {
                try {
                    await this.checkConnection();
                } catch (error) {
                    this.handleFailure();
                }
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop health check monitoring
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Get Redis client instance (deprecated - use executeOperation instead)
     */
    getClient() {
        return this.client;
    }

    /**
     * Gracefully close Redis connection
     */
    async close() {
        this.stopHealthCheck();
        await redisPoolService.closePool();
        console.log('Redis: All connections closed gracefully');
    }

    /**
     * Get connection status
     */
    getStatus() {
        const poolStats = redisPoolService.getPoolStats();
        return {
            isConnected: this.isConnected,
            isCircuitOpen: this.isCircuitOpen,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            isAvailable: this.isAvailable(),
            pool: poolStats
        };
    }
}

// Export singleton instance
export default new RedisService();
