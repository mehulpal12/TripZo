import { Request, Response, NextFunction } from 'express';
import { setCaptainStatus, getCaptainAssignedRides, getCaptainRideHistory } from '../services/captain.service';
import { CaptainStatus } from '@prisma/client';

export const setOnline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const captain = await setCaptainStatus(userId, CaptainStatus.AVAILABLE);

    res.status(200).json({
      success: true,
      data: captain,
    });
  } catch (error) {
    next(error);
  }
};

export const setOffline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const captain = await setCaptainStatus(userId, CaptainStatus.OFFLINE);

    res.status(200).json({
      success: true,
      data: captain,
    });
  } catch (error) {
    next(error);
  }
};

export const getRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const rides = await getCaptainAssignedRides(userId);

    res.status(200).json({
      success: true,
      data: rides,
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;

    const result = await getCaptainRideHistory(userId, { page, limit, status });

    res.status(200).json({
      success: true,
      data: result.rides,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

