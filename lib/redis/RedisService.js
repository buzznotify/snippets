import { EventEmitter } from 'events';
import redisPoolService from './RedisPoolService.js';

/**
 * Redis Service
 * - leases connections from the pool
 * - circuit breaker
 * - health checks
 */
class RedisService extends EventEmitter {
  constructor() {
    super();
    this.isCircuitOpen = false;
    this.failureCount = 0;
    this.lastFailureTime = 0;

    this.healthCheckInterval = null;
    this.startHealthCheck();
  }

  async withClient(fn) {
    let client = null;
    try {
      client = await redisPoolService.getConnection();
      return await fn(client);
    } finally {
      if (client) redisPoolService.returnConnection(client);
    }
  }

  async executeOperation(operation) {
    return this.withClient(operation);
  }

  handleFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= 5 && !this.isCircuitOpen) {
      this.isCircuitOpen = true;
      console.warn('🔴 Redis: Circuit breaker opened');
      this.emit('circuitOpened');

      setTimeout(() => {
        this.isCircuitOpen = false;
        this.failureCount = 0;
        console.log('🟢 Redis: Circuit breaker closed');
        this.emit('circuitClosed');
      }, 30000);
    }
  }

  isAvailable() {
    return redisPoolService.isInitialized && !this.isCircuitOpen;
  }

  async waitForConnection(timeout = 10000) {
    if (this.isAvailable()) return true;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Redis connection timeout')), timeout);
      const check = () => {
        if (this.isAvailable()) { clearTimeout(timer); resolve(true); }
        else { setTimeout(check, 100); }
      };
      check();
    });
  }

  async checkConnection() {
    try {
      return await this.withClient(async (c) => {
        await c.ping();
        return true;
      });
    } catch (e) {
      return false;
    }
  }

  startHealthCheck() {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isAvailable()) return;
      try {
        const ok = await this.checkConnection();
        if (!ok) this.handleFailure();
      } catch {
        this.handleFailure();
      }
    }, 30000);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async close() {
    this.stopHealthCheck();
    await redisPoolService.closePool();
    console.log('Redis: closed gracefully');
  }

  getStatus() {
    const pool = redisPoolService.getPoolStats();
    return {
      isCircuitOpen: this.isCircuitOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isAvailable: this.isAvailable(),
      pool,
    };
  }
}

export default new RedisService();
