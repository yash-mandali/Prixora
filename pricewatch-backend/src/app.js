import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/environment.js';
import { apiLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import './models/index.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, cb) { cb(null, !origin || env.corsOrigins.includes(origin)); },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(mongoSanitize());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
