import { RefreshTokenRecord, RefreshTokenStore } from '../contracts/refresh-token-store.interface';
import { redis } from './redis.client';

const tokenKey = (jti: string) => `refresh:token:${jti}`;
const userSetKey = (userId: string) => `refresh:user:${userId}`;

export class RedisRefreshTokenStore implements RefreshTokenStore {
  async save(jti: string, record: RefreshTokenRecord, ttlSeconds: number): Promise<void> {
    await redis
      .multi()
      .set(tokenKey(jti), JSON.stringify(record), 'EX', ttlSeconds)
      .sadd(userSetKey(record.userId), jti)
      .expire(userSetKey(record.userId), ttlSeconds)
      .exec();
  }

  async get(jti: string): Promise<RefreshTokenRecord | null> {
    const value = await redis.get(tokenKey(jti));

    if (!value) return null;

    const record = JSON.parse(value) as RefreshTokenRecord;

    return { ...record, expiresAt: new Date(record.expiresAt) };
  }

  async delete(jti: string): Promise<void> {
    const record = await this.get(jti);

    await redis.del(tokenKey(jti));

    if (record) {
      await redis.srem(userSetKey(record.userId), jti);
    }
  }

  // Used on password change/reset — kills every session for this user at once
  async deleteAllForUser(userId: string): Promise<void> {
    const jtis = await redis.smembers(userSetKey(userId));

    if (jtis.length === 0) return;

    const pipeline = redis.multi();
    jtis.forEach((jti) => pipeline.del(tokenKey(jti)));
    pipeline.del(userSetKey(userId));

    await pipeline.exec();
  }

  async exists(jti: string): Promise<boolean> {
    return (await redis.exists(tokenKey(jti))) === 1;
  }
}
