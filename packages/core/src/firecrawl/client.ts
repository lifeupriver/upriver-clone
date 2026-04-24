import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  FirecrawlScrapeResult,
  FirecrawlMapResult,
  ScrapeOptions,
} from '../types/firecrawl.js';
import type { UsageEvent } from '../types/audit.js';
import { logUsageEvent } from '../usage/logger.js';

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';

export interface FirecrawlClientOptions {
  apiKey: string;
  clientSlug: string;
  command: string;
  creditLogPath?: string;
}

export class FirecrawlClient {
  private apiKey: string;
  private clientSlug: string;
  private command: string;
  private creditLogPath?: string;

  constructor(opts: FirecrawlClientOptions) {
    this.apiKey = opts.apiKey;
    this.clientSlug = opts.clientSlug;
    this.command = opts.command;
    if (opts.creditLogPath !== undefined) this.creditLogPath = opts.creditLogPath;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${FIRECRAWL_BASE_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firecrawl ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  private logCredit(event_type: UsageEvent['event_type'], credits: number, extra?: string) {
    const entry = `${new Date().toISOString()} [${event_type}] credits=${credits} slug=${this.clientSlug} cmd=${this.command}${extra ? ' ' + extra : ''}\n`;

    if (this.creditLogPath) {
      try {
        mkdirSync(dirname(this.creditLogPath), { recursive: true });
        appendFileSync(this.creditLogPath, entry);
      } catch {
        // non-fatal
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
      data?: FirecrawlScrapeResult[];
      next?: string;
    }

    const allResults: FirecrawlScrapeResult[] = [];
    let nextUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;

      const url = nextUrl ?? `/v1/batch/scrape/${jobId}`;
      const poll = await this.request<PollResponse>(url, 'GET');

      if (poll.data) {
        allResults.push(...poll.data);
      }

      if (poll.status === 'completed') {
        if (poll.next) {
          nextUrl = poll.next;
          continue;
        }
        break;
      }

      if (poll.status === 'failed') {
        throw new Error(`Batch scrape job ${jobId} failed`);
      }
    }

    return allResults;
  }

  private estimateScrapeCredits(options: ScrapeOptions): number {
    let credits = 1;
    if (options.formats.includes('json')) credits += 4;
    if (options.formats.includes('screenshot')) credits += 1;
    if (options.formats.includes('branding')) credits += 1;
    return credits;
  }
}
