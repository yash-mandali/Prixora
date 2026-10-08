import { BaseExtractor } from './base.extractor.js';
import { SITE_SELECTORS } from '../extractor.config.js';

export class FlipkartExtractor extends BaseExtractor {
  constructor() { super(SITE_SELECTORS.flipkart); }

  async extract(page, url) {
    const productUrl = new URL(url);
    const isHyperlocal = productUrl.searchParams.get('marketplace')?.toUpperCase() === 'HYPERLOCAL';
    if (!isHyperlocal) return super.extract(page, url);

    const standardProductUrl = new URL(productUrl);
    standardProductUrl.searchParams.delete('marketplace');
    standardProductUrl.searchParams.delete('shopId');
    standardProductUrl.searchParams.delete('pageUID');

    try {
      return await super.extract(page, url);
    } catch (error) {
      if (!['PRICE_NOT_FOUND', 'PRICE_PARSE_FAILED'].includes(error?.code)) throw error;
      return super.extract(page, standardProductUrl.toString());
    }
  }
}
