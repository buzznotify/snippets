import Redis from 'ioredis';
import { EventEmitter } from 'events';

/**
 * Redis Connection Pool Service
 * - Safe waiting queue with timeout cancellation
 * - No removal on transient 'error' (only 'close'/'end')
 * - Safe idle cleanup
 */
class RedisPoolService extends EventEmitter {
  constructor() {
    super();

    this.poolSize = parseInt(process.env.REDIS_POOL_SIZE || '10', 10);
    this.maxConnections = parseInt(process.env.REDIS_MAX_CONNECTIONS || '25', 10);
    this.connectionTimeout = parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000', 10);
    this.idleTimeout = parseInt(process.env.REDIS_IDLE_TIMEOUT || '30000', 10);

    this.connections = [];  // [{ client, isActive, lastUsed, createdAt }]
    this.activeConnections = 0;
    this.waitingQueue = []; // [{ resolve, reject, deadline, canceled }]
    this.isInitialized = false;

    this.initializePool();
  }

  async initializePool() {
    try {
      console.log(`🔄 Initializing Redis pool (size: ${this.poolSize}, max: ${this.maxConnections})`);

      for (let i = 0; i < this.poolSize; i++) {
        await this.createConnection();
      }

      this.isInitialized = true;
      console.log(`✅ Redis pool ready with ${this.connections.length} connections`);

      this.startIdleCleanup();
      this.startQueueSweeper();
    } catch (err) {
      console.error('❌ Pool init failed:', err);
      this.emit('error', err);
    }
  }

