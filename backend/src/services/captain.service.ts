import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { CaptainStatus, RideStatus } from '@prisma/client';

import { redisClient } from '../config/redis';

export const setCaptainStatus = async (userId: string, status: CaptainStatus) => {
  // Use upsert to auto-create the captain profile if it doesn't exist for this user
  const captain = await prisma.captain.upsert({
    where: { userId },
    update: {}, // Just to get the current profile and check status
    create: {
      userId,
      status: CaptainStatus.OFFLINE,
      vehicleType: 'BIKE',
      vehicleNumber: `AUTO-${Math.floor(1000 + Math.random() * 9000)}`
    }
  });

  // Prevent changing status if ON_RIDE, unless specifically allowed by some admin override
  if (captain.status === CaptainStatus.ON_RIDE && status !== CaptainStatus.ON_RIDE) {
    throw new AppError('INVALID_STATE', 409, 'Cannot change status while on a ride');
  }

  const updatedCaptain = await prisma.captain.update({
    where: { userId },
    data: { status },
  });

  // Explicitly clean up Redis if going offline
  if (status === CaptainStatus.OFFLINE && redisClient.isReady) {
    await Promise.all([
      redisClient.zRem('captain_locations', userId),
      redisClient.hDel('captain_location_meta', userId)
    ]).catch(err => console.error("Failed to clean up captain from Redis on OFFLINE:", err));
  }

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

export const getCaptainRideHistory = async (
  userId: string,
  options: { page?: number; limit?: number; status?: string } = {}
) => {
  const captain = await prisma.captain.findUnique({
    where: { userId },
  });

  if (!captain) {
    throw new AppError('CAPTAIN_NOT_FOUND', 404, 'Captain profile not found');
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    captainId: captain.id,
  };

  if (options.status && options.status !== 'ALL') {
    whereClause.status = options.status as RideStatus;
  }

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    }),
    prisma.ride.count({ where: whereClause }),
  ]);

  // Aggregate stats for Captain
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [allCompletedRides, todayCompletedRides, cancelledCount] = await Promise.all([
    prisma.ride.findMany({
      where: {
        captainId: captain.id,
        status: RideStatus.COMPLETED,
      },
      select: { finalFare: true, estimatedFare: true },
    }),
    prisma.ride.findMany({
      where: {
        captainId: captain.id,
        status: RideStatus.COMPLETED,
        createdAt: { gte: startOfToday },
      },
      select: { finalFare: true, estimatedFare: true },
    }),
    prisma.ride.count({
      where: {
        captainId: captain.id,
        status: RideStatus.CANCELLED,
      },
    }),
  ]);

  const totalEarnings = allCompletedRides.reduce(
    (acc, r) => acc + Number(r.finalFare || r.estimatedFare || 0),
    0
  );
  const todayEarnings = todayCompletedRides.reduce(
    (acc, r) => acc + Number(r.finalFare || r.estimatedFare || 0),
    0
  );

  return {
    rides,
    stats: {
      totalEarnings,
      todayEarnings,
      completedTrips: allCompletedRides.length,
      todayTrips: todayCompletedRides.length,
      cancelledTrips: cancelledCount,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

