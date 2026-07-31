import { TokenBlacklistStore } from '../contracts/token-blacklist-store.interface';
import { redis } from './redis.client';

const key = (tokenHash: string) => `blacklist:access:${tokenHash}`;

export class RedisTokenBlacklistStore implements TokenBlacklistStore {
  async add(tokenHash: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await redis.set(key(tokenHash), '1', 'EX', ttlSeconds);
  }

  async isBlacklisted(tokenHash: string): Promise<boolean> {
    return (await redis.exists(key(tokenHash))) === 1;
  }
}
