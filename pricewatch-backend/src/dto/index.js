import { fromMinor } from '../utils/money.js';
import { ACTIVE_STATUSES } from '../constants/task-status.js';

const plain = (d) => (d?.toObject ? d.toObject() : d);

export function taskDTO(doc) {
  const t = plain(doc);
  return {
    id: String(t._id),
    productUrl: t.productUrl,
    productName: t.productName || null,
    productImageUrl: t.productImageUrl || null,
    websiteDomain: t.websiteDomain,
    monitoringType: t.monitoringType,
    minimumPrice: fromMinor(t.minimumPrice),
    maximumPrice: fromMinor(t.maximumPrice),
    targetPrice: fromMinor(t.targetPrice),
    percentageThreshold: t.percentageThreshold ?? null,
    intervalMinutes: t.intervalMinutes,
    startDate: t.startDate,
    endDate: t.endDate,
    status: t.status,
    lastCheckedAt: t.lastCheckedAt || null,
    lastAttemptAt: t.lastAttemptAt || null,
    nextCheckAt: ACTIVE_STATUSES.includes(t.status) ? t.nextCheckAt || null : null,
    lastKnownPrice: fromMinor(t.lastKnownPrice),
    lowestPrice: fromMinor(t.lowestPrice),
    highestPrice: fromMinor(t.highestPrice),
    currency: t.currency,
    productAvailability: t.productAvailability,
    notificationPreference: t.notificationPreference,
    consecutiveFailures: t.consecutiveFailures,
    lastErrorCode: t.lastErrorCode || null,
    completedAt: t.completedAt || null,
    terminalReason: t.terminalReason || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function historyDTO(doc) {
  const h = plain(doc);
  return {
    id: String(h._id), taskId: String(h.taskId), executionId: h.executionId ? String(h.executionId) : null,
    checkedAt: h.checkedAt, price: fromMinor(h.price), currency: h.currency,
    previousPrice: fromMinor(h.previousPrice), priceDifference: fromMinor(h.priceDifference),
    percentageChange: h.percentageChange ?? null, priceStatus: h.priceStatus || null,
    productAvailability: h.productAvailability || null, errorMessage: h.errorMessage || null,
  };
}

export function executionDTO(doc) {
  const e = plain(doc);
  return {
    id: String(e._id), taskId: String(e.taskId), startedAt: e.startedAt, completedAt: e.completedAt || null,
    status: e.status, price: fromMinor(e.price), errorCode: e.errorCode || null, errorMessage: e.errorMessage || null,
    executionDurationMs: e.executionDurationMs ?? null, websiteDomain: e.websiteDomain, attempt: e.attempt ?? null,
  };
}

export function notificationDTO(doc) {
  const n = plain(doc);
  return {
    id: String(n._id), taskId: String(n.taskId), priceHistoryId: n.priceHistoryId ? String(n.priceHistoryId) : null,
    channel: n.notificationType, title: n.title, message: n.message, isRead: n.isRead,
    status: n.status, sentAt: n.sentAt || null, createdAt: n.createdAt,
  };
}

export const userDTO = (u) => ({ id: String(u._id), name: u.name, email: u.email, isActive: u.isActive, createdAt: u.createdAt });
