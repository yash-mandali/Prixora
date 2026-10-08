import rateLimit from 'express-rate-limit';

const limited = (windowMs, max, code) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { code, message: 'Too many requests, please try again later' } }),
});
export const apiLimiter = limited(15 * 60 * 1000, 600, 'RATE_LIMITED');
export const authLimiter = limited(15 * 60 * 1000, 30, 'AUTH_RATE_LIMITED');
