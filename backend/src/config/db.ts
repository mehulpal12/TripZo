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

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL successfully via Prisma');
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL', err);
    process.exit(-1);
  }
};
