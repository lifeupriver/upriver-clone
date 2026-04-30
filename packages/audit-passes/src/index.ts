export { run as runSeo } from './seo/index.js';
export { run as runContent } from './content/index.js';
export { run as runDesign } from './design/index.js';
export { run as runSales } from './sales/index.js';
export { run as runLinks } from './links/index.js';
export { run as runSchema } from './schema/index.js';
export { run as runAeo } from './aeo/index.js';
export { run as runGeo } from './geo/index.js';
export { run as runTypography } from './typography/index.js';
export { run as runLocal } from './local/index.js';
export { run as runBacklinks } from './backlinks/index.js';
export { run as runCompetitors } from './competitors/index.js';
export { run as runMedia, buildInventory, summarizeInventory } from './media/index.js';
export type { ImageClassification, ImageRecord, MediaInventorySummary } from './media/index.js';
export {
  run as runGaps,
  detectFeatures,
  detectExpectedPages,
  FEATURE_CATALOG,
  VERTICAL_FEATURE_REQUIREMENTS,
} from './gaps/index.js';
export type { FeatureId, FeatureSpec, ExpectedPageMatch, DetectedFeatures } from './gaps/index.js';

export type { PageData, DesignTokens } from './shared/loader.js';
export { loadPages, loadDesignTokens, loadRawHtml } from './shared/loader.js';
export type { PassOptions, Vertical, VerticalPack } from './shared/vertical-pack.js';
export { getVerticalPack } from './shared/vertical-pack.js';
