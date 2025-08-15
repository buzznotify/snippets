/**
 * Simple Redis Connection Test
 * Isolates the connection issue
 */

import Redis from 'ioredis';

async function testRedisConnection() {
    try {
        console.log('Testing Simple Redis Connection...\n');

        console.log('Step 1: Creating Redis client...');
        const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            lazyConnect: true
        });

        console.log('Step 2: Waiting for connection...');
        await redis.connect();

        console.log('Redis: connect event fired');
        console.log('Redis: ready event fired');

        redis.on('error', (error) => {
            console.error('Redis: error event fired:', error.message);
        });

        console.log('Step 3: Testing ping...');
        const result = await redis.ping();
        console.log('Ping result:', result);

        if (result !== 'PONG') {
            throw new Error('Ping failed');
        }

        console.log('Step 4: Connection status...');
        console.log('Connected:', redis.status);
        console.log('Is Open:', redis.isOpen);

        console.log('Step 5: Testing set/get...');
        const testKey = 'test-key';
        const testValue = 'test-value';
        await redis.set(testKey, testValue);
        const value = await redis.get(testKey);
        console.log('Set/Get successful:', value);

        if (value !== testValue) {
            throw new Error('Set/Get failed');
        }

        await redis.del(testKey);
        console.log('Cleanup successful');

        console.log('Step 6: Closing connection...');
        await redis.quit();
        console.log('Connection closed');

        console.log('\nSimple Redis Test Complete!');

    } catch (error) {
        console.error('\nSimple Redis Test Failed:', error);
        process.exit(1);
    }
}

// Run the test
testRedisConnection().catch(console.error);
