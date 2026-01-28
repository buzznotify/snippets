/**
 * Snippet Service - Clean and simple business logic
 * 
 * This service handles all snippet operations with clean separation of concerns.
 * Cache operations are handled through the CacheManager.
 */

import { Snippet } from "../models/snippet.js";
import cacheManager from "../../../lib/cache/CacheManager.js";
import backgroundProcessor from "../../../lib/cache/BackgroundProcessor.js";

/**
 * Create a new snippet
 */
export const createSnippet = async (user_id, keyName, value, type) => {
    // Check if snippet already exists
    const existingSnippet = await Snippet.findOne({
        user_id,
        keyName,
        status: 'published'
    });

    if (existingSnippet) {
        return existingSnippet;
    }

    // Create new snippet
    const snippet = new Snippet({
        user_id,
        keyName,
        value,
        type: type || 'text',
        status: 'published',
        version: 1,
    });

    await snippet.save();

    // Invalidate cache for this user (async, non-blocking)
    await cacheManager.invalidateSnippet(snippet._id, user_id, keyName);

    return snippet;
}

/**
 * Update an existing snippet
 */
export const updateSnippet = async (snippet_id, user_id, keyName, value, type) => {
    // Check if another snippet with same keyName exists
    const duplicateSnippet = await Snippet.findOne({
        _id: { $ne: snippet_id },
        user_id,
        keyName,
        status: 'published'
    });

    if (duplicateSnippet) {
        throw new Error('A snippet with this key name already exists');
    }

    // Get current snippet to track old keyName
    const currentSnippet = await Snippet.findOne({
        _id: snippet_id,
        user_id
    });

    if (!currentSnippet) {
        throw new Error('Snippet not found');
    }

    const oldKeyName = currentSnippet.keyName;

    // Update snippet
    const updateData = {
        keyName,
        value,
        version: (currentSnippet.version || 1) + 1,
        updatedAt: new Date()
    };

    if (type) {
        updateData.type = type;
    }

    const updatedSnippet = await Snippet.findByIdAndUpdate(
        snippet_id,
        updateData,
        { new: true }
    );

    // Invalidate cache (handles key rename)
    await cacheManager.invalidateSnippetUpdate(
        snippet_id,
        user_id,
        oldKeyName,
        keyName
    );

    return updatedSnippet;
}

/**
 * Get snippet by ID with caching
 */
export const getSnippet = async (snippet_id, user_id) => {
    return await cacheManager.getSnippet(
        snippet_id,
        async () => {
            // Fetch from database
            const snippet = await Snippet.findOne({
                _id: snippet_id,
                user_id,
                status: 'published'
            });
            return snippet ? snippet.toObject() : null;
        }
    );
}

/**
 * Get all snippets for a user
 */
export const getAllSnippets = async (user_id) => {
    const snippets = await Snippet.find({
        user_id,
        status: 'published'
    }).sort({ createdAt: -1 });

    // Warm cache in background (non-blocking)
    if (snippets.length > 0) {
        backgroundProcessor.addJob('warm-user-cache', {
            userId: user_id,
            snippets: snippets.map(s => s.toObject())
        });
    }

    return snippets;
}

/**
 * Delete (archive) a snippet
 */
export const deleteSnippet = async (snippet_id, user_id) => {
    const snippet = await Snippet.findOne({
        _id: snippet_id,
        user_id
    });

    if (!snippet) {
        return `Snippet ${snippet_id} not found`;
    }

    // Archive the snippet
    await Snippet.findByIdAndUpdate(
        snippet_id,
        {
            status: 'archived',
            updatedAt: new Date()
        }
    );

    // Invalidate cache
    await cacheManager.invalidateSnippet(
        snippet_id,
        user_id,
        snippet.keyName
    );

    return `Snippet ${snippet_id} deleted successfully`;
}

/**
 * Get snippet by keyName with caching
 */
export const getSnippetByKeyName = async (user_id, keyName) => {
    return await cacheManager.getSnippetByKey(
        user_id,
        keyName,
        async () => {
            // Fetch from database
            const snippet = await Snippet.findOne({
                user_id,
                keyName,
                status: 'published'
            });
            return snippet ? snippet.toObject() : null;
        }
    );
}

/**
 * Warm cache for all users (used during startup)
 */
export const warmAllUsersCache = async () => {
    try {
        const snippets = await Snippet.find({ status: 'published' })
            .lean()
            .limit(1000); // Limit to prevent memory issues

        if (snippets.length === 0) {
            return { success: true, count: 0 };
        }

        // Group snippets by user
        const userSnippets = {};
        for (const snippet of snippets) {
            const userId = String(snippet.user_id);
            if (!userSnippets[userId]) {
                userSnippets[userId] = [];
            }
            userSnippets[userId].push(snippet);
        }

        // Add batch warm job to background processor
        const users = Object.keys(userSnippets).map(userId => ({
            userId,
            snippets: userSnippets[userId]
        }));

        await backgroundProcessor.addJob('batch-warm-cache', { users });

        return {
            success: true,
            count: snippets.length,
            users: users.length
        };
    } catch (error) {
        console.error('Failed to warm cache:', error);
        return { success: false, error: error.message };
    }
}
