import { Request, Response, NextFunction } from 'express';
import { estimateFare } from '../services/fare.service';
import { createRide, getRideById, cancelRide, acceptRide, rejectRide, markCaptainArrived, startRide, completeRide, getActiveRideForRider } from '../services/ride.service';
import { prisma } from '../config/db';
import { RideStatus } from '@prisma/client';
import { createScheduledRide } from '../services/ride.service';

export const getFare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pickupLat, pickupLng, destinationLat, destinationLng, vehicleType } = req.query;

    const fare = estimateFare(
      parseFloat(pickupLat as string),
      parseFloat(pickupLng as string),
      parseFloat(destinationLat as string),
      parseFloat(destinationLng as string),
      (vehicleType as string) || 'BIKE'
    );

    res.status(200).json({
      success: true,
      data: fare,
    });
  } catch (error) {
    next(error);
  }
};

export const scheduleRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { pickup, destination, vehicleType, scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'scheduledAt is required' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid scheduledAt datetime' });
    }

    const diffMinutes = (scheduledDate.getTime() - Date.now()) / (1000 * 60);
    if (diffMinutes < 10) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled ride must be set at least 10 minutes in advance. For immediate pickups, please use "Book Ride".',
      });
    }

    const fare = estimateFare(
      Number(pickup.lat),
      Number(pickup.lng),
      Number(destination.lat),
      Number(destination.lng),
      vehicleType || 'BIKE'
    );

    const ride = await createScheduledRide({
      riderId: userId,
      pickupLat: Number(pickup.lat),
      pickupLng: Number(pickup.lng),
      pickupAddress: pickup.address || pickup.name,
      pickupName: pickup.name || pickup.address,
      destinationLat: Number(destination.lat),
      destinationLng: Number(destination.lng),
      destinationAddress: destination.address || destination.name,
      destinationName: destination.name || destination.address,
      estimatedDistanceM: fare.estimatedDistanceM,
      estimatedDurationS: fare.estimatedDurationS,
      estimatedFare: fare.estimatedFare,
      scheduledAt: scheduledDate,
    });

    res.status(201).json({
      success: true,
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const getScheduledRidesForRider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const minTime = new Date(now.getTime() - 30 * 60 * 1000);
    const rides = await prisma.ride.findMany({
      where: {
        riderId: userId,
        status: { in: [RideStatus.SCHEDULED, RideStatus.SEARCHING] },
        scheduledAt: { gte: minTime },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        captain: {
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: rides,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const activeRide = await getActiveRideForRider(userId);

    res.status(200).json({
      success: true,
      data: activeRide,
    });
  } catch (error) {
    next(error);
  }
};

export const createImmediateRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { pickup, destination, vehicleType } = req.body;

    const fare = estimateFare(
      pickup.lat,
      pickup.lng,
      destination.lat,
      destination.lng,
      vehicleType || 'BIKE'
    );

    const ride = await createRide({
      riderId: userId,
      pickupLat: Number(pickup.lat),
      pickupLng: Number(pickup.lng),
      pickupAddress: pickup.address || pickup.name,
      pickupName: pickup.name || pickup.address,
      destinationLat: Number(destination.lat),
      destinationLng: Number(destination.lng),
      destinationAddress: destination.address || destination.name,
      destinationName: destination.name || destination.address,
      estimatedDistanceM: fare.estimatedDistanceM,
      estimatedDurationS: fare.estimatedDurationS,
      estimatedFare: fare.estimatedFare,
      vehicleType: vehicleType || 'BIKE',
    });

    res.status(201).json({
      success: true,
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const getRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId, role } = req.user!;

    const ride = await getRideById(rideId as string, userId, role);

    res.status(200).json({
      success: true,
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const getRideHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    if (role === 'RIDER') {
      const [rides, total] = await Promise.all([
        prisma.ride.findMany({
          where: { riderId: userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            captain: {
              include: {
                user: {
                  select: { name: true, phone: true },
                },
              },
            },
          },
        }),
        prisma.ride.count({ where: { riderId: userId } }),
      ]);

      res.status(200).json({
        success: true,
        data: rides,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      // For Captains, resolve Captain.id from User.id
      const captain = await prisma.captain.findUnique({ where: { userId } });
      if (!captain) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const [rides, total] = await Promise.all([
        prisma.ride.findMany({
          where: { captainId: captain.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            rider: {
              select: { name: true, phone: true, email: true },
            },
          },
        }),
        prisma.ride.count({ where: { captainId: captain.id } }),
      ]);

      res.status(200).json({
        success: true,
        data: rides,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId, role } = req.user!;
    const { reason } = req.body;

    const cancelledRide = await cancelRide(rideId as string, userId, role, reason);

    res.status(200).json({
      success: true,
      data: cancelledRide,
    });
  } catch (error) {
    next(error);
  }
};

export const accept = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.user!;
    const ride = await acceptRide(rideId as string, userId);
    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

export const reject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.user!;
    const result = await rejectRide(rideId as string, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const arrived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.user!;
    const ride = await markCaptainArrived(rideId as string, userId);
    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

export const start = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.user!;
    const ride = await startRide(rideId as string, userId);
    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

export const complete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.user!;
    const ride = await completeRide(rideId as string, userId);
    res.status(200).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};
