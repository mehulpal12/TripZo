import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { TokenPayload } from './utils/crypto';
import { redisClient } from './config/redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { prisma } from './config/db';
import { isOriginAllowed } from './config/cors';
import { logger } from './utils/logger';

let io: SocketIOServer;

export const initializeSocket = async (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Configure Redis Adapter for horizontal scaling
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    logger.error('Failed to initialize Redis Adapter', { error: err });
    throw err;
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '').trim();
    }
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = Object.fromEntries(
        socket.handshake.headers.cookie.split(';').map((c) => {
          const parts = c.trim().split('=');
          return [parts[0], decodeURIComponent(parts.slice(1).join('='))];
        })
      );
      token = cookies.token || cookies.accessToken;
    }

    if (!token) {
      return next(new Error('Authentication error'));
    }

    if (redisClient.isReady) {
      try {
        const isDenied = await redisClient.get(`denylist:${token}`);
        if (isDenied) {
          return next(new Error('Token has been revoked'));
        }
      } catch (err) {
        logger.error('Error checking token denylist', { error: err });
      }
    }

    jwt.verify(token, env.JWT_ACCESS_SECRET, (err: any, decoded: any) => {
      if (err) {
        logger.error('Socket JWT Error', { message: err.message });
        return next(new Error('Authentication error'));
      }
      socket.data.user = decoded as TokenPayload;
      next();
    });
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as TokenPayload;

    logger.info(`Socket connected: ${socket.id} (User: ${user.userId}, Role: ${user.role})`);

    // Join personal room
    if (user.role === 'CAPTAIN') {
      socket.join(`captain:${user.userId}`);
    } else if (user.role === 'RIDER') {
      socket.join(`rider:${user.userId}`);
    }

    // Join ride room if requested (authorized)
    socket.on('join_ride', async (rideId: string) => {
      try {
        const ride = await prisma.ride.findUnique({ where: { id: rideId } });
        if (!ride) return socket.emit('error', { code: 'RIDE_NOT_FOUND' });

        const captainProfile = user.role === 'CAPTAIN'
          ? await prisma.captain.findUnique({ where: { userId: user.userId } })
          : null;

        const isParticipant =
          (user.role === 'RIDER' && ride.riderId === user.userId) ||
          (user.role === 'CAPTAIN' && captainProfile?.id === ride.captainId);

        if (!isParticipant) return socket.emit('error', { code: 'UNAUTHORIZED' });

        socket.join(`ride:${rideId}`);
        logger.info(`User ${user.userId} joined ride room: ride:${rideId}`);
      } catch (err) {
        logger.error(`Error in join_ride for user ${user.userId}`, { error: err });
        socket.emit('error', { code: 'INTERNAL_ERROR' });
      }
    });

    // Receive captain location and update Redis GEO
    socket.on('captain:location', async (data: { rideId?: string; lat: number; lng: number; timestamp?: number }) => {
      if (user.role !== 'CAPTAIN') return;

      try {
        if (!redisClient.isReady) {
          logger.error('Redis client not ready to receive location');
          return;
        }

        const { rideId, lat, lng, timestamp = Date.now() } = data;

        // 1. Strict Coordinate Validation
        if (
          typeof lat !== 'number' ||
          typeof lng !== 'number' ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          logger.warn(`[Socket] Invalid coordinates received from captain ${user.userId}: lat=${lat}, lng=${lng}`);
          return;
        }

        // 2. Resolve and Validate Active Ride Assignment
        let targetRideId = rideId;
        if (!targetRideId) {
          const cachedAssignment = await redisClient.get(`ride_assignment:${user.userId}`);
          if (cachedAssignment) {
            targetRideId = cachedAssignment;
          }
        } else {
          const assignedRide = await redisClient.get(`ride_assignment:${user.userId}`);
          if (assignedRide !== targetRideId) {
            // Fallback: check database if Redis assignment key was evicted
            const captainProfile = await prisma.captain.findUnique({ where: { userId: user.userId } });
            if (captainProfile) {
              const activeDbRide = await prisma.ride.findFirst({
                where: {
                  id: targetRideId,
                  captainId: captainProfile.id,
                  status: {
                    in: ['CAPTAIN_ASSIGNED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'IN_PROGRESS'],
                  },
                },
              });

              if (activeDbRide) {
                await redisClient.set(`ride_assignment:${user.userId}`, targetRideId, { EX: 86400 });
              } else {
                return; // Unauthorized or stale broadcast
              }
            } else {
              return;
            }
          }
        }

        // 3. Stale Location Protection
        const storedMeta = await redisClient.hGet('captain_location_meta', user.userId);
        let storedTimestamp = 0;
        if (storedMeta) {
          if (storedMeta.startsWith('{')) {
            try {
              storedTimestamp = Number(JSON.parse(storedMeta).updatedAt) || 0;
            } catch {
              storedTimestamp = 0;
            }
          } else {
            storedTimestamp = parseInt(storedMeta, 10) || 0;
          }
        }
        if (storedTimestamp > 0 && timestamp <= storedTimestamp) {
          return; // Reject older event
        }

        // 4. Atomic Write to Redis GEO and Metadata
        await redisClient.multi()
          .geoAdd('captain_locations', {
            longitude: lng,
            latitude: lat,
            member: user.userId,
          })
          .hSet('captain_location_meta', user.userId, timestamp.toString())
          .exec();

        // 5. Broadcast to Authorized Ride Room
        if (targetRideId) {
          io.to(`ride:${targetRideId}`).emit('captain:location', {
            lat,
            lng,
            timestamp,
          });
        }
      } catch (err) {
        logger.error('Error updating captain location', { error: err });
      }
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${user.userId})`);
      // If captain disconnects, remove from GEO and reset DB status to OFFLINE
      if (user.role === 'CAPTAIN') {
        // Atomic clean up of Redis GEO and metadata hash
        if (redisClient.isReady) {
          redisClient.multi()
            .zRem('captain_locations', user.userId)
            .hDel('captain_location_meta', user.userId)
            .exec()
            .catch((err) => logger.error('Error in Redis GEO cleanup on disconnect', { error: err }));
        }
        // Reset DB status to OFFLINE so captain doesn't appear available when gone
        try {
          const { prisma } = await import('./config/db');
          const { CaptainStatus } = await import('@prisma/client');
          await prisma.captain.updateMany({
            where: {
              userId: user.userId,
              status: { in: [CaptainStatus.AVAILABLE] }, // Only reset if not ON_RIDE
            },
            data: { status: CaptainStatus.OFFLINE },
          });
        } catch (err) {
          logger.error('Failed to reset captain status on disconnect', { error: err });
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
