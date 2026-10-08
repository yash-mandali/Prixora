import { z } from 'zod';
import { env } from '../config/environment.js';
import { MONITORING_TYPES, MONITORING_TYPE as T } from '../constants/monitoring-types.js';
import { ALL_STATUSES } from '../constants/task-status.js';

const emptyToUndef = (v) => (v === '' || v === null ? undefined : v);
const price = z.preprocess(emptyToUndef, z.coerce.number().positive().max(1e9).optional());

export const monitoringSchema = z.object({
  productUrl: z.string().trim().url().max(2048),
  monitoringType: z.enum(MONITORING_TYPES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  intervalMinutes: z.coerce.number().int().min(env.MIN_INTERVAL_MINUTES).max(10080), // custom intervals allowed up to 7 days
  minimumPrice: price,
  maximumPrice: price,
  targetPrice: price,
  percentageThreshold: z.preprocess(emptyToUndef, z.coerce.number().gt(0).max(100).optional()),
  notificationPreference: z.object({ inApp: z.boolean().default(true), email: z.boolean().default(false) }).default({}),
}).superRefine((d, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (d.endDate <= d.startDate) issue('endDate', 'End date must be after start date');
  else if (d.endDate <= new Date()) issue('endDate', 'End date must be in the future');
  if (d.minimumPrice != null && d.maximumPrice != null && d.minimumPrice > d.maximumPrice) issue('minimumPrice', 'Minimum price must not exceed maximum price');
  if (d.monitoringType === T.PRICE_RANGE && d.minimumPrice == null && d.maximumPrice == null) issue('minimumPrice', 'Set a minimum and/or maximum price');
  if (d.monitoringType === T.TARGET_PRICE && d.targetPrice == null) issue('targetPrice', 'Target price is required');
  if (d.monitoringType === T.PERCENTAGE_DROP && d.percentageThreshold == null) issue('percentageThreshold', 'Percentage threshold is required');
  if (!d.notificationPreference.inApp && !d.notificationPreference.email) issue('notificationPreference', 'Enable at least one notification channel');
});

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);

export const listQuerySchema = z.object({
  page, limit,
  q: z.string().trim().max(100).optional(),
  status: z.string().optional().transform((s) => (s ? s.split(',').filter((x) => ALL_STATUSES.includes(x)) : undefined)),
  sortBy: z.enum(['createdAt', 'productName', 'lastKnownPrice', 'startDate', 'endDate', 'lastCheckedAt', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const historyQuerySchema = z.object({
  page, limit: z.coerce.number().int().min(1).max(200).default(25),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  downsample: z.coerce.number().int().min(10).max(1000).optional(),
});

export const pageQuerySchema = z.object({ page, limit });
export const notificationQuerySchema = z.object({ page, limit, taskId: z.string().regex(/^[a-f\d]{24}$/i).optional(), unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true') });
