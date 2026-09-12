import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { RideStatus } from '@prisma/client';
import { startMatchingForRide } from '../services/ride.service';

// Create a dedicated Redis connection for BullMQ
// Upstash Redis requires TLS when used with ioredis, typically family 0 handles it
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});

// Create Queue
export const rideQueue = new Queue('scheduled-rides-queue', { connection });

// Create Worker
export const rideWorker = new Worker(
  'scheduled-rides-queue',
  async (job: Job) => {
    if (job.name === 'startMatching') {
      const { rideId } = job.data;
      console.log(`BullMQ executing startMatching for scheduled ride ${rideId}`);

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
        console.log(`Ride ${rideId} was already processed or cancelled. Ignoring job.`);
        return;
      }

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (ride) {
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
      console.log(`BullMQ: checking if ride ${rideId} still needs cancellation...`);

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
        console.log(`Ride ${rideId} cancelled due to no captain assignment.`);
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
          console.error('Socket emit error after cancellation:', socketErr);
        }
      } else {
        console.log(`Ride ${rideId} already assigned or cancelled — no action needed.`);
      }
    } else if (job.name === 'reconciliation') {
      console.log('Running scheduled rides reconciliation sweep...');
      // Find rides that are SCHEDULED and their match time has passed
      const now = new Date();
      const pastTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins in future
      
      const missedRides = await prisma.ride.findMany({
        where: {
          status: RideStatus.SCHEDULED,
          scheduledAt: { lte: pastTime }
        }
      });

      for (const missed of missedRides) {
        console.warn(`Reconciliation found missed scheduled ride ${missed.id}, enqueuing...`);
        await rideQueue.add('startMatching', { rideId: missed.id }, { jobId: `recover-${missed.id}` });
      }
    }
  },
  { connection }
);

rideWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

rideWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

// Initialize reconciliation job to run every 5 minutes
export const initReconciliationJob = async () => {
  // Run immediately on boot
  await rideQueue.add('reconciliation', {}, { jobId: `reconciliation-${Date.now()}` });
  
  // Then run every 5 minutes
  setInterval(async () => {
    await rideQueue.add('reconciliation', {}, { jobId: `reconciliation-${Date.now()}` });
  }, 5 * 60 * 1000);
};
