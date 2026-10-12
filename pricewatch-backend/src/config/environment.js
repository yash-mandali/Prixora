import 'dotenv/config';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const num = (d) => z.coerce.number().default(d);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: num(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: num(12),
  CORS_ORIGINS: z.string().default('https://prixora.vercel.app/'),
  LOG_LEVEL: z.string().default('info'),
  RUN_WORKER_IN_API: bool.optional(),
  WORKER_POLL_INTERVAL_MS: num(1000),
  MAX_CONCURRENT_JOBS: num(3),
  LEASE_MS: num(300000),
  JOB_TIMEOUT_MS: num(60000),
  DOMAIN_MIN_GAP_MS: num(3000),
  MAX_CONSECUTIVE_FAILURES: num(5),
  MIN_INTERVAL_MINUTES: num(15),
  MAX_TASKS_PER_USER: num(50),
  ALLOW_GENERIC_EXTRACTOR: bool.default('true'),
  ALLOW_PRIVATE_URLS: bool.default('false'),
  EXECUTION_TTL_DAYS: num(90),
  PLAYWRIGHT_HEADLESS: bool.default('true'),
  PLAYWRIGHT_NO_SANDBOX: bool.default('false'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: num(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('PriceWatch <no-reply@example.com>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast at boot: misconfiguration must never reach runtime.
  console.error('Invalid environment configuration:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  RUN_WORKER_IN_API: parsed.data.RUN_WORKER_IN_API ?? parsed.data.NODE_ENV !== 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production',
});
