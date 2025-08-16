// backend/lib/redis/SyncQueue.js
import Queue from 'bull'; // or bullmq if you prefer
import { queueConfig } from './config.js';

class SyncQueue {
  constructor() {
    this.queue = new Queue('sync-to-db', { redis: queueConfig.redis, defaultJobOptions: queueConfig.defaultJobOptions });
  }

  async addJob(name, data, opts = {}) {
    const job = await this.queue.add(name, data, opts);
    console.log('[SYNC] added job', { name, id: job.id, data });
    return job;
  }

  getStats() {
    return {
      name: 'sync-to-db',
      options: queueConfig.defaultJobOptions,
    };
  }

  async close() {
    await this.queue.close();
  }
}

export default new SyncQueue();
