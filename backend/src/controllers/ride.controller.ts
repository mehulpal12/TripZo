import { Request, Response, NextFunction } from 'express';
import { estimateFare } from '../services/fare.service';
import { createRide, getRideById, cancelRide, acceptRide, rejectRide, markCaptainArrived, startRide, completeRide } from '../services/ride.service';
import { prisma } from '../config/db';

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
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      estimatedDistanceM: fare.estimatedDistanceM,
      estimatedDurationS: fare.estimatedDurationS,
      estimatedFare: fare.estimatedFare,
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
    // MVP implementation: just return rides where riderId = userId for Riders
    if (role === 'RIDER') {
      const rides = await prisma.ride.findMany({
        where: { riderId: userId },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({
        success: true,
        data: rides,
      });
    } else {
      // For Captains, return rides where they are assigned
      const rides = await prisma.ride.findMany({
        where: { captainId: userId },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({
        success: true,
        data: rides,
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
