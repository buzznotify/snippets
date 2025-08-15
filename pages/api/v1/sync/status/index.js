import dataSyncService from '../../../../lib/redis/DataSyncService.js';

/**
 * Data Sync Status API Endpoint
 * Returns current sync status without triggering sync
 */
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed. Use GET to check sync status.'
        });
    }

    try {
        console.log('📊 Data Sync Status API called');

        // Get current sync status
        const syncStatus = await dataSyncService.getSyncStatus();
        console.log('Current sync status:', syncStatus);

        // Get user sync stats
        const userStats = await dataSyncService.getUserSyncStats();
        console.log('User sync stats:', userStats);

        // Get snippet sync stats
        const snippetStats = await dataSyncService.getSnippetSyncStats();
        console.log('Snippet sync stats:', snippetStats);

        // Return status response
        return res.status(200).json({
            success: true,
            message: 'Sync status retrieved successfully',
            syncStatus,
            userStats,
            snippetStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to get sync status:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
