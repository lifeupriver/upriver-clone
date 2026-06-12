/**
 * Testable handlers for the intake routes (`GET/POST /api/intake/<slug>` and
 * `POST /api/intake/<slug>/lock-scope`).
 *
 * Auth model (the PRD trust boundary for client-submitted scope decisions):
 *
 * - `GET`/`POST /api/intake/<slug>` is reachable by EITHER an operator
 *   session OR a valid share token passed as `?t=` — the share-token client
 *   portal (`/deliverables/<slug>/next-steps`) embeds `IntakeForm`, whose
 *   browser JS calls this route directly, so a middleware operator gate would
 *   break the client flow. Anonymous callers with no/invalid token get 401.
 * - `POST /api/intake/<slug>/lock-scope` is operator-only: locking scope is
 *   the admin action on `/clients/<slug>/intake`, never a client one.
 *
 * Like `_portal-handler.ts`, the handlers take an injected `getOperator` /
 * `validateToken` so they can be unit-tested against the local data source;
 * the route files wire the real Supabase-Auth + share-token plumbing. Keeping
 * `lib/auth` out of this module's import graph also keeps it out of the
 * NodeNext test compile.
 */
import type { AuditFinding, ClientIntake, FindingDecision, ScopeTier } from '@upriver/core';
import { clientExists, readAllFindings, readIntake } from '../../../lib/fs-reader.js';
import { emptyIntake, writeIntake } from '../../../lib/intake-writer.js';
import { readAuditPackage } from '../../../lib/report-reader.js';
import { resolveClientDataSource } from '../../../lib/data-source.js';

/** Kebab-case slug shape — mirrors the gate in `api/share-tokens.ts`. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const VALID_DECISIONS: ReadonlyArray<FindingDecision> = ['fix', 'skip', 'discuss'];
const VALID_TIERS: ReadonlyArray<ScopeTier> = ['polish', 'rebuild', 'rebuild-plus-content'];
const MAX_PAGE_WANTS_LEN = 4000;
const MAX_REFERENCE_SITES = 20;

/** Minimal request context shared by the intake handlers. */
export interface IntakeRequestCtx {
  params: { slug?: string };
  request: Request;
  cookies?: unknown;
}

/** Lock-scope additionally redirects back to the admin view on success. */
export interface LockScopeRequestCtx extends IntakeRequestCtx {
  redirect(path: string, status?: number): Response;
}

export interface IntakeRouteDeps {
  /** Resolve the operator for this request, or null if the caller isn't one. */
  getOperator: (ctx: { request: Request; cookies: unknown }) => Promise<{ id: string } | null>;
  /** Validate a `?t=` share token against this slug (the client-portal gate). */
  validateToken: (slug: string, token: string) => Promise<boolean>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Authorize an intake read/write: an operator session passes outright; an
 * anonymous caller passes only with a valid `?t=` share token for THIS slug.
 *
 * @returns `null` when authorized, otherwise the 401 response to return.
 */
async function authorizeIntake(
  ctx: IntakeRequestCtx,
  deps: IntakeRouteDeps,
  slug: string,
): Promise<Response | null> {
  const operator = await deps.getOperator({ request: ctx.request, cookies: ctx.cookies });
  if (operator) return null;
  const token = new URL(ctx.request.url).searchParams.get('t');
  if (token && (await deps.validateToken(slug, token))) return null;
  return json(401, { error: 'unauthorized — operator session or share token required' });
}

/**
 * Type-guard: a non-null plain object (`Record<string, unknown>`).
 *
 * @param v - Arbitrary value.
 * @returns True if `v` is a non-array, non-null object.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Sanitize a `findingDecisions` map from untrusted input.
 *
 * Drops any key whose value is not one of `'fix' | 'skip' | 'discuss'`,
 * logging a warning per dropped entry so bad client state shows up in logs.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `Record<string, FindingDecision>`.
 */
function sanitizeFindingDecisions(input: unknown): Record<string, FindingDecision> {
  const out: Record<string, FindingDecision> = {};
  if (!isRecord(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && (VALID_DECISIONS as readonly string[]).includes(v)) {
      out[k] = v as FindingDecision;
    } else {
      console.warn(`[api/intake] dropping invalid finding decision for ${k}: ${String(v)}`);
    }
  }
  return out;
}

/**
 * Sanitize a `pageWants` map from untrusted input.
 *
 * Drops non-string values; truncates strings to `MAX_PAGE_WANTS_LEN` chars.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `Record<string, string>`.
 */
function sanitizePageWants(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== 'string') {
      console.warn(`[api/intake] dropping non-string pageWants[${k}]`);
      continue;
    }
    out[k] = v.length > MAX_PAGE_WANTS_LEN ? v.slice(0, MAX_PAGE_WANTS_LEN) : v;
  }
  return out;
}

/**
 * Sanitize a `referenceSites` array from untrusted input.
 *
 * Drops entries that aren't strings or fail `new URL(...)`. Caps at
 * `MAX_REFERENCE_SITES` after filtering.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `string[]` of valid URLs.
 */
function sanitizeReferenceSites(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') continue;
    try {
      // eslint-disable-next-line no-new
      new URL(v);
      out.push(v);
    } catch {
      console.warn(`[api/intake] dropping invalid reference URL: ${v}`);
    }
  }
  return out.slice(0, MAX_REFERENCE_SITES);
}

