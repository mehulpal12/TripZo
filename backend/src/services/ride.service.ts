import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { RideStatus, Role } from '@prisma/client';

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

  return prisma.ride.findUnique({ where: { id: rideId } });
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

  return prisma.ride.findUnique({ where: { id: rideId } });
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

  return prisma.ride.findUnique({ where: { id: rideId } });
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

  return prisma.ride.findUnique({ where: { id: rideId } });
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

  return prisma.ride.findUnique({ where: { id: rideId } });
};
