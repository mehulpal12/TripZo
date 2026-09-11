import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { RideStatus, Role, CaptainStatus } from '@prisma/client';
import { getNearbyCaptains } from './matching.service';
import { getIO } from '../socket';

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
  try {
    const io = getIO();
    const vehicleType = 'BIKE'; // Assuming BIKE for MVP
    const radiusKm = 5; // Search radius
    const nearbyCaptains = await getNearbyCaptains(ride.id, data.pickupLat, data.pickupLng, radiusKm, vehicleType);

    if (nearbyCaptains.length > 0) {
      console.log(`Found ${nearbyCaptains.length} eligible captains for ride ${ride.id}`);
      nearbyCaptains.forEach((captain) => {
        io.to(`captain:${captain.userId}`).emit('ride:new', {
          rideId: ride.id,
          pickup: { lat: data.pickupLat, lng: data.pickupLng },
          destination: { lat: data.destinationLat, lng: data.destinationLng },
          estimatedFare: data.estimatedFare,
          estimatedDistanceM: data.estimatedDistanceM,
        });
      });
    } else {
      console.log(`No eligible captains found initially for ride ${ride.id}`);
    }

    // Set 2-minute fallback timeout
    setTimeout(async () => {
      const currentRide = await prisma.ride.findUnique({ where: { id: ride.id } });
      if (currentRide && currentRide.status === RideStatus.SEARCHING) {
        console.log(`Matching timeout reached for ride ${ride.id}. Cancelling ride.`);
        await prisma.ride.update({
          where: { id: ride.id },
          data: {
            status: RideStatus.CANCELLED,
            cancellationReason: 'NO_CAPTAINS_AVAILABLE',
            cancelledBy: 'SYSTEM',
            cancelledAt: new Date(),
          },
        });
        io.to(`ride:${ride.id}`).emit('ride:cancelled', { reason: 'NO_CAPTAINS_AVAILABLE' });
      }
    }, 2 * 60 * 1000);

  } catch (err) {
    console.error('Error during matching flow:', err);
  }

  return ride;
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

  return ride;
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

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:captain_assigned', updatedRide);
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

  const updatedRide = await prisma.ride.findUnique({ where: { id: rideId } });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:completed', updatedRide);
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }

  return updatedRide;
};
