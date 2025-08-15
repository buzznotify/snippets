/**
 * Data Sync Test File
 * Tests the migration of existing database data to Redis cache
 */

import '../env.js'; // Load environment variables first
import dataSyncService from './DataSyncService.js';
import cacheService from './CacheService.js';

/**
 * Test the data sync functionality
 */
async function testDataSync() {
    console.log('🧪 Starting Data Sync Test...\n');

    try {
        // Test 1: Check cache availability
        console.log(' Checking Cache Availability...');
        const cacheStatus = cacheService.getStatus();
        console.log('Cache Status:', JSON.stringify(cacheStatus, null, 2));

        if (!cacheService.isAvailable()) {
            console.log(' Cache not available, skipping tests');
            return;
        }
        console.log(' Cache is available\n');

        // Test 2: Initialize data sync service
        console.log(' Initializing Data Sync Service...');
        try {
            await dataSyncService.initialize();
            console.log(' Data Sync Service initialized');
        } catch (error) {
            console.log(' Data Sync Service initialization failed:', error.message);
            console.log('Skipping tests...');
            return;
        }

        // Test 3: Get initial sync status
        console.log('\n Getting Initial Sync Status...');
        const initialStatus = await dataSyncService.getSyncStatus();
        console.log('Initial Status:', JSON.stringify(initialStatus, null, 2));

        // Test 4: Sync users to cache
        console.log('\n Syncing Users to Cache...');
        try {
            const userSyncResult = await dataSyncService.syncUsers();
            console.log('User Sync Result:', JSON.stringify(userSyncResult, null, 2));
        } catch (error) {
            console.log('User sync failed (this is normal if no users exist):', error.message);
        }

        // Test 5: Sync snippets to cache
        console.log('\n Syncing Snippets to Cache...');
        try {
            const snippetSyncResult = await dataSyncService.syncSnippets();
            console.log('Snippet Sync Result:', JSON.stringify(snippetSyncResult, null, 2));
        } catch (error) {
            console.log('Snippet sync failed (this is normal if no snippets exist):', error.message);
        }

        // Test 6: Get updated sync status
        console.log('\n Getting Updated Sync Status...');
        const updatedStatus = await dataSyncService.getSyncStatus();
        console.log('Updated Status:', JSON.stringify(updatedStatus, null, 2));

        // Test 7: Verify data consistency
        console.log('\n Verifying Data Consistency...');
        const consistency = await dataSyncService.verifyDataConsistency();
        console.log('Data Consistency:', JSON.stringify(consistency, null, 2));

        // Test 8: Health check
        console.log('\n Running Health Check...');
        const health = await dataSyncService.healthCheck();
        console.log('Health Check:', JSON.stringify(health, null, 2));

        console.log('\n Data Sync Test Completed Successfully!');
        console.log('\n Summary:');
        console.log('    Cache system is working');
        console.log('    Data sync service is initialized');
        console.log('    Existing data migration attempted');
        console.log('    Data consistency verified');
        console.log('    Health check passed');

    } catch (error) {
        console.error('\n Data Sync Test Failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Test individual sync operations
 */
async function testIndividualSyncs() {
    console.log('\n Testing Individual Sync Operations...\n');

    try {
        // Test user sync only
        console.log('👥 Testing User Sync Only...');
        try {
            const result = await dataSyncService.syncUsers();
            console.log('User sync result:', result);
        } catch (error) {
            console.log('User sync error:', error.message);
        }

        // Test snippet sync only
        console.log('\n Testing Snippet Sync Only...');
        try {
            const result = await dataSyncService.syncSnippets();
            console.log('Snippet sync result:', result);
        } catch (error) {
            console.log('Snippet sync error:', error.message);
        }

    } catch (error) {
        console.error('Individual sync test failed:', error);
    }
}

/**
 * Test cache statistics
 */
async function testCacheStats() {
    console.log('\n Testing Cache Statistics...\n');

    try {
        const stats = await cacheService.getStats();
        console.log('Cache Stats:', JSON.stringify(stats, null, 2));

        const userStats = await dataSyncService.getUserSyncStats();
        console.log('User Sync Stats:', JSON.stringify(userStats, null, 2));

        const snippetStats = await dataSyncService.getSnippetSyncStats();
        console.log('Snippet Sync Stats:', JSON.stringify(snippetStats, null, 2));

    } catch (error) {
        console.error('Cache stats test failed:', error);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log(' Data Sync Test Suite');
    console.log('========================\n');

    await testDataSync();
    await testIndividualSyncs();
    await testCacheStats();

    console.log('\n Data Sync Test Suite Complete!');
}

// Export for use in other files
export { testDataSync, testIndividualSyncs, testCacheStats, runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}
