import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../middleware/validation.middleware.js';
import { notificationQuerySchema } from '../validators/monitoring.validator.js';

const r = Router();
r.use(authenticate);
r.get('/', validate(notificationQuerySchema, 'query'), c.list);
r.put('/read-all', c.markAllRead); // declared before /:id/read
r.put('/:id/read', validateObjectId('id'), c.markRead);
export default r;
