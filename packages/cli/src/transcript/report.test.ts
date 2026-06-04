import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { buildReportModel, renderReport } from './report.js';
import type { MergeResult } from '../generate/profile-merge.js';
import type { Reconciliation } from './types.js';

const NOW = '2026-06-04T12:00:00.000Z';

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, ProfileField<unknown>>): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as any;
  for (const [path, env] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur: any = p;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i] as string;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1] as string] = env;
  }
  return p as ClientProfile;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const op = (value: unknown): ProfileField<unknown> => ({ value, source: 'operator', confidence: 'low', verified: false, updatedAt: NOW });
const tr = (value: unknown): ProfileField<unknown> => ({ value, source: 'transcript', confidence: 'medium', verified: false, updatedAt: NOW });

const before = profileWith({ 'governance.regulatedData': op(['PII']) });
const after = profileWith({ 'governance.regulatedData': op(['PII']), 'capacity.bookingLeadTime': tr({ typical: '8w' }) });

const merge: MergeResult = {
  profile: after,
  applied: ['capacity.bookingLeadTime'],
  unchanged: [],
  conflicts: [
    { path: 'governance.regulatedData', existing: op(['PII']), candidate: { value: ['Card'], source: 'transcript' }, queuedAt: NOW },
  ],
};
const recon: Reconciliation = {
  candidates: [
    { path: 'capacity.bookingLeadTime', value: { typical: '8w' }, quote: 'eight weeks', confidence: 'medium', chunkIndices: [0] },
    { path: 'governance.regulatedData', value: ['Card'], quote: 'card data', confidence: 'low', chunkIndices: [1] },
  ],
  dropped: [{ path: 'foo.bar', value: 1, quote: 'q', reason: 'unknown schema path: foo.bar' }],
  unmapped: [{ topic: 'library partnership', quote: 'we partner with the library' }],
  discarded: [],
};

test('buildReportModel computes coverage delta and MUST_ASK-still-empty', () => {
  const m = buildReportModel(before, after, recon, merge, []);
  assert.equal(m.coverage.filledBefore, 1);
  assert.equal(m.coverage.filledAfter, 2);
  assert.ok(m.coverage.mustAskStillEmpty.includes('voice.attributes'));
  assert.ok(m.coverage.mustAskStillEmpty.length > 0);
});

test('buildReportModel reports deliverableReadiness before/after (doc-03 field coverage improves)', () => {
  const m = buildReportModel(before, after, recon, merge, []);
  assert.equal(typeof m.deliverables.readyBefore, 'number');
  assert.equal(typeof m.deliverables.readyAfter, 'number');
  // capacity.bookingLeadTime is a doc-03 requiresField → its fill reduces doc-03's missing count.
  assert.ok(m.deliverables.improved.some((d) => d.id === 'doc-03'));
});

test('buildReportModel groups applied/conflicted/dropped per section', () => {
  const m = buildReportModel(before, after, recon, merge, []);
  const cap = m.sections.find((s) => s.section === 'capacity');
  const gov = m.sections.find((s) => s.section === 'governance');
  assert.equal(cap?.applied, 1);
  assert.equal(gov?.conflicted, 1);
});

test('renderReport surfaces the unmapped list, conflicts, drops, and MUST-ASK prominently', () => {
  const m = buildReportModel(before, after, recon, merge, []);
  const text = renderReport(m, { slug: 'littlefriends', file: 's.txt', dryRun: false });
  assert.match(text, /Unmapped/i);
  assert.match(text, /library partnership/);
  assert.match(text, /conflict/i);
  assert.match(text, /governance\.regulatedData/);
  assert.match(text, /foo\.bar/);
  assert.match(text, /must-ask/i);
});

test('renderReport marks a dry run', () => {
  const m = buildReportModel(before, after, recon, merge, []);
  assert.match(renderReport(m, { slug: 'littlefriends', file: 's.txt', dryRun: true }), /dry-run/i);
});
