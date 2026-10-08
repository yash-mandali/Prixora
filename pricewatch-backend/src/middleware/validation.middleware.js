import mongoose from 'mongoose';
import { AppError } from '../errors/app-error.js';

/** Validates req[source] with a zod schema and stores the parsed value on req.valid[source]. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[source]);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(AppError.unprocessable('Validation failed', 'VALIDATION_ERROR', details));
  }
  req.valid = { ...(req.valid || {}), [source]: r.data };
  next();
};

export const validateObjectId = (...params) => (req, _res, next) => {
  for (const p of params) if (!mongoose.isValidObjectId(req.params[p])) return next(AppError.notFound());
  next();
};
