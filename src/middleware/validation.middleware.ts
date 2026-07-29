import { Request, Response, NextFunction } from 'express';

import { validationResult } from 'express-validator';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

export const validateRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(
      'Request validation failed',
      400,
      ErrorCode.VALIDATION_ERROR,
      errors.array()
    );
  }

  next();
};
