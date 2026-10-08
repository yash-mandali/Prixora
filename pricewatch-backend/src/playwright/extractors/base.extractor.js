import { playwrightConfig } from '../../config/playwright.js';
import { ExtractionError } from '../errors.js';
import { parsePrice } from '../price.parser.js';

const BLOCK_PATTERN = /captcha|robot check|unusual traffic|access denied|verify you are (a )?human|automated access|click the button below to continue shopping/i;
const PAGE_SETTLE_TIMEOUT_MS = 3000;
const FALLBACK_PRICE_SELECTORS = [
  '[itemprop="price"]',
  'meta[property="product:price:amount"]',
  'meta[property="og:price:amount"]',
  '[data-price]',
  '[data-testid*="price" i]',
  '[class*="price" i]',
];

/**
 * Template-method extractor. Subclasses supply selector config only; navigation, blocked-page detection,
 * JSON-LD/meta fallback, parsing and validation live here so a bad price can never be returned.
 *
 * Compliance: if a site presents a challenge/CAPTCHA/denial we STOP and report ACCESS_BLOCKED. No bypassing.
 */
export class BaseExtractor {
  constructor(config = {}) {
    this.config = { name: [], price: [], image: [], unavailable: [], ...config };
  }

  async open(page, url) {
    let response;
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: playwrightConfig.navigationTimeoutMs });
    } catch (err) {
      if (err?.name === 'TimeoutError') throw new ExtractionError('TIMEOUT');
      throw new ExtractionError('PAGE_LOAD_FAILED', String(err?.message || '').split('\n')[0]);
    }
    const status = response?.status();
    if (status === 403 || status === 429 || status === 503) throw new ExtractionError('ACCESS_BLOCKED', `HTTP ${status}`);
    if (status >= 400) throw new ExtractionError('PAGE_LOAD_FAILED', `HTTP ${status}`);
  }

  async waitForContent(page) {
    try {
      await page.waitForLoadState('networkidle', { timeout: PAGE_SETTLE_TIMEOUT_MS });
    } catch (err) {
      if (err?.name !== 'TimeoutError') throw err;
    }

    const sel = this.config.price.join(',');
    if (!sel) return;
    try {
      await page.waitForSelector(sel, {
        state: 'visible',
        timeout: this.config.priceWaitTimeoutMs ?? playwrightConfig.selectorWaitMs,
      });
    } catch (err) {
      if (err?.name !== 'TimeoutError') throw err;
    }
  }

  async assertNotBlocked(page) {
    const probe = await page.evaluate(() => `${document.title} ${(document.body?.innerText || '').slice(0, 600)}`);
    console.log('Page probe text for block detection:', probe);
    if (BLOCK_PATTERN.test(probe)) throw new ExtractionError('ACCESS_BLOCKED', 'challenge or denial page detected');
  }

  async scrapeDom(page) {
    return page.evaluate((cfg) => {
      const pickText = (sels) => {
        for (const s of sels) {
          const el = document.querySelector(s);
          const t = el?.textContent?.trim();
          if (t) return t;
        }
        return null;
      };
      const pickPriceTexts = (sels, { visibleOnly = false } = {}) => {
        const texts = [];
        const seen = new Set();
        for (const selector of sels) {
          let nodes;
          try { nodes = document.querySelectorAll(selector); } catch { continue; }
          for (const el of nodes) {
            if (visibleOnly && el.getClientRects().length === 0) continue;
            const value = el.getAttribute('content')
              || el.getAttribute('data-price')
              || el.getAttribute('aria-label')
              || el.textContent;
            const text = value?.trim();
            if (text && !seen.has(text)) {
              seen.add(text);
              texts.push(text);
            }
          }
        }
        return texts;
      };
      const pickPricesAfterName = () => {
        if (!cfg.priceAfterName) return [];
        const title = cfg.name.map((selector) => {
          try { return document.querySelector(selector); } catch { return null; }
        }).find(Boolean);
        if (!title) return [];

        const elements = Array.from(document.querySelectorAll('body *'));
        const titleIndex = elements.indexOf(title);
        if (titleIndex < 0) return [];

        const prices = [];
        const seen = new Set();
        const currencyAmount = /(?:₹|\$|€|£|\b(?:rs\.?|inr|usd|eur|gbp)\b)\s*\d[\d.,]*|\d[\d.,]*\s*(?:€|£|\b(?:eur|gbp)\b)/i;
        for (const el of elements.slice(titleIndex + 1, titleIndex + 201)) {
          if (el.children.length || el.getClientRects().length === 0) continue;
          const text = el.textContent?.trim();
          if (text && currencyAmount.test(text) && !seen.has(text)) {
            prices.push(text);
            seen.add(text);
          }
        }
        return prices;
      };
      const pickAttr = (sels) => {
        for (const s of sels) {
          const el = document.querySelector(s);
          const v = el?.getAttribute('src') || el?.getAttribute('data-src') || el?.getAttribute('content');
          if (v) return v;
        }
        return null;
      };
      return {
        name: pickText(cfg.name),
        priceTexts: pickPriceTexts(cfg.price, { visibleOnly: true }),
        contextPriceTexts: pickPricesAfterName(),
        fallbackPriceTexts: pickPriceTexts(cfg.fallbackPriceSelectors, { visibleOnly: true }),
        image: pickAttr(cfg.image),
        unavailable: cfg.unavailable.some((s) => document.querySelector(s)),
      };
    }, { ...this.config, fallbackPriceSelectors: FALLBACK_PRICE_SELECTORS });
  }

  async scrapeStructuredData(page) {
    return page.evaluate(() => {
      const out = { name: null, price: null, currency: null, image: null, availability: null };
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(visit);
        const type = [].concat(node['@type'] || []);
        if (type.includes('Product')) {
          out.name = out.name || node.name || null;
          const img = [].concat(node.image || [])[0];
          out.image = out.image || (typeof img === 'string' ? img : img?.url) || null;
          for (const o of [].concat(node.offers || [])) {
            const price = o?.price ?? o?.lowPrice ?? o?.priceSpecification?.price;
            if (price != null && out.price == null) {
              out.price = price; out.currency = o.priceCurrency || o.priceSpecification?.priceCurrency || null;
              out.availability = o.availability || null;
            }
          }
        }
        if (node['@graph']) visit(node['@graph']);
      };
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try { visit(JSON.parse(s.textContent)); } catch { /* ignore malformed JSON-LD */ }
      });
      const meta = (n) => document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.getAttribute('content') || null;
      out.price = out.price ?? meta('product:price:amount') ?? meta('og:price:amount');
      out.currency = out.currency || meta('product:price:currency') || meta('og:price:currency');
      out.name = out.name || meta('og:title');
      out.image = out.image || meta('og:image');
      return out;
    });
  }

  async extract(page, url) {
    await this.open(page, url);
    await this.waitForContent(page);
    await this.assertNotBlocked(page);

    const dom = await this.scrapeDom(page);
    console.log('DOM scrape result:', dom);
    const sd = await this.scrapeStructuredData(page);
    console.log('Structured data scrape result:', sd);

    const configuredPriceTexts = dom.priceTexts || (dom.priceText ? [dom.priceText] : []);
    let parsed = null;
    let hasDomPriceText = configuredPriceTexts.length > 0;
    for (const text of configuredPriceTexts) {
      parsed = parsePrice(text);
      if (parsed) break;
    }
    if (!parsed) {
      for (const text of dom.contextPriceTexts || []) {
        hasDomPriceText = true;
        parsed = parsePrice(text);
        if (parsed) break;
      }
    }
    if (!parsed) {
      for (const text of dom.fallbackPriceTexts || []) {
        hasDomPriceText = true;
        parsed = parsePrice(text);
        if (parsed) break;
      }
    }
    if (!parsed && sd.price != null) parsed = parsePrice(String(sd.price), sd.currency || 'INR');
    if (parsed && sd.currency && !hasDomPriceText) parsed.currency = sd.currency;

    const availability = dom.unavailable || /OutOfStock|SoldOut/i.test(sd.availability || '')
      ? 'OutOfStock' : /InStock/i.test(sd.availability || '') ? 'InStock' : 'Unknown';
    
    console.log('Determined availability:', availability);
    if (!parsed) {
      if (availability === 'OutOfStock') throw new ExtractionError('PRODUCT_UNAVAILABLE');
      throw new ExtractionError(hasDomPriceText ? 'PRICE_PARSE_FAILED' : 'PRICE_NOT_FOUND');
    }
    return {
      productName: (dom.name || sd.name || '').slice(0, 500) || null,
      price: parsed.minor,
      currency: parsed.currency,
      availability,
      imageUrl: dom.image || sd.image || null,
    };
  }
}
