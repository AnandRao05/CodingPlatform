require('./dnsPatch');
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;
let redisAvailable = false;
let redisConnectionOptions = null;

if (REDIS_URL) {
  try {
    const parsed = new URL(REDIS_URL);
    redisConnectionOptions = {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      family: 4,               // Force IPv4 to prevent IPv6 ETIMEDOUT hangs
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      connectTimeout: 10000,   // 10s — abort if can't connect
      commandTimeout: 10000,   // 10s — abort if command hangs
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 2000, 6000); // 2s, 4s, 6s backoff
      }
    };

    redisClient = new Redis(redisConnectionOptions);

    redisClient.on('connect', () => {
      console.log('[Redis] Connecting to Redis...');
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      console.log('[Redis] Connected and ready to process queues.');
      // Initialize BullMQ worker only AFTER Redis is ready
      try {
        const { initExecutionWorker } = require('../workers/executionWorker');
        initExecutionWorker();
      } catch (e) {
        console.warn('[Redis] Error starting execution worker on ready:', e.message);
      }
    });

    redisClient.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[Redis] Connection lost:', err.message);
      }
      redisAvailable = false;
    });

    redisClient.on('close', () => {
      redisAvailable = false;
    });
  } catch (err) {
    console.warn('[Redis] Failed to initialize Redis client. Falling back to direct execution.', err.message);
    redisAvailable = false;
  }
} else {
  console.log('[Redis] REDIS_URL not configured. Running in Direct Synchronous Mode.');
}

const isRedisAvailable = () => redisAvailable;

module.exports = {
  redisClient,
  redisConnectionOptions,
  isRedisAvailable,
  REDIS_URL
};
