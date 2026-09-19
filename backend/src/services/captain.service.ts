import { prisma } from '../config/db';
import { AppError } from '../errors/AppError';
import { CaptainStatus, RideStatus } from '@prisma/client';

import { redisClient } from '../config/redis';

export const getOrCreateCaptain = async (userId: string) => {
  return await prisma.captain.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      status: CaptainStatus.OFFLINE,
      vehicleType: 'BIKE',
      vehicleNumber: `AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
    },
  });
};

export const setCaptainStatus = async (
  userId: string,
  status: CaptainStatus,
  lat?: number,
  lng?: number
) => {
  // Use upsert to auto-create the captain profile if it doesn't exist for this user
  const captain = await getOrCreateCaptain(userId);

  // Prevent changing status if ON_RIDE, unless specifically allowed by some admin override
  if (captain.status === CaptainStatus.ON_RIDE && status !== CaptainStatus.ON_RIDE) {
    throw new AppError('INVALID_STATE', 409, 'Cannot change status while on a ride');
  }

  const updatedCaptain = await prisma.captain.update({
    where: { userId },
    data: { status },
  });

  // Immediately register captain coordinates in Redis if provided when going online
  if (
    status === CaptainStatus.AVAILABLE &&
    redisClient.isReady &&
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    await Promise.all([
      redisClient.geoAdd('captain_locations', {
        member: userId,
        latitude: lat,
        longitude: lng,
      }),
      redisClient.hSet(
        'captain_location_meta',
        userId,
        JSON.stringify({
          vehicleType: updatedCaptain.vehicleType,
          updatedAt: Date.now(),
        })
      ),
    ]).catch((err) => console.error('Failed to register captain in Redis on ONLINE:', err));
  }

  // Explicitly clean up Redis if going offline
  if (status === CaptainStatus.OFFLINE && redisClient.isReady) {
    await Promise.all([
      redisClient.zRem('captain_locations', userId),
      redisClient.hDel('captain_location_meta', userId),
    ]).catch((err) => console.error('Failed to clean up captain from Redis on OFFLINE:', err));
  }

  return updatedCaptain;
};

export const getCaptainAssignedRides = async (userId: string) => {
  const captain = await getOrCreateCaptain(userId);

  const rides = await prisma.ride.findMany({
    where: {
      captainId: captain.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  return rides;
};

export const getCaptainScheduledRides = async (userId: string) => {
  const captain = await getOrCreateCaptain(userId);

  const now = new Date();
  // Include scheduled rides from 15 minutes ago onwards (matching window) to any future scheduled time
  const minScheduledTime = new Date(now.getTime() - 15 * 60 * 1000);

  const rides = await prisma.ride.findMany({
    where: {
      OR: [
        {
          captainId: captain.id,
          status: { in: [RideStatus.SCHEDULED, RideStatus.SEARCHING] },
        },
        {
          captainId: null,
          status: { in: [RideStatus.SCHEDULED, RideStatus.SEARCHING] },
          scheduledAt: { gte: minScheduledTime },
        },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
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
  });

  const totalScheduled = rides.length;
  const assignedToMeCount = rides.filter((r) => r.captainId === captain.id).length;
  const totalPotentialFare = rides.reduce(
    (acc, r) => acc + Number(r.estimatedFare || r.finalFare || 0),
    0
  );

  const nextUpcoming = rides.length > 0 ? rides[0].scheduledAt : null;

  return {
    rides,
    stats: {
      totalScheduled,
      assignedToMeCount,
      totalPotentialFare,
      nextUpcoming,
    },
  };
};

export const getCaptainActiveRequest = async (userId: string) => {
  const captain = await getOrCreateCaptain(userId);

  // If captain is not online/available, they cannot take dispatch requests
  if (captain.status !== CaptainStatus.AVAILABLE) {
    return null;
  }

  // Find active SEARCHING ride (either immediate or scheduled within dispatch window)
  const now = new Date();
  const maxScheduledLookahead = new Date(now.getTime() + 25 * 60 * 1000); // Up to 25 mins ahead
  const minScheduledLookbehind = new Date(now.getTime() - 15 * 60 * 1000);

  const ride = await prisma.ride.findFirst({
    where: {
      status: RideStatus.SEARCHING,
      captainId: null,
      OR: [
        { scheduledAt: null }, // Immediate ride
        { scheduledAt: { gte: minScheduledLookbehind, lte: maxScheduledLookahead } }, // Scheduled ride in dispatch window
      ],
      rejections: {
        none: {
          captainId: captain.id,
        },
      },
    },
    orderBy: [
      { scheduledAt: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      rider: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!ride) {
    return null;
  }

  return {
    id: ride.id,
    status: ride.status,
    pickup: {
      lat: Number(ride.pickupLat),
      lng: Number(ride.pickupLng),
      address: ride.pickupAddress || 'Pickup Location',
      name: ride.pickupName || ride.pickupAddress || 'Pickup Point',
    },
    destination: {
      lat: Number(ride.destinationLat),
      lng: Number(ride.destinationLng),
      address: ride.destinationAddress || 'Destination Location',
      name: ride.destinationName || ride.destinationAddress || 'Drop Point',
    },
    fare: Number(ride.estimatedFare || ride.finalFare || 0),
    estimatedDistanceM: ride.estimatedDistanceM,
    estimatedDurationS: ride.estimatedDurationS,
    scheduledAt: ride.scheduledAt,
    isScheduled: Boolean(ride.scheduledAt),
    rider: ride.rider,
  };
};

export const getCaptainRideHistory = async (
  userId: string,
  options: { page?: number; limit?: number; status?: string } = {}
) => {
  const captain = await getOrCreateCaptain(userId);

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

