import { asyncHandler } from '../utils/async-handler.js';
import { dashboardService as svc } from '../services/dashboard.service.js';

export const summary = asyncHandler(async (req, res) => res.json({ data: await svc.summary(req.userId) }));
export const running = asyncHandler(async (req, res) => res.json({ data: await svc.byStatus(req.userId, 'Running') }));
export const completed = asyncHandler(async (req, res) => res.json({ data: await svc.byStatus(req.userId, ['Completed', 'Expired']) }));
export const alerts = asyncHandler(async (req, res) => res.json({ data: await svc.alerts(req.userId) }));
