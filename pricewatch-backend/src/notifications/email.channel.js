import nodemailer from 'nodemailer';
import { env } from '../config/environment.js';
import { CHANNEL } from '../constants/notification-types.js';

let transporter;
const getTransporter = () => {
  if (!env.SMTP_HOST) return null;
  transporter ||= nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
};

export const emailChannel = {
  type: CHANNEL.EMAIL,
  async deliver({ user, title, message }) {
    const t = getTransporter();
    if (!t) throw new Error('Email is not configured (SMTP_HOST empty)');
    await t.sendMail({ from: env.SMTP_FROM, to: user.email, subject: title, text: message });
  },
};
