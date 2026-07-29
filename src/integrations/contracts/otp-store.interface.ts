export interface OtpRecord {
  code: string;
  attempts: number;
  expiresAt: Date;
}

export interface OtpStore {
  save(key: string, record: OtpRecord, ttlSeconds: number): Promise<void>;

  get(key: string): Promise<OtpRecord | null>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}
