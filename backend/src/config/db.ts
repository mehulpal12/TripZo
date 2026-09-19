import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { env } from './env';

const dbUrl = env.DATABASE_URL.includes('connection_limit')
  ? env.DATABASE_URL
  : `${env.DATABASE_URL}${env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=20&pool_timeout=10`;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e: any) => {
  logger.warn(e.message);
});

prisma.$on('error', (e: any) => {
  logger.error(e.message);
});

export const connectDB = async (retries = 5, delayMs = 2500): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('Connected to PostgreSQL successfully via Prisma');
      return;
    } catch (err: any) {
      logger.warn(`Connecting to PostgreSQL (attempt ${attempt}/${retries}): ${err?.message || err}`);
      if (attempt === retries) {
        logger.error('Failed to connect to PostgreSQL after retries. Ensure your database server is active.', err);
        process.exit(-1);
      }
      logger.info(`Database may be waking up from sleep. Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};
