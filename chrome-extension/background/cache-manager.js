// Cache Manager - Multi-tier caching for optimal performance
import { CACHE_CONFIG } from '../lib/firebase-config.js';

export class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.snippetIdMap = new Map(); // Maps snippet IDs to keyNames
    this.initIndexedDB();
  }

  // Initialize IndexedDB for large-scale caching
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SnippetCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.idb = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create snippets store
        if (!db.objectStoreNames.contains('snippets')) {
          const store = db.createObjectStore('snippets', { keyPath: 'keyName' });
          store.createIndex('id', 'id', { unique: true });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Get snippet by keyName (multi-tier lookup)
  async getSnippet(keyName) {
    // L1: Memory cache (fastest, ~0ms)
    if (this.memoryCache.has(keyName)) {
      const cached = this.memoryCache.get(keyName);
      // Check if not expired
      if (!this.isExpired(cached)) {
        this.updateAccessTime(keyName);
        return cached.data;
      }
    }

    // L2: Chrome storage (fast, ~1-5ms)
    try {
      const key = `${CACHE_CONFIG.CHROME_STORAGE_PREFIX}${keyName}`;
      const stored = await chrome.storage.local.get(key);
      if (stored[key]) {
        const item = stored[key];
        if (!this.isExpired(item)) {
          // Promote to memory cache
          this.setMemoryCache(keyName, item.data);
          return item.data;
        }
      }
    } catch (error) {
      console.error('Chrome storage error:', error);
    }

    // L3: IndexedDB (moderate, ~5-10ms)
    try {
      const idbSnippet = await this.getFromIndexedDB(keyName);
      if (idbSnippet && !this.isExpired({ timestamp: idbSnippet.cachedAt })) {
        // Promote to faster caches
        this.setMemoryCache(keyName, idbSnippet);
        await this.setChromeStorage(keyName, idbSnippet);
        return idbSnippet;
      }
    } catch (error) {
      console.error('IndexedDB error:', error);
    }

    // Not found in any cache
    return null;
  }

  // Get snippet by ID
  async getSnippetById(snippetId) {
    // Check ID map first
    const keyName = this.snippetIdMap.get(snippetId);
    if (keyName) {
      return await this.getSnippet(keyName);
    }

    // Search in IndexedDB by ID
    try {
      const transaction = this.idb.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const index = store.index('id');
      
      return new Promise((resolve, reject) => {
        const request = index.get(snippetId);
        request.onsuccess = () => {
          const snippet = request.result;
          if (snippet) {
            this.snippetIdMap.set(snippetId, snippet.keyName);
          }
          resolve(snippet);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB search error:', error);
      return null;
    }
  }

  // Set snippet in all cache tiers
  async setSnippet(keyName, snippet) {
    // Update ID map
    if (snippet.id) {
      this.snippetIdMap.set(snippet.id, keyName);
    }

    // Add cache metadata
    const cachedSnippet = {
      ...snippet,
      cachedAt: Date.now()
    };

    // L1: Memory cache
    this.setMemoryCache(keyName, cachedSnippet);

    // L2: Chrome storage (async)
    this.setChromeStorage(keyName, cachedSnippet);

    // L3: IndexedDB (async)
    this.setIndexedDB(keyName, cachedSnippet);
  }

  // Remove snippet from all caches
  async removeSnippet(keyName) {
    // Remove from memory cache
    this.memoryCache.delete(keyName);

    // Remove from Chrome storage
    const key = `${CACHE_CONFIG.CHROME_STORAGE_PREFIX}${keyName}`;
    await chrome.storage.local.remove(key);

    // Remove from IndexedDB
    try {
      const transaction = this.idb.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      store.delete(keyName);
    } catch (error) {
      console.error('IndexedDB delete error:', error);
    }

    // Clean up ID map
    for (const [id, name] of this.snippetIdMap.entries()) {
      if (name === keyName) {
        this.snippetIdMap.delete(id);
        break;
      }
    }
  }

  // Set in memory cache with LRU eviction
  setMemoryCache(keyName, data) {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= CACHE_CONFIG.MEMORY_CACHE_SIZE) {
      // Remove least recently used item
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(keyName, {
      data: data,
      timestamp: Date.now(),
      accessTime: Date.now()
    });
  }

  // Set in Chrome storage
  async setChromeStorage(keyName, data) {
    try {
      const key = `${CACHE_CONFIG.CHROME_STORAGE_PREFIX}${keyName}`;
      await chrome.storage.local.set({
        [key]: {
          data: data,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Chrome storage set error:', error);
      // If storage is full, clear old items
      if (error.message?.includes('QUOTA_EXCEEDED')) {
        await this.clearOldChromeStorage();
        // Retry
        await this.setChromeStorage(keyName, data);
      }
    }
  }

  // Set in IndexedDB
  async setIndexedDB(keyName, data) {
    try {
      const transaction = this.idb.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      store.put(data);
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  }

  // Get from IndexedDB
  async getFromIndexedDB(keyName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.idb.transaction(['snippets'], 'readonly');
        const store = transaction.objectStore('snippets');
        const request = store.get(keyName);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Check if cache item is expired
  isExpired(item) {
    if (!item || !item.timestamp) return true;
    const age = Date.now() - item.timestamp;
    return age > CACHE_CONFIG.CACHE_TTL;
  }

  // Update access time for LRU
  updateAccessTime(keyName) {
    const item = this.memoryCache.get(keyName);
    if (item) {
      item.accessTime = Date.now();
      // Move to end (most recently used)
      this.memoryCache.delete(keyName);
      this.memoryCache.set(keyName, item);
    }
  }

  // Clear old items from Chrome storage
  async clearOldChromeStorage() {
    const allKeys = await chrome.storage.local.get(null);
    const snippetKeys = Object.keys(allKeys).filter(key => 
      key.startsWith(CACHE_CONFIG.CHROME_STORAGE_PREFIX)
    );

    // Sort by timestamp and remove oldest 25%
    const items = snippetKeys.map(key => ({
      key,
      timestamp: allKeys[key].timestamp || 0
    }));
    
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = items.slice(0, Math.ceil(items.length * 0.25));
    
    await chrome.storage.local.remove(toRemove.map(item => item.key));
  }

  // Get all cached snippets
  async getAllCached() {
    const snippets = [];
    
    // Get from IndexedDB (most complete)
    try {
      const transaction = this.idb.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Get all cached error:', error);
      // Fallback to memory cache
      return Array.from(this.memoryCache.values()).map(item => item.data);
    }
  }

  // Preload snippets into cache
  async preloadSnippets(snippets) {
    for (const snippet of snippets) {
      if (snippet.keyName) {
        await this.setSnippet(snippet.keyName, snippet);
      }
    }
  }

  // Clear all caches
  async clearAll() {
    // Clear memory cache
    this.memoryCache.clear();
    this.snippetIdMap.clear();

    // Clear Chrome storage
    const allKeys = await chrome.storage.local.get(null);
    const snippetKeys = Object.keys(allKeys).filter(key => 
      key.startsWith(CACHE_CONFIG.CHROME_STORAGE_PREFIX)
    );
    await chrome.storage.local.remove(snippetKeys);

    // Clear IndexedDB
    try {
      const transaction = this.idb.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      store.clear();
    } catch (error) {
      console.error('Clear IndexedDB error:', error);
    }
  }

  // Get cache statistics
  async getStats() {
    const stats = {
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: CACHE_CONFIG.MEMORY_CACHE_SIZE
      },
      chromeStorage: {
        count: 0,
        bytesUsed: 0
      },
      indexedDB: {
        count: 0
      }
    };

    // Chrome storage stats
    try {
      const allKeys = await chrome.storage.local.get(null);
      const snippetKeys = Object.keys(allKeys).filter(key => 
        key.startsWith(CACHE_CONFIG.CHROME_STORAGE_PREFIX)
      );
      stats.chromeStorage.count = snippetKeys.length;
      
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      stats.chromeStorage.bytesUsed = bytesInUse;
    } catch (error) {
      console.error('Chrome storage stats error:', error);
    }

    // IndexedDB stats
    try {
      const transaction = this.idb.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const countRequest = store.count();
      
      await new Promise((resolve, reject) => {
        countRequest.onsuccess = () => {
          stats.indexedDB.count = countRequest.result;
          resolve();
        };
        countRequest.onerror = () => reject(countRequest.error);
      });
    } catch (error) {
      console.error('IndexedDB stats error:', error);
    }

    return stats;
  }

  // Optimize cache by removing expired items
  async optimizeCache() {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (this.isExpired(value)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean Chrome storage
    const allKeys = await chrome.storage.local.get(null);
    const toRemove = [];
    
    for (const [key, value] of Object.entries(allKeys)) {
      if (key.startsWith(CACHE_CONFIG.CHROME_STORAGE_PREFIX) && this.isExpired(value)) {
        toRemove.push(key);
      }
    }
    
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
    }

    console.log(`Cache optimized: removed ${toRemove.length} expired items`);
  }
}