export type FindingPriority = 'p0' | 'p1' | 'p2';
export type FindingEffort = 'light' | 'medium' | 'heavy';

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
