// Pitch teaser deliverables (Spec 19 §6). Four short prospect-facing docs
// generated through the normal engine (same hedging, same identity assert,
// same manifest) but NEVER part of --all/--web — `pitch run` generates them
// one by one. Generation sessions run in an empty staging dir, so the audit
// findings, scraped homepage copy, and vertical pack arrive as an extra
// user-prompt section built here from the client artifacts.

import { parse as parseYaml } from 'yaml';
import type { DeliverableId } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';
import type { AuditFinding, ClientConfig } from '@upriver/core';
import { getVerticalPack } from '@upriver/audit-passes';

export const PITCH_DOCS: readonly DeliverableId[] = [
  'doc-pitch-01',
  'doc-pitch-02',
  'doc-pitch-03',
  'doc-pitch-04',
];

export function isPitchDoc(id: DeliverableId | string): boolean {
  return (PITCH_DOCS as readonly string[]).includes(id);
}

/** Ceiling on the injected context — teasers are short; their context is too. */
export const PITCH_CONTEXT_MAX_CHARS = 24_000;

const FINDINGS_LIMIT = 8;
const PRIORITY_ORDER: Record<string, number> = { p0: 0, p1: 1, p2: 2 };

async function readJson<T>(ds: ClientDataSource, slug: string, path: string): Promise<T | null> {
  const raw = await ds.readClientFileText(slug, path);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function renderFindings(findings: AuditFinding[] | undefined): string {
  if (!findings || findings.length === 0) {
    return '(no audit findings are available for this prospect)';
  }
  const top = [...findings]
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, FINDINGS_LIMIT);
  return top
    .map(
      (f) =>
        `- [${f.priority}] ${f.title} — ${f.description} Why it matters: ${f.why_it_matters} Recommended fix: ${f.recommendation}`,
    )
    .join('\n');
}

function renderVertical(config: ClientConfig | null): string {
  const pack = getVerticalPack(config?.vertical);
  const topics = pack.expectedTopics
    .slice(0, 5)
    .map((t) => `- ${t.label}`)
    .join('\n');
  const pages = pack.expectedPages
    .slice(0, 5)
    .map((p) => `- ${p.label}`)
    .join('\n');
  return [
    `Vertical: ${config?.vertical ?? 'generic'} (${pack.noun}; typical buyer: ${pack.buyer})`,
    `Example buyer question: ${pack.exampleBuyerQuestion}`,
    `Example search: ${pack.searchQueryExample}`,
    `Pages a serious site in this vertical has:\n${pages}`,
    `Topics buyers ask about:\n${topics}`,
  ].join('\n');
}

/**
 * Build the `## Pitch recon context` user-prompt section for a teaser
 * generation session: top audit findings (p0 first), the scraped homepage
 * copy, and the vertical pack snapshot. Missing artifacts degrade to honest
 * placeholders — the specs tell the model what to do with thin context.
 */
export async function buildPitchContext(ds: ClientDataSource, slug: string): Promise<string> {
  const pkg = await readJson<{ findings?: AuditFinding[] }>(ds, slug, 'audit-package.json');
  const home = await readJson<{ url?: string; content?: { markdown?: string } }>(
    ds,
    slug,
    'pages/home.json',
  );
  const configRaw = await ds.readClientFileText(slug, 'client-config.yaml');
  let config: ClientConfig | null = null;
  if (configRaw) {
    try {
      config = parseYaml(configRaw) as ClientConfig;
    } catch {
      config = null;
    }
  }

  const homeCopy = home?.content?.markdown?.trim()
    ? home.content.markdown.trim()
    : '(no scraped homepage copy is available for this prospect)';

  const sections = [
    '### Homepage audit findings (highest priority first)',
    renderFindings(pkg?.findings),
    `### Scraped homepage copy${home?.url ? ` (${home.url})` : ''}`,
    homeCopy,
    '### Vertical context',
    renderVertical(config),
  ];

  let out = sections.join('\n\n');
  if (out.length > PITCH_CONTEXT_MAX_CHARS) {
    out = `${out.slice(0, PITCH_CONTEXT_MAX_CHARS - 25)}\n\n[context truncated]`;
  }
  return out;
}
