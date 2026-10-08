import { asyncHandler } from '../utils/async-handler.js';
import { monitoringService as svc } from '../services/monitoring.service.js';

const page = (r, q) => ({ page: q.page, limit: q.limit, total: r.total, totalPages: Math.ceil(r.total / q.limit) });
const send = (res, r, q) => res.json({ data: r.items, meta: page(r, q) });

export const create = asyncHandler(async (req, res) => res.status(201).json({ data: await svc.create(req.userId, req.valid.body) }));
export const list = asyncHandler(async (req, res) => send(res, await svc.list(req.userId, req.valid.query), req.valid.query));
export const get = asyncHandler(async (req, res) => res.json({ data: await svc.get(req.userId, req.params.id) }));
export const update = asyncHandler(async (req, res) => res.json({ data: await svc.update(req.userId, req.params.id, req.valid.body) }));
export const remove = asyncHandler(async (req, res) => { await svc.remove(req.userId, req.params.id); res.status(204).end(); });
export const pause = asyncHandler(async (req, res) => res.json({ data: await svc.pause(req.userId, req.params.id) }));
export const resume = asyncHandler(async (req, res) => res.json({ data: await svc.resume(req.userId, req.params.id) }));
export const cancel = asyncHandler(async (req, res) => res.json({ data: await svc.cancel(req.userId, req.params.id) }));
export const history = asyncHandler(async (req, res) => send(res, await svc.history(req.userId, req.params.id, req.valid.query), req.valid.query));
export const latestPrice = asyncHandler(async (req, res) => res.json({ data: await svc.latestPrice(req.userId, req.params.id) }));
export const statistics = asyncHandler(async (req, res) => res.json({ data: await svc.statistics(req.userId, req.params.id) }));
export const executions = asyncHandler(async (req, res) => send(res, await svc.executions(req.userId, req.params.id, req.valid.query), req.valid.query));
export const execution = asyncHandler(async (req, res) => res.json({ data: await svc.execution(req.userId, req.params.id, req.params.executionId) }));
