// Firebase Configuration
// Replace with your actual Firebase project configuration

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Firestore settings for optimal performance
export const firestoreSettings = {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true
};

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  SNIPPETS: 'snippets',
  ORGANIZATIONS: 'organizations',
  USAGE_STATS: 'usage_stats'
};

// Cache configuration
export const CACHE_CONFIG = {
  MEMORY_CACHE_SIZE: 1000, // Max items in memory
  CHROME_STORAGE_PREFIX: 'snippet_',
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  PREFETCH_LIMIT: 100 // Number of snippets to prefetch
};

// Performance thresholds
export const PERFORMANCE = {
  MAX_SNIPPET_LENGTH: 10000,
  MAX_KEY_LENGTH: 100,
  DEBOUNCE_DELAY: 300, // ms
  BATCH_WRITE_DELAY: 500, // ms
  MAX_BATCH_SIZE: 500 // Firestore batch limit
};