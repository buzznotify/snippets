// Sync Manager - Handles real-time synchronization with Firestore
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { COLLECTIONS, CACHE_CONFIG, PERFORMANCE } from '../lib/firebase-config.js';

export class SnippetSyncManager {
  constructor(db, cacheManager) {
    this.db = db;
    this.cacheManager = cacheManager;
    this.unsubscribers = [];
    this.userId = null;
    this.organizationId = null;
    this.batchProcessor = new BatchProcessor(db);
  }

  // Start syncing snippets for a user
  async startSync(userId, organizationId = null) {
    this.userId = userId;
    this.organizationId = organizationId;
    
    // Stop any existing sync
    this.stopSync();
    
    // Set up personal snippets listener
    await this.setupPersonalSnippetsListener(userId);
    
    // Set up organization snippets listener if applicable
    if (organizationId) {
      await this.setupOrgSnippetsListener(organizationId);
    }
    
    console.log(`Sync started for user: ${userId}, org: ${organizationId}`);
  }

  // Set up real-time listener for personal snippets
  async setupPersonalSnippetsListener(userId) {
    const snippetsRef = collection(this.db, COLLECTIONS.SNIPPETS);
    const q = query(
      snippetsRef,
      where('userId', '==', userId),
      where('status', '==', 'published'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          const snippetData = { 
            id: change.doc.id, 
            ...change.doc.data(),
            source: snapshot.metadata.fromCache ? 'cache' : 'server'
          };
          
          switch (change.type) {
            case 'added':
            case 'modified':
              await this.handleSnippetUpdate(snippetData);
              break;
            case 'removed':
              await this.handleSnippetRemoval(snippetData.id);
              break;
          }
        }
        
        // Update sync status
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          await this.updateSyncStatus('synced');
        }
      },
      (error) => {
        console.error('Personal snippets listener error:', error);
        this.updateSyncStatus('error');
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  // Set up real-time listener for organization snippets
  async setupOrgSnippetsListener(organizationId) {
    const orgSnippetsRef = collection(
      this.db, 
      `${COLLECTIONS.ORGANIZATIONS}/${organizationId}/snippets`
    );
    
    const q = query(
      orgSnippetsRef,
      where('status', '==', 'published'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          const snippetData = { 
            id: change.doc.id, 
            ...change.doc.data(),
            isOrganizational: true,
            source: snapshot.metadata.fromCache ? 'cache' : 'server'
          };
          
          switch (change.type) {
            case 'added':
            case 'modified':
              await this.handleSnippetUpdate(snippetData);
              break;
            case 'removed':
              await this.handleSnippetRemoval(snippetData.id);
              break;
          }
        }
      },
      (error) => {
        console.error('Organization snippets listener error:', error);
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  // Handle snippet update (add or modify)
  async handleSnippetUpdate(snippet) {
    // Update cache
    await this.cacheManager.setSnippet(snippet.keyName, snippet);
    
    // Notify content scripts
    this.notifyContentScripts({
      type: 'SNIPPET_UPDATED',
      snippet: snippet
    });
    
    // Track update for analytics
    if (snippet.source === 'server') {
      console.log(`Snippet updated from server: ${snippet.keyName}`);
    }
  }

  // Handle snippet removal
  async handleSnippetRemoval(snippetId) {
    // Get snippet from cache to find keyName
    const snippet = await this.cacheManager.getSnippetById(snippetId);
    if (snippet) {
      await this.cacheManager.removeSnippet(snippet.keyName);
      
      // Notify content scripts
      this.notifyContentScripts({
        type: 'SNIPPET_REMOVED',
        snippetId: snippetId,
        keyName: snippet.keyName
      });
    }
  }

  // Get a single snippet by keyName
  async getSnippet(keyName) {
    // Try cache first
    const cached = await this.cacheManager.getSnippet(keyName);
    if (cached) {
      return cached;
    }
    
    // Query Firestore
    const snippetsRef = collection(this.db, COLLECTIONS.SNIPPETS);
    const q = query(
      snippetsRef,
      where('userId', '==', this.userId),
      where('keyName', '==', keyName),
      where('status', '==', 'published'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const snippet = { id: doc.id, ...doc.data() };
      
      // Cache for future use
      await this.cacheManager.setSnippet(keyName, snippet);
      
      return snippet;
    }
    
    return null;
  }

  // Get all snippets for the current user
  async getAllSnippets() {
    const allSnippets = [];
    
    // Get personal snippets
    if (this.userId) {
      const personalSnippets = await this.getUserSnippets(this.userId);
      allSnippets.push(...personalSnippets);
    }
    
    // Get organizational snippets
    if (this.organizationId) {
      const orgSnippets = await this.getOrgSnippets(this.organizationId);
      allSnippets.push(...orgSnippets);
    }
    
    return allSnippets;
  }

  // Get user's personal snippets
  async getUserSnippets(userId) {
    const snippetsRef = collection(this.db, COLLECTIONS.SNIPPETS);
    const q = query(
      snippetsRef,
      where('userId', '==', userId),
      where('status', '==', 'published'),
      orderBy('keyName')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Get organization snippets
  async getOrgSnippets(organizationId) {
    const orgSnippetsRef = collection(
      this.db,
      `${COLLECTIONS.ORGANIZATIONS}/${organizationId}/snippets`
    );
    const q = query(
      orgSnippetsRef,
      where('status', '==', 'published'),
      orderBy('keyName')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      isOrganizational: true 
    }));
  }

  // Create a new snippet
  async createSnippet(data) {
    const snippetData = {
      userId: this.userId,
      keyName: data.keyName,
      value: data.value,
      type: data.type || 'text',
      status: 'published',
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        usageCount: 0,
        lastUsed: null,
        tags: data.tags || [],
        domains: data.domains || []
      }
    };
    
    // Add to organization collection if specified
    const collectionPath = data.isOrganizational && this.organizationId
      ? `${COLLECTIONS.ORGANIZATIONS}/${this.organizationId}/snippets`
      : COLLECTIONS.SNIPPETS;
    
    const docRef = doc(collection(this.db, collectionPath));
    await setDoc(docRef, snippetData);
    
    const newSnippet = { id: docRef.id, ...snippetData };
    
    // Update cache immediately
    await this.cacheManager.setSnippet(data.keyName, newSnippet);
    
    return newSnippet;
  }

  // Update an existing snippet
  async updateSnippet(snippetId, updates) {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      version: increment(1)
    };
    
    // Determine collection path
    const isOrg = updates.isOrganizational && this.organizationId;
    const collectionPath = isOrg
      ? `${COLLECTIONS.ORGANIZATIONS}/${this.organizationId}/snippets`
      : COLLECTIONS.SNIPPETS;
    
    const docRef = doc(this.db, collectionPath, snippetId);
    await updateDoc(docRef, updateData);
    
    // Get updated document
    const updatedDoc = await getDoc(docRef);
    const updatedSnippet = { id: updatedDoc.id, ...updatedDoc.data() };
    
    // Update cache
    await this.cacheManager.setSnippet(updatedSnippet.keyName, updatedSnippet);
    
    return updatedSnippet;
  }

  // Delete (archive) a snippet
  async deleteSnippet(snippetId) {
    // Get snippet first to determine collection
    const snippet = await this.cacheManager.getSnippetById(snippetId);
    if (!snippet) return;
    
    const collectionPath = snippet.isOrganizational && this.organizationId
      ? `${COLLECTIONS.ORGANIZATIONS}/${this.organizationId}/snippets`
      : COLLECTIONS.SNIPPETS;
    
    const docRef = doc(this.db, collectionPath, snippetId);
    
    // Soft delete by updating status
    await updateDoc(docRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
    
    // Remove from cache
    await this.cacheManager.removeSnippet(snippet.keyName);
  }

  // Track snippet usage
  async trackUsage(snippetId) {
    // Use batch processor for efficient writes
    this.batchProcessor.scheduleUpdate(snippetId, {
      'metadata.usageCount': increment(1),
      'metadata.lastUsed': serverTimestamp()
    });
  }

  // Prefetch frequently used snippets
  async prefetchFrequentSnippets(userId) {
    const snippetsRef = collection(this.db, COLLECTIONS.SNIPPETS);
    const q = query(
      snippetsRef,
      where('userId', '==', userId),
      where('status', '==', 'published'),
      orderBy('metadata.usageCount', 'desc'),
      limit(CACHE_CONFIG.PREFETCH_LIMIT)
    );
    
    const snapshot = await getDocs(q);
    const snippets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cache all frequent snippets
    for (const snippet of snippets) {
      await this.cacheManager.setSnippet(snippet.keyName, snippet);
    }
    
    console.log(`Prefetched ${snippets.length} frequent snippets`);
    return snippets;
  }

  // Prefetch snippets by context (domain)
  async prefetchByContext(url) {
    if (!url || !this.userId) return;
    
    try {
      const domain = new URL(url).hostname;
      
      const snippetsRef = collection(this.db, COLLECTIONS.SNIPPETS);
      const q = query(
        snippetsRef,
        where('userId', '==', this.userId),
        where('status', '==', 'published'),
        where('metadata.domains', 'array-contains', domain)
      );
      
      const snapshot = await getDocs(q);
      const snippets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Cache domain-specific snippets
      for (const snippet of snippets) {
        await this.cacheManager.setSnippet(snippet.keyName, snippet);
      }
      
      console.log(`Prefetched ${snippets.length} snippets for domain: ${domain}`);
    } catch (error) {
      console.error('Error prefetching by context:', error);
    }
  }

  // Get user document
  async getUserDocument(userId) {
    const userRef = doc(this.db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
  }

  // Update sync status
  async updateSyncStatus(status) {
    await chrome.storage.local.set({ syncStatus: status });
    
    // Update badge based on status
    if (status === 'synced') {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (status === 'syncing') {
      chrome.action.setBadgeText({ text: '↻' });
      chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    } else if (status === 'error') {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    }
  }

  // Notify content scripts about changes
  notifyContentScripts(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Content script might not be injected
        });
      });
    });
  }

  // Stop syncing
  stopSync() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    this.userId = null;
    this.organizationId = null;
    console.log('Sync stopped');
  }
}

// Batch processor for efficient Firestore writes
class BatchProcessor {
  constructor(db) {
    this.db = db;
    this.pendingUpdates = new Map();
    this.timer = null;
  }

  scheduleUpdate(docId, updates) {
    // Merge with existing pending updates
    const existing = this.pendingUpdates.get(docId) || {};
    this.pendingUpdates.set(docId, { ...existing, ...updates });
    
    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Schedule batch write
    this.timer = setTimeout(() => {
      this.flush();
    }, PERFORMANCE.BATCH_WRITE_DELAY);
  }

  async flush() {
    if (this.pendingUpdates.size === 0) return;
    
    const batch = writeBatch(this.db);
    
    this.pendingUpdates.forEach((updates, docId) => {
      const docRef = doc(this.db, COLLECTIONS.SNIPPETS, docId);
      batch.update(docRef, updates);
    });
    
    try {
      await batch.commit();
      console.log(`Batch updated ${this.pendingUpdates.size} documents`);
    } catch (error) {
      console.error('Batch update failed:', error);
    }
    
    this.pendingUpdates.clear();
    this.timer = null;
  }
}