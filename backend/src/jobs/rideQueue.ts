import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { RideStatus } from '@prisma/client';
import { startMatchingForRide } from '../services/ride.service';
import { logger } from '../utils/logger';

// Create a dedicated Redis connection for BullMQ
// Upstash Redis requires TLS when used with ioredis, typically family 0 handles it
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});

connection.on('error', (err) => logger.error('BullMQ Redis error', err));
connection.on('connect', () => logger.info('BullMQ Redis connected'));

// Create Queue
export const rideQueue = new Queue('scheduled-rides-queue', { connection });

// Create Worker
export const rideWorker = new Worker(
  'scheduled-rides-queue',
  async (job: Job) => {
    if (job.name === 'startMatching') {
      const { rideId } = job.data;
      logger.info(`BullMQ executing startMatching for scheduled ride ${rideId}`);

      // Idempotent state transition
      const updatedCount = await prisma.ride.updateMany({
        where: {
          id: rideId,
          status: RideStatus.SCHEDULED,
        },
        data: {
          status: RideStatus.SEARCHING,
          version: { increment: 1 },
        },
      });

      if (updatedCount.count === 0) {
        logger.info(`Ride ${rideId} was already processed or cancelled. Ignoring job.`);
        return;
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          rider: {
            select: { id: true, name: true, phone: true },
          },
        },
      });
      if (ride) {
        try {
          const { getIO } = await import('../socket');
          const io = getIO();
          io.to(`rider:${ride.riderId}`).emit('ride:matching_started', ride);
          io.to(`rider:${ride.riderId}`).emit('ride:status_update', {
            rideId: ride.id,
            status: RideStatus.SEARCHING,
            ride,
          });
        } catch (err) {
          logger.error('BullMQ: failed to emit matching_started to rider', { error: err });
        }

        await startMatchingForRide(
          ride.id,
          ride.pickupLat,
          ride.pickupLng,
          ride.destinationLat,
          ride.destinationLng,
          ride.estimatedFare,
          ride.estimatedDistanceM
        );
      }
    } else if (job.name === 'cancelIfNoAssignment') {
      const { rideId } = job.data;
      logger.info(`BullMQ: checking if ride ${rideId} still needs cancellation...`);

      const updatedCount = await prisma.ride.updateMany({
        where: {
          id: rideId,
          status: RideStatus.SEARCHING,
        },
        data: {
          status: RideStatus.CANCELLED,
          cancellationReason: 'NO_CAPTAINS_AVAILABLE',
          cancelledBy: 'SYSTEM',
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (updatedCount.count > 0) {
        logger.info(`Ride ${rideId} cancelled due to no captain assignment.`);
        try {
          const { getIO } = await import('../socket');
          const io = getIO();
          // Emit to ride room and rider's personal room
          const ride = await prisma.ride.findUnique({ where: { id: rideId } });
          io.to(`ride:${rideId}`).emit('ride:cancelled', { reason: 'NO_CAPTAINS_AVAILABLE' });
          if (ride?.riderId) {
            io.to(`rider:${ride.riderId}`).emit('ride:cancelled', { reason: 'NO_CAPTAINS_AVAILABLE' });
          }
        } catch (socketErr) {
          logger.error('Socket emit error after cancellation', { error: socketErr });
        }
      } else {
        logger.info(`Ride ${rideId} already assigned or cancelled — no action needed.`);
      }
    } else if (job.name === 'reconciliation') {
      logger.info('Running scheduled rides reconciliation sweep...');
      // Find rides that are SCHEDULED and their match time has arrived (within next 15 mins)
      const now = new Date();
      const upcomingThreshold = new Date(now.getTime() + 15 * 60 * 1000);
      
      const missedRides = await prisma.ride.findMany({
        where: {
          status: RideStatus.SCHEDULED,
          scheduledAt: { lte: upcomingThreshold },
        },
      });

      for (const missed of missedRides) {
        const existingJob = await rideQueue.getJob(`startMatching-${missed.id}`);
        const existingRecovery = await rideQueue.getJob(`recover-${missed.id}`);
        if (!existingJob && !existingRecovery) {
          logger.warn(`Reconciliation found missed scheduled ride ${missed.id}, enqueuing...`);
          await rideQueue.add(
            'startMatching',
            { rideId: missed.id },
            { jobId: `recover-${missed.id}` }
          );
        }
      }
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 20, duration: 10_000 },
  }
);

rideWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} has completed!`);
});

rideWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} has failed`, { message: err?.message });
});

// Initialize distributed-safe reconciliation job to run every 1 minute
export const initReconciliationJob = async () => {
  // Trigger an initial sweep on server startup
  await rideQueue.add('reconciliation', {}, { jobId: `init-sweep-${Date.now()}` }).catch(() => {});

  // Upsert a distributed-safe job scheduler (BullMQ v6 API)
  await rideQueue.upsertJobScheduler(
    'reconciliation-singleton',
    { every: 60 * 1000 },
    {
      name: 'reconciliation',
      data: {},
    }
  );
};
