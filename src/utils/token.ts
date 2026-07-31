import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { env } from '../config/env';
import { UserRole, VerificationStatus } from '../types/enums';

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
  verificationStatus: VerificationStatus;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // unique token id, used as the Redis lookup key
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload & { iat: number } => {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & { iat: number };
};

export const generateRefreshToken = (
  userId: string
): { token: string; jti: string; expiresAt: Date } => {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ sub: userId, jti } as RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const { exp } = jwt.decode(token) as { exp: number };

  return { token, jti, expiresAt: new Date(exp * 1000) };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

// Refresh tokens are never stored raw in Redis — only this hash, so a
// Redis compromise alone doesn't hand over usable tokens.
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
