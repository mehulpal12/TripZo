import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';
import { prisma } from './config/db';
import { redisClient } from './config/redis';
import { isOriginAllowed } from './config/cors';

const app = express();

// Request ID Correlation Middleware
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('x-request-id', reqId);
  next();
});

// Security & Parsing Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cookieParser());

// Shared strict CORS policy
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parser limits to prevent DOS payloads
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters (relaxed in development for multi-device testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.' } },
});

const rideLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many ride requests. Please try again later.' } },
});

const captainLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many captain requests. Please try again later.' } },
});

// Health endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  const checks = { postgres: false, redis: false, bullmq: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = true;
  } catch (err) {}

  try {
    if (redisClient.isReady) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch (err) {}

  try {
    const { rideWorker } = await import('./jobs/rideQueue');
    checks.bullmq = !rideWorker.closing;
  } catch (err) {}

  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
  });
});

import authRoutes from './routes/auth.routes';
import rideRoutes from './routes/ride.routes';
import captainRoutes from './routes/captain.routes';

app.use('/auth/login', authLimiter);
app.use('/auth', authRoutes);
app.use('/rides', rideLimiter, rideRoutes);
app.use('/captains', captainLimiter, captainRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;

