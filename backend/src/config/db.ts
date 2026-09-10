import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
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
