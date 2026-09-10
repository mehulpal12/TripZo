import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.error(`[AppError] ${err.code}: ${err.message}`, { metadata: err.metadata, stack: err.stack });
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
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
