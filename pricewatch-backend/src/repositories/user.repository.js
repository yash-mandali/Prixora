import { User } from '../models/User.js';

export const userRepository = {
  create: (data) => User.create(data),
  findById: (id) => User.findById(id),
  findByEmail: (email) => User.findOne({ email: email.toLowerCase() }),
  findByEmailWithPassword: (email) => User.findOne({ email: email.toLowerCase() }).select('+passwordHash'),
};
