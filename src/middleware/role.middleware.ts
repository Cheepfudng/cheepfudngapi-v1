import { Response, NextFunction } from 'express';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { AuthRequest } from '../types/auth.types';
import { UserRole } from '../types/enums';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'You do not have permission to perform this action',
        403,
        ErrorCode.FORBIDDEN
      );
    }
    next();
  };
};
