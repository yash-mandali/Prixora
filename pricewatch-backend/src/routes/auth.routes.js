import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const r = Router();
r.post('/register', authLimiter, validate(registerSchema), c.register);
r.post('/login', authLimiter, validate(loginSchema), c.login);
r.post('/logout', authenticate, c.logout);
r.get('/me', authenticate, c.me);
export default r;
