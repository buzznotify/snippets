// backend/lib/redis/CacheService.js
import redisService from './RedisService.js';
import { CacheStrategyFactory } from './CacheStrategy.js';
import syncQueue from './SyncQueue.js';

class CacheService {
  constructor() {
    this.redis = redisService;
    this.syncQueue = syncQueue;

    const dbService = {
      fetch: async (_key, fetchFn) => (typeof fetchFn === 'function' ? await fetchFn() : null),
    };

    this.strategyFactory = new CacheStrategyFactory(this.syncQueue, dbService);
    this.writeBehindStrategy = this.strategyFactory.getStrategy('write-behind');
    this.readThroughStrategy = this.strategyFactory.getStrategy('read-through');

    this.keyPrefixes = {
      USER: 'user',
      SNIPPET: 'snippet',
      USER_SNIPPETS: 'user_snippets',
      SNIPPET_IDX: 'snippet:idx',
      SESSION: 'session',
      API_RESPONSE: 'api_response',
    };

    this.ttlConfig = {
      USER: 3600,
      SNIPPET: null,       // authoritative in cache for cache-first
      USER_SNIPPETS: 1800, // list snapshot
      SESSION: 7200,
      API_RESPONSE: 900,
    };
  }

  isAvailable() {
    return this.redis.isAvailable();
  }

  getStatus() {
    return {
      redis: this.redis.getStatus(),
      syncQueue: this.syncQueue.getStats(),
      isAvailable: this.isAvailable(),
    };
  }

  // ----------------------- Atomic helpers (MULTI/EXEC) -----------------------

  async setSnippetAtomic({ id, userId, keyName, json, ttl = 0 }) {
    const sKey = `snippet:${id}`;
    const iKey = `snippet:idx:${userId}:${keyName}`;
    const uKey = `user_snippets:${userId}`;

    return this.redis.executeOperation(async (client) => {
      const tx = client.multi();
      tx.set(sKey, json);
      if (ttl > 0) tx.expire(sKey, ttl);
      tx.set(iKey, String(id));
      tx.sadd(uKey, String(id));
      await tx.exec();
      return true;
    });
  }

  async updateSnippetAtomic({ id, userId, oldKeyName, newKeyName, json, ttl = 0 }) {
    const sKey = `snippet:${id}`;
    const uKey = `user_snippets:${userId}`;
    const oldIdx = oldKeyName ? `snippet:idx:${userId}:${oldKeyName}` : null;
    const newIdx = `snippet:idx:${userId}:${newKeyName}`;

    return this.redis.executeOperation(async (client) => {
      const tx = client.multi();
      tx.set(sKey, json);
      if (ttl > 0) tx.expire(sKey, ttl);
      if (oldIdx && oldKeyName !== newKeyName) tx.del(oldIdx);
      tx.set(newIdx, String(id));
      tx.sadd(uKey, String(id));
      await tx.exec();
      return true;
    });
  }

  async deleteSnippetAtomic({ id, userId, keyName }) {
    const sKey = `snippet:${id}`;
    const iKey = `snippet:idx:${userId}:${keyName}`;
    const uKey = `user_snippets:${userId}`;

    return this.redis.executeOperation(async (client) => {
      const tx = client.multi();
      tx.del(sKey);
      tx.del(iKey);
      tx.srem(uKey, String(id));
      await tx.exec();
      return true;
    });
  }

  // ----------------------------- Users (unchanged) ---------------------------

  async cacheUser(userId, userData) {
    const key = this.generateKey(this.keyPrefixes.USER, userId);
    return await this.writeBehindStrategy.execute('set', key, userData, this.ttlConfig.USER);
  }

