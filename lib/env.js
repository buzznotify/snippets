/* eslint-disable */
/**
 * Environment Loader
 * Loads environment variables from .env.local file
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Verify required environment variables
const requiredEnvVars = ['MONGODB_URL', 'REDIS_HOST', 'REDIS_PASSWORD', 'SECRET_KEY'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`${envVar} not found in environment variables`);
        console.warn(`Make sure .env.local file exists and contains ${envVar}`);
    } else {
        // Mask sensitive values in logs
        const value = process.env[envVar];
        const maskedValue = envVar.includes('PASSWORD') || envVar.includes('SECRET') || envVar.includes('KEY')
            ? value.substring(0, 8) + '...'
            : value.substring(0, 20) + '...';
    }
}

// Export environment variables
export const env = {
    MONGODB_URL: process.env.MONGODB_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT || 6379,
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB || 0,
    SECRET_KEY: process.env.SECRET_KEY,
};
