import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { CaptainStatus } from '@prisma/client';

export const setCaptainStatus = async (userId: string, status: CaptainStatus) => {
  const captain = await prisma.captain.findUnique({
    where: { userId },
  });

  if (!captain) {
    throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain profile not found');
  }

  // Prevent changing status if ON_RIDE, unless specifically allowed by some admin override
  if (captain.status === CaptainStatus.ON_RIDE && status !== CaptainStatus.ON_RIDE) {
    throw new AppError('INVALID_STATE', 409, 'Cannot change status while on a ride');
  }

  const updatedCaptain = await prisma.captain.update({
    where: { userId },
    data: { status },
  });

  return updatedCaptain;
};

export const getCaptainAssignedRides = async (userId: string) => {
  const captain = await prisma.captain.findUnique({
    where: { userId },
  });

  if (!captain) {
    throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain profile not found');
  }

  const rides = await prisma.ride.findMany({
    where: {
      captainId: captain.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  return rides;
};
