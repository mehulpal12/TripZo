import app from './app';
import { env } from './config/env';
import { connectDB, prisma } from './config/db';
import { connectRedis, redisClient } from './config/redis';
import { logger } from './utils/logger';
import { createHttpTerminator } from 'http-terminator';
import http from 'http';
import { initializeSocket } from './socket';

const startServer = async () => {
  await connectDB();
  await connectRedis();

  // Create HTTP Server
  const server = http.createServer(app);

  // Initialize Socket.io
  initializeSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const httpTerminator = createHttpTerminator({ server });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      await httpTerminator.terminate();
      logger.info('HTTP server closed');
      
      await prisma.$disconnect();
      logger.info('PostgreSQL connection closed');
      
      await redisClient.quit();
      logger.info('Redis connection closed');
      
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
