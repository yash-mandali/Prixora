import bcrypt from 'bcryptjs';
import { env } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { userRepository } from '../repositories/user.repository.js';
import { signToken } from '../utils/jwt.js';
import { userDTO } from '../dto/index.js';
import { logger } from '../utils/logger.js';

export const authService = {
  async register({ name, email, password }) {
    if (await userRepository.findByEmail(email)) throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    let user;
    try {
      user = await userRepository.create({ name, email, passwordHash });
    } catch (err) {
      if (err?.code === 11000) throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
      throw err;
    }
    logger.info({ userId: String(user._id) }, 'User registered');
    return { user: userDTO(user), token: signToken(user._id) };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmailWithPassword(email);
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    if (!user.isActive) throw AppError.forbidden('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
    return { user: userDTO(user), token: signToken(user._id) };
  },
};
