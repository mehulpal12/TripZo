import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { CaptainStatus } from '@prisma/client';
import { logger } from '../utils/logger';

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

  // Filter out any captains whose locations are older than 2 minutes
  const now = Date.now();
  const maxAgeMs = 2 * 60 * 1000;
  const activeMembers: string[] = [];
  const staleMembers: string[] = [];

  const metaList = await redisClient.hmGet('captain_location_meta', nearbyMembers);

  nearbyMembers.forEach((member, index) => {
    const meta = metaList[index];
    let updatedAt = 0;
    if (meta) {
      if (meta.startsWith('{')) {
        try {
          updatedAt = Number(JSON.parse(meta).updatedAt) || 0;
        } catch {
          updatedAt = 0;
        }
      } else {
        updatedAt = parseInt(meta, 10) || 0;
      }
    }
    
    if (!updatedAt || now - updatedAt > maxAgeMs) {
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
      .catch((err) => logger.error('Failed to clean up stale captain locations in Redis', { error: err }));
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
