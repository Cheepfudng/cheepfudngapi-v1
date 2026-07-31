import { Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRole, VerificationStatus } from '../types/enums';
import { AuthRequest } from '../types/auth.types';

export const requireVerifiedOrganization = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
  }

  if (req.user.role !== UserRole.ORGANIZATION) {
    return next();
  }

  if (req.user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new AppError(
      'Your organization is pending verification. Please complete document submission and wait for admin approval.',
      403,
      ErrorCode.ORGANIZATION_NOT_VERIFIED
    );
  }

  next();
};
