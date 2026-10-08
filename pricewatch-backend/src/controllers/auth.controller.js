import { asyncHandler } from '../utils/async-handler.js';
import { authService } from '../services/auth.service.js';
import { userDTO } from '../dto/index.js';

export const register = asyncHandler(async (req, res) => res.status(201).json({ data: await authService.register(req.valid.body) }));
export const login = asyncHandler(async (req, res) => res.json({ data: await authService.login(req.valid.body) }));
// Tokens are stateless; the client discards its token. (See README for revocation options.)
export const logout = (_req, res) => res.json({ data: { message: 'Logged out' } });
export const me = (req, res) => res.json({ data: userDTO(req.user) });
