import { Notification } from '../models/Notification.js';

export const notificationRepository = {
  create: (data) => Notification.create(data),
  markSent: (id) => Notification.updateOne({ _id: id }, { $set: { status: 'Sent', sentAt: new Date() } }),
  markFailed: (id, msg) => Notification.updateOne({ _id: id }, { $set: { status: 'Failed', errorMessage: String(msg).slice(0, 300) } }),
  deleteByTask: (taskId) => Notification.deleteMany({ taskId }),
  markRead: (id, userId) => Notification.findOneAndUpdate({ _id: id, userId }, { $set: { isRead: true } }, { new: true }),
  markAllRead: (userId) => Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } }),
  unreadCount: (userId) => Notification.countDocuments({ userId, isRead: false, notificationType: 'in_app' }),
  recent: (userId, limit) => Notification.find({ userId, notificationType: 'in_app' }).sort({ createdAt: -1 }).limit(limit),
  async list(userId, { page = 1, limit = 20, taskId, unread }) {
    const q = { userId, ...(taskId && { taskId }), ...(unread && { isRead: false }) };
    const [items, total] = await Promise.all([
      Notification.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(q),
    ]);
    return { items, total };
  },
};
