import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FirecrawlClient, type FirecrawlClientOptions } from './client.js';
import { FirecrawlError } from '../errors.js';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function makeClient(overrides: Partial<FirecrawlClientOptions> & { fetchImpl: typeof fetch }) {
  return new FirecrawlClient({
    apiKey: 'test-key',
    clientSlug: 'test-client',
    command: 'test',
    pollIntervalMs: 1,
    ...overrides,
  });
}

/**
 * Fetch stub for batch-scrape flows: answers the initial POST with a job id,
 * then serves `polls` in order for every GET (repeating the last one).
 */
function batchFetch(polls: unknown[]): { impl: typeof fetch; getUrls: string[] } {
  const getUrls: string[] = [];
  let i = 0;
  const impl = ((input: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'j1' }));
    getUrls.push(String(input));
    const body = polls[Math.min(i, polls.length - 1)]!;
    i++;
    return Promise.resolve(jsonResponse(body));
  }) as typeof fetch;
  return { impl, getUrls };
}

describe('FirecrawlClient.batchScrape polling', () => {
  it('does not duplicate cumulative data reported across polls', async () => {
    const a = { url: 'https://a.com', markdown: 'a' };
    const b = { url: 'https://b.com', markdown: 'b' };
    // The API reports cumulative partial data while scraping — only the
    // terminal response may be accumulated.
    const { impl } = batchFetch([
      { status: 'scraping', completed: 1, data: [a] },
      { status: 'scraping', completed: 2, data: [a, b] },
      { status: 'completed', completed: 2, data: [a, b] },
    ]);
    const client = makeClient({ fetchImpl: impl });
    const results = await client.batchScrape(['https://a.com', 'https://b.com'], {
      formats: ['markdown'],
    });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.url).sort(), ['https://a.com', 'https://b.com']);
  });

  it('follows `next` pagination once the job completes', async () => {
    const { impl, getUrls } = batchFetch([
      { status: 'scraping', data: [{ url: 'https://a.com' }] },
      {
        status: 'completed',
        data: [{ url: 'https://a.com' }],
        next: 'https://api.firecrawl.dev/v1/batch/scrape/j1?skip=1',
      },
      { status: 'completed', data: [{ url: 'https://b.com' }] },
    ]);
    const client = makeClient({ fetchImpl: impl });
    const results = await client.batchScrape(['https://a.com', 'https://b.com'], {
      formats: ['markdown'],
    });
    assert.deepEqual(results.map((r) => r.url), ['https://a.com', 'https://b.com']);
    assert.equal(getUrls[2], 'https://api.firecrawl.dev/v1/batch/scrape/j1?skip=1');
  });

  it('throws after the poll budget is exhausted, reporting pages scraped', async () => {
    const { impl } = batchFetch([
      { status: 'scraping', completed: 3, data: [{ url: 'https://a.com' }] },
    ]);
    const client = makeClient({ fetchImpl: impl, pollMaxAttempts: 3 });
    await assert.rejects(
      client.batchScrape(['https://a.com'], { formats: ['markdown'] }),
      (err: unknown) => {
        assert.ok(err instanceof FirecrawlError);
        assert.match(err.message, /timed out after 3 polls/);
        assert.match(err.message, /3 page\(s\) had been scraped/);
        return true;
      },
    );
  });
});

describe('FirecrawlClient request timeout', () => {
  it('aborts a hung request after requestTimeoutMs and retries', async () => {
    let aborted = false;
    let attempts = 0;
    const impl = ((_input: unknown, init?: RequestInit) => {
      attempts++;
      if (attempts === 1) {
        // Hang until the client-side timeout fires the abort signal.
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('This operation was aborted', 'AbortError'));
          });
        });
      }
      return Promise.resolve(jsonResponse({ links: ['https://a.com/x'] }));
    }) as typeof fetch;

    const client = makeClient({ fetchImpl: impl, requestTimeoutMs: 25 });
    const result = await client.map('https://a.com');
    assert.equal(aborted, true);
    assert.equal(attempts, 2);
    assert.deepEqual(result.urls, ['https://a.com/x']);
  });
});
