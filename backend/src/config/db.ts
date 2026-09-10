import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    logger.info('Connected to PostgreSQL successfully');
    client.release();
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL', err);
    process.exit(-1);
  }
};
