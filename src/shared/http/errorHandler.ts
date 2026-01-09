import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';
import { failure } from './response';

export function globalErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // Known, trusted error
  if (err instanceof AppError) {
    return failure(res, err.message, err.statusCode);
  }

  // Unknown / programming error
  console.error('🔥 Unexpected Error:', err);

  return failure(res, 'Internal server error', 500);
}
