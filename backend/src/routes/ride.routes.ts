import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getFare,
  createImmediateRide,
  scheduleRide,
  getRide,
  getRideHistory,
  cancel,
  accept,
  reject,
  arrived,
  start,
  complete,
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

const scheduleRideSchema = z.object({
  body: z.object({
    pickup: coordinateSchema,
    destination: coordinateSchema,
    vehicleType: z.string().optional(),
    scheduledAt: z.string().datetime(),
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
router.post('/schedule', validate(scheduleRideSchema), scheduleRide);
router.get('/', getRideHistory);
router.get('/:rideId', getRide);
router.post('/:rideId/cancel', validate(cancelRideSchema), cancel);
router.post('/:rideId/accept', accept);
router.post('/:rideId/reject', reject);
router.post('/:rideId/arrived', arrived);
router.post('/:rideId/start', start);
router.post('/:rideId/complete', complete);

export default router;
