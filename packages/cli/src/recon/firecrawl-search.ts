import type { SearchResult } from './types.js';

const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search';

interface FirecrawlSearchItem {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
  metadata?: { title?: string; description?: string };
}

/**
 * Minimal Firecrawl `/v1/search` wrapper for the serp adapter. `FirecrawlClient`
 * exposes scrape/map but not search, and core is read-only for this build, so the
 * recon command injects this as the `SearchFn`. Kept tiny and dependency-free.
 */
export async function firecrawlSearch(
  apiKey: string,
  query: string,
  opts?: { limit?: number },
): Promise<SearchResult[]> {
  const res = await fetch(FIRECRAWL_SEARCH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: opts?.limit ?? 10 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl search ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { data?: FirecrawlSearchItem[]; results?: FirecrawlSearchItem[] };
  const items = data.data ?? data.results ?? [];
  return items
    .filter((it) => Boolean(it.url))
    .map((it) => {
      const result: SearchResult = { title: it.title ?? it.metadata?.title ?? it.url!, url: it.url! };
      const description = it.description ?? it.metadata?.description;
      if (description) result.description = description;
      if (it.markdown) result.markdown = it.markdown;
      return result;
    });
}
