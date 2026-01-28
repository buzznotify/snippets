/**
 * Redis Configuration
 * This file is kept for backward compatibility but is no longer used.
 * All Redis configuration is now handled in CacheManager.js
 */

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};
