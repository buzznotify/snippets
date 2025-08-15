import { Snippet } from "../models/snippet.js";
import cacheService from "../../../lib/redis/CacheService.js";

/**
 * Enhanced Snippet Service with Cache-First Architecture
 * Implements Write-Behind pattern: Cache first, then sync to DB in background
 */

/**
 * Create a new snippet with cache-first approach
 */
export const createSnippet = async (user_id, keyName, value, type) => {
    try {
        console.log('Creating snippet with cache-first approach:', { user_id, keyName, value, type });

        // Check if snippet already exists in cache first
        const cacheKey = `snippet:${user_id}:${keyName}`;
        const existingCached = await cacheService.redis.getClient().get(cacheKey);

        if (existingCached) {
            return `keyName ${keyName} already exists.`;
        }

        // Check database as fallback
        const existingDb = await Snippet.findOne({ user_id: user_id, keyName: keyName });
        if (existingDb) {
            // Cache the existing snippet for future requests
            await cacheService.cacheSnippet(existingDb._id.toString(), existingDb.toObject());
            return `keyName ${keyName} already exists.`;
        }

        // Create new snippet
        const snippet = new Snippet({
            user_id: user_id,
            keyName: keyName,
            value: value,
            type: type,
            status: "published",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Save to cache first (Write-Behind pattern)
        const snippetData = snippet.toObject();
        await cacheService.cacheSnippet(snippet._id.toString(), snippetData);

        // Save to database
        await snippet.save();

        // Invalidate user snippets collection cache
        await cacheService.invalidateUserSnippets(user_id);

        console.log('Snippet created successfully with cache-first approach');
        return `Snippet created successfully`;

    } catch (error) {
        console.error('Error creating snippet:', error);
        throw error;
    }
};

/**
 * Update snippet with cache-first approach
 */
export const updateSnippet = async (snippet_id, user_id, keyName, value) => {
    try {
        console.log('Updating snippet with cache-first approach:', { snippet_id, user_id, keyName, value });

        // Check for duplicate keyName in cache first
        const cacheKey = `snippet:${user_id}:${keyName}`;
        const existingCached = await cacheService.redis.getClient().get(cacheKey);

        if (existingCached && existingCached._id !== snippet_id) {
            return `keyName ${keyName} already exists.`;
        }

        // Check database as fallback
        const existingDb = await Snippet.findOne({
            _id: { $ne: snippet_id },
            user_id: user_id,
            keyName: keyName
        });

        if (existingDb) {
            // Cache the existing snippet
            await cacheService.cacheSnippet(existingDb._id.toString(), existingDb.toObject());
            return `keyName ${keyName} already exists.`;
        }

        // Update in cache first
        const updatedData = { keyName, value, updatedAt: new Date() };
        await cacheService.updateSnippet(snippet_id, updatedData);

        // Update in database
        const snippet = await Snippet.findByIdAndUpdate(
            { _id: snippet_id },
            updatedData,
            { new: true }
        );

        // Invalidate user snippets collection cache
        await cacheService.invalidateUserSnippets(user_id);

        console.log('Snippet updated successfully with cache-first approach');
        return snippet;

    } catch (error) {
        console.error('Error updating snippet:', error);
        throw error;
    }
};

/**
 * Get snippet with cache-first approach
 */
export const getSnippet = async (snippet_id, user_id) => {
    try {
        console.log('Getting snippet with cache-first approach:', { snippet_id, user_id });

        // Try cache first
        const snippet = await cacheService.getSnippet(
            snippet_id,
            async () => {
                // Cache miss - fetch from database
                const dbSnippet = await Snippet.findOne({ _id: snippet_id, user_id: user_id });
                if (dbSnippet) {
                    // Cache the snippet for future requests
                    await cacheService.cacheSnippet(snippet_id, dbSnippet.toObject());
                }
                return dbSnippet;
            }
        );

        return snippet;

    } catch (error) {
        console.error('Error getting snippet:', error);
        throw error;
    }
};

/**
 * Get all snippets for a user with cache-first approach
 */
export const getAllSnippets = async (user_id) => {
    try {
        console.log('Getting all snippets with cache-first approach for user:', user_id);

        // Try cache first
        const snippets = await cacheService.getUserSnippets(
            user_id,
            async () => {
                // Cache miss - fetch from database
                const dbSnippets = await Snippet.find({
                    user_id: user_id,
                    status: "published"
                });

                if (dbSnippets && dbSnippets.length > 0) {
                    // Populate cache with existing data (no sync jobs)
                    const cacheOperations = dbSnippets.map(snippet => ({
                        key: `snippet:${snippet._id}`,
                        data: snippet.toObject(),
                        ttl: null // No TTL for snippets (source of truth)
                    }));

                    await cacheService.populateCache(cacheOperations);
                }

                return dbSnippets;
            }
        );

        return snippets || [];

    } catch (error) {
        console.error('Error getting all snippets:', error);
        throw error;
    }
};

/**
 * Delete snippet with cache-first approach
 */
export const deleteSnippet = async (snippet_id, user_id) => {
    try {
        console.log('Deleting snippet with cache-first approach:', { snippet_id, user_id });

        // Delete from cache first
        await cacheService.deleteSnippet(snippet_id);

        // Update status in database
        const snippet = await Snippet.findOneAndUpdate(
            { _id: snippet_id, user_id: user_id },
            { status: "archived", updatedAt: new Date() },
            { new: true }
        );

        // Invalidate user snippets collection cache
        await cacheService.invalidateUserSnippets(user_id);

        console.log('Snippet deleted successfully with cache-first approach');
        return `Snippet ${snippet_id} deleted.`;

    } catch (error) {
        console.error('Error deleting snippet:', error);
        throw error;
    }
};

/**
 * Get snippet by keyName with cache-first approach
 */
export const getSnippetByKeyName = async (user_id, keyName) => {
    try {
        console.log('Getting snippet by keyName with cache-first approach:', { user_id, keyName });

        // Try cache first using keyName pattern
        const cacheKey = `snippet:${user_id}:${keyName}`;
        const snippet = await cacheService.redis.getClient().get(cacheKey);

        if (snippet) {
            return JSON.parse(snippet);
        }

        // Cache miss - fetch from database
        const dbSnippet = await Snippet.findOne({
            user_id: user_id,
            keyName: keyName,
            status: "published"
        });

        if (dbSnippet) {
            // Cache the snippet for future requests
            await cacheService.cacheSnippet(dbSnippet._id.toString(), dbSnippet.toObject());

            // Also cache by keyName for faster lookups
            await cacheService.redis.getClient().set(
                cacheKey,
                JSON.stringify(dbSnippet.toObject()),
                'EX',
                3600 // 1 hour TTL for keyName lookups
            );
        }

        return dbSnippet;

    } catch (error) {
        console.error('Error getting snippet by keyName:', error);
        throw error;
    }
};

/**
 * Bulk sync existing database snippets to cache
 * This ensures all existing data is available in cache
 */
export const syncExistingSnippetsToCache = async () => {
    try {
        console.log(' Starting bulk sync of existing snippets to cache...');

        // Get all published snippets from database
        const allSnippets = await Snippet.find({ status: "published" });
        console.log(`Found ${allSnippets.length} snippets to sync to cache`);

        if (allSnippets.length === 0) {
            console.log('No snippets to sync');
            return { success: true, syncedCount: 0 };
        }

        // Group snippets by user for efficient caching
        const snippetsByUser = {};
        allSnippets.forEach(snippet => {
            const userId = snippet.user_id.toString();
            if (!snippetsByUser[userId]) {
                snippetsByUser[userId] = [];
            }
            snippetsByUser[userId].push(snippet);
        });

        let totalSynced = 0;

        // Sync each user's snippets
        for (const [userId, snippets] of Object.entries(snippetsByUser)) {
            try {
                // Cache individual snippets
                const cacheOperations = snippets.map(snippet => ({
                    key: `snippet:${snippet._id}`,
                    data: snippet.toObject(),
                    ttl: null
                }));

                await cacheService.populateCache(cacheOperations);

                // Cache user snippets collection
                await cacheService.cacheUserSnippets(userId, snippets.map(s => s.toObject()));

                totalSynced += snippets.length;
                console.log(` Synced ${snippets.length} snippets for user ${userId}`);

            } catch (error) {
                console.error(` Failed to sync snippets for user ${userId}:`, error);
            }
        }

        console.log(` Bulk sync completed! Total snippets synced: ${totalSynced}`);
        return { success: true, syncedCount: totalSynced };

    } catch (error) {
        console.error(' Bulk sync failed:', error);
        throw error;
    }
};

/**
 * Get cache statistics for snippets
 */
export const getSnippetCacheStats = async () => {
    try {
        const stats = await cacheService.getStats();
        return {
            cacheStatus: cacheService.getStatus(),
            snippetCount: await cacheService.redis.getClient().keys('snippet:*').then(keys => keys.length),
            userSnippetsCount: await cacheService.redis.getClient().keys('user_snippets:*').then(keys => keys.length),
            ...stats
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);
        return null;
    }
};
