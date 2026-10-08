import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

// Payload contains only the subject (user id). No PII, no roles, no secrets.
export const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' });
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
