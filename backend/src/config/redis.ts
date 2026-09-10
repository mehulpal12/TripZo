import { createClient } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Connected to Redis successfully'));

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    logger.error('Failed to connect to Redis', err);
    process.exit(-1);
  }
};
