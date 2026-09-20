import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/crypto';
import { AppError } from '../errors/AppError';
import { Role } from '@prisma/client';
import { redisClient } from '../config/redis';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.token || req.cookies?.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('UNAUTHORIZED', 401, 'No token provided');
    }

    // Check revocation denylist
    if (redisClient.isReady) {
      const isDenied = await redisClient.get(`denylist:${token}`);
      if (isDenied) {
        throw new AppError('UNAUTHORIZED', 401, 'Token has been revoked');
      }
    }

    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('UNAUTHORIZED', 401, 'Invalid or expired token'));
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401, 'Not authenticated'));
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(new AppError('FORBIDDEN', 403, 'Insufficient permissions'));
    }

    next();
  };
};
