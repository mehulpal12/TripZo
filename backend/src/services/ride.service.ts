import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { RideStatus, Role, CaptainStatus } from '@prisma/client';
import { getNearbyCaptains } from './matching.service';
import { getIO } from '../socket';
import { redisClient } from '../config/redis';

export const createRide = async (data: {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  estimatedDistanceM: number;
  estimatedDurationS: number;
  estimatedFare: number;
}) => {
  const ride = await prisma.ride.create({
    data: {
      ...data,
      status: RideStatus.SEARCHING,
    },
  });

  // Start the matching flow
  await startMatchingForRide(ride.id, data.pickupLat, data.pickupLng, data.destinationLat, data.destinationLng, data.estimatedFare, data.estimatedDistanceM);

  return ride;
};

export const createScheduledRide = async (data: {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  estimatedDistanceM: number;
  estimatedDurationS: number;
  estimatedFare: number;
  scheduledAt: Date;
}) => {
  const ride = await prisma.ride.create({
    data: {
      ...data,
      status: RideStatus.SCHEDULED,
    },
  });

  // Calculate delay: trigger matching 15 minutes before scheduled pickup
  const now = Date.now();
  const scheduledTime = data.scheduledAt.getTime();
  const matchTime = scheduledTime - 15 * 60 * 1000;
  const delay = Math.max(0, matchTime - now); // If it's already within 15 mins, queue it immediately

  const { rideQueue } = await import('../jobs/rideQueue');
  await rideQueue.add('startMatching', { rideId: ride.id }, { delay });

  return ride;
};

export const startMatchingForRide = async (
  rideId: string,
  pickupLat: number | string | any,
  pickupLng: number | string | any,
  destinationLat: number | string | any,
  destinationLng: number | string | any,
  estimatedFare: number | string | any,
  estimatedDistanceM: number | string | any
) => {
  try {
    // In case variables are Prisma Decimals, convert to number
    const pLat = Number(pickupLat);
    const pLng = Number(pickupLng);
    const dLat = Number(destinationLat);
    const dLng = Number(destinationLng);
    const fare = Number(estimatedFare);
    const dist = Number(estimatedDistanceM);

    const io = getIO();
    const vehicleType = 'BIKE'; // Assuming BIKE for MVP
    const radiusKm = 5; // Search radius
    const nearbyCaptains = await getNearbyCaptains(rideId, pLat, pLng, radiusKm, vehicleType);

    if (nearbyCaptains.length > 0) {
      console.log(`Found ${nearbyCaptains.length} eligible captains for ride ${rideId}`);
      nearbyCaptains.forEach((captain) => {
        io.to(`captain:${captain.userId}`).emit('ride:new', {
          rideId: rideId,
          pickup: { lat: pLat, lng: pLng },
          destination: { lat: dLat, lng: dLng },
          estimatedFare: fare,
          estimatedDistanceM: dist,
        });
      });
    } else {
      console.log(`No eligible captains found initially for ride ${rideId}`);
    }

    // Schedule a durable 2-minute fallback via BullMQ (survives server restarts)
    const { rideQueue } = await import('../jobs/rideQueue');
    await rideQueue.add(
      'cancelIfNoAssignment',
      { rideId },
      {
        delay: 2 * 60 * 1000,
        jobId: `cancel-timeout-${rideId}`, // Idempotent: won't add duplicate if already scheduled
      }
    );


  } catch (err) {
    console.error('Error during matching flow:', err);
  }
};

export const getRideById = async (rideId: string, userId: string, role: Role) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { rider: true, captain: true },
  });

  if (!ride) {
    throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');
  }

  if (role === Role.RIDER && ride.riderId !== userId) {
    throw new AppError('UNAUTHORIZED', 403, 'Not authorized to view this ride');
  }

  // A captain can view if they are assigned to it or if it's SEARCHING (in a real app, searching rides might be broadcasted, not fetched by ID, but for safety check:)
  if (role === Role.CAPTAIN && ride.captainId !== userId && ride.status !== RideStatus.SEARCHING) {
    throw new AppError('UNAUTHORIZED', 403, 'Not authorized to view this ride');
  }

  // Attach latest real-time location if captain is assigned
  let captainLocation = null;
  if (ride.captain && redisClient.isReady) {
    const geoPos = await redisClient.geoPos('captain_locations', ride.captain.userId);
    if (geoPos && geoPos[0]) {
      captainLocation = {
        lat: geoPos[0].latitude,
        lng: geoPos[0].longitude,
      };
    }
  }

  return {
    ...ride,
    captainLocation,
  };
};

