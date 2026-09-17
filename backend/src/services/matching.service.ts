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
  const timestamps = await redisClient.hmGet('captain_location_meta', nearbyMembers);
  const staleThreshold = Date.now() - (5 * 60 * 1000);
  const activeMembers: string[] = [];
  const staleMembers: string[] = [];

  nearbyMembers.forEach((member, i) => {
    const ts = timestamps[i];
    if (!ts || parseInt(ts, 10) < staleThreshold) {
      staleMembers.push(member);
    } else {
      activeMembers.push(member);
    }
  });

  // Asynchronously clean up stale members from Redis to keep the GEO set fresh
  if (staleMembers.length > 0) {
    redisClient.multi()
      .zRem('captain_locations', staleMembers)
      .hDel('captain_location_meta', staleMembers)
      .exec()
      .catch(err => console.error("Failed to clean up stale captain locations in Redis:", err));
  }

  // 2. Filter via Postgres
  // - Captain status must be AVAILABLE
  // - Vehicle type must match (if provided)
  // - Captain must not have rejected this ride
  const captainWhereClause: any = {
    status: CaptainStatus.AVAILABLE,
    ...(vehicleType ? { vehicleType } : {}),
    rejections: {
      none: {
        rideId: rideId,
      },
    },
  };

  if (activeMembers.length > 0) {
    captainWhereClause.userId = { in: activeMembers };
  } else if (process.env.NODE_ENV === 'production') {
    // In strict production, require active GEO coordinates
    return [];
  }

  const eligibleCaptains = await prisma.captain.findMany({
    where: captainWhereClause,
    include: {
      user: true, // to easily get names/push tokens if needed
    },
  });

  return eligibleCaptains;
};
