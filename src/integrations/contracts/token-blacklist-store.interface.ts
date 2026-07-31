export interface TokenBlacklistStore {
  add(tokenHash: string, ttlSeconds: number): Promise<void>;
  isBlacklisted(tokenHash: string): Promise<boolean>;
}
