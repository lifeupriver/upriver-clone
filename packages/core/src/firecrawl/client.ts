import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  FirecrawlScrapeResult,
  FirecrawlMapResult,
  ScrapeOptions,
} from '../types/firecrawl.js';
import type { UsageEvent } from '../types/audit.js';
import { logUsageEvent } from '../usage/logger.js';
import { FirecrawlError } from '../errors.js';

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
// ~30 min at the default interval — large sites legitimately take that long.
const DEFAULT_POLL_MAX_ATTEMPTS = 600;

export interface FirecrawlClientOptions {
  apiKey: string;
  clientSlug: string;
  command: string;
  creditLogPath?: string;
  /** Per-request timeout in ms. Defaults to 60s. */
  requestTimeoutMs?: number;
  /** Delay between batch-job status polls in ms. Defaults to 3s. */
  pollIntervalMs?: number;
  /** Max batch-job status polls before giving up. Defaults to 600 (~30 min). */
  pollMaxAttempts?: number;
  /** Injectable fetch for tests. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

export class FirecrawlClient {
  private apiKey: string;
  private clientSlug: string;
  private command: string;
  private creditLogPath?: string;
  private requestTimeoutMs: number;
  private pollIntervalMs: number;
  private pollMaxAttempts: number;
  private fetchImpl: typeof fetch;

  constructor(opts: FirecrawlClientOptions) {
    this.apiKey = opts.apiKey;
    this.clientSlug = opts.clientSlug;
    this.command = opts.command;
    if (opts.creditLogPath !== undefined) this.creditLogPath = opts.creditLogPath;
    this.requestTimeoutMs = opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.pollMaxAttempts = opts.pollMaxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${FIRECRAWL_BASE_URL}${path}`;
    const maxAttempts = 4;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Per-attempt timeout so a hung connection can't stall a run forever.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          ...(body != null ? { body: JSON.stringify(body) } : {}),
        });

        if (res.ok) return (await res.json()) as T;

        // Retry transient failures (429 rate limit, 5xx). Honor Retry-After when
        // the server provides it; otherwise exponential backoff with jitter.
        if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
          const retryAfter = res.headers.get('retry-after');
          const wait = parseRetryAfter(retryAfter) ?? backoffMs(attempt);
          await sleep(wait);
          continue;
        }

        const text = await res.text();
        throw new FirecrawlError(`Firecrawl ${method} ${path} → ${res.status}: ${text}`, {
          context: { method, path, status: res.status, body: text.slice(0, 500) },
        });
      } catch (err) {
        // Network errors (DNS, ECONNRESET) throw TypeError; our per-request
        // timeout surfaces as an AbortError. Both are transient — retry.
        const timedOut = err instanceof Error && err.name === 'AbortError';
        lastErr = timedOut
          ? new FirecrawlError(
              `Firecrawl ${method} ${path} timed out after ${this.requestTimeoutMs}ms`,
              { context: { method, path, timeoutMs: this.requestTimeoutMs }, cause: err },
            )
          : err;
        const transient = timedOut || err instanceof TypeError;
        if (transient && attempt < maxAttempts) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw lastErr;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(`Firecrawl ${method} ${path}: retries exhausted`);
  }

  private logCredit(event_type: UsageEvent['event_type'], credits: number, extra?: string) {
    const entry = `${new Date().toISOString()} [${event_type}] credits=${credits} slug=${this.clientSlug} cmd=${this.command}${extra ? ' ' + extra : ''}\n`;

    if (this.creditLogPath) {
      try {
        mkdirSync(dirname(this.creditLogPath), { recursive: true });
        appendFileSync(this.creditLogPath, entry);
      } catch (err) {
        // Non-fatal — Supabase log below still captures the event. Surface
        // the failure on stderr so misconfigured paths aren't silent.
        console.warn(
          `[firecrawl] failed to write credit log at ${this.creditLogPath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    void logUsageEvent({
      client_slug: this.clientSlug,
      event_type,
      credits_used: credits,
      command: this.command,
    });
  }

  async map(url: string): Promise<FirecrawlMapResult> {
    interface MapResponse {
      links?: string[];
      urls?: string[];
    }
    const data = await this.request<MapResponse>('/v1/map', 'POST', { url });
    const urls = data.links ?? data.urls ?? [];
    this.logCredit('firecrawl_map', 2, `url=${url} pages=${urls.length}`);
    return { urls };
  }

  async scrape(url: string, options: ScrapeOptions): Promise<FirecrawlScrapeResult> {
    interface ScrapeResponse {
      data?: FirecrawlScrapeResult;
      markdown?: string;
      html?: string;
      rawHtml?: string;
      screenshot?: string;
      links?: FirecrawlScrapeResult['links'];
      images?: string[];
      summary?: string;
      branding?: FirecrawlScrapeResult['branding'];
      json?: Record<string, unknown>;
      metadata?: FirecrawlScrapeResult['metadata'];
    }
    const payload: Record<string, unknown> = { url, formats: options.formats };
    if (options.onlyMainContent !== undefined) payload['onlyMainContent'] = options.onlyMainContent;
    if (options.screenshot) payload['screenshot'] = options.screenshot;
    if (options.jsonOptions) payload['jsonOptions'] = options.jsonOptions;
    if (options.actions) payload['actions'] = options.actions;
    if (options.waitFor) payload['waitFor'] = options.waitFor;
    if (options.timeout) payload['timeout'] = options.timeout;

    const raw = await this.request<ScrapeResponse>('/v1/scrape', 'POST', payload);
    const result = (raw.data ?? raw) as FirecrawlScrapeResult;
    result.url = url;

    const credits = this.estimateScrapeCredits(options);
    this.logCredit('firecrawl_scrape', credits, `url=${url} formats=${options.formats.join(',')}`);

    return result;
  }

  async batchScrape(
    urls: string[],
    options: ScrapeOptions,
    onPage?: (result: FirecrawlScrapeResult) => Promise<void>,
  ): Promise<FirecrawlScrapeResult[]> {
    interface BatchResponse {
      id?: string;
      data?: FirecrawlScrapeResult[];
      status?: string;
      next?: string;
    }

    const payload: Record<string, unknown> = { urls, formats: options.formats };
    if (options.onlyMainContent !== undefined) payload['onlyMainContent'] = options.onlyMainContent;
    if (options.jsonOptions) payload['jsonOptions'] = options.jsonOptions;

    const initial = await this.request<BatchResponse>('/v1/batch/scrape', 'POST', payload);

    let results: FirecrawlScrapeResult[] = [];

    if (initial.data) {
      results = initial.data;
    } else if (initial.id) {
      // Poll until complete
      results = await this.pollBatchJob(initial.id);
    }

    // Normalize URL: Firecrawl sometimes puts it in metadata.sourceURL or metadata.url
    for (const r of results) {
      if (!r.url) {
        r.url = r.metadata?.sourceURL ?? r.metadata?.url ?? '';
      }
    }

    const credits = this.estimateScrapeCredits(options) * urls.length;
    this.logCredit('firecrawl_batch', credits, `pages=${urls.length} formats=${options.formats.join(',')}`);

    if (onPage) {
      for (const r of results) {
        await onPage(r);
      }
    }

    return results;
  }

  private async pollBatchJob(jobId: string): Promise<FirecrawlScrapeResult[]> {
    interface PollResponse {
      status: string;
      completed?: number;
      data?: FirecrawlScrapeResult[];
      next?: string;
    }

    const allResults: FirecrawlScrapeResult[] = [];
    let nextUrl: string | undefined;
    let attempts = 0;
    let pagesSeen = 0;
    const maxAttempts = this.pollMaxAttempts;

    while (attempts < maxAttempts) {
      await sleep(this.pollIntervalMs);
      attempts++;

      const url = nextUrl ?? `/v1/batch/scrape/${jobId}`;
      const poll = await this.request<PollResponse>(url, 'GET');
      pagesSeen = Math.max(pagesSeen, poll.completed ?? poll.data?.length ?? 0);

      if (poll.status === 'completed') {
        // Only accumulate on the terminal status: while still scraping, the
        // API reports cumulative partial data, so pushing it every poll would
        // duplicate pages. Completed responses paginate via `next`.
        if (poll.data) {
          allResults.push(...poll.data);
        }
        if (poll.next) {
          nextUrl = poll.next;
          continue;
        }
        return allResults;
      }

      if (poll.status === 'failed') {
        throw new FirecrawlError(`Batch scrape job ${jobId} failed`, {
          context: { jobId },
        });
      }
    }

    // Exhausted the poll budget — fail loudly rather than silently returning
    // partial results.
    const minutes = Math.round((maxAttempts * this.pollIntervalMs) / 60_000);
    throw new FirecrawlError(
      `Batch scrape job ${jobId} timed out after ${maxAttempts} polls (~${minutes} min); ` +
        `${pagesSeen} page(s) had been scraped before the timeout`,
      {
        context: {
          jobId,
          attempts: maxAttempts,
          pollIntervalMs: this.pollIntervalMs,
          pagesScraped: pagesSeen,
        },
      },
    );
  }

  private estimateScrapeCredits(options: ScrapeOptions): number {
    let credits = 1;
    if (options.formats.includes('json')) credits += 4;
    if (options.formats.includes('screenshot')) credits += 1;
    if (options.formats.includes('branding')) credits += 1;
    return credits;
  }
}

function backoffMs(attempt: number): number {
  // 1s, 2s, 4s base + up to ~30% jitter so concurrent retries don't synchronize.
  const base = 1000 * Math.pow(2, attempt - 1);
  return Math.round(base + Math.random() * base * 0.3);
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number.parseFloat(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  // HTTP-date form (rare for 429); ignore — fall back to backoff.
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
