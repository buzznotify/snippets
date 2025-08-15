import { connectToDB } from '../../../backend/database/db.js';
import dataSyncService from '../../../lib/redis/DataSyncService.js';

/**
 * Data Sync API Endpoint
 * Syncs existing database data to Redis cache
 */
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed. Use POST to trigger data sync.'
        });
    }

    try {
        console.log('Data Sync API called');

        // Connect to database
        await connectToDB();
        console.log('Database connected');

        // Initialize data sync service
        await dataSyncService.initialize();
        console.log('Data sync service initialized');

        // Get initial sync status
        const initialStatus = await dataSyncService.getSyncStatus();
        console.log('Initial sync status:', initialStatus);

        // Perform data sync
        const syncResults = await dataSyncService.syncAllData();
        console.log('Data sync completed:', syncResults);

        // Get final sync status
        const finalStatus = await dataSyncService.getSyncStatus();
        console.log('Final sync status:', finalStatus);

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Data sync completed successfully',
            results: syncResults,
            initialStatus,
            finalStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Data sync failed:', error);

        return res.status(500).json({
            success: false,
            error: 'Data sync failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
