import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';
import { prisma } from './config/db';
import { redisClient } from './config/redis';

const app = express();

// Request ID Correlation Middleware
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('x-request-id', reqId);
  next();
});

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.' } },
});

const rideLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many ride requests. Please try again later.' } },
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
app.use('/captains', captainRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;
