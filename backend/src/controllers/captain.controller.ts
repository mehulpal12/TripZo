import { Request, Response, NextFunction } from 'express';
import { setCaptainStatus, getCaptainAssignedRides } from '../services/captain.service';
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
