import { BaseExtractor } from './base.extractor.js';
import { SITE_SELECTORS } from '../extractor.config.js';

export class CromaExtractor extends BaseExtractor {
  constructor() { super(SITE_SELECTORS.croma); }
}
