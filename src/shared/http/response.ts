import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function success<T>(res: Response, data: T, statusCode = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };

  return res.status(statusCode).json(response);
}

export function failure(res: Response, message: string, statusCode = 500) {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: message,
  };

  return res.status(statusCode).json(response);
}
