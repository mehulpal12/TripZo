import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { CaptainStatus } from '@prisma/client';

export const getNearbyCaptains = async (
  rideId: string,
  lat: number,
  lng: number,
  radiusKm: number,
  vehicleType: string
) => {
  if (!redisClient.isReady) {
    throw new Error('Redis is not ready');
  }

  // 1. Search GEO set
  const nearbyMembers = await redisClient.geoSearch(
    'captain_locations',
    { latitude: lat, longitude: lng },
    { radius: radiusKm, unit: 'km' },
  );

  if (nearbyMembers.length === 0) {
    return [];
  }

  // 2. Filter via Postgres
  // - Captain status must be AVAILABLE
  // - Vehicle type must match (if provided)
  // - Captain must not have rejected this ride
  const eligibleCaptains = await prisma.captain.findMany({
    where: {
      userId: { in: nearbyMembers },
      status: CaptainStatus.AVAILABLE,
      ...(vehicleType ? { vehicleType } : {}),
      rejections: {
        none: {
          rideId: rideId,
        },
      },
    },
    include: {
      user: true, // to easily get names/push tokens if needed
    },
  });

  return eligibleCaptains;
};
