export interface RefreshTokenRecord {
  userId: string;
  expiresAt: Date;
}

export interface RefreshTokenStore {
  save(jti: string, record: RefreshTokenRecord, ttlSeconds: number): Promise<void>;
  get(jti: string): Promise<RefreshTokenRecord | null>;
  delete(jti: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  exists(jti: string): Promise<boolean>;
}
