import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { hashPassword, comparePassword, generateAccessToken } from '../utils/crypto';
import { AppError } from '../errors/AppError';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import ms from 'ms';
import { env } from '../config/env';

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

    const session = await prisma.refreshSession.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.refreshSession.delete({ where: { id: session.id } });
      }
      throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token');
    }

    const newAccessToken = generateAccessToken({ userId: session.user.id, role: session.user.role });
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresInMs = ms(env.REFRESH_TOKEN_EXPIRES_IN as any);

    await prisma.$transaction([
      prisma.refreshSession.delete({ where: { id: session.id } }),
      prisma.refreshSession.create({
        data: {
          token: newRefreshTokenString,
          userId: session.user.id,
          expiresAt: new Date(Date.now() + expiresInMs),
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenString,
      },
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

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
