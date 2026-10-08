import { Router } from 'express';
import * as c from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const r = Router();
r.use(authenticate);
r.get('/summary', c.summary);
r.get('/running', c.running);
r.get('/completed', c.completed);
r.get('/alerts', c.alerts);
export default r;
