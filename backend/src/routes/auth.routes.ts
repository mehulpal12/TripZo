import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { register, login, refresh, logout } from '../controllers/auth.controller';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['RIDER', 'ADMIN', 'CAPTAIN']).default('RIDER'),
    name: z.string().optional(),
    phone: z.string().optional()
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);

export default router;
