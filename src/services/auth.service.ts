import jwt from 'jsonwebtoken';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenStore } from '../integrations/contracts/refresh-token-store.interface';
import { TokenBlacklistStore } from '../integrations/contracts/token-blacklist-store.interface';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/token';
import { UserRole, VerificationStatus } from '../types';

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly tokenBlacklistStore: TokenBlacklistStore
  ) {}

  async issueTokens(userId: string, role: UserRole, verificationStatus: VerificationStatus) {
    const accessToken = generateAccessToken({ sub: userId, role, verificationStatus });

    const { token: refreshToken, jti, expiresAt } = generateRefreshToken(userId);
    const ttlSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    await this.refreshTokenStore.save(jti, { userId, expiresAt }, ttlSeconds);

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmailWithPassword(email);

    if (!user || !user.password || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401, ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated', 403, ErrorCode.ACCOUNT_DEACTIVATED);
    }

    const tokens = await this.issueTokens(user._id.toString(), user.role, user.verificationStatus);

    return { user, ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(
        'Refresh token is invalid or expired',
        401,
        ErrorCode.REFRESH_TOKEN_INVALID
      );
    }

    const record = await this.refreshTokenStore.get(payload.jti);

    if (!record || record.userId !== payload.sub) {
      throw new AppError(
        'Refresh token is invalid or expired',
        401,
        ErrorCode.REFRESH_TOKEN_INVALID
      );
    }

    // Rotation: old token is dead the instant it's used
    await this.refreshTokenStore.delete(payload.jti);

    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError(
        'Refresh token is invalid or expired',
        401,
        ErrorCode.REFRESH_TOKEN_INVALID
      );
    }

    return this.issueTokens(user._id.toString(), user.role, user.verificationStatus);
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
        await this.tokenBlacklistStore.add(hashToken(accessToken), ttlSeconds);
      }
    } catch {
      // malformed token — nothing to blacklist
    }

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await this.refreshTokenStore.delete(payload.jti);
      } catch {
        // already invalid/expired
      }
    }
  }
}
