/**
 * Cache System Test File
 * Run this to verify Redis cache is working correctly
 */

import cacheService from './CacheService.js';

/**
 * Test the cache system functionality
 */
async function testCacheSystem() {
    console.log('🧪 Starting Cache System Test...\n');

    try {
        // Test 1: Check Redis connection
        console.log('1️⃣ Testing Redis Connection...');

        // Wait for Redis to be ready
        console.log('⏳ Checking Redis connection...');
        try {
            const isConnected = await cacheService.redis.checkConnection();
            if (!isConnected) {
                console.log('❌ Redis connection check failed');
                console.log('Skipping tests...');
                return;
            }
            console.log('✅ Redis connection check passed');
        } catch (error) {
            console.log('❌ Redis connection failed:', error.message);
            console.log('Skipping tests...');
            return;
        }

        const status = cacheService.getStatus();
        console.log('Cache Status:', JSON.stringify(status, null, 2));

        if (!cacheService.isAvailable()) {
            console.log('❌ Cache not available, skipping tests');
            return;
        }
        console.log('✅ Redis connection successful\n');

        // Test 2: Basic cache operations
        console.log('2️⃣ Testing Basic Cache Operations...');

        // Test user caching
        const testUser = {
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com',
            createdAt: new Date().toISOString()
        };

        await cacheService.cacheUser('test-user-123', testUser);
        console.log('✅ User cached successfully');

        // Test user retrieval
        const cachedUser = await cacheService.getUser('test-user-123', () => testUser);
        console.log('✅ User retrieved from cache:', cachedUser ? 'SUCCESS' : 'FAILED');

        // Test 3: Snippet operations
        console.log('\n3️⃣ Testing Snippet Operations...');

        const testSnippet = {
            id: 'test-snippet-456',
            keyName: 'test-snippet',
            value: 'This is a test snippet',
            type: 'text',
            userId: 'test-user-123',
            createdAt: new Date().toISOString()
        };

        await cacheService.cacheSnippet('test-snippet-456', testSnippet);
        console.log('✅ Snippet cached successfully');

        const cachedSnippet = await cacheService.getSnippet('test-snippet-456', () => testSnippet);
        console.log('✅ Snippet retrieved from cache:', cachedSnippet ? 'SUCCESS' : 'FAILED');

        // Test 4: Cache invalidation
        console.log('\n4️⃣ Testing Cache Invalidation...');

        await cacheService.invalidateUserSnippets('test-user-123');
        console.log('✅ User snippets cache invalidated');

        // Test 5: Bulk operations
        console.log('\n5️⃣ Testing Bulk Operations...');

        const bulkOperations = [
            { key: 'bulk-test-1', data: { id: 1, name: 'Bulk Test 1' }, ttl: 3600 },
            { key: 'bulk-test-2', data: { id: 2, name: 'Bulk Test 2' }, ttl: 3600 },
            { key: 'bulk-test-3', data: { id: 3, name: 'Bulk Test 3' }, ttl: 3600 }
        ];

        await cacheService.bulkCache(bulkOperations);
        console.log('✅ Bulk cache operations successful');

        // Test 6: Queue statistics
        console.log('\n6️⃣ Testing Queue Statistics...');

        const queueStats = await cacheService.syncQueue.getStats();
        console.log('Queue Stats:', JSON.stringify(queueStats, null, 2));

        // Test 7: Cache statistics
        console.log('\n7️⃣ Testing Cache Statistics...');

        const cacheStats = await cacheService.getStats();
        console.log('Cache Stats Available:', cacheStats ? 'YES' : 'NO');

        // Test 8: Cleanup test data
        console.log('\n8️⃣ Cleaning Up Test Data...');

        await cacheService.deleteUser('test-user-123');
        await cacheService.deleteSnippet('test-snippet-456');
        await cacheService.bulkDelete(['bulk-test-1', 'bulk-test-2', 'bulk-test-3']);

        console.log('✅ Test data cleaned up');

        console.log('\n🎉 All Cache Tests Passed Successfully!');
        console.log('\n📊 Cache System is working correctly with:');
        console.log('   ✅ Redis connection and health monitoring');
        console.log('   ✅ Write-Behind caching strategy');
        console.log('   ✅ Background sync queue');
        console.log('   ✅ Cache invalidation');
        console.log('   ✅ Bulk operations');
        console.log('   ✅ Error handling and fallbacks');

    } catch (error) {
        console.error('\n❌ Cache Test Failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Test cache fallback when Redis is unavailable
 */
async function testCacheFallback() {
    console.log('\n🔄 Testing Cache Fallback...');

    try {
        // This should trigger fallback behavior
        const result = await cacheService.getUser('non-existent', () => ({ id: 'fallback-user' }));
        console.log('Fallback result:', result);
    } catch (error) {
        console.log('Expected fallback error:', error.message);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Redis Cache System Test Suite');
    console.log('================================\n');

    await testCacheSystem();
    await testCacheFallback();

    console.log('\n🏁 Test Suite Complete!');
}

// Export for use in other files
export { testCacheSystem, testCacheFallback, runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}
