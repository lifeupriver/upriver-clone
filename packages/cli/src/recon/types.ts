import type {
  ClientConfig,
  FirecrawlScrapeResult,
  ScrapeOptions,
} from '@upriver/core';
import type { ClientDataSource } from '@upriver/core/data';
import type { ClientProfile, Confidence } from '@upriver/schemas';

/**
 * The six recon adapters (build spec 04 §1). Every adapter implements the same
 * `gather` → `extract` contract; `secret-shopper` is a scaffold this build
 * (separate `recon secret-shopper start|record` commands, not part of the
 * default adapter run).
 */
export type ReconAdapterId =
  | 'website'
  | 'gbp'
  | 'socials'
  | 'geo'
  | 'serp'
  | 'secret-shopper';

/**
 * A candidate profile value produced by an adapter, addressed by an object-key
 * dot-path into `ClientProfile` (e.g. `identity.hours`). Recon candidates always
 * carry `source: 'recon'` (the lowest merge precedence — they fill gaps, never
 * overwrite). Confidence is set per adapter; `evidence` is a quote or URL backing
 * the value. The recon write path never sets `verified` — HV fields land
 * unverified and wait for an operator (build spec 03).
 */
export interface PathedCandidate {
  path: string;
  value: unknown;
  source: 'recon';
  confidence?: Confidence;
  evidence?: string;
}

/** Scrape one URL. Injected so adapters run offline in tests (build spec 04 §3). */
export type ScrapeFn = (url: string, options: ScrapeOptions) => Promise<FirecrawlScrapeResult>;

/** One web-search hit (title + url, optionally hydrated with page content). */
export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  markdown?: string;
}

/** Web search (serp adapter). Injected; offline in tests. */
export type SearchFn = (query: string, opts?: { limit?: number }) => Promise<SearchResult[]>;

/** A read-only, structured-output LLM call. Returns the model's reply text. */
export interface LlmRequest {
  /** Command label for usage logging. */
  command: string;
  systemPrompt: string;
  userPrompt: string;
  /** JSON-Schema passed to `claude --json-schema` so output is structurally valid. */
  jsonSchema?: unknown;
}
export type LlmFn = (req: LlmRequest) => Promise<string>;

/**
 * Everything an adapter needs, with the external surfaces (scrape, search, llm,
 * data source) injected. The command wires the real implementations; tests inject
 * fakes that replay recorded fixtures — so `gather`/`extract` never touch the
 * network under test (build spec 04 §3 DoD).
 */
export interface ReconContext {
  slug: string;
  config: ClientConfig;
  /** The current profile — may be freshly created/empty; recon often runs first. */
  profile: ClientProfile;
  /** ISO timestamp for this run, injected so orchestration stays pure-ish. */
  now: string;
  /** Re-gather even when cached evidence exists (e.g. website `pages/` reuse). */
  fresh: boolean;
  log: (msg: string) => void;
  ds: ClientDataSource;
  scrape: ScrapeFn;
  search: SearchFn;
  llm: LlmFn;
}

/** Raw evidence an adapter gathered: persisted file paths + the in-memory payload. */
export interface RawEvidence {
  id: ReconAdapterId;
  /** Paths (relative to `clients/<slug>/`) of evidence written by `gather`. */
  files: string[];
  /** Structured payload handed to `extract`. */
  payload: unknown;
}

/**
 * The adapter contract (build spec 04 §1). `gather` persists raw evidence under
 * `clients/<slug>/recon/<id>/` via the data source; `extract` turns it into
 * dot-pathed `source: 'recon'` candidates. A throwing adapter is isolated by the
 * orchestrator — partial failure never aborts the run.
 */
export interface ReconAdapter {
  id: ReconAdapterId;
  gather(ctx: ReconContext): Promise<RawEvidence>;
  extract(evidence: RawEvidence, ctx: ReconContext): Promise<PathedCandidate[]>;
}
