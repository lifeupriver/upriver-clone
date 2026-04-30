// Types
export * from './types/client-config.js';
export * from './types/firecrawl.js';
export * from './types/audit.js';
export * from './types/audit-package.js';
export * from './types/intake.js';
export * from './types/voice.js';
export * from './types/extraction-schemas.js';
export {
  CtaButtonZ,
  ContactZ,
  TeamMemberZ,
  TestimonialZ,
  FaqZ,
  PricingItemZ,
  SocialLinkZ,
  EventSpaceZ,
  ExtractedZ,
  coerceArray,
} from './types/extraction-zod.js';
export type { Extracted } from './types/extraction-zod.js';

// Firecrawl
export { FirecrawlClient } from './firecrawl/client.js';
export type { FirecrawlClientOptions } from './firecrawl/client.js';
export { detectPlatform } from './firecrawl/platform-detector.js';

// GSC
export { fetchGscData } from './gsc/client.js';
export type { GscData, GscQueryRow } from './gsc/client.js';

// Config
export {
  clientDir,
  configPath,
  readClientConfig,
  writeClientConfig,
  updateClientConfig,
} from './config/client-config.js';

// Usage
export { logUsageEvent, formatCost } from './usage/logger.js';

// Util
export { assertPathInside } from './util/paths.js';
export { flagsToArgs } from './util/flags.js';

// Errors
export { UpriverError, ConfigError, FirecrawlError } from './errors.js';
export type { UpriverErrorOptions } from './errors.js';

// Skills registry (workstream H.3)
export {
  MARKETING_SKILLS,
  UPRIVER_SKILLS,
  ALL_SKILLS,
  getSkill,
  hasSkill,
} from './skills/registry.js';
export type { SkillEntry, Workstream } from './skills/registry.js';

// Pipeline (G.7 — single source of truth for stage list)
export { PIPELINE_STAGES, findStage } from './pipeline/stages.js';
export type { PipelineStage, PipelineStageId } from './pipeline/stages.js';

// Interview form parser (shared between CLI and dashboard)
export {
  parseInterviewGuide,
  summarizeProgress,
  responsesToTranscriptMarkdown,
} from './interview/parse-guide.js';
export type { FormSpec, FormSection, FormItem } from './interview/parse-guide.js';