  async getUser(userId, dbFetchFunction) {
    const key = this.generateKey(this.keyPrefixes.USER, userId);
    return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.USER);
  }

  async updateUser(userId, userData) {
    const key = this.generateKey(this.keyPrefixes.USER, userId);
    return await this.writeBehindStrategy.execute('update', key, userData, this.ttlConfig.USER);
  }

  async deleteUser(userId) {
    const key = this.generateKey(this.keyPrefixes.USER, userId);
    return await this.writeBehindStrategy.execute('delete', key);
  }

  // ----------------------------- Snippets (atomic) ---------------------------

  // NOTE: we DO NOT use writeBehindStrategy for snippets anymore.
  // We manage jobs explicitly to guarantee idempotency & ordering.

  async getSnippet(snippetId, dbFetchFunction) {
    const key = this.generateKey(this.keyPrefixes.SNIPPET, snippetId);
    return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.SNIPPET);
  }

  async getUserSnippets(userId, dbFetchFunction) {
    const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
    return await this.readThroughStrategy.execute('get', key, dbFetchFunction, this.ttlConfig.USER_SNIPPETS);
  }

  async cacheUserSnippets(userId, snippets) {
    const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
    return await this.writeBehindStrategy.execute('set', key, snippets, this.ttlConfig.USER_SNIPPETS);
  }

  async invalidateUserSnippets(userId) {
    const key = this.generateKey(this.keyPrefixes.USER_SNIPPETS, userId);
    try {
      await this.redis.executeOperation((client) => client.del(key));
      console.log(`User snippets cache invalidated for user: ${userId}`);
    } catch (e) {
      console.error('Failed to invalidate user snippets cache:', e);
    }
  }

  // ------------------------------ Sessions/APIs ------------------------------

  async cacheSession(sessionId, sessionData) {
    const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
    return await this.writeBehindStrategy.execute('set', key, sessionData, this.ttlConfig.SESSION);
  }

  async getSession(sessionId) {
    try {
      const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
      return await this.redis.executeOperation(async (client) => {
        const s = await client.get(key);
        return s ? JSON.parse(s) : null;
      });
    } catch (e) {
      console.warn('Failed to get session from cache:', e.message);
      return null;
    }
  }

  async deleteSession(sessionId) {
    const key = this.generateKey(this.keyPrefixes.SESSION, sessionId);
    return await this.writeBehindStrategy.execute('delete', key);
  }

  async cacheApiResponse(cacheKey, responseData) {
    const key = this.generateKey(this.keyPrefixes.API_RESPONSE, cacheKey);
    return await this.writeBehindStrategy.execute('set', key, responseData, this.ttlConfig.API_RESPONSE);
  }

  async getCachedApiResponse(cacheKey) {
    const key = this.generateKey(this.keyPrefixes.API_RESPONSE, cacheKey);
    return await this.readThroughStrategy.execute('get', key, () => null, this.ttlConfig.API_RESPONSE);
  }

  // ------------------------------- Bulk ops ----------------------------------

  async bulkCache(operations) {
    if (!this.redis.isAvailable()) throw new Error('Cache unavailable for bulk operations');
    try {
      return await this.redis.executeOperation(async (client) => {
        const pipeline = client.pipeline();
        for (const { key, data, ttl } of operations) {
          const val = JSON.stringify(data);
          pipeline.set(key, val);
          if (ttl) pipeline.expire(key, ttl);
        }
        await pipeline.exec();
        return { success: true, operationsCount: operations.length };
      });
    } catch (e) {
      console.error('Bulk cache operation failed:', e);
      throw e;
    }
  }

  async populateCache(operations) {
    // Same as bulkCache but intentionally no jobs — safe to reuse bulkCache
    return this.bulkCache(operations);
  }

  async bulkDelete(keys) {
    if (!this.redis.isAvailable()) throw new Error('Cache unavailable for bulk operations');
    try {
      return await this.redis.executeOperation(async (client) => {
        await client.del(...keys);
        return { success: true, deletedCount: keys.length };
      });
    } catch (e) {
      console.error('Bulk delete operation failed:', e);
      throw e;
    }
  }

  // ----------------------------- Invalidation --------------------------------

  async invalidateByPattern(pattern) {
    try {
      await this.syncQueue.addJob('cache-invalidate', { pattern });
      return { success: true, pattern };
    } catch (e) {
      console.error('Cache invalidation failed:', e);
      throw e;
    }
  }

  async invalidateKeys(keys) {
    try {
      await this.syncQueue.addJob('cache-invalidate', { keys });
      return { success: true, keysCount: keys.length };
    } catch (e) {
      console.error('Cache invalidation failed:', e);
      throw e;
    }
  }

  // ----------------------------- Utilities -----------------------------------

  generateKey(prefix, identifier) {
    return `${prefix}:${identifier}`;
  }

  generateUserKey(prefix, userId, identifier = null) {
    return identifier ? `${prefix}:${userId}:${identifier}` : `${prefix}:${userId}`;
  }

  async keyExists(key) {
    if (!this.redis.isAvailable()) return false;
    try {
      return await this.redis.executeOperation(async (client) => (await client.exists(key)) === 1);
    } catch (e) {
      console.error('Key existence check failed:', e);
      return false;
    }
  }

  async getTTL(key) {
    if (!this.redis.isAvailable()) return -1;
    try {
      return await this.redis.executeOperation(async (client) => await client.ttl(key));
    } catch (e) {
      console.error('TTL check failed:', e);
      return -1;
    }
  }

  // Use SCAN, not KEYS
  async scanCount(pattern, count = 1000) {
    return this.redis.executeOperation(async (client) => {
      let cursor = '0';
      let total = 0;
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        total += keys.length;
        cursor = next;
      } while (cursor !== '0');
      return total;
    });
  }

  async getStats() {
    if (!this.redis.isAvailable()) return null;
    try {
      return await this.redis.executeOperation(async (client) => {
        const info = await client.info();
        const keyspace = await client.info('keyspace');
        return {
          info: info.split('\r\n').filter((l) => l && !l.startsWith('#')),
          keyspace: keyspace.split('\r\n').filter((l) => l && !l.startsWith('#')),
          status: this.getStatus(),
        };
      });
    } catch (e) {
      console.error('Cache stats failed:', e);
      return null;
    }
  }

  async close() {
    try {
      await this.syncQueue.close();
      await this.redis.close();
      console.log('Cache service closed gracefully');
    } catch (e) {
      console.error('Error closing cache service:', e);
    }
  }
}

export default new CacheService();
