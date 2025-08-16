// backend/lib/services/DataSyncService.js
import '../env.js';
import { connectToDB } from '../../backend/database/db.js';
import { syncExistingSnippetsToCache } from '../../backend/snippet/services/snippet-cached.js';
import { syncExistingUsersToCache } from '../../backend/user/services/user-cached.js';
import cacheService from '../redis/CacheService.js';

class DataSyncService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    console.log('Initializing Data Sync Service...');
    await connectToDB();
    await this.waitForRedis();
    this.isInitialized = true;
    console.log('Data Sync Service initialized');
  }

  async waitForRedis(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (cacheService.isAvailable()) return true;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Redis not available within timeout');
  }

  async syncAllData() {
    await this.initialize();
    const start = Date.now();
    const users = await syncExistingUsersToCache();
    const snippets = await syncExistingSnippetsToCache();
    return { users, snippets, totalTime: Date.now() - start };
  }

  async syncUsers() {
    await this.initialize();
    return await syncExistingUsersToCache();
  }

  async syncSnippets() {
    await this.initialize();
    return await syncExistingSnippetsToCache();
  }

  async getSyncStatus() {
    await this.initialize();
    const cacheStats = await cacheService.getStats();
    const userStats = await this.getUserSyncStats();
    const snippetStats = await this.getSnippetSyncStats();
    return {
      isInitialized: this.isInitialized,
      cacheStatus: cacheService.getStatus(),
      userSync: userStats,
      snippetSync: snippetStats,
      cacheStats,
    };
  }

  async getUserSyncStats() {
    const userCount = await cacheService.scanCount('user:*');
    const emailCount = await cacheService.scanCount('user:email:*');
    const sessionCount = await cacheService.scanCount('session:*');
    return { userCount, emailCount, sessionCount, totalUserKeys: userCount + emailCount + sessionCount };
  }

  async getSnippetSyncStats() {
    const snippetCount = await cacheService.scanCount('snippet:*');
    const userSnippetsCount = await cacheService.scanCount('user_snippets:*');
    return { snippetCount, userSnippetsCount, totalSnippetKeys: snippetCount + userSnippetsCount };
  }

  async verifyDataConsistency() {
    await this.initialize();
    const cachedUsers = await cacheService.scanCount('user:*');
    const dbUsersProxy = await cacheService.scanCount('user:email:*'); // if you mirrored
    const cachedSnippets = await cacheService.scanCount('snippet:*');
    const dbSnippetsProxy = await cacheService.scanCount('user_snippets:*');

    const results = {
      users: { cached: cachedUsers, db: dbUsersProxy, consistent: cachedUsers > 0 && dbUsersProxy > 0 },
      snippets: { cached: cachedSnippets, db: dbSnippetsProxy, consistent: cachedSnippets > 0 && dbSnippetsProxy > 0 },
    };
    return results;
  }

  async clearAllCache() {
    await this.initialize();
    return await cacheService.clearAll();
  }

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
        dataConsistency: consistency,
      };
    } catch (error) {
      return {
        service: 'DataSyncService',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        isInitialized: this.isInitialized,
        cacheAvailable: cacheService.isAvailable(),
      };
    }
  }
}

export default new DataSyncService();
