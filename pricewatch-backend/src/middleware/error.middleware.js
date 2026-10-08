import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (_req, _res, next) => next(AppError.notFound('Route not found', 'ROUTE_NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({ error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) } });
  }
  if (err?.name === 'CastError') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  if (err?.code === 11000) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Duplicate value' } });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  // Unknown: log everything server-side, expose nothing to the client.
  logger.error({ err: { message: err?.message, stack: err?.stack }, path: req.path, method: req.method, userId: req.userId && String(req.userId) }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}
