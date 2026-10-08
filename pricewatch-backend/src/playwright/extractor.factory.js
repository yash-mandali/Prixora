import { env } from '../config/environment.js';
import { normalizeDomain } from '../utils/url.utils.js';
import { ExtractionError } from './errors.js';
import { assertExtractor } from './interfaces/product-price-extractor.contract.js';
import { SITE_SELECTORS } from './extractor.config.js';
import { AmazonExtractor } from './extractors/amazon.extractor.js';
import { FlipkartExtractor } from './extractors/flipkart.extractor.js';
import { MyntraExtractor } from './extractors/myntra.extractor.js';
import { CromaExtractor } from './extractors/croma.extractor.js';
import { GenericExtractor } from './extractors/generic.extractor.js';

const registry = [
  { domains: SITE_SELECTORS.amazon.domains, extractor: assertExtractor(new AmazonExtractor()) },
  { domains: SITE_SELECTORS.flipkart.domains, extractor: assertExtractor(new FlipkartExtractor()) },
  { domains: SITE_SELECTORS.myntra.domains, extractor: assertExtractor(new MyntraExtractor()) },
  { domains: SITE_SELECTORS.croma.domains, extractor: assertExtractor(new CromaExtractor()) },
];
const generic = assertExtractor(new GenericExtractor());

/** Select the extractor for a URL's domain; throws UNSUPPORTED_SITE when none applies. */
export function getExtractor(url) {
  const host = normalizeDomain(url);
  const hit = registry.find((r) => r.domains.some((d) => host === d || host.endsWith(`.${d}`)));
  if (hit) return hit.extractor;
  if (env.ALLOW_GENERIC_EXTRACTOR) return generic;
  throw new ExtractionError('UNSUPPORTED_SITE', host);
}
