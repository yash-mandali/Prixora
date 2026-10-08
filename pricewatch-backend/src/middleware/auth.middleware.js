import { AppError } from '../errors/app-error.js';
import { verifyToken } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw AppError.unauthorized();
  let payload;
  try { payload = verifyToken(token); } catch { throw AppError.unauthorized('Invalid or expired token', 'INVALID_TOKEN'); }
  const user = await userRepository.findById(payload.sub);
  if (!user) throw AppError.unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  if (!user.isActive) throw AppError.forbidden('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
  req.user = user;
  req.userId = user._id;
  next();
});
