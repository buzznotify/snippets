/**
 * Simple Redis Connection Test
 * Isolates the connection issue
 */

import Redis from 'ioredis';

async function testRedisConnection() {
    console.log('🧪 Testing Simple Redis Connection...\n');

    try {
        // Test 1: Basic Redis connection
        console.log('1️⃣ Creating Redis client...');
        const redis = new Redis({
            host: 'localhost',
            port: 6379,
            lazyConnect: false,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        });

        // Test 2: Wait for connection
        console.log('2️⃣ Waiting for connection...');

        redis.on('connect', () => {
            console.log('✅ Redis: connect event fired');
        });

        redis.on('ready', () => {
            console.log('✅ Redis: ready event fired');
        });

        redis.on('error', (error) => {
            console.error('❌ Redis: error event fired:', error.message);
        });

        redis.on('close', () => {
            console.log('🔌 Redis: close event fired');
        });

        // Test 3: Try to ping
        console.log('3️⃣ Testing ping...');
        try {
            const result = await redis.ping();
            console.log('✅ Ping result:', result);
        } catch (error) {
            console.error('❌ Ping failed:', error.message);
        }

        // Test 4: Check connection status
        console.log('4️⃣ Connection status...');
        console.log('Connected:', redis.status);
        console.log('Is Open:', redis.status === 'ready');

        // Test 5: Try to set/get a value
        console.log('5️⃣ Testing set/get...');
        try {
            await redis.set('test-key', 'test-value');
            const value = await redis.get('test-key');
            console.log('✅ Set/Get successful:', value);

            // Cleanup
            await redis.del('test-key');
            console.log('✅ Cleanup successful');
        } catch (error) {
            console.error('❌ Set/Get failed:', error.message);
        }

        // Test 6: Close connection
        console.log('6️⃣ Closing connection...');
        await redis.quit();
        console.log('✅ Connection closed');

        console.log('\n🎉 Simple Redis Test Complete!');

    } catch (error) {
        console.error('\n❌ Simple Redis Test Failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testRedisConnection().catch(console.error);
