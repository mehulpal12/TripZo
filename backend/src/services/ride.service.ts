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

// Additional transition functions like acceptRide, startRide, completeRide will go here in future phases (Captain system).
