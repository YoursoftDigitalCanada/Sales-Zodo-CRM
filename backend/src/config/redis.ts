import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../common/utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!config.redis.url) {
    logger.warn('Redis URL not configured, some features may be limited');
    return null;
  }

  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('❌ Redis error:', error);
    });
  }

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}