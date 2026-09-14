import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { TokenPayload } from './utils/crypto';
import { redisClient } from './config/redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { prisma } from './config/db';

let io: SocketIOServer;

export const initializeSocket = async (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST'],
    },
  });

  // Configure Redis Adapter for horizontal scaling
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.error('Failed to initialize Redis Adapter:', err);
    throw err;
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    let token = socket.handshake.auth.token;
    if (!token && socket.handshake.headers.authorization) {
      token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '').trim();
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
        console.error('Error checking token denylist:', err);
      }
    }

    jwt.verify(token, env.JWT_ACCESS_SECRET, (err: any, decoded: any) => {
      if (err) {
        console.error('Socket JWT Error:', err.message);
        return next(new Error('Authentication error'));
      }
      socket.data.user = decoded as TokenPayload;
      next();
    });
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as TokenPayload;

    console.log(`Socket connected: ${socket.id} (User: ${user.userId}, Role: ${user.role})`);

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
        console.log(`User ${user.userId} joined ride room: ride:${rideId}`);
      } catch (err) {
        console.error(`Error in join_ride for user ${user.userId}:`, err);
        socket.emit('error', { code: 'INTERNAL_ERROR' });
      }
    });

    // Receive captain location and update Redis GEO
    socket.on('captain:location', async (data: { rideId?: string; lat: number; lng: number; timestamp?: number }) => {
      if (user.role !== 'CAPTAIN') return;

      try {
        if (!redisClient.isReady) {
            console.error('Redis client not ready to receive location');
            return;
        }

        const { rideId, lat, lng, timestamp = Date.now() } = data;

        // If they provide a rideId, validate assignment
        if (rideId) {
            const assignedRide = await redisClient.get(`ride_assignment:${user.userId}`);
            if (assignedRide !== rideId) {
                return; // Unauthorized or stale broadcast
            }
        }

        // Stale location protection
        const storedTimestamp = await redisClient.hGet('captain_location_meta', user.userId);
        if (storedTimestamp && timestamp <= parseInt(storedTimestamp, 10)) {
            return; // Reject older event
        }
        
        // Atomic write to Redis GEO and metadata hash via MULTI transaction
        await redisClient.multi()
            .geoAdd('captain_locations', {
                longitude: lng,
                latitude: lat,
                member: user.userId,
            })
            .hSet('captain_location_meta', user.userId, timestamp.toString())
            .exec();

        // Broadcast to ride room if active
        if (rideId) {
            io.to(`ride:${rideId}`).emit('captain:location', {
                lat,
                lng,
                timestamp
            });
        }
      } catch (err) {
        console.error('Error updating captain location:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${user.userId})`);
      // If captain disconnects, remove from GEO and reset DB status to OFFLINE
      if (user.role === 'CAPTAIN') {
        // Atomic clean up of Redis GEO and metadata hash
        if (redisClient.isReady) {
          redisClient.multi()
            .zRem('captain_locations', user.userId)
            .hDel('captain_location_meta', user.userId)
            .exec()
            .catch(console.error);
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
          console.error('Failed to reset captain status on disconnect:', err);
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
