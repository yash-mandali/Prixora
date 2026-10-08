import { priceHistoryRepository } from '../repositories/priceHistory.repository.js';
import { fromMinor } from '../utils/money.js';

export const statisticsService = {
  async forTask(task) {
    const s = await priceHistoryRepository.aggregateStats(task._id);
    if (!s) return { count: 0, currency: task.currency };
    return {
      count: s.count, currency: task.currency,
      currentPrice: fromMinor(s.last), firstPrice: fromMinor(s.first),
      lowestPrice: fromMinor(s.lowest), lowestAt: s.lowestAt,
      highestPrice: fromMinor(s.highest), highestAt: s.highestAt,
      averagePrice: fromMinor(Math.round(s.average)),
      totalChange: fromMinor(s.last - s.first),
      totalChangePercent: s.first ? Math.round(((s.last - s.first) * 10000) / s.first) / 100 : null,
      firstCheckedAt: s.firstAt, lastCheckedAt: s.lastAt,
    };
  },
};
