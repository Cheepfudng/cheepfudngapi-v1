import { Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { AuthRequest } from '../types/auth.types';
import { userRepository, tokenBlacklistStore } from '../services/service-container';
import { verifyAccessToken, hashToken } from '../utils/token';

export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('You are not logged in', 401, ErrorCode.UNAUTHORIZED);
  }

  const token = header.split(' ')[1];

  if (await tokenBlacklistStore.isBlacklisted(hashToken(token))) {
    throw new AppError(
      'Session has been terminated, please log in again',
      401,
      ErrorCode.INVALID_TOKEN
    );
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Invalid or expired token', 401, ErrorCode.INVALID_TOKEN);
  }

  const user = await userRepository.findById(payload.sub);

  if (!user || !user.isActive) {
    throw new AppError(
      'The user belonging to this token no longer exists',
      401,
      ErrorCode.UNAUTHORIZED
    );
  }

  if (user.changedPasswordAfter(payload.iat)) {
    throw new AppError(
      'Password was recently changed, please log in again',
      401,
      ErrorCode.UNAUTHORIZED
    );
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    verificationStatus: user.verificationStatus,
    organizationType: user.organizationType,
  };
  req.token = token;

  next();
};

// Same identity resolution as protect(), but never rejects the request — a missing,
// invalid, or expired token just leaves req.user unset (anonymous). For routes that are
// public but behave differently for an authenticated owner/admin (e.g. a campaign's public
// detail page showing full status only to its own org or an admin).
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.split(' ')[1];

  try {
    if (await tokenBlacklistStore.isBlacklisted(hashToken(token))) return next();

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive || user.changedPasswordAfter(payload.iat)) return next();

    req.user = {
      id: user._id.toString(),
      role: user.role,
      verificationStatus: user.verificationStatus,
      organizationType: user.organizationType,
    };
    req.token = token;
  } catch {
    // Invalid/expired token on an optionally-authenticated route — treat as anonymous
    // rather than failing the request.
  }

  next();
};
