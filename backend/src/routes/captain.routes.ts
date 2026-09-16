import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { setOnline, setOffline, getRides, getHistory, getScheduledRides } from '../controllers/captain.controller';
import { Role } from '@prisma/client';

const router = Router();

// All routes require authentication and CAPTAIN role
router.use(requireAuth);
router.use(requireRole([Role.CAPTAIN]));

router.post('/online', setOnline);
router.post('/offline', setOffline);
router.get('/rides', getRides);
router.get('/scheduled', getScheduledRides);
router.get('/history', getHistory);

export default router;
