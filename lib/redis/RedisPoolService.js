import Redis from 'ioredis';
import { EventEmitter } from 'events';

/**
 * Redis Connection Pool Service
 * Manages a pool of Redis connections with configurable limits
 */
class RedisPoolService extends EventEmitter {
    constructor() {
        super();

        // Pool configuration from environment variables
        this.poolSize = parseInt(process.env.REDIS_POOL_SIZE) || 10;
        this.maxConnections = parseInt(process.env.REDIS_MAX_CONNECTIONS) || 25;
        this.connectionTimeout = parseInt(process.env.REDIS_CONNECTION_TIMEOUT) || 5000;
        this.idleTimeout = parseInt(process.env.REDIS_IDLE_TIMEOUT) || 30000;

        // Pool state
        this.connections = [];
        this.activeConnections = 0;
        this.waitingQueue = [];
        this.isInitialized = false;

        // Initialize the pool
        this.initializePool();
    }

    /**
     * Initialize the connection pool
     */
    async initializePool() {
        try {
            console.log(`🔄 Initializing Redis connection pool (size: ${this.poolSize}, max: ${this.maxConnections})`);

            // Create initial connections
            for (let i = 0; i < this.poolSize; i++) {
                await this.createConnection();
            }

            this.isInitialized = true;
            console.log(`✅ Redis connection pool initialized with ${this.connections.length} connections`);

            // Start idle connection cleanup
            this.startIdleCleanup();

        } catch (error) {
            console.error('❌ Failed to initialize Redis connection pool:', error);
            this.emit('error', error);
        }
    }

    /**
     * Create a new Redis connection
     */
    async createConnection() {
        try {
            const connection = new Redis({
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT || 6379,
                username: process.env.REDIS_USERNAME,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 0,
                lazyConnect: true,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                connectTimeout: this.connectionTimeout,
                commandTimeout: this.connectionTimeout,
                keepAlive: this.idleTimeout,
            });

            // Setup connection event handlers
            connection.on('connect', () => {
                console.log('🔗 Redis connection established');
            });

            connection.on('ready', () => {
                console.log('✅ Redis connection ready');
            });

            connection.on('error', (error) => {
                console.error('❌ Redis connection error:', error.message);
                this.removeConnection(connection);
            });

            connection.on('close', () => {
                console.log('🔌 Redis connection closed');
                this.removeConnection(connection);
            });

            connection.on('end', () => {
                console.log('🔚 Redis connection ended');
                this.removeConnection(connection);
            });

            // Add connection to pool
            this.connections.push({
                client: connection,
                isActive: false,
                lastUsed: Date.now(),
                createdAt: Date.now()
            });

            return connection;

        } catch (error) {
            console.error('❌ Failed to create Redis connection:', error);
            throw error;
        }
    }

