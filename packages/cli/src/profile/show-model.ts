import {
  COVERAGE_MAP,
  deliverableReadiness,
  fieldFilled,
  isHumanVerifyRequired,
  nearestEnvelope,
  type ClientProfile,
  type ConflictEntry,
  type DeliverableId,
  type Readiness,
} from '@upriver/schemas';

import { generatedIds, type Manifest } from '../generate/manifest.js';
import { leafPaths } from '../generate/profile-merge.js';

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
 * conflict queue. Pure: no filesystem, no data source. `generated` is the
 * approved-doc set the readiness math runs against (approval, not mere
 * presence, counts a doc as generated — spec 02 follow-up).
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
