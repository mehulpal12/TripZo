import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../errors/AppError';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('VALIDATION_ERROR', 400, 'Invalid request data', error.format()));
      } else {
        next(error);
      }
    }
  };
};
