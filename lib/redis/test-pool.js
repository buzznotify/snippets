/**
 * Redis Connection Pool Test
 * Tests the new connection pooling system
 */

import '../env.js';
import redisPoolService from './RedisPoolService.js';
import redisService from './RedisService.js';

async function testConnectionPool() {
    console.log('🧪 Testing Redis Connection Pool');
    console.log('================================\n');

    try {
        // Wait for pool to initialize
        console.log('⏳ Waiting for pool initialization...');
        await redisPoolService.waitForInitialization();
        console.log('✅ Pool initialized\n');

        // Test 1: Get pool statistics
        console.log('📊 Pool Statistics:');
        const poolStats = redisPoolService.getPoolStats();
        console.log(JSON.stringify(poolStats, null, 2));

        // Test 2: Get multiple connections
        console.log('\n🔗 Testing multiple connections...');
        const connections = [];
        const numConnections = 5;

        for (let i = 0; i < numConnections; i++) {
            try {
                const connection = await redisPoolService.getConnection();
                connections.push(connection);
                console.log(`✅ Got connection ${i + 1}`);

                // Test ping
                const pingResult = await connection.ping();
                console.log(`   Ping result: ${pingResult}`);

            } catch (error) {
                console.error(`❌ Failed to get connection ${i + 1}:`, error.message);
            }
        }

        // Test 3: Check pool status after getting connections
        console.log('\n📊 Pool Status After Getting Connections:');
        const afterStats = redisPoolService.getPoolStats();
        console.log(JSON.stringify(afterStats, null, 2));

        // Test 4: Return connections to pool
        console.log('\n🔄 Returning connections to pool...');
        for (let i = 0; i < connections.length; i++) {
            redisPoolService.returnConnection(connections[i]);
            console.log(`✅ Returned connection ${i + 1}`);
        }

        // Test 5: Check pool status after returning connections
        console.log('\n📊 Pool Status After Returning Connections:');
        const finalStats = redisPoolService.getPoolStats();
        console.log(JSON.stringify(finalStats, null, 2));

        // Test 6: Test RedisService executeOperation
        console.log('\n🧪 Testing RedisService executeOperation...');
        try {
            const result = await redisService.executeOperation(async (client) => {
                await client.set('test-key', 'test-value');
                const value = await client.get('test-key');
                await client.del('test-key');
                return value;
            });
            console.log(`✅ executeOperation result: ${result}`);
        } catch (error) {
            console.error('❌ executeOperation failed:', error.message);
        }

        // Test 7: Test connection limits
        console.log('\n🚧 Testing connection limits...');
        const maxConnections = parseInt(process.env.REDIS_MAX_CONNECTIONS) || 25;
        const testConnections = [];

        try {
            for (let i = 0; i < maxConnections + 5; i++) {
                const connection = await redisPoolService.getConnection();
                testConnections.push(connection);
                console.log(`✅ Got connection ${i + 1}`);
            }
        } catch (error) {
            console.log(`⚠️  Expected limit reached: ${error.message}`);
        }

        // Return test connections
        for (const connection of testConnections) {
            redisPoolService.returnConnection(connection);
        }

        console.log('\n✅ Connection Pool Test Completed Successfully!');

    } catch (error) {
        console.error('❌ Connection Pool Test Failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        try {
            await redisPoolService.closePool();
            console.log('✅ Pool closed');
        } catch (error) {
            console.error('❌ Failed to close pool:', error.message);
        }
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testConnectionPool().catch(console.error);
}

export { testConnectionPool };
