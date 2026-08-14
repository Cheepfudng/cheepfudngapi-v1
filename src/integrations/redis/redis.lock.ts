import { randomUUID } from 'crypto';

import { redis } from './redis.client';

// Only deletes the key if it still holds the token we set — prevents a caller from ever
// releasing a lock it no longer owns (e.g. its own TTL already expired and a different
// request has since acquired the same key).
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

// Generic short-lived distributed lock on top of Redis SET NX. Not tied to checkout —
// any future flow needing "only one of these in flight per key" (e.g. a future donation
// or admin-action idempotency guard) can reuse this directly.
export class RedisLock {
  // Returns an opaque token to pass to release() if acquired, or null if the key is
  // already locked. Never queues/waits — the caller decides how to respond to contention.
  async acquire(key: string, ttlSeconds: number): Promise<string | null> {
    const token = randomUUID();
    const result = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK' ? token : null;
  }

  async release(key: string, token: string): Promise<void> {
    await redis.eval(RELEASE_IF_OWNER_SCRIPT, 1, key, token);
  }
}
