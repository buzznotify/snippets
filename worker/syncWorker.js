// worker/syncWorker.js
import 'dotenv/config'; // loads .env by default; we'll override for .env.local below
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Next.js uses .env.local; make sure worker sees it too

import Queue from 'bull';
import mongoose from 'mongoose';

// ---- Redis queue config (inline to avoid import path/ESM issues) ----
const queueRedisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB_QUEUE || process.env.REDIS_DB || 1), // <— use same DB as your app’s queue
};

// ---- Mongo connection (adjust your URI/env as needed) ----
// console.log(process.env.MONGODB_UR:);
const mongoUri =
  process.env.MONGODB_URL ||
  `mongodb://${process.env.MONGODB_HOST || '127.0.0.1'}:${process.env.MONGODB_PORT || 27017}/${process.env.MONGODB_DB || 'snippets'}`;

// ---- Snippet model (minimal; align with your real schema) ----
import mongoosePkg from 'mongoose';
const { Schema } = mongoosePkg;

const SnippetSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  keyName: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  type: { type: String, default: 'text' },
  status: { type: String, enum: ['published', 'archived'], default: 'published' },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', SnippetSchema);

// ---- Bootstrap ----
(async function bootstrap() {
  // 1) Connect Mongo
  await mongoose.connect(mongoUri, {
    // no need for useNewUrlParser/useUnifiedTopology in driver v4+
  });
  console.log('[WORKER] Mongo connected ->', mongoUri);

  // 2) Connect Bull queue (must match your app's queue)
  const queue = new Queue('sync-to-db', { redis: queueRedisConfig });
  console.log('[WORKER] Queue connected', queueRedisConfig);

  // 3) Process jobs. IMPORTANT: processor name must match what you use in addJob(name,...)
  queue.process('sync-to-db', 5, async (job) => {
    const { op, id, version, fields } = job.data;
    console.log('[WORKER] processing', { op, id, version });

    switch (op) {
      case 'create': {
        const existing = await Snippet.findById(id);
        if (!existing) {
          await Snippet.create({ _id: id, ...normalizeFields(fields) });
          console.log('[WORKER] created', id);
        } else if ((existing.version || 1) < version) {
          await Snippet.updateOne(
            { _id: id, version: version - 1 },
            { $set: { ...normalizeFields(fields), version } }
          );
          console.log('[WORKER] upgraded existing to v', version);
        } else {
          console.log('[WORKER] create noop (exists/newer)');
        }
        return;
      }

      case 'update': {
        await Snippet.updateOne(
          { _id: id, version: version - 1 },
          { $set: { ...normalizeFields(fields), version } }
        );
        console.log('[WORKER] updated', id, '-> v', version);
        return;
      }

      case 'archive': {
        await Snippet.updateOne(
          { _id: id, version: version - 1 },
          { $set: { ...normalizeFields(fields), version, status: 'archived' } }
        );
        console.log('[WORKER] archived', id);
        return;
      }

      default:
        console.warn('[WORKER] unknown op', op);
        return;
    }
  });

  queue.on('failed', (job, err) => {
    console.error('[WORKER] job failed', job?.id, err);
  });

  queue.on('error', (err) => {
    console.error('[WORKER] queue error', err);
  });

  console.log('[WORKER] ready');
})().catch((e) => {
  console.error('[WORKER] bootstrap error', e);
  process.exit(1);
});

// Normalize possible snake_case from API to schema’s camelCase
function normalizeFields(fields) {
  if (!fields) return fields;
  const out = { ...fields };
  if (out.created_at && !out.createdAt) out.createdAt = new Date(out.created_at);
  if (out.updated_at && !out.updatedAt) out.updatedAt = new Date(out.updated_at);
  delete out.created_at;
  delete out.updated_at;
  return out;
}
