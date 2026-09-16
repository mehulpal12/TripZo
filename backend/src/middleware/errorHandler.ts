import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isAppError = err instanceof AppError || (err && (err.statusCode || err.code));
  if (isAppError) {
    const statusCode = err.statusCode || 400;
    const code = err.code || 'BAD_REQUEST';
    logger.error(`[AppError] ${code}: ${err.message}`, { metadata: err.metadata, stack: err.stack });
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  logger.error('Unhandled Error', { error: err, stack: err.stack });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
