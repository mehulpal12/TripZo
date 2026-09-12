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

  // 1.5 Lazy TTL Cleanup: Filter out stale captains (no location updates in the last 5 minutes)
  const staleThreshold = Date.now() - (5 * 60 * 1000);
  const activeMembers: string[] = [];
  const staleMembers: string[] = [];

  for (const member of nearbyMembers) {
    const timestampStr = await redisClient.hGet('captain_location_meta', member);
    if (!timestampStr) {
      staleMembers.push(member);
      continue;
    }
    const timestamp = parseInt(timestampStr, 10);
    if (timestamp < staleThreshold) {
      staleMembers.push(member);
    } else {
      activeMembers.push(member);
    }
  }

  // Asynchronously clean up stale members from Redis to keep the GEO set fresh
  if (staleMembers.length > 0) {
    Promise.all([
      redisClient.zRem('captain_locations', staleMembers),
      redisClient.hDel('captain_location_meta', staleMembers)
    ]).catch(err => console.error("Failed to clean up stale captain locations in Redis:", err));
  }

  if (activeMembers.length === 0) {
    return [];
  }

  // 2. Filter via Postgres
  // - Captain status must be AVAILABLE
  // - Vehicle type must match (if provided)
  // - Captain must not have rejected this ride
  const eligibleCaptains = await prisma.captain.findMany({
    where: {
      userId: { in: activeMembers },
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
