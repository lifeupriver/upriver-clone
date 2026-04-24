// Types
export * from './types/client-config.js';
export * from './types/firecrawl.js';
export * from './types/audit.js';
export * from './types/extraction-schemas.js';

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
