import rateLimit from 'express-rate-limit';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError('Too many requests, please try again later', 429, ErrorCode.TOO_MANY_REQUESTS)
    );
  },
});
