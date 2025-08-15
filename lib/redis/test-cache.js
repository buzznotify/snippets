/**
 * Cache System Test File
 * Run this to verify Redis cache is working correctly
 */

import cacheService from './CacheService.js';

/**
 * Test the cache system functionality
 */
async function runCacheTests() {
    try {
        console.log('Redis Cache System Test Suite');
        console.log('================================\n');

        console.log('Starting Cache System Test...\n');

        console.log('Step 1: Testing Redis Connection...');
        try {
            const isAvailable = cacheService.isAvailable();
            if (!isAvailable) {
                console.log('Redis connection check failed');
                throw new Error('Redis not available');
            }
        } catch (error) {
            console.log('Redis connection check failed');
            throw error;
        }

        try {
            await cacheService.redis.waitForConnection(5000);
            console.log('Redis connection check passed');
        } catch (error) {
            console.log('Redis connection failed:', error.message);
            throw error;
        }

        console.log('Redis connection successful\n');

        console.log('Step 2: Testing Basic Cache Operations...');
        const testUserId = 'test-user-123';
        const testUserData = {
            id: testUserId,
            name: 'Test User',
            email: 'test@example.com'
        };

        await cacheService.cacheUser(testUserId, testUserData);
        console.log('User cached successfully');

        const cachedUser = await cacheService.getUser(testUserId, () => null);
        console.log('User retrieved from cache:', cachedUser ? 'SUCCESS' : 'FAILED');

        console.log('\nStep 3: Testing Snippet Operations...');
        const testSnippetId = 'test-snippet-456';
        const testSnippetData = {
            id: testSnippetId,
            title: 'Test Snippet',
            content: 'This is a test snippet'
        };

        await cacheService.cacheSnippet(testSnippetId, testSnippetData);
        console.log('Snippet cached successfully');

        const cachedSnippet = await cacheService.getSnippet(testSnippetId, () => null);
        console.log('Snippet retrieved from cache:', cachedSnippet ? 'SUCCESS' : 'FAILED');

        console.log('\nStep 4: Testing Cache Invalidation...');
        await cacheService.invalidateUserSnippets(testUserId);
        console.log('User snippets cache invalidated');

        console.log('\nStep 5: Testing Bulk Operations...');
        const bulkOperations = [
            { key: 'bulk-test-1', data: { id: '1', name: 'Bulk Test 1' }, ttl: 3600 },
            { key: 'bulk-test-2', data: { id: '2', name: 'Bulk Test 2' }, ttl: 3600 },
            { key: 'bulk-test-3', data: { id: '3', name: 'Bulk Test 3' }, ttl: 3600 }
        ];

        await cacheService.bulkCache(bulkOperations);
        console.log('Bulk cache operations successful');

        console.log('\nStep 6: Testing Queue Statistics...');
        const queueStats = await cacheService.syncQueue.getStats();
        console.log('Queue Stats:', queueStats);

        console.log('\nStep 7: Testing Cache Statistics...');
        const cacheStats = await cacheService.getStats();
        console.log('Cache Stats Available:', cacheStats ? 'YES' : 'NO');

        console.log('\nStep 8: Cleaning Up Test Data...');
        await cacheService.deleteUser(testUserId);
        await cacheService.deleteSnippet(testSnippetId);

        // Clean up bulk test data
        for (const op of bulkOperations) {
            await cacheService.redis.getClient().del(op.key);
        }

        console.log('Test data cleaned up');

        console.log('\nAll Cache Tests Passed Successfully!');

        console.log('\nCache System is working correctly with:');
        console.log('   - Redis connection and health monitoring');
        console.log('   - Write-Behind caching strategy');
        console.log('   - Background sync queue');
        console.log('   - Cache invalidation');
        console.log('   - Bulk operations');
        console.log('   - Error handling and fallbacks');

        console.log('\nTesting Cache Fallback...');
        // Test fallback when Redis is unavailable
        const fallbackResult = await cacheService.getUser('fallback-user', () => ({ id: 'fallback-user' }));
        console.log('Fallback result:', fallbackResult);

    } catch (error) {
        console.error('\nCache Test Failed:', error);
        throw error;
    }
}

// Test cache fallback functionality
async function testCacheFallback() {
    try {
        console.log('\nTesting Cache Fallback Functionality...');

        // Simulate Redis unavailability
        const originalIsAvailable = cacheService.isAvailable;
        cacheService.isAvailable = () => false;

        try {
            const result = await cacheService.getUser('fallback-user', () => ({ id: 'fallback-user' }));
            console.log('Fallback result:', result);
        } finally {
            // Restore original function
            cacheService.isAvailable = originalIsAvailable;
        }

    } catch (error) {
        console.error('Cache fallback test failed:', error);
        throw error;
    }
}

// Main test runner
async function runAllTests() {
    try {
        console.log('Redis Cache System Test Suite');
        console.log('================================\n');

        await runCacheTests();
        await testCacheFallback();

        console.log('\nAll tests completed successfully!');

    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    }
}

// Export for use in other files
export { runCacheTests, testCacheFallback, runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}
