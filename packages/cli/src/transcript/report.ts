// The run report (spec §1): per-section counts, the unmapped list (prominent),
// the coverage delta, and which MUST_ASK session fields are still empty.

import {
  COVERAGE_MAP,
  MUST_ASK,
  deliverableReadiness,
  fieldFilled,
  type ClientProfile,
  type DeliverableId,
} from '@upriver/schemas';

import { leafPaths, type MergeResult } from '../generate/profile-merge.js';
import type { DiscardedDuplicate, DroppedCandidate, Reconciliation, UnmappedTopic } from './types.js';

export interface SectionCount {
  section: string;
  applied: number;
  conflicted: number;
  dropped: number;
}

export interface DeliverableDelta {
  id: DeliverableId;
  title: string;
  missingBefore: number;
  missingAfter: number;
  unverifiedHvAfter: number;
}

export interface ReportModel {
  applied: string[];
  conflicts: string[];
  dropped: DroppedCandidate[];
  discarded: DiscardedDuplicate[];
  unmapped: UnmappedTopic[];
  chunkErrors: Array<{ chunkIndex: number; error: string }>;
  sections: SectionCount[];
  coverage: {
    filledBefore: number;
    filledAfter: number;
    mustAskEmptyBefore: number;
    mustAskEmptyAfter: number;
    mustAskStillEmpty: string[];
  };
  deliverables: {
    readyBefore: number;
    readyAfter: number;
    improved: DeliverableDelta[];
  };
}

function section(path: string): string {
  return path.split('.')[0] as string;
}

function countFilled(profile: ClientProfile): number {
  return leafPaths(profile).filter((p) => fieldFilled(profile, p)).length;
}

function mustAskEmpty(profile: ClientProfile): string[] {
  return MUST_ASK.filter((m) => !fieldFilled(profile, m.path)).map((m) => m.path);
}

/** deliverableReadiness before/after across the coverage map (spec §1.6). */
function deliverableDelta(before: ClientProfile, after: ClientProfile): ReportModel['deliverables'] {
  let readyBefore = 0;
  let readyAfter = 0;
  const improved: DeliverableDelta[] = [];
  for (const d of COVERAGE_MAP) {
    const b = deliverableReadiness(before, d.id);
    const a = deliverableReadiness(after, d.id);
    if (b.ready) readyBefore += 1;
    if (a.ready) readyAfter += 1;
    if (a.missingFields.length < b.missingFields.length) {
      improved.push({
        id: d.id,
        title: d.title,
        missingBefore: b.missingFields.length,
        missingAfter: a.missingFields.length,
        unverifiedHvAfter: a.unverifiedHv.length,
      });
    }
  }
  return { readyBefore, readyAfter, improved };
}

export function buildReportModel(
  before: ClientProfile,
  after: ClientProfile,
  recon: Reconciliation,
  merge: MergeResult,
  chunkErrors: Array<{ chunkIndex: number; error: string }>,
): ReportModel {
  const conflicts = merge.conflicts.map((c) => c.path);
  const counts = new Map<string, SectionCount>();
  const bump = (path: string, key: 'applied' | 'conflicted' | 'dropped'): void => {
    const s = section(path);
    const row = counts.get(s) ?? { section: s, applied: 0, conflicted: 0, dropped: 0 };
    row[key] += 1;
    counts.set(s, row);
  };
  for (const p of merge.applied) bump(p, 'applied');
  for (const p of conflicts) bump(p, 'conflicted');
  for (const d of recon.dropped) bump(d.path, 'dropped');

  return {
    applied: merge.applied,
    conflicts,
    dropped: recon.dropped,
    discarded: recon.discarded,
    unmapped: recon.unmapped,
    chunkErrors,
    sections: [...counts.values()].sort((a, b) => a.section.localeCompare(b.section)),
    coverage: {
      filledBefore: countFilled(before),
      filledAfter: countFilled(after),
      mustAskEmptyBefore: mustAskEmpty(before).length,
      mustAskEmptyAfter: mustAskEmpty(after).length,
      mustAskStillEmpty: mustAskEmpty(after),
    },
    deliverables: deliverableDelta(before, after),
  };
}

export interface RenderOptions {
  slug: string;
  file: string;
  dryRun: boolean;
}

export function renderReport(m: ReportModel, opts: RenderOptions): string {
  const L: string[] = [];
  const cov = m.coverage;
  L.push('');
  L.push(`Transcript extraction — ${opts.slug}${opts.dryRun ? '  [dry-run: nothing written]' : ''}`);
  L.push(`  source: ${opts.file}`);
  L.push('');
  L.push(
    `  applied ${m.applied.length}   conflicted ${m.conflicts.length}   dropped ${m.dropped.length}   discarded ${m.discarded.length}   unmapped ${m.unmapped.length}`,
  );
  L.push(
    `  coverage: filled fields ${cov.filledBefore} → ${cov.filledAfter}   (MUST-ASK empty ${cov.mustAskEmptyBefore} → ${cov.mustAskEmptyAfter})`,
  );
  L.push(
    `  deliverables ready ${m.deliverables.readyBefore} → ${m.deliverables.readyAfter}` +
      (m.deliverables.improved.length > 0
        ? `; field coverage improved for ${m.deliverables.improved.length} deliverable(s):`
        : ''),
  );
  for (const d of m.deliverables.improved) {
    L.push(`    ${d.id} ${d.title}: missing ${d.missingBefore} → ${d.missingAfter} (HV still unverified: ${d.unverifiedHvAfter})`);
  }

  if (m.sections.length > 0) {
    L.push('');
    L.push('  Per section:');
    for (const s of m.sections) {
      L.push(`    ${s.section}: applied ${s.applied}, conflicted ${s.conflicted}, dropped ${s.dropped}`);
    }
  }

  if (m.conflicts.length > 0) {
    L.push('');
    L.push(`  Conflicts queued (review with \`profile conflicts ${opts.slug}\`):`);
    for (const p of m.conflicts) L.push(`    - ${p}`);
  }

  if (m.dropped.length > 0) {
    L.push('');
    L.push('  Dropped (invalid path/value or non-verbatim quote — not silent):');
    for (const d of m.dropped) L.push(`    - ${d.path}: ${d.reason}`);
  }

  if (m.discarded.length > 0) {
    L.push('');
    L.push('  Discarded duplicate values (kept the higher-confidence reading):');
    for (const d of m.discarded) L.push(`    - ${d.path}: dropped ${JSON.stringify(d.value)} (kept ${JSON.stringify(d.keptValue)})`);
  }

  // Unmapped — prominent: these are real topics with no schema home.
  L.push('');
  L.push(`  ▸ UNMAPPED TOPICS (${m.unmapped.length}) — no schema field; review for a schema gap:`);
  if (m.unmapped.length === 0) L.push('    (none)');
  for (const u of m.unmapped) L.push(`    - ${u.topic}: "${u.quote}"`);

  if (m.chunkErrors.length > 0) {
    L.push('');
    L.push('  Chunk errors (extraction continued for the rest):');
    for (const e of m.chunkErrors) L.push(`    - chunk ${e.chunkIndex}: ${e.error}`);
  }

  L.push('');
  L.push(`  MUST-ASK session fields still empty (${cov.mustAskStillEmpty.length}):`);
  for (const p of cov.mustAskStillEmpty) L.push(`    - ${p}`);

  return L.join('\n');
}
