import { chromium } from 'playwright';
import { playwrightConfig } from '../config/playwright.js';
import { assertSafeUrl } from '../utils/url.utils.js';
import { ExtractionError } from './errors.js';
import { logger } from '../utils/logger.js';

let browser = null;
let launching = null;

async function getBrowser() {
  if (browser?.isConnected()) return browser;
  if (!launching) {
    launching = chromium.launch({ headless: playwrightConfig.headless, args: playwrightConfig.args })
      .then((b) => {
        browser = b;
        b.on('disconnected', () => { browser = null; logger.warn('Playwright browser disconnected'); });
        logger.info('Playwright browser launched');
        return b;
      })
      .finally(() => { launching = null; });
  }
  return launching;
}

/**
 * Runs fn(page) inside an isolated, always-closed BrowserContext with a hard timeout.
 * SSRF: every document navigation (including redirects) is re-validated.
 */
export async function withPage(fn, { timeoutMs = 60000 } = {}) {
  const b = await getBrowser();
  const context = await b.newContext({ locale: playwrightConfig.locale, viewport: playwrightConfig.viewport });
  let timer;
  try {
    await context.route('**/*', async (route) => {
      const req = route.request();
      const type = req.resourceType();
      if (playwrightConfig.blockedResourceTypes.includes(type)) return route.abort();
      if (type === 'document') {
        try { await assertSafeUrl(req.url()); } catch { return route.abort('blockedbyclient'); }
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(playwrightConfig.navigationTimeoutMs);
    return await Promise.race([
      fn(page),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new ExtractionError('TIMEOUT', 'job exceeded time limit')), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
    await context.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (browser) await browser.close().catch(() => {});
  browser = null;
}

export const playwrightService = { withPage, closeBrowser };
