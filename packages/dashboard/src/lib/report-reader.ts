import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditPackage } from '@upriver/core';
import type { FindingPriority } from '@upriver/core';
import { getClientsBase } from './fs-reader.js';

/**
 * Read the full audit-package.json for a client.
 *
 * @param slug - Client slug (directory name under the clients base path).
 * @returns Parsed AuditPackage, or null if the file is missing or invalid JSON.
 */
export function readAuditPackage(slug: string): AuditPackage | null {
  const path = join(getClientsBase(), slug, 'audit-package.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as AuditPackage;
  } catch {
    return null;
  }
}

/**
 * Read the executive-summary narrative for a client.
 *
 * Resolution order:
 *   1. clients/<slug>/executive-summary.md (written by a later workstream).
 *   2. The "Executive summary" or "What's working" section of
 *      clients/<slug>/docs/brand-voice-guide.md, captured from the heading
 *      to the next H1 or end of file.
 *
 * @param slug - Client slug.
 * @returns Markdown body, or null if no source is available.
 */
export function readExecutiveSummary(slug: string): string | null {
  const base = getClientsBase();
  const direct = join(base, slug, 'executive-summary.md');
  if (existsSync(direct)) {
    try {
      return readFileSync(direct, 'utf8');
    } catch {
      // fall through to the brand-voice-guide fallback
    }
  }

  const fallback = join(base, slug, 'docs', 'brand-voice-guide.md');
  if (!existsSync(fallback)) return null;

  let raw: string;
  try {
    raw = readFileSync(fallback, 'utf8');
  } catch {
    return null;
  }

  const lines = raw.split('\n');
  const startIdx = lines.findIndex(
    (l) => /^##\s+executive\s+summary\b/i.test(l) || /^##\s+what['’]s\s+working\b/i.test(l),
  );
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^#\s+/.test(lines[i] ?? '')) {
      endIdx = i;
      break;
    }
  }

  const section = lines.slice(startIdx, endIdx).join('\n').trim();
  return section.length > 0 ? section : null;
}

export interface ClientFacingPriority {
  label: 'Critical' | 'Important' | 'Polish';
  pill: 'pill-accent' | 'pill-muted' | 'pill-ghost';
}

/**
 * Map an internal finding priority to a client-facing label and pill class.
 *
 * @param p - Internal priority (`p0` | `p1` | `p2`).
 * @returns Object with a human-readable `label` and a `pill` CSS class.
 */
export function clientFacingPriority(p: FindingPriority): ClientFacingPriority {
  if (p === 'p0') return { label: 'Critical', pill: 'pill-accent' };
  if (p === 'p1') return { label: 'Important', pill: 'pill-muted' };
  return { label: 'Polish', pill: 'pill-ghost' };
}