  buildClient() {
    return new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      // connection behavior
      lazyConnect: true,               // connect on first command (saves sockets)
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: this.connectionTimeout,
      commandTimeout: this.connectionTimeout,
      keepAlive: this.idleTimeout,
    });
  }

  async createConnection() {
    const client = this.buildClient();

    client.on('connect', () => {
      // noisy in large pools; keep if you need
      // console.log('🔗 Redis connection established');
    });

    client.on('ready', () => {
      // console.log('✅ Redis connection ready');
    });

    client.on('error', (err) => {
      // Do NOT remove on 'error' — it can be transient.
      console.error('⚠️ Redis connection error:', err?.message);
    });

    client.on('close', () => {
      console.warn('🔌 Redis connection closed');
      this.removeConnection(client);
    });

    client.on('end', () => {
      console.warn('🔚 Redis connection ended');
      this.removeConnection(client);
    });

    this.connections.push({
      client,
      isActive: false,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    });

    return client;
  }

  async getConnection() {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    // Reuse idle if possible
    const idle = this.connections.find(c => !c.isActive);
    if (idle) {
      idle.isActive = true;
      idle.lastUsed = Date.now();
      this.activeConnections++;
      return idle.client;
    }

    // Grow pool if under limits
    if (this.connections.length < this.maxConnections) {
      const client = await this.createConnection();
      const wrap = this.connections.find(c => c.client === client);
      if (wrap) {
        wrap.isActive = true;
        wrap.lastUsed = Date.now();
        this.activeConnections++;
        return client;
      }
    }

    // Otherwise queue the request
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + this.connectionTimeout;
      const ticket = { resolve, reject, deadline, canceled: false };
      this.waitingQueue.push(ticket);

      setTimeout(() => {
        if (ticket.canceled) return;
        ticket.canceled = true;
        // Remove this ticket from queue if still present
        const idx = this.waitingQueue.indexOf(ticket);
        if (idx >= 0) this.waitingQueue.splice(idx, 1);
        reject(new Error('Redis connection timeout - pool exhausted'));
      }, this.connectionTimeout);

      // Optional log
      // console.log(`⏳ Queued connection request (queue: ${this.waitingQueue.length})`);
    });
  }

  returnConnection(connection) {
    const wrap = this.connections.find(c => c.client === connection);
    if (!wrap) return; // already removed

    // If there’s a waiter, handoff directly
    while (this.waitingQueue.length > 0) {
      const ticket = this.waitingQueue.shift();
      if (!ticket || ticket.canceled) continue;
      // give this same connection to the waiter
      wrap.isActive = true;
      wrap.lastUsed = Date.now();
      this.activeConnections = Math.min(this.activeConnections + 1, this.maxConnections);
      ticket.canceled = true;
      try { ticket.resolve(wrap.client); } catch (_) {}
      return;
    }

    // else, mark idle
    if (wrap.isActive) {
      wrap.isActive = false;
      wrap.lastUsed = Date.now();
      this.activeConnections = Math.max(this.activeConnections - 1, 0);
      // console.log(`🔄 Returned connection (active: ${this.activeConnections}/${this.maxConnections})`);
    }
  }

  removeConnection(connection) {
    const idx = this.connections.findIndex(c => c.client === connection);
    if (idx === -1) return;

    const wasActive = this.connections[idx].isActive;
    if (wasActive) {
      this.activeConnections = Math.max(this.activeConnections - 1, 0);
    }

    // Ensure the client is closed
    try { connection.disconnect(); } catch (_) {}
    this.connections.splice(idx, 1);

    // Try to keep pool above min size
    this.replaceConnection();
    // Handoff to queued waiters if any free appears
    this.processWaitingQueue();
  }

  async replaceConnection() {
    if (this.connections.length < this.poolSize && this.connections.length < this.maxConnections) {
      try {
        await this.createConnection();
        // console.log(`🔄 Replaced connection (pool: ${this.connections.length})`);
      } catch (err) {
        console.error('❌ Failed to replace connection:', err);
      }
    }
  }

  processWaitingQueue() {
    if (!this.waitingQueue.length) return;
    // while there is an idle and a waiter
    let idle = this.connections.find(c => !c.isActive);
    while (idle && this.waitingQueue.length) {
      const ticket = this.waitingQueue.shift();
      if (!ticket || ticket.canceled) {
        idle = this.connections.find(c => !c.isActive);
        continue;
      }
      idle.isActive = true;
      idle.lastUsed = Date.now();
      this.activeConnections = Math.min(this.activeConnections + 1, this.maxConnections);
      ticket.canceled = true;
      try { ticket.resolve(idle.client); } catch (_) {}
      idle = this.connections.find(c => !c.isActive);
    }
  }

  startIdleCleanup() {
    this._idleTimer = setInterval(() => this.cleanupIdleConnections(), 60_000);
  }

  cleanupIdleConnections() {
    const now = Date.now();
    const idleBefore = now - this.idleTimeout;

    // Iterate backwards to splice safely
    for (let i = this.connections.length - 1; i >= 0; i--) {
      const c = this.connections[i];
      if (!c.isActive && c.lastUsed < idleBefore && this.connections.length > this.poolSize) {
        // console.log(`🧹 Closing idle connection (idle ${(now - c.lastUsed) / 1000 | 0}s)`);
        try { c.client.disconnect(); } catch (_) {}
        this.connections.splice(i, 1);
      }
    }
  }

  startQueueSweeper() {
    // Clean up expired waiters just in case (belt & suspenders)
    this._queueTimer = setInterval(() => {
      const now = Date.now();
      for (let i = this.waitingQueue.length - 1; i >= 0; i--) {
        const t = this.waitingQueue[i];
        if (!t.canceled && now > t.deadline) {
          t.canceled = true;
          try { t.reject(new Error('Redis connection timeout - queued request expired')); } catch (_) {}
          this.waitingQueue.splice(i, 1);
        }
      }
    }, 1000);
  }

  async waitForInitialization() {
    if (this.isInitialized) return true;
    await new Promise((res) => {
      const iv = setInterval(() => {
        if (this.isInitialized) { clearInterval(iv); res(true); }
      }, 100);
    });
    return true;
  }

  getPoolStats() {
    return {
      poolSize: this.poolSize,
      maxConnections: this.maxConnections,
      totalConnections: this.connections.length,
      activeConnections: this.activeConnections,
      availableConnections: this.connections.filter(c => !c.isActive).length,
      waitingQueue: this.waitingQueue.filter(t => !t.canceled).length,
      isInitialized: this.isInitialized,
    };
  }

  async closePool() {
    console.log('🔄 Closing Redis pool...');
    // Reject queued requests
    while (this.waitingQueue.length) {
      const t = this.waitingQueue.shift();
      if (!t) continue;
      t.canceled = true;
      try { t.reject(new Error('Pool is closing')); } catch (_) {}
    }

    const closes = this.connections.map(async (c) => {
      try { await c.client.quit(); } catch (e) { /* ignore */ }
    });
    await Promise.allSettled(closes);

    this.connections = [];
    this.activeConnections = 0;
    this.isInitialized = false;

    if (this._idleTimer) clearInterval(this._idleTimer);
    if (this._queueTimer) clearInterval(this._queueTimer);

    console.log('✅ Redis pool closed');
  }
}

export default new RedisPoolService();
