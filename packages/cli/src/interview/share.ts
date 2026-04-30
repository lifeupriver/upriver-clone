/**
 * Interview-link share token, file-backed at
 * `clients/<slug>/interview-share.json`. Mirrors the report-share pattern so
 * the dashboard can validate without a Postgres roundtrip.
 *
 * One token per client, regenerated only when the file is missing or
 * corrupt. The dashboard's interview form route checks the `?token=` query
 * against this file before rendering.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { clientDir } from '@upriver/core';

export interface InterviewShareInfo {
  token: string;
  createdAt: string;
  baseUrl: string;
}

function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function loadOrCreateInterviewShare(
  slug: string,
  baseUrl: string,
): InterviewShareInfo {
  const dir = clientDir(slug, resolveClientsBase());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'interview-share.json');

  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as InterviewShareInfo;
      if (
        typeof parsed.token === 'string' &&
        parsed.token.length >= 16 &&
        typeof parsed.createdAt === 'string' &&
        typeof parsed.baseUrl === 'string'
      ) {
        return parsed;
      }
    } catch {
      /* fall through and rewrite */
    }
  }

  const info: InterviewShareInfo = {
    token: randomBytes(24).toString('base64url'),
    createdAt: new Date().toISOString(),
    baseUrl: stripTrailingSlash(baseUrl),
  };
  writeFileSync(path, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  return info;
}

export function readInterviewShare(slug: string): InterviewShareInfo | null {
  const dir = clientDir(slug, resolveClientsBase());
  const path = join(dir, 'interview-share.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as InterviewShareInfo;
  } catch {
    return null;
  }
}

export function buildInterviewUrl(slug: string, info: InterviewShareInfo): string {
  const base = stripTrailingSlash(info.baseUrl);
  return `${base}/deliverables/${slug}/interview?token=${encodeURIComponent(info.token)}`;
}
