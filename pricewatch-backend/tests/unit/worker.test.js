import test from 'node:test';
import assert from 'node:assert/strict';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/x';
process.env.JWT_SECRET ||= 'x'.repeat(40);
process.env.NODE_ENV = 'test';
const { createScheduler } = await import('../../src/background/monitoring.scheduler.js');
const { getExtractor } = await import('../../src/playwright/extractor.factory.js');
const { BaseExtractor } = await import('../../src/playwright/extractors/base.extractor.js');
const { FlipkartExtractor } = await import('../../src/playwright/extractors/flipkart.extractor.js');

test('extractor factory selects site-specific extractor by domain', () => {
  assert.equal(getExtractor('https://www.amazon.in/dp/X').constructor.name, 'AmazonExtractor');
  assert.equal(getExtractor('https://www.flipkart.com/p/x').constructor.name, 'FlipkartExtractor');
  assert.equal(getExtractor('https://unknown-shop.example/p').constructor.name, 'GenericExtractor');
});

// Fake Playwright page to test extraction logic without a browser.
const fakePage = ({ status = 200, dom = {}, sd = {}, probe = 'Product page' }) => ({
  goto: async () => ({ status: () => status }),
  waitForSelector: async () => {}, waitForLoadState: async () => {},
  evaluate: async (fn, arg) => {
    const src = fn.toString();
    if (src.includes('innerText')) return probe;
    if (arg) return { name: null, priceText: null, image: null, unavailable: false, ...dom };
    return { name: null, price: null, currency: null, image: null, availability: null, ...sd };
  },
});
const ex = new BaseExtractor({ price: ['.p'] });

test('extractor waits for page hydration and a visible retailer price before scraping', async () => {
  const calls = [];
  await ex.waitForContent({
    waitForLoadState: async (state) => calls.push(['load', state]),
    waitForSelector: async (selector, options) => calls.push(['selector', selector, options.state]),
  });
  assert.deepEqual(calls, [
    ['load', 'networkidle'],
    ['selector', '.p', 'visible'],
  ]);
});

test('extractor: price found', async () => {
  const r = await ex.extract(fakePage({ dom: { name: 'Phone', priceText: '₹69,999' } }), 'https://x.test');
  assert.equal(r.price, 6999900);
});
test('extractor: falls back to structured data', async () => {
  const r = await ex.extract(fakePage({ sd: { price: '499.00', currency: 'USD', name: 'X' } }), 'https://x.test');
  assert.deepEqual([r.price, r.currency], [49900, 'USD']);
});
test('extractor: falls back to a semantic DOM price when retailer selectors miss', async () => {
  const r = await ex.extract(fakePage({ dom: { fallbackPriceTexts: ['₹1,499'] } }), 'https://x.test');
  assert.deepEqual([r.price, r.currency], [149900, 'INR']);
});
test('Flipkart hyperlocal links fall back to the standard product listing when the preview has no price', async () => {
  const navigatedUrls = [];
  let currentUrl = '';
  const page = {
    goto: async (url) => {
      currentUrl = url;
      navigatedUrls.push(url);
      return { status: () => 200 };
    },
    waitForLoadState: async () => {},
    waitForSelector: async () => {},
    evaluate: async (fn, arg) => {
      if (fn.toString().includes('innerText')) return 'Product page';
      if (!arg) return { name: null, price: null, currency: null, image: null, availability: null };
      if (currentUrl.includes('marketplace=HYPERLOCAL')) {
        return { name: null, priceTexts: [], contextPriceTexts: [], fallbackPriceTexts: [], image: null, unavailable: false };
      }
      return { name: 'Gulab Gold Groundnut Oil', priceTexts: [], contextPriceTexts: ['₹1,120'], fallbackPriceTexts: [], image: null, unavailable: false };
    },
  };
  const url = 'https://www.flipkart.com/gulab-gold-groundnut-oil/p/itm8dcd46eb45cbf?pid=EDOFYTWJ4AQZN2ZZ&marketplace=HYPERLOCAL&shopId=ahm_147_wh_hl_01&pageUID=1791355110081';
  const result = await new FlipkartExtractor().extract(page, url);

  assert.equal(result.price, 112000);
  assert.equal(navigatedUrls.length, 2);
  const fallbackUrl = new URL(navigatedUrls[1]);
  assert.equal(fallbackUrl.searchParams.get('pid'), 'EDOFYTWJ4AQZN2ZZ');
  assert.equal(fallbackUrl.searchParams.has('marketplace'), false);
  assert.equal(fallbackUrl.searchParams.has('shopId'), false);
  assert.equal(fallbackUrl.searchParams.has('pageUID'), false);
});
test('Flipkart unavailable product status is reported instead of a missing price', async () => {
  const page = fakePage({
    dom: { name: 'Flipkart SmartBuy Mouse', unavailable: true },
  });

  await assert.rejects(
    new FlipkartExtractor().extract(page, 'https://www.flipkart.com/p/itm1d606a891bdf0'),
    { code: 'PRODUCT_UNAVAILABLE' },
  );
});
test('extractor: typed errors, never a bad price', async () => {
  await assert.rejects(ex.extract(fakePage({}), 'u'), { code: 'PRICE_NOT_FOUND' });
  await assert.rejects(ex.extract(fakePage({ dom: { priceText: 'N/A' } }), 'u'), { code: 'PRICE_PARSE_FAILED' });
  await assert.rejects(ex.extract(fakePage({ dom: { unavailable: true } }), 'u'), { code: 'PRODUCT_UNAVAILABLE' });
  await assert.rejects(ex.extract(fakePage({ status: 404 }), 'u'), { code: 'PAGE_LOAD_FAILED' });
  await assert.rejects(ex.extract(fakePage({ status: 429 }), 'u'), { code: 'ACCESS_BLOCKED' });
  await assert.rejects(ex.extract(fakePage({ probe: 'Enter the characters: CAPTCHA' }), 'u'), { code: 'ACCESS_BLOCKED' });
  await assert.rejects(ex.extract(fakePage({ probe: 'Click the button below to continue shopping' }), 'u'), { code: 'ACCESS_BLOCKED' });
});

test('executeTask never throws even when everything is broken (one bad task cannot kill the worker)', async () => {
  const { executeTask } = await import('../../src/background/monitoring.worker.js');
  const task = { _id: 'x', userId: 'u', websiteDomain: 'a.test', productUrl: 'https://a.test', status: 'Running', endDate: new Date(Date.now() + 1e6), intervalMinutes: 60 };
  // No DB connected: every repository call fails. executeTask must swallow and return.
  await assert.doesNotReject(executeTask(task, { workerId: 'w', playwright: { withPage: async () => { throw new Error('x'); } } }));
});
