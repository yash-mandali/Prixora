import { asyncHandler } from '../utils/async-handler.js';
import { notificationService as svc } from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const r = await svc.list(req.userId, q);
  res.json({ data: r.items, meta: { page: q.page, limit: q.limit, total: r.total, totalPages: Math.ceil(r.total / q.limit), unread: r.unread } });
});
export const markRead = asyncHandler(async (req, res) => res.json({ data: await svc.markRead(req.userId, req.params.id) }));
export const markAllRead = asyncHandler(async (req, res) => { await svc.markAllRead(req.userId); res.json({ data: { message: 'All notifications marked as read' } }); });
