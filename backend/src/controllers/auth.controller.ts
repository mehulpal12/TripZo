import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { hashPassword, comparePassword, generateAccessToken } from '../utils/crypto';
import { AppError } from '../errors/AppError';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import ms from 'ms';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redisClient } from '../config/redis';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('USER_EXISTS', 409, 'User with this email already exists');
    }



    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: role as Role,
        name,
        ...(role === 'CAPTAIN' && {
          captainProfile: {
            create: {
              vehicleType: 'BIKE',
              vehicleNumber: `TEST-${Math.floor(1000 + Math.random() * 9000)}`, // Auto-generate for MVP testing
            }
          }
        })
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshTokenString = crypto.randomBytes(40).toString('hex');

    const expiresInMs = ms(env.REFRESH_TOKEN_EXPIRES_IN as any);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await prisma.refreshSession.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenString,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new AppError('INVALID_TOKEN', 400, 'Refresh token is required');
    }

    // 1. Concurrency absorbing: If this refresh token was already refreshed in the last 15 seconds,
    // return the cached token pair instead of throwing an error or logging out.
    if (redisClient.isReady) {
      const cached = await redisClient.get(`recent_refresh:${refreshToken}`);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: JSON.parse(cached),
        });
      }
    }

    const session = await prisma.refreshSession.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.refreshSession.deleteMany({ where: { id: session.id } });
      }
      throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token');
    }

    const newAccessToken = generateAccessToken({ userId: session.user.id, role: session.user.role });
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresInMs = ms(env.REFRESH_TOKEN_EXPIRES_IN as any);

    // Atomically delete the old session. Using deleteMany prevents P2025 exceptions.
    const deleted = await prisma.refreshSession.deleteMany({
      where: { id: session.id },
    });

    if (deleted.count === 0) {
      // Check if another concurrent thread completed the refresh
      if (redisClient.isReady) {
        const cached = await redisClient.get(`recent_refresh:${refreshToken}`);
        if (cached) {
          return res.status(200).json({
            success: true,
            data: JSON.parse(cached),
          });
        }
      }
      throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token');
    }

    // Create the rotated refresh session
    await prisma.refreshSession.create({
      data: {
        token: newRefreshTokenString,
        userId: session.user.id,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    const responsePayload = {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenString,
    };

    // Cache with a 15-second grace period in Redis to absorb concurrent race requests
    if (redisClient.isReady) {
      await redisClient
        .set(`recent_refresh:${refreshToken}`, JSON.stringify(responsePayload), { EX: 15 })
        .catch(() => {});
    }

    res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshSession.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Revoke current access token via Redis denylist
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token && redisClient.isReady) {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        if (ttl > 0) {
          await redisClient.set(`denylist:${token}`, '1', { EX: ttl });
        }
      }
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
