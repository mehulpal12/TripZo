import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { TokenPayload } from './utils/crypto';
import { redisClient } from './config/redis';

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    let token = socket.handshake.auth.token;
    if (!token && socket.handshake.headers.authorization) {
      token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '').trim();
    }

    if (!token) {
      return next(new Error('Authentication error'));
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

    // Join ride room if requested
    socket.on('join_ride', (rideId: string) => {
      socket.join(`ride:${rideId}`);
      console.log(`User ${user.userId} joined ride room: ride:${rideId}`);
    });

    // Receive captain location and update Redis GEO
    socket.on('captain:location', async (data: { lat: number; lng: number }) => {
      if (user.role !== 'CAPTAIN') return;

      try {
        if (!redisClient.isReady) {
            console.error('Redis client not ready to receive location');
            return;
        }

        const { lat, lng } = data;
        
        // GEOADD key longitude latitude member
        await redisClient.geoAdd('captain_locations', {
          longitude: lng,
          latitude: lat,
          member: user.userId,
        }).then(() => {
            console.log(`Captain location updated: ${lat}, ${lng}`);
        }).catch((err) => {
            console.error('Error updating captain location:', err);
        });

        // Set an expiry mechanism so offline captains don't stay forever.
        // Redis GEO doesn't support TTL per member, but we can set a separate expiring key or just clean up on disconnect.
        // For MVP, we'll just track that we got an update.
      } catch (err) {
        console.error('Error updating captain location:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${user.userId})`);
      // If captain disconnects, we should ideally remove them from GEO or mark them offline.
      if (user.role === 'CAPTAIN') {
         if (redisClient.isReady) {
            redisClient.zRem('captain_locations', user.userId).catch(console.error);
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
