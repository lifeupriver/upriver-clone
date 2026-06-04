import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE_EXPECTATIONS,
  createEmptyProfile,
  type ClientProfile,
  type ProfileField,
} from '@upriver/schemas';

import { coverageDelta, deliverableDeltas, renderDryRun, renderReport } from './report.js';
import type { ReconRunResult } from './run.js';

const NOW = '2026-06-04T12:00:00.000Z';

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('lf', NOW) as any;
  for (const [path, v] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur: any = p;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i] as string;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1] as string] = v;
  }
  return p as ClientProfile;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function env<T>(value: T): ProfileField<T> {
  return { value, source: 'recon', confidence: 'low', verified: false, updatedAt: NOW };
}

test('coverageDelta counts recon targets filled before vs after', () => {
  const before = createEmptyProfile('lf', NOW);
  const after = profileWith({
    'identity.gbp': env({ url: 'https://maps.google.com/x', status: 'claimed' }),
    'identity.socialHandles': env([{ platform: 'instagram', handle: '@lf' }]),
  });

  const d = coverageDelta(before, after);

  assert.equal(d.targetsTotal, SOURCE_EXPECTATIONS.recon.length);
  assert.equal(d.filledBefore, 0);
  assert.equal(d.filledAfter, 2);
  assert.deepEqual([...d.newlyFilled].sort(), ['identity.gbp', 'identity.socialHandles']);
  assert.ok(!d.stillEmpty.includes('identity.gbp'));
  assert.ok(d.stillEmpty.includes('pricing.shareable'));
});

test('coverageDelta does not count a target already filled before as newly filled', () => {
  const before = profileWith({ 'identity.hours': env('Mon–Fri 7:30–5:30') });
  const after = profileWith({ 'identity.hours': env('Mon–Fri 7:30–5:30') });

  const d = coverageDelta(before, after);

  assert.equal(d.filledBefore, 1);
  assert.equal(d.filledAfter, 1);
  assert.deepEqual(d.newlyFilled, []);
  assert.ok(!d.stillEmpty.includes('identity.hours'));
});

test('deliverableDeltas reports deliverables whose missing-field count dropped', () => {
  const before = createEmptyProfile('lf', NOW);
  // doc-02 (Business Facts) requires identity.legalName among others.
  const after = profileWith({ 'identity.legalName': env('Little Friends Learning Loft LLC') });

  const deltas = deliverableDeltas(before, after);
  const doc02 = deltas.find((x) => x.id === 'doc-02');

  assert.ok(doc02, 'doc-02 should show progress');
  assert.equal(doc02?.missingAfter, doc02!.missingBefore - 1);
  // A deliverable that requires none of the filled fields shows no delta.
  assert.ok(!deltas.some((x) => x.id === 'doc-13'));
});

test('renderReport includes per-adapter outcomes, coverage, and conflicts', () => {
  const before = createEmptyProfile('lf', NOW);
  const after = profileWith({ 'identity.legalName': env('LF LLC') });
  const run: ReconRunResult = {
    profileBefore: before,
    profileAfter: after,
    conflicts: [],
    perAdapter: [
      {
        id: 'website',
        ok: true,
        evidenceFiles: ['recon/website/page.json'],
        candidates: [{ path: 'identity.legalName', value: 'LF LLC', source: 'recon' }],
        dropped: [],
        outcomes: [{ path: 'identity.legalName', kind: 'filled' }],
      },
      {
        id: 'gbp',
        ok: false,
        error: 'gbp gather boom',
        evidenceFiles: [],
        candidates: [],
        dropped: [],
        outcomes: [],
      },
    ],
  };

  const out = renderReport(run);

  assert.match(out, /website/);
  assert.match(out, /identity\.legalName/);
  assert.match(out, /gbp/);
  assert.match(out, /boom/); // failed adapter surfaced
  assert.match(out, /[Cc]overage/);
});

test('renderDryRun lists planned adapters and unfilled targets', () => {
  const out = renderDryRun({ adapters: ['website', 'gbp'], unfilledTargets: ['identity.gbp', 'pricing.shareable'] });

  assert.match(out, /dry-run/i);
  assert.match(out, /website/);
  assert.match(out, /identity\.gbp/);
  assert.match(out, /pricing\.shareable/);
});
