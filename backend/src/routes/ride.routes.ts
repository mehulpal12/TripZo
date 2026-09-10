import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getFare,
  createImmediateRide,
  getRide,
  getRideHistory,
  cancel,
} from '../controllers/ride.controller';

const router = Router();

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const getFareSchema = z.object({
  query: z.object({
    pickupLat: z.string(),
    pickupLng: z.string(),
    destinationLat: z.string(),
    destinationLng: z.string(),
    vehicleType: z.string().optional(),
  }),
});

const createRideSchema = z.object({
  body: z.object({
    pickup: coordinateSchema,
    destination: coordinateSchema,
    vehicleType: z.string().optional(),
  }),
});

const cancelRideSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

// Protect all ride routes
router.use(requireAuth);

router.get('/fare', validate(getFareSchema), getFare);
router.post('/', validate(createRideSchema), createImmediateRide);
router.get('/', getRideHistory);
router.get('/:rideId', getRide);
router.post('/:rideId/cancel', validate(cancelRideSchema), cancel);

export default router;
