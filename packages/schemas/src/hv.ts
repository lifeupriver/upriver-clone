import { isEnvelope, nearestEnvelope } from './envelope.js';
import type { ProfileField } from './envelope.js';

/**
 * Human-Verify-Required registry. Static schema metadata, NOT stored in the
 * envelope. Each entry is a dot-path glob into `ClientProfile`:
 *   - a literal segment matches that key
 *   - `*`  matches exactly one segment (an array index or record key)
 *   - `**` (trailing) matches the remainder, including nothing
 * A glob also matches any path *below* it — an HV envelope makes everything
 * under it human-verify-required, so an envelope-granular path (`pricing.deposit`)
 * is covered by a section glob (`pricing.**`).
 *
 * Contents are every field touching safety, compliance, money/pricing,
 * capacity/availability, and access/credentials (PRD §2.2; spec §5). Section
 * files do not encode HV — only this registry does. The map↔schema and
 * HV-consistency cross-checks (spec §7) keep registry and schema in lockstep.
 */
export const HV_FIELDS: readonly string[] = [
  // Section-wide gates (PRD §2.2 marks these "HV throughout").
  'pricing.**',
  'capacity.**',
  'governance.**',
  'toolsAndAccess.**',
  // Targeted gates within otherwise non-HV sections.
  'people.routing.doNotRoute',
  'people.billingContact',
  'offerings.core.*.priceRange',
  'offerings.dontDo',
  'salesProcess.close.definition',
  'salesProcess.funnel.revenuePerCustomer',
  'content.photos.rights',
  'content.videos.rights',
  'operationsAutomation.escalationRouting',
  'operationsAutomation.sensitiveTopics',
  'operationsAutomation.spendCap',
  'goals.budgetConstraints',
  'goals.redLines',
  // The website scope fork (doc-10 §9): which website path the engagement takes
  // (A iterative / B partial / C full) is a money decision — Build Spec 10 gates
  // every website deliverable on it. Verifying it verifies the enclosing
  // `goals.engagementScope` envelope.
  'goals.engagementScope.websiteScope',
  // Preschool module additions (Little Friends).
  'modules.preschool.ocfs.**',
  'modules.preschool.trainingMatrix.**',
  'modules.preschool.immunizationPolicy',
  'modules.preschool.enrollmentCapacity.**',
];

/**
 * Does `glob` match `path`? `*` matches one segment, trailing `**` matches the
 * remainder (including nothing), and a fully-consumed literal glob also matches
 * any path nested below it.
 */
export function matchHvPath(glob: string, path: string): boolean {
  const g = glob.split('.');
  const p = path.split('.');
  let i = 0;
  let j = 0;
  while (i < g.length) {
    const gs = g[i] as string;
    if (gs === '**') return true; // trailing wildcard: matches the rest, incl. nothing
    if (j >= p.length) return false; // glob wants more, path ended
    if (gs === '*' || gs === p[j]) {
      i++;
      j++;
      continue;
    }
    return false;
  }
  // Glob fully consumed; any leftover path segments sit below an HV node.
  return true;
}

/** Is the field at `path` human-verify-required per the registry? */
export function isHumanVerifyRequired(path: string): boolean {
  return HV_FIELDS.some((glob) => matchHvPath(glob, path));
}

function isVerifiedPath(profile: Record<string, unknown>, path: string): boolean {
  return nearestEnvelope(profile, path)?.verified === true;
}

function collectEnvelopePaths(
  node: unknown,
  prefix: string,
  out: Array<{ path: string; env: ProfileField<unknown> }>,
): void {
  if (isEnvelope(node)) {
    out.push({ path: prefix, env: node });
    return; // do not descend into envelope internals
  }
  if (Array.isArray(node)) {
    node.forEach((el, i) => collectEnvelopePaths(el, prefix ? `${prefix}.${i}` : `${i}`, out));
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      collectEnvelopePaths(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
}

/**
 * HV paths that are not yet verified. With `paths`, filters that set; without,
 * scans every envelope present in `profile` and reports the HV ones whose
 * `verified` is not true.
 */
export function unverifiedHvFields(profile: Record<string, unknown>, paths?: string[]): string[] {
  if (paths) {
    return paths.filter((p) => isHumanVerifyRequired(p) && !isVerifiedPath(profile, p));
  }
  const found: Array<{ path: string; env: ProfileField<unknown> }> = [];
  collectEnvelopePaths(profile, '', found);
  return found
    .filter((e) => isHumanVerifyRequired(e.path) && e.env.verified !== true)
    .map((e) => e.path);
}

/**
 * Gate a deliverable: any required path that is HV and not verified blocks it.
 * `generate` calls this with a deliverable's `requiresHvVerified` paths.
 */
export function assertGeneratable(
  profile: Record<string, unknown>,
  requiredPaths: string[],
): { ok: true } | { ok: false; blockedBy: string[] } {
  const blockedBy = requiredPaths.filter(
    (p) => isHumanVerifyRequired(p) && !isVerifiedPath(profile, p),
  );
  return blockedBy.length === 0 ? { ok: true } : { ok: false, blockedBy };
}
