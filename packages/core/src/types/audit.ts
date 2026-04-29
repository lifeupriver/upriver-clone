export type FindingPriority = 'p0' | 'p1' | 'p2';
export type FindingEffort = 'light' | 'medium' | 'heavy';

/**
 * Estimated impact of resolving a finding. `scorePoints` is the rough lift on
 * the per-dimension score (0–100 scale) once shipped; `description` is a
 * human-readable phrase used in operator-facing reports. Both are heuristic —
 * default heuristic lives in `finding-builder.ts`.
 */
export interface EstimatedImpact {
  scorePoints: number;
  description: string;
}

export interface AuditFinding {
  id: string;
  dimension: string;
  priority: FindingPriority;
  effort: FindingEffort;
  title: string;
  description: string;
  why_it_matters: string;
  recommendation: string;
  evidence?: string;
  page?: string;
  affected_pages?: string[];
  estimatedImpact?: EstimatedImpact;
}

export type AuditDimension =
  | 'seo'
  | 'content'
  | 'design'
  | 'sales'
  | 'backlinks'
  | 'links'
  | 'schema'
  | 'aeo'
  | 'geo'
  | 'competitors'
  | 'local';

export interface AuditPassResult {
  dimension: AuditDimension;
  score: number;
  summary: string;
  findings: AuditFinding[];
  completed_at: string;
}

export interface UsageEvent {
  client_slug: string;
  event_type: 'firecrawl_scrape' | 'firecrawl_crawl' | 'firecrawl_map' | 'firecrawl_batch' | 'claude_api' | 'gsc_api' | 'ahrefs_api';
  model?: string;
  credits_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  command: string;
}
