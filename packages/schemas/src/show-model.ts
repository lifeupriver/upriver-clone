import type { ClientProfile } from './client-profile.js';
import { COVERAGE_MAP, type DeliverableId } from './coverage-map.js';
import { deliverableReadiness, fieldFilled, leafPaths, type Readiness } from './coverage.js';
import { nearestEnvelope } from './envelope.js';
import { isHumanVerifyRequired } from './hv.js';
import type { ConflictEntry } from './merge.js';

/**
 * The Client Profile coverage report model — the single builder shared by the
 * CLI's `profile show` and the dashboard's coverage view, promoted here from
 * `packages/cli/src/profile/show-model.ts` so the two surfaces cannot drift
 * (Build Spec 06 §1a decision). Pure: no filesystem, no data source. The
 * "generated" set is the approved-doc ids from a manifest (approval, not mere
 * presence, counts a doc as generated for downstream deps).
 */

/** `clients/<slug>/docs/manifest.json` entry — which docs are generated and approved. */
export interface ManifestEntry {
  id: DeliverableId;
  /** Client-artifact path of the generated doc, e.g. `docs/doc-01-brand-voice-guide.md`. */
  path: string;
  generatedAt: string;
  specHash: string;
  profileSliceHash: string;
  markers: number;
  /** Approval at the Continue gate is what counts a doc as "generated" for downstream deps. */
  approved: boolean;
}

export interface Manifest {
  version: 1;
  docs: Record<string, ManifestEntry>;
}

/** Approved deliverable ids — the "generated" set passed to `deliverableReadiness`. */
export function generatedIds(manifest: Manifest): DeliverableId[] {
  return Object.values(manifest.docs)
    .filter((e) => e.approved)
    .map((e) => e.id);
}

export interface DeliverableRow {
  id: DeliverableId;
  title: string;
  readiness: Readiness;
}

/** A doc generated but not approved that is the reason ≥1 downstream is blocked. */
export interface UnapprovedBlocking {
  id: string;
  path: string;
  blocking: DeliverableId[];
}

export interface SectionFill {
  section: string;
  filled: number;
  total: number;
}

/** The `profile show` report model — rendered to text or emitted as `--json`. */
export interface ShowModel {
  slug: string;
  revision: number;
  ready: DeliverableRow[];
  blocked: DeliverableRow[];
  unapprovedBlocking: UnapprovedBlocking[];
  conflicts: ConflictEntry[];
  fill: SectionFill[];
  generated: DeliverableId[];
}

export interface FieldState {
  path: string;
  filled: boolean;
  hv: boolean;
  verified: boolean;
}

/** The `--deliverable <id>` single-row detail. */
export interface DeliverableDetail {
  id: DeliverableId;
  title: string;
  readiness: Readiness;
  fields: FieldState[];
  requiresDocs: Array<{ id: DeliverableId; generated: boolean }>;
}

function sectionFill(profile: ClientProfile): SectionFill[] {
  const order: string[] = [];
  const counts = new Map<string, { filled: number; total: number }>();
  for (const p of leafPaths(profile)) {
    const section = p.split('.')[0] as string;
    let c = counts.get(section);
    if (!c) {
      c = { filled: 0, total: 0 };
      counts.set(section, c);
      order.push(section);
    }
    c.total += 1;
    if (fieldFilled(profile, p)) c.filled += 1;
  }
  return order.map((section) => ({ section, ...counts.get(section)! }));
}

/**
 * Build the coverage report model from a profile, its docs manifest, and the
 * conflict queue. Pure.
 */
export function buildShowModel(
  profile: ClientProfile,
  manifest: Manifest,
  conflicts: ConflictEntry[],
): ShowModel {
  const generated = generatedIds(manifest);
  const rows: DeliverableRow[] = COVERAGE_MAP.map((d) => ({
    id: d.id,
    title: d.title,
    readiness: deliverableReadiness(profile, d.id, generated),
  }));

  const unapprovedBlocking: UnapprovedBlocking[] = [];
  for (const entry of Object.values(manifest.docs)) {
    if (entry.approved) continue;
    const blocking = COVERAGE_MAP.filter(
      (d) =>
        d.requiresDocs.includes(entry.id) &&
        deliverableReadiness(profile, d.id, generated).missingDocs.includes(entry.id),
    ).map((d) => d.id);
    if (blocking.length > 0) unapprovedBlocking.push({ id: entry.id, path: entry.path, blocking });
  }

  return {
    slug: profile._meta.slug,
    revision: profile._meta.revision,
    ready: rows.filter((r) => r.readiness.ready),
    blocked: rows.filter((r) => !r.readiness.ready),
    unapprovedBlocking,
    conflicts,
    fill: sectionFill(profile),
    generated,
  };
}

/** Single-deliverable detail: every required field with its filled/HV/verified state. */
export function buildDeliverableDetail(
  profile: ClientProfile,
  manifest: Manifest,
  id: DeliverableId,
): DeliverableDetail {
  const d = COVERAGE_MAP.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown deliverable: ${id}`);
  const generated = generatedIds(manifest);
  const data = profile as unknown as Record<string, unknown>;
  const fields: FieldState[] = d.requiresFields.map((p) => ({
    path: p,
    filled: fieldFilled(profile, p),
    hv: isHumanVerifyRequired(p),
    verified: nearestEnvelope(data, p)?.verified === true,
  }));
  return {
    id,
    title: d.title,
    readiness: deliverableReadiness(profile, id, generated),
    fields,
    requiresDocs: d.requiresDocs.map((x) => ({ id: x, generated: generated.includes(x) })),
  };
}
