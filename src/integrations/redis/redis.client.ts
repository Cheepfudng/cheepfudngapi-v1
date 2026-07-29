import Redis from 'ioredis';

import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export const redis = new Redis(env.REDIS_URL);

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (error) => {
  logger.error('❌ Redis connection error:', error);
});
