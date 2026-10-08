import mongoose from 'mongoose';
import { MonitoringTask } from '../models/MonitoringTask.js';
import { ACTIVE_STATUSES } from '../constants/task-status.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Every user-facing query takes userId, so ownership is enforced by construction.
export const monitoringRepository = {
  create: (data) => MonitoringTask.create(data),
  findById: (id) => MonitoringTask.findById(id),
  findOwned: (id, userId) => MonitoringTask.findOne({ _id: id, userId }),
  updateOwned: (id, userId, condition, update) =>
    MonitoringTask.findOneAndUpdate({ _id: id, userId, ...condition }, update, { new: true }),
  deleteOwned: (id, userId) => MonitoringTask.findOneAndDelete({ _id: id, userId }),
  countActive: (userId) => MonitoringTask.countDocuments({ userId, status: { $in: ACTIVE_STATUSES } }),

  async list(userId, { filter = {}, sort = { createdAt: -1 }, page = 1, limit = 20 }) {
    const query = { userId, ...filter };
    const [items, total] = await Promise.all([
      MonitoringTask.find(query).sort(sort).skip((page - 1) * limit).limit(limit),
      MonitoringTask.countDocuments(query),
    ]);
    return { items, total };
  },

  find: (userId, filter, sort, limit) => MonitoringTask.find({ userId, ...filter }).sort(sort).limit(limit),

  async countByStatus(userId) {
    const rows = await MonitoringTask.aggregate([{ $match: { userId: oid(userId) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.n]));
  },

  /** Atomically claim ONE due task with a lease. Safe across many worker instances. */
  claimDue(workerId, leaseMs, now = new Date()) {
    return MonitoringTask.findOneAndUpdate(
      {
        status: 'Running',
        nextCheckAt: { $lte: now },
        endDate: { $gte: now },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
      },
      { $set: { lockedBy: workerId, lockedUntil: new Date(now.getTime() + leaseMs) } },
      { sort: { nextCheckAt: 1 }, new: true },
    );
  },

  releaseLease: (id, workerId) =>
    MonitoringTask.updateOne({ _id: id, lockedBy: workerId }, { $set: { lockedBy: null, lockedUntil: null } }),

  // Worker-side writes are guarded by lease ownership.
  updateLeased: (id, workerId, update) => MonitoringTask.updateOne({ _id: id, lockedBy: workerId }, update),
  updateIfStatus: (id, status, set) => MonitoringTask.updateOne({ _id: id, status }, { $set: set }),
};
