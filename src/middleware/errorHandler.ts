import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (error instanceof AppError) {
    logger.error({
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
    });

    return res.status(error.statusCode).json({
      status: false,
      message: error.message,
      error: {
        code: error.code,
        ...(error.details !== undefined && {
          details: error.details,
        }),
      },
    });
  }

  const unknownError = error instanceof Error ? error : new Error('Unknown error');

  logger.error({
    message: unknownError.message,
    stack: unknownError.stack,
  });

  return res.status(500).json({
    status: false,
    message: 'An unexpected error occurred',
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    },
  });
};
