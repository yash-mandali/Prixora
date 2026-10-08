import { CHANNEL } from '../constants/notification-types.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { inAppChannel } from '../notifications/in-app.channel.js';
import { emailChannel } from '../notifications/email.channel.js';
import { formatMoney } from '../utils/money.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../errors/app-error.js';
import { notificationDTO } from '../dto/index.js';

// Add SMS/push by implementing { type, deliver(ctx) } and registering it here.
const channels = { [CHANNEL.IN_APP]: inAppChannel, [CHANNEL.EMAIL]: emailChannel };

function buildMessage({ task, price, previousPrice, evaluation }) {
  const c = task.currency;
  const lines = [
    `${evaluation.headline}.`, '',
    `Product: ${task.productName || task.websiteDomain}`,
    `Previous Price: ${formatMoney(previousPrice, c)}`,
    `Current Price: ${formatMoney(price, c)}`,
  ];
  if (task.monitoringType === 'PriceRange') lines.push(`Target Range: ${formatMoney(task.minimumPrice, c)} - ${formatMoney(task.maximumPrice, c)}`);
  if (task.monitoringType === 'TargetPrice') lines.push(`Target Price: ${formatMoney(task.targetPrice, c)}`);
  if (task.monitoringType === 'PercentageDrop') lines.push(`Threshold: ${task.percentageThreshold}%`);
  lines.push('', task.productUrl);
  return lines.join('\n');
}

export const notificationService = {
  /**
   * Creates one notification per enabled channel. NEVER throws: a notification failure must not
   * turn a successful price check into a failed execution (business rule 13).
   */
  async notifyPriceEvent({ task, history, price, previousPrice, evaluation }) {
    try {
      const user = await userRepository.findById(task.userId);
      if (!user?.isActive) return;
      const title = `${task.productName || task.websiteDomain}: ${evaluation.headline}`;
      const message = buildMessage({ task, price, previousPrice, evaluation });
      const enabled = [];
      if (task.notificationPreference?.inApp !== false) enabled.push(CHANNEL.IN_APP);
      if (task.notificationPreference?.email) enabled.push(CHANNEL.EMAIL);

      for (const type of enabled) {
        let doc;
        try {
          doc = await notificationRepository.create({
            userId: task.userId, taskId: task._id, priceHistoryId: history._id, notificationType: type, title, message,
            isRead: type !== CHANNEL.IN_APP, // only in-app items count as "unread" in the UI
            dedupeKey: `${task._id}:${history._id}:${type}`,
          });
        } catch (err) {
          if (err?.code === 11000) continue; // already created (retry) => idempotent
          throw err;
        }
        try {
          await channels[type].deliver({ user, title, message });
          await notificationRepository.markSent(doc._id);
          logger.info({ taskId: String(task._id), channel: type }, 'Notification sent');
        } catch (err) {
          await notificationRepository.markFailed(doc._id, err.message);
          logger.warn({ taskId: String(task._id), channel: type, err: err.message }, 'Notification delivery failed');
        }
      }
    } catch (err) {
      logger.error({ taskId: String(task._id), err: err.message }, 'Notification pipeline failed');
    }
  },

  async list(userId, q) {
    const { items, total } = await notificationRepository.list(userId, q);
    return { items: items.map(notificationDTO), total, unread: await notificationRepository.unreadCount(userId) };
  },
  async markRead(userId, id) {
    const n = await notificationRepository.markRead(id, userId);
    if (!n) throw AppError.notFound('Notification not found');
    return notificationDTO(n);
  },
  markAllRead: (userId) => notificationRepository.markAllRead(userId),
};
