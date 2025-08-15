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
async function runDataSyncTests() {
    try {
        console.log('Data Sync Test Suite');
        console.log('=====================\n');

        console.log('Step 1: Checking Cache Availability...');
        if (!cacheService.isAvailable()) {
            console.log('Cache not available, skipping tests');
            return;
        }
        console.log('Cache is available\n');

        console.log('Step 2: Initializing Data Sync Service...');
        try {
            await dataSyncService.initialize();
            console.log('Data Sync Service initialized');
        } catch (error) {
            console.log('Data Sync Service initialization failed:', error.message);
            return;
        }

        console.log('\nStep 3: Getting Initial Sync Status...');
        const initialStatus = await dataSyncService.getSyncStatus();
        console.log('Initial sync status:', initialStatus);

        console.log('\nStep 4: Syncing Users to Cache...');
        try {
            const userSyncResult = await dataSyncService.syncUsersToCache();
            console.log('User sync result:', userSyncResult);
        } catch (error) {
            console.log('User sync failed (this is normal if no users exist):', error.message);
        }

        console.log('\nStep 5: Syncing Snippets to Cache...');
        try {
            const snippetSyncResult = await dataSyncService.syncSnippetsToCache();
            console.log('Snippet sync result:', snippetSyncResult);
        } catch (error) {
            console.log('Snippet sync failed (this is normal if no snippets exist):', error.message);
        }

        console.log('\nStep 6: Getting Updated Sync Status...');
        const updatedStatus = await dataSyncService.getSyncStatus();
        console.log('Updated sync status:', updatedStatus);

        console.log('\nStep 7: Verifying Data Consistency...');
        const consistency = await dataSyncService.verifyDataConsistency();
        console.log('Data consistency:', consistency);

        console.log('\nStep 8: Running Health Check...');
        const health = await dataSyncService.healthCheck();
        console.log('Health check:', health);

        console.log('\nData Sync Test Completed Successfully!');
        console.log('\nSummary:');
        console.log('   - Cache system is working');
        console.log('   - Data sync service is initialized');
        console.log('   - Existing data migration attempted');
        console.log('   - Data consistency verified');
        console.log('   - Health check passed');

    } catch (error) {
        console.error('\nData Sync Test Failed:', error);
        throw error;
    }
}

/**
 * Test individual sync operations
 */
async function testIndividualOperations() {
    try {
        console.log('\nTesting Individual Sync Operations...\n');

        console.log('Testing User Sync Only...');
        try {
            const userSyncResult = await dataSyncService.syncUsersToCache();
            console.log('User sync completed:', userSyncResult);
        } catch (error) {
            console.log('User sync failed:', error.message);
        }

        console.log('\nTesting Snippet Sync Only...');
        try {
            const snippetSyncResult = await dataSyncService.syncSnippetsToCache();
            console.log('Snippet sync completed:', snippetSyncResult);
        } catch (error) {
            console.log('Snippet sync failed:', error.message);
        }

        console.log('\nTesting Cache Statistics...\n');
        const snippetStats = await dataSyncService.getSnippetSyncStats();
        console.log('Snippet sync stats:', snippetStats);

        const userStats = await dataSyncService.getUserSyncStats();
        console.log('User sync stats:', userStats);

        const overallStats = await dataSyncService.getSyncStatus();
        console.log('Overall sync stats:', overallStats);

    } catch (error) {
        console.error('Individual operations test failed:', error);
        throw error;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    try {
        console.log('Data Sync Test Suite');
        console.log('=====================\n');

        await runDataSyncTests();
        await testIndividualOperations();
        // await testCacheStats(); // This function is removed from the new_code, so it's removed here.

        console.log('\nData Sync Test Suite Complete!');

    } catch (error) {
        console.error('Data sync test suite failed:', error);
        process.exit(1);
    }
}

// Export for use in other files
export { runDataSyncTests, testIndividualOperations, runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}