export const cancelRide = async (rideId: string, userId: string, role: Role, reason?: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');
  }

  // Authorization check
  if (role === Role.RIDER && ride.riderId !== userId) {
    throw new AppError('UNAUTHORIZED', 403, 'Not authorized to cancel this ride');
  }
  if (role === Role.CAPTAIN && ride.captainId !== userId) {
    throw new AppError('UNAUTHORIZED', 403, 'Not authorized to cancel this ride');
  }

  // Allowed states to cancel from
  const allowedCancelStates: RideStatus[] = [
    RideStatus.SCHEDULED,
    RideStatus.SEARCHING,
    RideStatus.CAPTAIN_ASSIGNED,
    RideStatus.CAPTAIN_ARRIVING,
    RideStatus.CAPTAIN_ARRIVED,
  ];

  if (!allowedCancelStates.includes(ride.status)) {
    throw new AppError('INVALID_STATE', 409, `Cannot cancel ride in status ${ride.status}`);
  }

  // Perform atomic update
  const updatedCount = await prisma.ride.updateMany({
    where: {
      id: rideId,
      status: ride.status, // Ensure it hasn't changed
      version: ride.version,
    },
    data: {
      status: RideStatus.CANCELLED,
      cancelledBy: role,
      cancellationReason: reason,
      cancelledAt: new Date(),
      version: ride.version + 1,
    },
  });

  if (updatedCount.count === 0) {
    throw new AppError('CONCURRENCY_ERROR', 409, 'Ride state was modified by another request. Please try again.');
  }

  // Clear Redis assignment cache and reset captain status if assigned
  if (ride.captainId) {
    const assignedCaptain = await prisma.captain.findUnique({ where: { id: ride.captainId }});
    if (assignedCaptain) {
      // Reset captain status from ON_RIDE/AVAILABLE back to AVAILABLE so they can toggle offline
      if (assignedCaptain.status === CaptainStatus.ON_RIDE || assignedCaptain.status === CaptainStatus.AVAILABLE) {
        await prisma.captain.update({
          where: { id: ride.captainId },
          data: { status: CaptainStatus.AVAILABLE },
        });
      }
      if (redisClient.isReady) {
        await redisClient.del(`ride_assignment:${assignedCaptain.userId}`);
      }
    }
  }

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });
  
  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:cancelled', { reason: reason || 'Cancelled by user' });
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};

// Additional transition functions

export const acceptRide = async (rideId: string, captainUserId: string) => {
  const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
  if (!captain) {
    throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain not found');
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');
  }

  if (ride.status !== RideStatus.SEARCHING) {
    throw new AppError('INVALID_STATE', 409, 'Ride is no longer searching for a captain');
  }

  // Ensure the captain is actually available (not on another ride)
  if (captain.status !== CaptainStatus.AVAILABLE) {
    throw new AppError('INVALID_STATE', 409, `Captain is not available (current status: ${captain.status})`);
  }

  // Check if this captain previously rejected this ride
  const rejection = await prisma.rideRejection.findUnique({
    where: {
      rideId_captainId: {
        rideId: ride.id,
        captainId: captain.id,
      }
    }
  });

  if (rejection) {
    throw new AppError('INVALID_STATE', 409, 'You have already rejected this ride');
  }

  const updatedCount = await prisma.ride.updateMany({
    where: {
      id: rideId,
      status: RideStatus.SEARCHING,
      version: ride.version,
    },
    data: {
      status: RideStatus.CAPTAIN_ASSIGNED,
      captainId: captain.id,
      assignedAt: new Date(),
      version: ride.version + 1,
    },
  });

  if (updatedCount.count === 0) {
    throw new AppError('CONCURRENCY_ERROR', 409, 'Ride was accepted by someone else or cancelled.');
  }

  // Update captain status to ON_RIDE
  await prisma.captain.update({
    where: { id: captain.id },
    data: { status: CaptainStatus.ON_RIDE },
  });

  // Cache assignment in Redis for real-time location validation (24h TTL)
  if (redisClient.isReady) {
    await redisClient.set(`ride_assignment:${captainUserId}`, rideId, {
      EX: 86400 // 24 hours
    });
  }

  const updatedRide = await prisma.ride.findUnique({ 
    where: { id: rideId },
    include: {
      captain: {
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            }
          }
        }
      }
    }
  });

  try {
    const io = getIO();
    // Emit to the ride room (for any listeners already joined)
    io.to(`ride:${rideId}`).emit('ride:captain_assigned', updatedRide);
    // Also emit directly to the rider's personal room to avoid the join_ride timing race
    if (updatedRide?.riderId) {
      io.to(`rider:${updatedRide.riderId}`).emit('ride:captain_assigned', updatedRide);
    }
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};