    /**
     * Get a connection from the pool
     */
    async getConnection() {
        // Wait for pool to be initialized
        if (!this.isInitialized) {
            await this.waitForInitialization();
        }

        // Check if we can create more connections
        if (this.activeConnections < this.maxConnections) {
            // Find an available connection in the pool
            const availableConnection = this.connections.find(conn => !conn.isActive);

            if (availableConnection) {
                availableConnection.isActive = true;
                availableConnection.lastUsed = Date.now();
                this.activeConnections++;
                return availableConnection.client;
            } else {
                // Create a new connection if pool is full but under max limit
                if (this.connections.length < this.maxConnections) {
                    const newConnection = await this.createConnection();
                    const poolConnection = this.connections.find(conn => conn.client === newConnection);
                    if (poolConnection) {
                        poolConnection.isActive = true;
                        poolConnection.lastUsed = Date.now();
                        this.activeConnections++;
                        return newConnection;
                    }
                }
            }
        }

        // If we can't get a connection immediately, queue the request
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Redis connection timeout - pool exhausted'));
            }, this.connectionTimeout);

            this.waitingQueue.push({
                resolve: (connection) => {
                    clearTimeout(timeout);
                    resolve(connection);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                timestamp: Date.now()
            });

            console.log(`⏳ Connection request queued (queue size: ${this.waitingQueue.length})`);
        });
    }

    /**
     * Return a connection to the pool
     */
    returnConnection(connection) {
        const poolConnection = this.connections.find(conn => conn.client === connection);

        if (poolConnection) {
            poolConnection.isActive = false;
            poolConnection.lastUsed = Date.now();
            this.activeConnections--;

            console.log(`🔄 Connection returned to pool (active: ${this.activeConnections}/${this.maxConnections})`);

            // Process waiting queue if there are pending requests
            this.processWaitingQueue();
        }
    }

    /**
     * Remove a failed connection from the pool
     */
    removeConnection(connection) {
        const index = this.connections.findIndex(conn => conn.client === connection);

        if (index !== -1) {
            const poolConnection = this.connections[index];

            if (poolConnection.isActive) {
                this.activeConnections--;
            }

            this.connections.splice(index, 1);

            console.log(`🗑️  Connection removed from pool (active: ${this.activeConnections}/${this.maxConnections})`);

            // Try to replace the removed connection
            this.replaceConnection();

            // Process waiting queue
            this.processWaitingQueue();
        }
    }

    /**
     * Replace a removed connection
     */
    async replaceConnection() {
        if (this.connections.length < this.poolSize && this.connections.length < this.maxConnections) {
            try {
                await this.createConnection();
                console.log(`🔄 Replaced removed connection (pool size: ${this.connections.length})`);
            } catch (error) {
                console.error('❌ Failed to replace connection:', error);
            }
        }
    }

    /**
     * Process waiting queue
     */
    processWaitingQueue() {
        while (this.waitingQueue.length > 0 && this.activeConnections < this.maxConnections) {
            const request = this.waitingQueue.shift();
            const availableConnection = this.connections.find(conn => !conn.isActive);

            if (availableConnection) {
                availableConnection.isActive = true;
                availableConnection.lastUsed = Date.now();
                this.activeConnections++;

                console.log(`✅ Processing queued request (active: ${this.activeConnections}/${this.maxConnections})`);
                request.resolve(availableConnection.client);
            } else {
                break;
            }
        }
    }

    /**
     * Start idle connection cleanup
     */
    startIdleCleanup() {
        setInterval(() => {
            this.cleanupIdleConnections();
        }, 60000); // Check every minute
    }

    /**
     * Cleanup idle connections
     */
    cleanupIdleConnections() {
        const now = Date.now();
        const idleThreshold = now - this.idleTimeout;

        this.connections.forEach((poolConnection, index) => {
            if (!poolConnection.isActive &&
                poolConnection.lastUsed < idleThreshold &&
                this.connections.length > this.poolSize) {

                console.log(`🧹 Cleaning up idle connection (idle for ${Math.round((now - poolConnection.lastUsed) / 1000)}s)`);
                poolConnection.client.disconnect();
                this.connections.splice(index, 1);
            }
        });
    }

    /**
     * Wait for pool initialization
     */
    async waitForInitialization() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        return {
            poolSize: this.poolSize,
            maxConnections: this.maxConnections,
            totalConnections: this.connections.length,
            activeConnections: this.activeConnections,
            availableConnections: this.connections.filter(conn => !conn.isActive).length,
            waitingQueue: this.waitingQueue.length,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Close all connections in the pool
     */
    async closePool() {
        console.log('🔄 Closing Redis connection pool...');

        // Clear waiting queue
        this.waitingQueue.forEach(request => {
            request.reject(new Error('Pool is closing'));
        });
        this.waitingQueue = [];

        // Close all connections
        const closePromises = this.connections.map(async (poolConnection) => {
            try {
                await poolConnection.client.quit();
            } catch (error) {
                console.error('Error closing connection:', error);
            }
        });

        await Promise.all(closePromises);

        this.connections = [];
        this.activeConnections = 0;
        this.isInitialized = false;

        console.log('✅ Redis connection pool closed');
    }
}

// Export singleton instance
export default new RedisPoolService();
