import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';

/**
 * Middleware to validate request body using a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((e) => `${e.path.join('.')} - ${e.message}`).join('; ');
        return next(new AppError(message, 400));
      }
      next(err);
    }
  };
};

/**
 * Middleware to validate query parameters using a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((e) => `${e.path.join('.')} - ${e.message}`).join('; ');
        return next(new AppError(message, 400));
      }
      next(err);
    }
  };
};
