import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { logUsageEvent } from '../usage/logger.js';

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
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set');
  }

  const keyFile = JSON.parse(readFileSync(keyPath, 'utf8')) as Record<string, string>;
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
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
