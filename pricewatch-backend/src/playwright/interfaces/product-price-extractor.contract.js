/**
 * Contract every extractor must satisfy (JavaScript has no interfaces, so this is enforced by a test/helper).
 *
 * @typedef {Object} ExtractionResult
 * @property {string|null} productName
 * @property {number} price          integer minor units (paise/cents)
 * @property {string} currency       ISO code
 * @property {'InStock'|'OutOfStock'|'Unknown'} availability
 * @property {string|null} imageUrl
 *
 * interface IProductPriceExtractor { extract(page, url): Promise<ExtractionResult> }  // throws ExtractionError
 */
export function assertExtractor(obj) {
  if (!obj || typeof obj.extract !== 'function') throw new TypeError('Extractor must implement extract(page, url)');
  return obj;
}
