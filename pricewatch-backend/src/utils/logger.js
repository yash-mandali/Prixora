import pino from 'pino';

const isDev = (process.env.NODE_ENV || 'development') === 'development';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password', 'token', '*.token', 'passwordHash', '*.passwordHash'],
    censor: '[REDACTED]',
  },
  ...(isDev ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
});
