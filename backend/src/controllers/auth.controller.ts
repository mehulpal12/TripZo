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

const isProd = process.env.NODE_ENV === 'production';

const parseMs = (val: string, fallback: number): number => {
  const parsed = ms(val as any);
  return typeof parsed === 'number' ? parsed : fallback;
};

const getCookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: maxAgeMs,
  path: '/',
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, name, phone } = req.body;

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
        phone,
        ...(role === 'CAPTAIN' && {
          captainProfile: {
            create: {
              vehicleType: 'BIKE',
              vehicleNumber: `TEST-${Math.floor(1000 + Math.random() * 9000)}`, // Auto-generate for testing
            },
          },
        }),
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

    const expiresInMs = parseMs(env.REFRESH_TOKEN_EXPIRES_IN, 15 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await prisma.refreshSession.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    const accessExpiryMs = parseMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000);

    // Set secure HttpOnly cookies
    res.cookie('token', accessToken, getCookieOptions(accessExpiryMs));
    res.cookie('accessToken', accessToken, getCookieOptions(accessExpiryMs));
    res.cookie('refreshToken', refreshTokenString, getCookieOptions(expiresInMs));

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
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new AppError('INVALID_TOKEN', 400, 'Refresh token is required');
    }

    const accessExpiryMs = parseMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000);
    const expiresInMs = parseMs(env.REFRESH_TOKEN_EXPIRES_IN, 15 * 24 * 60 * 60 * 1000);

    // 1. Concurrency absorbing: If this refresh token was already refreshed in the last 15 seconds,
    // return the cached token pair instead of throwing an error or logging out.
    if (redisClient.isReady) {
      const cached = await redisClient.get(`recent_refresh:${refreshToken}`);
      if (cached) {
        const payload = JSON.parse(cached);
        res.cookie('token', payload.accessToken, getCookieOptions(accessExpiryMs));
        res.cookie('accessToken', payload.accessToken, getCookieOptions(accessExpiryMs));
        res.cookie('refreshToken', payload.refreshToken, getCookieOptions(expiresInMs));
        return res.status(200).json({
          success: true,
          data: payload,
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

    // Atomically delete the old session. Using deleteMany prevents P2025 exceptions.
    const deleted = await prisma.refreshSession.deleteMany({
      where: { id: session.id },
    });

    if (deleted.count === 0) {
      // Check if another concurrent thread completed the refresh
      if (redisClient.isReady) {
        const cached = await redisClient.get(`recent_refresh:${refreshToken}`);
        if (cached) {
          const payload = JSON.parse(cached);
          res.cookie('token', payload.accessToken, getCookieOptions(accessExpiryMs));
          res.cookie('accessToken', payload.accessToken, getCookieOptions(accessExpiryMs));
          res.cookie('refreshToken', payload.refreshToken, getCookieOptions(expiresInMs));
          return res.status(200).json({
            success: true,
            data: payload,
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

    // Set rotated secure cookies
    res.cookie('token', newAccessToken, getCookieOptions(accessExpiryMs));
    res.cookie('accessToken', newAccessToken, getCookieOptions(accessExpiryMs));
    res.cookie('refreshToken', newRefreshTokenString, getCookieOptions(expiresInMs));

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
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await prisma.refreshSession.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Revoke current access token via Redis denylist
    let token = req.cookies?.token || req.cookies?.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token && redisClient.isReady) {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        if (ttl > 0) {
          await redisClient.set(`denylist:${token}`, '1', { EX: ttl });
        }
      }
    }

    const clearOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
    };
    res.clearCookie('token', clearOpts);
    res.clearCookie('accessToken', clearOpts);
    res.clearCookie('refreshToken', clearOpts);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        captainProfile: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
