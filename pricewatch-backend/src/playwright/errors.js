export const EXTRACTION_ERRORS = Object.freeze({
  UNSUPPORTED_SITE: { message: 'Unsupported website', permanent: true },
  PAGE_LOAD_FAILED: { message: 'Page load failed', permanent: false },
  TIMEOUT: { message: 'Page load timed out', permanent: false },
  ACCESS_BLOCKED: { message: 'Website blocked automated access', permanent: false },
  PRICE_NOT_FOUND: { message: 'Price element not found', permanent: false },
  PRICE_PARSE_FAILED: { message: 'Price extraction failed', permanent: false },
  PRODUCT_UNAVAILABLE: { message: 'Product unavailable', permanent: false },
});

export class ExtractionError extends Error {
  constructor(code, detail) {
    const meta = EXTRACTION_ERRORS[code] || { message: 'Extraction failed', permanent: false };
    super(detail ? `${meta.message}: ${detail}` : meta.message);
    this.name = 'ExtractionError';
    this.code = code;
    this.permanent = meta.permanent;
  }
}
