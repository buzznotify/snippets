import Redis from 'ioredis';
import { EventEmitter } from 'events';

/**
 * Redis Service Class - Core caching layer with connection pooling and health monitoring
 * Implements SOLID principles with clean separation of concerns
 */
class RedisService extends EventEmitter {
    constructor() {
        super();

        // Configuration
        this.config = {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT || 6379,
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: false, // Changed to false for immediate connection
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000,
            // Connection pooling
            enableReadyCheck: true,
            maxLoadingTimeout: 10000,
            // Circuit breaker
            circuitBreakerThreshold: 5,
            circuitBreakerTimeout: 30000,
        };

        // State management
        this.isConnected = false;
        this.isCircuitOpen = false;
        this.failureCount = 0;
        this.lastFailureTime = 0;

        // Initialize Redis client
        this.client = null;
        this.initializeClient();

        // Health check interval
        this.healthCheckInterval = null;
        this.startHealthCheck();
    }

    /**
 * Initialize Redis client with connection pooling
 */
    initializeClient() {
        try {
            this.client = new Redis(this.config);
            this.setupEventHandlers();

        } catch (error) {
            console.error('Failed to initialize Redis client:', error);
            this.emit('error', error);
        }
    }

    /**
     * Setup Redis event handlers
     */
    setupEventHandlers() {
        if (!this.client) return;

        this.client.on('connect', () => {
            console.log('Redis: Connected');
            this.isConnected = true;
            this.isCircuitOpen = false;
            this.failureCount = 0;
            this.emit('connected');
        });

        this.client.on('ready', () => {
            console.log('Redis: Ready');
            this.isConnected = true;
            this.emit('ready');
        });

        this.client.on('error', (error) => {
            console.error('Redis: Error:', error);
            this.handleFailure();
            this.emit('error', error);
        });

        this.client.on('close', () => {
            console.log('Redis: Connection closed');
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.client.on('reconnecting', () => {
            console.log('Redis: Reconnecting...');
            this.emit('reconnecting');
        });

        this.client.on('end', () => {
            console.log('Redis: Connection ended');
            this.isConnected = false;
            this.emit('disconnected');
        });
    }

    /**
     * Handle Redis failures and implement circuit breaker
     */
    handleFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.config.circuitBreakerThreshold && !this.isCircuitOpen) {
            this.isCircuitOpen = true;
            console.warn('Redis: Circuit breaker opened');
            this.emit('circuitOpen');

            // Auto-close circuit breaker after timeout
            setTimeout(() => {
                this.isCircuitOpen = false;
                this.failureCount = 0;
                console.log('Redis: Circuit breaker closed');
                this.emit('circuitClosed');
            }, this.config.circuitBreakerTimeout);
        }
    }

    /**
 * Check if Redis is available
 */
    isAvailable() {
        return this.isConnected && !this.isCircuitOpen;
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
        if (!this.client) {
            return false;
        }

        try {
            await this.client.ping();
            return true;
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
                    await this.client.ping();
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
     * Get Redis client instance
     */
    getClient() {
        return this.client;
    }

    /**
     * Gracefully close Redis connection
     */
    async close() {
        this.stopHealthCheck();

        if (this.client) {
            try {
                await this.client.quit();
                console.log('Redis: Connection closed gracefully');
            } catch (error) {
                console.error('Redis: Error closing connection:', error);
            }
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isCircuitOpen: this.isCircuitOpen,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            isAvailable: this.isAvailable(),
        };
    }
}

// Export singleton instance
export default new RedisService();
