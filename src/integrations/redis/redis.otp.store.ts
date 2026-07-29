import { OtpRecord, OtpStore } from '../contracts/otp-store.interface';

import { redis } from './redis.client';

export class RedisOtpStore implements OtpStore {
  async save(key: string, record: OtpRecord, ttlSeconds: number): Promise<void> {
    await redis.set(key, JSON.stringify(record), 'EX', ttlSeconds);
  }

  async get(key: string): Promise<OtpRecord | null> {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    const record = JSON.parse(value) as OtpRecord;

    return {
      ...record,
      expiresAt: new Date(record.expiresAt),
    };
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  }
}