export const rejectRide = async (rideId: string, captainUserId: string) => {
  const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
  if (!captain) {
    throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain not found');
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');
  }

  // Create a rejection record if it doesn't exist
  await prisma.rideRejection.upsert({
    where: {
      rideId_captainId: {
        rideId: ride.id,
        captainId: captain.id,
      }
    },
    create: {
      rideId: ride.id,
      captainId: captain.id,
    },
    update: {}
  });

  // Re-broadcast to other eligible captains (the rejection filter will exclude this captain)
  // Only re-broadcast if the ride is still SEARCHING
  if (ride.status === RideStatus.SEARCHING) {
    startMatchingForRide(
      rideId,
      ride.pickupLat,
      ride.pickupLng,
      ride.destinationLat,
      ride.destinationLng,
      ride.estimatedFare,
      ride.estimatedDistanceM,
    ).catch(err => console.error('Re-broadcast after rejection failed:', err));
  }

  return { success: true };
};

export const markCaptainArrived = async (rideId: string, captainUserId: string) => {
  const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
  if (!captain) throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain not found');

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');

  if (ride.captainId !== captain.id) {
    throw new AppError('UNAUTHORIZED', 403, 'You are not assigned to this ride');
  }

  if (ride.status !== RideStatus.CAPTAIN_ASSIGNED && ride.status !== RideStatus.CAPTAIN_ARRIVING) {
    throw new AppError('INVALID_STATE', 409, `Cannot arrive from status ${ride.status}`);
  }

  const updatedCount = await prisma.ride.updateMany({
    where: {
      id: rideId,
      status: ride.status,
      version: ride.version,
    },
    data: {
      status: RideStatus.CAPTAIN_ARRIVED,
      version: ride.version + 1,
    },
  });

  if (updatedCount.count === 0) {
    throw new AppError('CONCURRENCY_ERROR', 409, 'Ride state was modified.');
  }

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:captain_arrived', updatedRide);
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};

export const startRide = async (rideId: string, captainUserId: string) => {
  const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
  if (!captain) throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain not found');

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');

  if (ride.captainId !== captain.id) {
    throw new AppError('UNAUTHORIZED', 403, 'You are not assigned to this ride');
  }

  if (ride.status !== RideStatus.CAPTAIN_ARRIVED) {
    throw new AppError('INVALID_STATE', 409, `Cannot start from status ${ride.status}. Captain must arrive first.`);
  }

  const updatedCount = await prisma.ride.updateMany({
    where: {
      id: rideId,
      status: ride.status,
      version: ride.version,
    },
    data: {
      status: RideStatus.IN_PROGRESS,
      startedAt: new Date(),
      version: ride.version + 1,
    },
  });

  if (updatedCount.count === 0) {
    throw new AppError('CONCURRENCY_ERROR', 409, 'Ride state was modified.');
  }

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:started', updatedRide);
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};

export const completeRide = async (rideId: string, captainUserId: string) => {
  const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
  if (!captain) throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain not found');

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('RIDE_NOT_FOUND', 404, 'Ride not found');

  if (ride.captainId !== captain.id) {
    throw new AppError('UNAUTHORIZED', 403, 'You are not assigned to this ride');
  }

  if (ride.status !== RideStatus.IN_PROGRESS) {
    throw new AppError('INVALID_STATE', 409, `Cannot complete from status ${ride.status}. Ride must be in progress.`);
  }

  // Calculate final fare... typically equals estimated unless rerouted. For MVP, we'll set finalFare = estimatedFare.
  
  const updatedCount = await prisma.ride.updateMany({
    where: {
      id: rideId,
      status: ride.status,
      version: ride.version,
    },
    data: {
      status: RideStatus.COMPLETED,
      completedAt: new Date(),
      finalFare: ride.estimatedFare,
      version: ride.version + 1,
    },
  });

  if (updatedCount.count === 0) {
    throw new AppError('CONCURRENCY_ERROR', 409, 'Ride state was modified.');
  }

  // Set captain back to AVAILABLE if they are still ON_RIDE
  await prisma.captain.update({
    where: { id: captain.id },
    data: { status: CaptainStatus.AVAILABLE },
  });

  // Clear Redis assignment cache
  if (redisClient.isReady) {
    await redisClient.del(`ride_assignment:${captainUserId}`);
  }

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:completed', updatedRide);
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};