/**
 * Sanitize a `scopeTier` from untrusted input.
 *
 * @param input - Untrusted value from the POST body.
 * @returns The valid tier, or `null` if missing/invalid.
 */
function sanitizeScopeTier(input: unknown): ScopeTier | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string' && (VALID_TIERS as readonly string[]).includes(input)) {
    return input as ScopeTier;
  }
  console.warn(`[api/intake] dropping invalid scopeTier: ${String(input)}`);
  return null;
}

/**
 * Merge a sanitized partial intake onto a base intake.
 *
 * Only fields present in `partial` overwrite. `version`, `submittedAt`, and
 * `updatedAt` are managed by the handler, not the partial.
 *
 * @param base - Existing intake (read from disk or `emptyIntake()`).
 * @param partialRaw - Untrusted partial body from the client.
 * @returns A merged intake, with timestamps left to the caller to update.
 */
function mergeIntake(base: ClientIntake, partialRaw: Record<string, unknown>): ClientIntake {
  const merged: ClientIntake = { ...base };
  if ('findingDecisions' in partialRaw) {
    merged.findingDecisions = sanitizeFindingDecisions(partialRaw['findingDecisions']);
  }
  if ('pageWants' in partialRaw) {
    merged.pageWants = sanitizePageWants(partialRaw['pageWants']);
  }
  if ('referenceSites' in partialRaw) {
    merged.referenceSites = sanitizeReferenceSites(partialRaw['referenceSites']);
  }
  if ('scopeTier' in partialRaw) {
    merged.scopeTier = sanitizeScopeTier(partialRaw['scopeTier']);
  }
  return merged;
}

/**
 * GET handler: returns the current intake JSON, or `{}` if none exists yet.
 *
 * - 400 on a missing/malformed slug.
 * - 401 unless the caller is an operator or holds a valid `?t=` share token.
 * - 404 if the slug doesn't exist.
 */
export async function handleIntakeGet(
  ctx: IntakeRequestCtx,
  deps: IntakeRouteDeps,
): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug || !SLUG_RE.test(slug)) {
    return json(400, { error: 'slug must be kebab-case' });
  }
  const denied = await authorizeIntake(ctx, deps, slug);
  if (denied) return denied;
  if (!(await clientExists(slug))) {
    return json(404, { error: 'client not found' });
  }
  const intake = await readIntake(slug);
  return json(200, intake ?? {});
}

/**
 * POST handler: merge a partial `ClientIntake` from the body onto the existing
 * file (or a fresh skeleton), validate, write, and return the persisted body.
 *
 * - 400 on a missing/malformed slug or unparseable JSON.
 * - 401 unless the caller is an operator or holds a valid `?t=` share token.
 * - 404 if the slug doesn't exist.
 * - 200 with the persisted body on success.
 */
export async function handleIntakePost(
  ctx: IntakeRequestCtx,
  deps: IntakeRouteDeps,
): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug || !SLUG_RE.test(slug)) {
    return json(400, { error: 'slug must be kebab-case' });
  }
  const denied = await authorizeIntake(ctx, deps, slug);
  if (denied) return denied;
  if (!(await clientExists(slug))) {
    return json(404, { error: 'client not found' });
  }

  let parsed: unknown;
  try {
    parsed = await ctx.request.json();
  } catch {
    return json(400, { error: 'invalid JSON body' });
  }
  if (!isRecord(parsed)) {
    return json(400, { error: 'body must be an object' });
  }

  const existing = (await readIntake(slug)) ?? emptyIntake();
  const merged = mergeIntake(existing, parsed);

  const now = new Date().toISOString();
  merged.updatedAt = now;
  if (merged.submittedAt === null) {
    merged.submittedAt = now;
  }

  await writeIntake(slug, merged);

  return json(200, merged);
}

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
 * Lock-scope POST handler: convert the persisted client intake into
 * `clients/<slug>/fixes-plan-scope.md` and redirect back to the admin view.
 *
 * - 400 if the slug is missing/malformed, intake missing, or no findings
 *   marked `fix`.
 * - 401 unless the caller is an operator (share tokens do NOT authorize this
 *   — locking scope is an admin action, not a client one).
 * - 404 if the client doesn't exist.
 * - 500 on filesystem errors.
 * - 303 redirect to `/clients/<slug>/intake` on success.
 */
export async function handleLockScope(
  ctx: LockScopeRequestCtx,
  deps: Pick<IntakeRouteDeps, 'getOperator'>,
): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug || !SLUG_RE.test(slug)) {
    return json(400, { error: 'slug must be kebab-case' });
  }
  const operator = await deps.getOperator({ request: ctx.request, cookies: ctx.cookies });
  if (!operator) {
    return json(401, { error: 'unauthorized — operator session required' });
  }
  if (!(await clientExists(slug))) {
    return json(404, { error: 'client not found' });
  }

  const intake = await readIntake(slug);
  if (!intake) {
    return json(400, { error: 'No intake.json on disk for this client.' });
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
    return json(400, { error: 'No findings marked Fix.' });
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
    return json(500, { error: `Failed to write scope: ${message}` });
  }

  return ctx.redirect(`/clients/${slug}/intake`, 303);
}
