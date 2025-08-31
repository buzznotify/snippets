// backend/snippet/services/snippet-cached.js
import { Snippet } from '../models/snippet.js';
import cacheService from '../../../lib/redis/CacheService.js';
import syncQueue from '../../../lib/redis/SyncQueue.js';

// ---------- Helpers ----------
const idxKey = (userId, keyName) => `snippet:idx:${userId}:${keyName}`;
const sKey = (id) => `snippet:${id}`;

// ---------- Create ----------
export const createSnippet = async (user_id, keyName, value, type) => {
  // Check cache by idx
  const idFromIdx = await cacheService.redis.executeOperation((c) => c.get(idxKey(user_id, keyName)));
  if (idFromIdx) {
    const s = await cacheService.redis.executeOperation((c) => c.get(sKey(idFromIdx)));
    if (s) return JSON.parse(s);
  }

  // Check DB duplicate
  const existingDb = await Snippet.findOne({ user_id, keyName, status: 'published' });
  if (existingDb) {
    // Seed cache atomically
    const json = JSON.stringify(existingDb.toObject());
    await cacheService.setSnippetAtomic({
      id: String(existingDb._id),
      userId: String(user_id),
      keyName,
      json,
      ttl: 0,
    });
    return existingDb;
  }

  // Create new
  const snippet = new Snippet({
    user_id,
    keyName,
    value,
    type,
    status: 'published',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const payload = snippet.toObject();
  const json = JSON.stringify(payload);

  // Cache first (atomic)
  await cacheService.setSnippetAtomic({
    id: String(snippet._id),
    userId: String(user_id),
    keyName,
    json,
    ttl: 0,
  });

  // Enqueue idempotent job
  await syncQueue.addJob(
    'sync-to-db',
    { op: 'create', id: String(snippet._id), version: 1, fields: payload },
    { jobId: `snippet:${snippet._id}:v1`, removeOnComplete: true }
  );
  console.log('[SYNC] queued create job', `snippet:${snippet._id}:v1`);  

  // Invalidate list snapshot (optional)
  await cacheService.invalidateUserSnippets(user_id);

  return payload;
};

// ---------- Update ----------
export const updateSnippet = async (snippet_id, user_id, keyName, value, type) => {
  // Load current from cache or DB
  const existing = await cacheService.getSnippet(
    snippet_id,
    async () => {
      const doc = await Snippet.findOne({ _id: snippet_id, user_id });
      return doc ? doc.toObject() : null;
    }
  );
  if (!existing) throw new Error('Snippet not found');

  const oldKeyName = existing.keyName;
  const version = (existing.version || 1) + 1;

  const updated = {
    ...existing,
    keyName,
    value,
    ...(type ? { type } : {}),
    version,
    updatedAt: new Date(),
  };
  const json = JSON.stringify(updated);

  // Cache atomic update (handle key rename)
  await cacheService.updateSnippetAtomic({
    id: String(snippet_id),
    userId: String(user_id),
    oldKeyName,
    newKeyName: keyName,
    json,
    ttl: 0,
  });

  // Enqueue idempotent update
  await syncQueue.addJob(
    'sync-to-db',
    { op: 'update', id: String(snippet_id), version, fields: { keyName, value, ...(type ? { type } : {}), updatedAt: updated.updatedAt } },
    { jobId: `snippet:${snippet_id}:v${version}`, removeOnComplete: true }
  );

  await cacheService.invalidateUserSnippets(user_id);
  return updated;
};

// ---------- Get by ID ----------
export const getSnippet = async (snippet_id, user_id) => {
  const snippet = await cacheService.getSnippet(
    snippet_id,
    async () => {
      const dbSnippet = await Snippet.findOne({ _id: snippet_id, user_id });
      if (!dbSnippet) return null;
      // atomic seed (id known but we also need index)
      const json = JSON.stringify(dbSnippet.toObject());
      await cacheService.setSnippetAtomic({
        id: String(snippet_id),
        userId: String(user_id),
        keyName: dbSnippet.keyName,
        json,
        ttl: 0,
      });
      return dbSnippet;
    }
  );
  return snippet;
};

// ---------- Get by keyName ----------
export const getSnippetByKeyName = async (user_id, keyName) => {
  const id = await cacheService.redis.executeOperation((c) => c.get(idxKey(user_id, keyName)));
  if (id) {
    const s = await cacheService.redis.executeOperation((c) => c.get(sKey(id)));
    if (s) return JSON.parse(s);
  }

  const dbSnippet = await Snippet.findOne({ user_id, keyName, status: 'published' });
  if (!dbSnippet) return null;

  const json = JSON.stringify(dbSnippet.toObject());
  await cacheService.setSnippetAtomic({
    id: String(dbSnippet._id),
    userId: String(user_id),
    keyName,
    json,
    ttl: 0,
  });

  return dbSnippet;
};

// ---------- Get all for user ----------
export const getAllSnippets = async (user_id) => {
  // try list snapshot
  const list = await cacheService.getUserSnippets(
    user_id,
    async () => {
      const dbSnippets = await Snippet.find({ user_id, status: 'published' }).sort({ createdAt: -1 });
      // seed atomically per snippet + set user list snapshot
      if (dbSnippets?.length) {
        const ops = [];
        for (const sn of dbSnippets) {
          const json = JSON.stringify(sn.toObject());
          await cacheService.setSnippetAtomic({
            id: String(sn._id),
            userId: String(user_id),
            keyName: sn.keyName,
            json,
            ttl: 0,
          });
          ops.push(sn.toObject());
        }
        await cacheService.cacheUserSnippets(user_id, ops);
      }
      return dbSnippets;
    }
  );
  return list || [];
};

// ---------- Delete (archive) ----------
export const deleteSnippet = async (snippet_id, user_id) => {
  // load to know keyName + version
  const existing = await cacheService.getSnippet(
    snippet_id,
    async () => {
      const doc = await Snippet.findOne({ _id: snippet_id, user_id });
      return doc ? doc.toObject() : null;
    }
  );
  if (!existing) return `Snippet ${snippet_id} already deleted`;

  const version = (existing.version || 1) + 1;

  await cacheService.deleteSnippetAtomic({
    id: String(snippet_id),
    userId: String(user_id),
    keyName: existing.keyName,
  });

  await syncQueue.addJob(
    'sync-to-db',
    { op: 'archive', id: String(snippet_id), version, fields: { status: 'archived', updatedAt: new Date() } },
    { jobId: `snippet:${snippet_id}:v${version}`, removeOnComplete: true }
  );

  await cacheService.invalidateUserSnippets(user_id);
  return `Snippet ${snippet_id} deleted.`;
};

// ---------- Bulk sync DB → cache (no jobs) ----------
export const syncExistingSnippetsToCache = async () => {
  const all = await Snippet.find({ status: 'published' });
  if (!all.length) return { success: true, syncedCount: 0 };

  for (const sn of all) {
    const json = JSON.stringify(sn.toObject());
    await cacheService.setSnippetAtomic({
      id: String(sn._id),
      userId: String(sn.user_id),
      keyName: sn.keyName,
      json,
      ttl: 0,
    });
  }
  // Rebuild user list snapshots (optional; already handled by setSnippetAtomic)
  return { success: true, syncedCount: all.length };
};

// ---------- Stats ----------
export const getSnippetCacheStats = async () => {
  try {
    const snippetCount = await cacheService.scanCount('snippet:*');
    const userSnippetsCount = await cacheService.scanCount('user_snippets:*');
    return {
      cacheStatus: cacheService.getStatus(),
      snippetCount,
      userSnippetsCount,
    };
  } catch (e) {
    console.error('Error getting cache stats:', e);
    return null;
  }
};
