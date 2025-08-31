// backend/lib/redis/CacheStrategy.js
import redisService from './RedisService.js';

class BaseCacheStrategy {
  constructor() {
    this.redis = redisService;
  }

  async execute(operation, ...args) {
    if (!this.redis.isAvailable()) {
      return this.fallback(operation, ...args);
    }
    try {
      return await this.performOperation(operation, ...args);
    } catch (error) {
      console.error(`Cache operation failed: ${operation}`, error);
      return this.fallback(operation, ...args);
    }
  }

  async performOperation(_operation, _args) {
    throw new Error('performOperation must be implemented by subclass');
  }

  async fallback(operation, ..._args) {
    console.warn(`Cache fallback for operation: ${operation}`);
    throw new Error('Fallback not implemented');
  }

  generateKey(prefix, identifier) {
    return `${prefix}:${identifier}`;
  }

  async setTTL(key, ttl) {
    if (ttl && ttl > 0) {
      await this.redis.executeOperation(async (client) => client.expire(key, ttl));
    }
  }
}

class WriteBehindCacheStrategy extends BaseCacheStrategy {
  constructor(syncQueue) {
    super();
    this.syncQueue = syncQueue;
  }

  async performOperation(operation, ...args) {
    switch (operation) {
      case 'set':
        return await this.set(...args);
      case 'get':
        return await this.get(...args);
      case 'delete':
        return await this.delete(...args);
      case 'update':
        return await this.update(...args);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async set(key, data, ttl = null) {
    const serializedData = JSON.stringify(data);
    await this.redis.executeOperation(async (client) => {
      await client.set(key, serializedData);
      if (ttl) await client.expire(key, ttl);
    });
    // NOTE: we no longer enqueue generic jobs from here for snippets.
    return { success: true, message: 'Data cached successfully' };
  }

  async get(key) {
    const data = await this.redis.executeOperation(async (client) => {
      const s = await client.get(key);
      return s ? JSON.parse(s) : null;
    });
    return data; // <- critical fix
  }

  async update(key, data, ttl = null) {
    const serializedData = JSON.stringify(data);
    await this.redis.executeOperation(async (client) => {
      await client.set(key, serializedData);
      if (ttl) await client.expire(key, ttl);
    });
    return { success: true, message: 'Data updated successfully' };
  }

  async delete(key) {
    await this.redis.executeOperation(async (client) => client.del(key));
    return { success: true, message: 'Data deleted successfully' };
  }

  async fallback(operation, ..._args) {
    console.warn(`Cache unavailable, falling back to DB for operation: ${operation}`);
    throw new Error('Cache unavailable - fallback required');
  }
}

class ReadThroughCacheStrategy extends BaseCacheStrategy {
  constructor(dbService) {
    super();
    this.dbService = dbService;
  }

  async performOperation(operation, ...args) {
    if (operation === 'get') return await this.get(...args);
    throw new Error(`Unsupported operation: ${operation}`);
  }

  async get(key, dbFetchFunction, ttl = 3600) {
    let data = await this.redis.executeOperation(async (client) => {
      const s = await client.get(key);
      return s ? JSON.parse(s) : null;
    });

    if (data) return data;

    try {
      data = await dbFetchFunction();
      if (data) {
        const serializedData = JSON.stringify(data);
        await this.redis.executeOperation(async (client) => {
          await client.set(key, serializedData);
          if (ttl) await client.expire(key, ttl);
        });
      }
      return data;
    } catch (error) {
      console.error('DB fetch failed:', error);
      throw error;
    }
  }

  async fallback(operation, ...args) {
    if (operation === 'get' && this.dbService) {
      const [key, dbFetchFunction] = args;
      if (typeof dbFetchFunction === 'function') {
        console.log('Cache unavailable, falling back to database for key:', key);
        return await this.dbService.fetch(key, dbFetchFunction);
      }
    }
    if (operation === 'get' && args[0] && args[0].includes('session:')) return null;
    throw new Error('Fallback not available');
  }
}

class CacheStrategyFactory {
  constructor(syncQueue, dbService) {
    this.syncQueue = syncQueue;
    this.dbService = dbService;
  }

  getStrategy(operationType = 'write-behind') {
    switch (operationType) {
      case 'write-behind':
        return new WriteBehindCacheStrategy(this.syncQueue);
      case 'read-through':
        return new ReadThroughCacheStrategy(this.dbService);
      default:
        return new WriteBehindCacheStrategy(this.syncQueue);
    }
  }
}

export { BaseCacheStrategy, WriteBehindCacheStrategy, ReadThroughCacheStrategy, CacheStrategyFactory };
