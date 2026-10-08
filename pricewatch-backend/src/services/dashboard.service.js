import { monitoringRepository as repo } from '../repositories/monitoring.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { TASK_STATUS as S, ALL_STATUSES } from '../constants/task-status.js';
import { taskDTO, notificationDTO } from '../dto/index.js';

export const dashboardService = {
  async summary(userId) {
    const [byStatus, alerts, recentlyChecked, upcoming, recentAlerts] = await Promise.all([
      repo.countByStatus(userId),
      notificationRepository.unreadCount(userId),
      repo.find(userId, { lastCheckedAt: { $exists: true } }, { lastCheckedAt: -1 }, 5),
      repo.find(userId, { status: S.RUNNING }, { nextCheckAt: 1 }, 5),
      notificationRepository.recent(userId, 5),
    ]);
    const counts = Object.fromEntries(ALL_STATUSES.map((s) => [s, byStatus[s] || 0]));
    return {
      counts: { total: Object.values(counts).reduce((a, b) => a + b, 0), ...counts },
      unreadAlerts: alerts,
      recentlyChecked: recentlyChecked.map(taskDTO),
      upcomingChecks: upcoming.map(taskDTO),
      recentAlerts: recentAlerts.map(notificationDTO),
    };
  },
  async byStatus(userId, status, limit = 50) {
    return (await repo.find(userId, { status: { $in: [].concat(status) } }, { updatedAt: -1 }, limit)).map(taskDTO);
  },
  async alerts(userId, limit = 20) {
    return (await notificationRepository.recent(userId, limit)).map(notificationDTO);
  },
};
