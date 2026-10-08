import { BaseExtractor } from './base.extractor.js';

/** Works on any site that publishes schema.org Product JSON-LD or price meta tags. */
export class GenericExtractor extends BaseExtractor {
  constructor() { super({}); }
}
