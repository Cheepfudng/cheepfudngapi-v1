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

// Checkout calls out to Paystack and reserves stock — capped per IP to blunt accidental
// double-submission and deliberate abuse (spamming transaction-initialize calls).
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'Too many checkout attempts, please try again later',
        429,
        ErrorCode.TOO_MANY_REQUESTS
      )
    );
  },
});
