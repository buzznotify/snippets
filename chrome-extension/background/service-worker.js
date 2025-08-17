// Service Worker - Main Background Script
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore,
  enableIndexedDbPersistence,
  initializeFirestore
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { firebaseConfig, firestoreSettings } from '../lib/firebase-config.js';
import { SnippetSyncManager } from './sync-manager.js';
import { CacheManager } from './cache-manager.js';
import { AuthManager } from './auth-manager.js';

// Initialize Firebase
let app;
let auth;
let db;
let syncManager;
let cacheManager;
let authManager;

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Initialize Firebase services
  await initializeFirebase();
  
  // Set up default settings
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      expansionEnabled: true,
      syncEnabled: true,
      offlineMode: true,
      shortcuts: {
        toggleExpansion: 'Ctrl+Space'
      }
    });
  }
  
  // Create context menus
  createContextMenus();
});

// Initialize Firebase and related services
async function initializeFirebase() {
  try {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth
    auth = getAuth(app);
    
    // Initialize Firestore with settings
    db = initializeFirestore(app, firestoreSettings);
    
    // Enable offline persistence
    try {
      await enableIndexedDbPersistence(db, { forceOwnership: true });
      console.log('Offline persistence enabled');
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support offline persistence');
      }
    }
    
    // Initialize managers
    cacheManager = new CacheManager();
    authManager = new AuthManager(auth);
    syncManager = new SnippetSyncManager(db, cacheManager);
    
    // Set up auth state listener
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        await handleUserAuthenticated(user);
      } else {
        console.log('User signed out');
        await handleUserSignedOut();
      }
    });
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

// Handle user authentication
async function handleUserAuthenticated(user) {
  // Store user info
  await chrome.storage.local.set({
    userId: user.uid,
    userEmail: user.email,
    isAuthenticated: true
  });
  
  // Get user's organization if exists
  const userDoc = await syncManager.getUserDocument(user.uid);
  const organizationId = userDoc?.organizationId;
  
  // Start syncing snippets
  await syncManager.startSync(user.uid, organizationId);
  
  // Prefetch frequently used snippets
  await syncManager.prefetchFrequentSnippets(user.uid);
  
  // Update extension badge
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  
  // Notify all tabs
  notifyAllTabs({ type: 'AUTH_STATE_CHANGED', authenticated: true, userId: user.uid });
}

// Handle user sign out
async function handleUserSignedOut() {
  // Stop syncing
  await syncManager.stopSync();
  
  // Clear local data
  await cacheManager.clearAll();
  
  // Update storage
  await chrome.storage.local.set({
    userId: null,
    userEmail: null,
    isAuthenticated: false
  });
  
  // Update badge
  chrome.action.setBadgeText({ text: '' });
  
  // Notify all tabs
  notifyAllTabs({ type: 'AUTH_STATE_CHANGED', authenticated: false });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async responses
  (async () => {
    try {
      switch (request.type) {
        case 'GET_SNIPPET':
          const snippet = await syncManager.getSnippet(request.keyName);
          sendResponse({ success: true, snippet });
          break;
          
        case 'GET_ALL_SNIPPETS':
          const snippets = await syncManager.getAllSnippets();
          sendResponse({ success: true, snippets });
          break;
          
        case 'CREATE_SNIPPET':
          const created = await syncManager.createSnippet(request.data);
          sendResponse({ success: true, snippet: created });
          break;
          
        case 'UPDATE_SNIPPET':
          const updated = await syncManager.updateSnippet(request.id, request.data);
          sendResponse({ success: true, snippet: updated });
          break;
          
        case 'DELETE_SNIPPET':
          await syncManager.deleteSnippet(request.id);
          sendResponse({ success: true });
          break;
          
        case 'TRACK_USAGE':
          await syncManager.trackUsage(request.snippetId);
          sendResponse({ success: true });
          break;
          
        case 'SIGN_IN':
          const user = await authManager.signIn();
          sendResponse({ success: true, user });
          break;
          
        case 'SIGN_OUT':
          await authManager.signOut();
          sendResponse({ success: true });
          break;
          
        case 'GET_AUTH_STATE':
          const authState = await authManager.getAuthState();
          sendResponse({ success: true, ...authState });
          break;
          
        case 'GET_CACHE_STATS':
          const stats = await cacheManager.getStats();
          sendResponse({ success: true, stats });
          break;
          
        case 'CLEAR_CACHE':
          await cacheManager.clearAll();
          sendResponse({ success: true });
          break;
          
        case 'PREFETCH_CONTEXT':
          await syncManager.prefetchByContext(request.url);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-expansion':
      const { expansionEnabled } = await chrome.storage.local.get('expansionEnabled');
      await chrome.storage.local.set({ expansionEnabled: !expansionEnabled });
      
      // Notify all tabs
      notifyAllTabs({ 
        type: 'EXPANSION_TOGGLED', 
        enabled: !expansionEnabled 
      });
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon-48.png',
        title: 'Snippet Expansion',
        message: `Expansion ${!expansionEnabled ? 'enabled' : 'disabled'}`
      });
      break;
  }
});

// Handle tab updates for context-aware prefetching
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Prefetch snippets relevant to this domain
    if (syncManager) {
      await syncManager.prefetchByContext(tab.url);
    }
  }
});

// Create context menus
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'create-snippet',
    title: 'Create snippet from selection',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'toggle-expansion',
    title: 'Toggle snippet expansion',
    contexts: ['all']
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'create-snippet':
      if (info.selectionText) {
        // Open popup with pre-filled value
        chrome.storage.local.set({
          pendingSnippet: {
            value: info.selectionText,
            sourceUrl: tab.url
          }
        });
        chrome.action.openPopup();
      }
      break;
      
    case 'toggle-expansion':
      chrome.commands.onCommand.dispatch('toggle-expansion');
      break;
  }
});

// Utility function to notify all tabs
function notifyAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab might not have content script injected
      });
    });
  });
}

// Handle extension unload
self.addEventListener('unload', async () => {
  if (syncManager) {
    await syncManager.stopSync();
  }
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();