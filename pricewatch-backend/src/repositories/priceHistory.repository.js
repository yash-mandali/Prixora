import mongoose from 'mongoose';
import { PriceHistory } from '../models/PriceHistory.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

export const priceHistoryRepository = {
  create: (data) => PriceHistory.create(data),
  deleteByTask: (taskId) => PriceHistory.deleteMany({ taskId }),
  latest: (taskId) => PriceHistory.findOne({ taskId }).sort({ checkedAt: -1 }),

  async list(taskId, { page = 1, limit = 25, from, to, sortDir = -1 }) {
    const q = { taskId };
    if (from || to) q.checkedAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    const [items, total] = await Promise.all([
      PriceHistory.find(q).sort({ checkedAt: sortDir }).skip((page - 1) * limit).limit(limit),
      PriceHistory.countDocuments(q),
    ]);
    return { items, total };
  },

  /** Chronological series for charts (capped). */
  series(taskId, { from, to, cap = 5000 } = {}) {
    const q = { taskId };
    if (from || to) q.checkedAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    return PriceHistory.find(q).sort({ checkedAt: -1 }).limit(cap).lean().then((r) => r.reverse());
  },

  async aggregateStats(taskId) {
    const [row] = await PriceHistory.aggregate([
      { $match: { taskId: oid(taskId) } },
      { $sort: { checkedAt: 1 } },
      { $group: {
        _id: '$taskId', count: { $sum: 1 }, lowest: { $min: '$price' }, highest: { $max: '$price' },
        average: { $avg: '$price' }, first: { $first: '$price' }, last: { $last: '$price' },
        firstAt: { $first: '$checkedAt' }, lastAt: { $last: '$checkedAt' },
        lowestAt: { $top: { sortBy: { price: 1 }, output: '$checkedAt' } },
        highestAt: { $top: { sortBy: { price: -1 }, output: '$checkedAt' } },
      } },
    ]);
    return row || null;
  },
};
