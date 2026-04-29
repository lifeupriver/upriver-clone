import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { logUsageEvent } from '../usage/logger.js';

// Minimum-fields schema for a Google service account JSON. We only validate
// the fields googleapis actually requires; extra fields pass through.
const ServiceAccountKeyZ = z
  .object({
    type: z.literal('service_account'),
    client_email: z.string().email(),
    private_key: z.string().min(1),
  })
  .passthrough();

export interface GscQueryRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscData {
  top_queries: GscQueryRow[];
  top_pages: GscQueryRow[];
  coverage_summary: {
    valid: number;
    warning: number;
    error: number;
    excluded: number;
  } | null;
}

export async function fetchGscData(
  property: string,
  clientSlug: string,
  command: string,
): Promise<GscData> {
  const keyPath = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'];
  if (!keyPath) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY env var is not set. Set it to the path of your Google service account JSON file (download from Google Cloud Console → IAM → Service Accounts).',
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(keyPath, 'utf8'));
  } catch (err) {
    throw new Error(
      `Failed to read or parse service account key at ${keyPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const parsed = ServiceAccountKeyZ.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(
      `Service account key at ${keyPath} is missing required fields (${issues}). Expected a Google service account JSON with type, client_email, and private_key.`,
    );
  }
  const auth = new google.auth.GoogleAuth({
    credentials: parsed.data,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [queriesRes, pagesRes] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl: property,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 50,
        startRow: 0,
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl: property,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 50,
        startRow: 0,
      },
    }),
  ]);

  void logUsageEvent({ client_slug: clientSlug, event_type: 'gsc_api', command });

  const mapRow = (r: typeof queriesRes.data.rows extends Array<infer T> | undefined ? T : never): GscQueryRow => ({
    keys: r?.keys ?? [],
    clicks: r?.clicks ?? 0,
    impressions: r?.impressions ?? 0,
    ctr: r?.ctr ?? 0,
    position: r?.position ?? 0,
  });

  return {
    top_queries: (queriesRes.data.rows ?? []).map(mapRow),
    top_pages: (pagesRes.data.rows ?? []).map(mapRow),
    coverage_summary: null,
  };
}
