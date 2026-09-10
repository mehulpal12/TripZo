import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';
import { pool } from './config/db';
import { redisClient } from './config/redis';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    // Check DB
    await pool.query('SELECT 1');
    // Check Redis
    if (!redisClient.isReady) throw new Error('Redis is not ready');
    
    res.status(200).json({ status: 'ready', dependencies: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: (error as Error).message });
  }
});

// Centralized error handler
app.use(errorHandler);

export default app;
