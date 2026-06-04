import type { ConflictEntry } from '@upriver/schemas';

import type { ShowModel, DeliverableDetail, DeliverableRow } from './show-model.js';
import type { SyncResult } from './sync.js';

const joinIds = (rows: DeliverableRow[]): string => rows.map((r) => r.id).join(', ');

function describeValue(v: unknown): string {
  const s = JSON.stringify(v) ?? String(v);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

/** The numbered conflict queue — shared by `profile show` and `profile conflicts`. */
export function renderConflicts(conflicts: ConflictEntry[]): string {
  const lines: string[] = [
    `Conflict queue (${conflicts.length})${conflicts.length ? ':' : ': none'}`,
  ];
  conflicts.forEach((c, i) => {
    lines.push(`  ${i + 1}. ${c.path}`);
    lines.push(
      `     existing:  ${describeValue(c.existing.value)} (${c.existing.source ?? 'unknown'}${c.existing.verified ? ', verified' : ''})`,
    );
    lines.push(`     candidate: ${describeValue(c.candidate.value)} (${c.candidate.source})`);
    lines.push(`     queued: ${c.queuedAt}`);
  });
  return lines.join('\n');
}

/** Render the `profile show` coverage report as text (the `--json` path emits the model directly). */
export function renderShow(model: ShowModel): string {
  const lines: string[] = [];
  lines.push(`Profile: ${model.slug}  (revision ${model.revision})`);
  lines.push('');

  lines.push('Fill by section:');
  if (model.fill.length === 0) {
    lines.push('  (no fields yet)');
  } else {
    const width = Math.max(...model.fill.map((f) => f.section.length));
    for (const f of model.fill) lines.push(`  ${f.section.padEnd(width)}  ${f.filled}/${f.total}`);
  }
  lines.push('');

  lines.push(`Ready (${model.ready.length})${model.ready.length ? ':' : ''}`);
  for (const r of model.ready) lines.push(`  ${r.id}  ${r.title}`);
  lines.push('');

  // Blocked, grouped by blocker kind (a deliverable may appear under more than one).
  const byFields = model.blocked.filter((r) => r.readiness.missingFields.length > 0);
  const byHv = model.blocked.filter((r) => r.readiness.unverifiedHv.length > 0);
  const byDocs = model.blocked.filter((r) => r.readiness.missingDocs.length > 0);
  lines.push(`Blocked (${model.blocked.length}):`);
  lines.push(`  blocked by missing fields (${byFields.length}): ${byFields.length ? joinIds(byFields) : 'none'}`);
  lines.push(`  blocked by unverified HV (${byHv.length}): ${byHv.length ? joinIds(byHv) : 'none'}`);
  lines.push(`  blocked by upstream docs (${byDocs.length}): ${byDocs.length ? joinIds(byDocs) : 'none'}`);
  lines.push('  (use `profile show <slug> --deliverable <id>` for the exact missing paths)');
  lines.push('');

  if (model.unapprovedBlocking.length > 0) {
    lines.push('Generated but unapproved — approve at the gate to unblock downstream:');
    for (const u of model.unapprovedBlocking) {
      lines.push(`  ${u.id}  ${u.path}  → ${u.blocking.join(', ')}`);
    }
    lines.push('');
  }

  lines.push(renderConflicts(model.conflicts));

  return lines.join('\n');
}

/** Render the `--deliverable <id>` detail: every required field with its state, plus exact blockers. */
export function renderDeliverableDetail(detail: DeliverableDetail): string {
  const lines: string[] = [];
  const status = detail.readiness.ready ? 'READY' : 'BLOCKED';
  lines.push(`Deliverable ${detail.id} — ${detail.title}  [${status}]`);
  lines.push('');

  lines.push(`Required fields (${detail.fields.length}):`);
  for (const f of detail.fields) {
    const mark = f.filled ? '[x]' : '[ ]';
    const tags: string[] = [];
    if (!f.filled) tags.push('missing');
    if (f.hv) tags.push(f.verified ? 'HV: verified' : 'HV: unverified');
    lines.push(`  ${mark} ${f.path}${tags.length ? `   ${tags.join(', ')}` : ''}`);
  }
  lines.push('');

  if (detail.requiresDocs.length) {
    lines.push('Upstream docs:');
    for (const d of detail.requiresDocs) lines.push(`  ${d.generated ? '[x]' : '[ ]'} ${d.id}`);
  } else {
    lines.push('Upstream docs: (none)');
  }
  lines.push('');

  const r = detail.readiness;
  lines.push('Blockers:');
  lines.push(`  missing fields (${r.missingFields.length})${r.missingFields.length ? `: ${r.missingFields.join(', ')}` : ''}`);
  lines.push(`  unverified HV (${r.unverifiedHv.length})${r.unverifiedHv.length ? `: ${r.unverifiedHv.join(', ')}` : ''}`);
  lines.push(`  missing docs (${r.missingDocs.length})${r.missingDocs.length ? `: ${r.missingDocs.join(', ')}` : ''}`);
  return lines.join('\n');
}

/** Render the outcome of a `profile pull`/`push` sync. */
export function renderSyncResult(slug: string, r: SyncResult): string {
  const lines: string[] = [`${r.direction} ${slug}: ${r.sourceKind} → ${r.destKind}`];

  if (r.mode === 'created') {
    lines.push(`  created: destination had no profile; copied from ${r.sourceKind}`);
  } else {
    lines.push(`  merged: ${r.applied} applied, ${r.unchanged} unchanged`);
    lines.push(`  conflicts queued: ${r.conflicts.length}${r.conflicts.length ? ` (resolve with \`upriver profile conflicts ${slug}\`)` : ''}`);
    for (const c of r.conflicts) lines.push(`    - ${c.path}`);
  }

  if (r.manifest === 'copied') lines.push(`  manifest: copied from ${r.sourceKind}`);
  else if (r.manifest === 'diverged-copied') lines.push(`  manifest: DIVERGED — copied from ${r.sourceKind} (source wins)`);
  else lines.push('  manifest: none on either side');

  if (r.docCount.source === r.docCount.dest) {
    lines.push(`  generated docs: ${r.docCount.source} on each (not synced by ${r.direction})`);
  } else {
    lines.push(
      `  generated docs: ${r.sourceKind} ${r.docCount.source}, ${r.destKind} ${r.docCount.dest} — NOT synced by ${r.direction}; use \`upriver sync ${r.direction} ${slug}\` for the doc files.`,
    );
  }

  return lines.join('\n');
}

/** Group zod validation issues by top-level section, mirroring `profile import`'s output. */
export function formatIssues(
  issues: Array<{ path: ReadonlyArray<string | number>; message: string }>,
): string {
  const bySection = new Map<string, string[]>();
  for (const issue of issues) {
    const section = issue.path.length > 0 ? String(issue.path[0]) : '(root)';
    const list = bySection.get(section) ?? [];
    list.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`);
    bySection.set(section, list);
  }
  const lines: string[] = [];
  for (const [section, msgs] of bySection) {
    lines.push(`  [${section}]`);
    for (const m of msgs) lines.push(`    - ${m}`);
  }
  return lines.join('\n');
}
