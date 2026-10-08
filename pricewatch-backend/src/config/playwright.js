import { env } from './environment.js';

export const playwrightConfig = Object.freeze({
  headless: env.PLAYWRIGHT_HEADLESS,
  args: env.PLAYWRIGHT_NO_SANDBOX ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  navigationTimeoutMs: 30000,
  selectorWaitMs: 8000,
  blockedResourceTypes: ['image', 'font', 'media'],
  locale: 'en-IN',
  viewport: { width: 1366, height: 800 },
});
