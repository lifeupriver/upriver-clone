import type { AuditPackage } from '@upriver/core';
import type { FindingPriority } from '@upriver/core';

import { resolveClientDataSource } from './data-source.js';

/**
 * Read the full audit-package.json for a client.
 *
 * @param slug - Client slug.
 * @returns Parsed AuditPackage, or null if the file is missing or invalid JSON.
 */
export async function readAuditPackage(slug: string): Promise<AuditPackage | null> {
  const text = await resolveClientDataSource().readClientFileText(
    slug,
    'audit-package.json',
  );
  if (!text) return null;
  try {
    return JSON.parse(text) as AuditPackage;
  } catch {
    return null;
  }
}

/**
 * Read the executive-summary narrative for a client.
 *
 * Resolution order:
 *   1. clients/<slug>/executive-summary.md — the dedicated standalone file
 *      written by `upriver synthesize` alongside `audit-package.json`. This
 *      is the canonical source as of workstream A.4.
 *   2. The "Executive summary" or "What's working" section of
 *      clients/<slug>/docs/brand-voice-guide.md, captured from the heading
 *      to the next H1 or end of file. Kept as a backward-compat fallback for
 *      audit packages produced before the standalone file existed.
 *
 * @param slug - Client slug.
 * @returns Markdown body, or null if no source is available.
 */
export async function readExecutiveSummary(slug: string): Promise<string | null> {
  const ds = resolveClientDataSource();

  const direct = await ds.readClientFileText(slug, 'executive-summary.md');
  if (direct) return direct;

  const fallback = await ds.readClientFileText(slug, 'docs/brand-voice-guide.md');
  if (!fallback) return null;

  const lines = fallback.split('\n');
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
