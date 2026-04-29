import type { APIRoute } from 'astro';
import type { AuditFinding } from '@upriver/core';
import { clientExists, readAllFindings, readIntake } from '@/lib/fs-reader';
import { readAuditPackage } from '@/lib/report-reader';
import { resolveClientDataSource } from '@/lib/data-source';

export const prerender = false;

/**
 * Resolve a finding's display title from a slug + id, falling back to the id
 * itself when the audit data has no record of it (e.g. stale intake).
 *
 * @param id - Finding id (e.g. `seo-001`).
 * @param byId - Map of finding id to `AuditFinding`.
 * @returns Human-friendly title for the locked-scope markdown.
 */
function findingTitle(id: string, byId: Map<string, AuditFinding>): string {
  const f = byId.get(id);
  return f?.title ?? id;
}

/**
 * Render a `clients/<slug>/fixes-plan-scope.md` document from a `ClientIntake`.
 *
 * The output is intentionally compatible with `readScope()` in
 * `packages/cli/src/commands/fixes/plan.ts` — finding ids must appear under
 * the `## In scope` heading and match `\b([a-z]+-\d{3})\b`. Other sections
 * (Deferred, Skipped, Page wants, Reference sites) are operator notes and
 * are ignored by the planner regex.
 *
 * @param slug - Client slug (used in the `Source:` line).
 * @param fixIds - Finding ids the client said `'fix'`.
 * @param discussIds - Finding ids the client said `'discuss'`.
 * @param skipIds - Finding ids the client said `'skip'`.
 * @param pageWants - Per-page free-text wants from the intake.
 * @param referenceSites - Reference URLs from the intake.
 * @param findingsById - Lookup of all known findings for title resolution.
 * @param pageTitlesBySlug - Lookup of page titles for nicer headings.
 * @returns The rendered markdown body.
 */
function renderScopeDoc(
  slug: string,
  fixIds: string[],
  discussIds: string[],
  skipIds: string[],
  pageWants: Record<string, string>,
  referenceSites: string[],
  findingsById: Map<string, AuditFinding>,
  pageTitlesBySlug: Map<string, string>,
): string {
  const lockedAt = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# Fixes plan scope — locked from client intake', '');
  lines.push(`Locked: ${lockedAt}`);
  lines.push(`Source: clients/${slug}/intake.json`, '');

  lines.push('## In scope', '');
  if (fixIds.length === 0) {
    lines.push('_No findings selected._');
  } else {
    for (const id of fixIds) {
      lines.push(`- ${id}, ${findingTitle(id, findingsById)}`);
    }
  }
  lines.push('');

  lines.push('## Deferred (client said "Discuss")', '');
  if (discussIds.length === 0) {
    lines.push('_None._');
  } else {
    for (const id of discussIds) {
      lines.push(`- ${id}, ${findingTitle(id, findingsById)}`);
    }
  }
  lines.push('');

  lines.push('## Skipped (client said "Don\'t bother")', '');
  if (skipIds.length === 0) {
    lines.push('_None._');
  } else {
    for (const id of skipIds) {
      lines.push(`- ${id}, ${findingTitle(id, findingsById)}`);
    }
  }
  lines.push('');

  lines.push('## Client priorities (page wants)', '');
  const pageEntries = Object.entries(pageWants).filter(([, text]) => text.trim().length > 0);
  if (pageEntries.length === 0) {
    lines.push('_No per-page priorities recorded._');
  } else {
    for (const [pageSlug, text] of pageEntries) {
      const heading = pageTitlesBySlug.get(pageSlug) ?? pageSlug;
      lines.push(`### ${heading}`, '', text.trim(), '');
    }
  }
  lines.push('');

  lines.push('## Reference sites', '');
  if (referenceSites.length === 0) {
    lines.push('_None._');
  } else {
    for (const url of referenceSites) {
      lines.push(`- ${url}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * POST handler: convert the persisted client intake into
 * `clients/<slug>/fixes-plan-scope.md` and redirect back to the admin view.
 *
 * - 400 if slug missing, intake missing, or no findings marked `fix`.
 * - 404 if the client doesn't exist.
 * - 500 on filesystem errors.
 * - 303 redirect to `/clients/<slug>/intake` on success.
 */
export const POST: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'missing slug' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!(await clientExists(slug))) {
    return new Response(JSON.stringify({ error: 'client not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const intake = await readIntake(slug);
  if (!intake) {
    return new Response(JSON.stringify({ error: 'No intake.json on disk for this client.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const decisions = intake.findingDecisions ?? {};
  const fixIds = Object.entries(decisions)
    .filter(([, v]) => v === 'fix')
    .map(([k]) => k)
    .sort();
  const discussIds = Object.entries(decisions)
    .filter(([, v]) => v === 'discuss')
    .map(([k]) => k)
    .sort();
  const skipIds = Object.entries(decisions)
    .filter(([, v]) => v === 'skip')
    .map(([k]) => k)
    .sort();

  if (fixIds.length === 0) {
    return new Response(JSON.stringify({ error: 'No findings marked Fix.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const findings = await readAllFindings(slug);
  const findingsById = new Map<string, AuditFinding>(findings.map((f) => [f.id, f]));

  // Page titles come from audit-package.json when available; fall back to slug
  // strings on the headings so the doc is still useful pre-synthesize.
  const pkg = await readAuditPackage(slug);
  const pageTitlesBySlug = new Map<string, string>();
  if (pkg?.siteStructure?.pages) {
    for (const p of pkg.siteStructure.pages) {
      pageTitlesBySlug.set(p.slug, p.title || p.slug);
    }
  }

  const body = renderScopeDoc(
    slug,
    fixIds,
    discussIds,
    skipIds,
    intake.pageWants ?? {},
    intake.referenceSites ?? [],
    findingsById,
    pageTitlesBySlug,
  );

  try {
    // Note: existsSync intentionally not branched — this endpoint overwrites
    // by design; the admin view shows a "Re-lock" warning when the file is
    // already present.
    await resolveClientDataSource().writeClientFile(slug, 'fixes-plan-scope.md', body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Failed to write scope: ${message}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return redirect(`/clients/${slug}/intake`, 303);
};
