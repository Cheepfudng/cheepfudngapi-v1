import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T
): Response => {
  return res.status(statusCode).json({
    status: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown
): Response => {
  return res.status(statusCode).json({
    status: false,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
  });
};
