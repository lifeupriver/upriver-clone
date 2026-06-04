import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyProfile,
  type ClientProfile,
  type ProfileField,
  type Source,
} from '@upriver/schemas';

import { planRecon, runRecon } from './run.js';
import { makeContext } from './testing.js';
import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext } from './types.js';

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
const leaf = (p: ClientProfile, path: string): ProfileField<unknown> => {
  let cur: any = p;
  for (const s of path.split('.')) cur = cur?.[s];
  return cur as ProfileField<unknown>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function env<T>(value: T, source: Source = 'operator'): ProfileField<T> {
  return { value, source, confidence: null, verified: false, updatedAt: NOW };
}

/** A mock adapter: returns canned candidates; optionally throws in gather. */
function mockAdapter(
  id: ReconAdapter['id'],
  candidates: PathedCandidate[],
  opts: { throwInGather?: boolean; onGather?: () => void } = {},
): ReconAdapter {
  return {
    id,
    async gather(_ctx: ReconContext): Promise<RawEvidence> {
      opts.onGather?.();
      if (opts.throwInGather) throw new Error(`${id} gather boom`);
      return { id, files: [`recon/${id}/evidence.json`], payload: {} };
    },
    async extract(): Promise<PathedCandidate[]> {
      return candidates;
    },
  };
}

function c(path: string, value: unknown): PathedCandidate {
  return { path, value, source: 'recon' };
}

test('runRecon merges every adapter’s candidates into the profile', async () => {
  const ctx = makeContext({ now: NOW });
  const a = mockAdapter('website', [c('identity.legalName', 'Little Friends Learning Loft LLC')]);
  const b = mockAdapter('gbp', [c('identity.hours', 'Mon–Fri 7:30–5:30')]);

  const r = await runRecon(ctx, [a, b]);

  assert.equal(leaf(r.profileAfter, 'identity.legalName').value, 'Little Friends Learning Loft LLC');
  assert.equal(leaf(r.profileAfter, 'identity.hours').value, 'Mon–Fri 7:30–5:30');
  assert.equal(r.perAdapter.length, 2);
  assert.deepEqual(r.perAdapter.map((p) => p.outcomes.map((o) => o.kind)), [['filled'], ['filled']]);
  assert.deepEqual(r.perAdapter[0]?.evidenceFiles, ['recon/website/evidence.json']);
});

test('a failing adapter is isolated — the others still merge', async () => {
  const ctx = makeContext({ now: NOW });
  const boom = mockAdapter('website', [c('identity.legalName', 'X')], { throwInGather: true });
  const ok = mockAdapter('gbp', [c('identity.hours', 'Mon–Fri 7:30–5:30')]);

  const r = await runRecon(ctx, [boom, ok]);

  const wr = r.perAdapter.find((p) => p.id === 'website');
  const gr = r.perAdapter.find((p) => p.id === 'gbp');
  assert.equal(wr?.ok, false);
  assert.match(String(wr?.error), /gather boom/);
  assert.equal(gr?.ok, true);
  // The healthy adapter's value still landed.
  assert.equal(leaf(r.profileAfter, 'identity.hours').value, 'Mon–Fri 7:30–5:30');
  // The failed adapter contributed nothing.
  assert.equal(leaf(r.profileAfter, 'identity.legalName'), undefined);
});

test('a structurally-invalid candidate is dropped before merge', async () => {
  const ctx = makeContext({ now: NOW });
  // identity.hours is a string; 42 must be dropped, the valid one kept.
  const a = mockAdapter('website', [c('identity.hours', 42), c('identity.legalName', 'LF LLC')]);

  const r = await runRecon(ctx, [a]);

  const wr = r.perAdapter[0];
  assert.equal(wr?.candidates.length, 1);
  assert.equal(wr?.candidates[0]?.path, 'identity.legalName');
  assert.equal(wr?.dropped.length, 1);
  assert.equal(wr?.dropped[0]?.path, 'identity.hours');
  assert.equal(leaf(r.profileAfter, 'identity.hours'), undefined);
});

test('runRecon queues conflicts and attributes outcomes per adapter', async () => {
  const ctx = makeContext({
    now: NOW,
    profile: profileWith({ 'identity.publicName': env('Operator Name', 'operator') }),
  });
  const a = mockAdapter('website', [c('identity.legalName', 'LF LLC')]); // filled
  const b = mockAdapter('gbp', [c('identity.publicName', 'Recon Name')]); // conflict

  const r = await runRecon(ctx, [a, b]);

  assert.deepEqual(r.perAdapter.find((p) => p.id === 'website')?.outcomes, [
    { path: 'identity.legalName', kind: 'filled' },
  ]);
  assert.deepEqual(r.perAdapter.find((p) => p.id === 'gbp')?.outcomes, [
    { path: 'identity.publicName', kind: 'conflicted' },
  ]);
  assert.equal(r.conflicts.length, 1);
});

test('planRecon lists adapters and unfilled recon targets without gathering', async () => {
  let gathered = false;
  const ctx = makeContext({
    now: NOW,
    profile: profileWith({ 'identity.publicName': env('LF', 'recon') }),
  });
  const a = mockAdapter('website', [c('identity.legalName', 'X')], {
    onGather: () => {
      gathered = true;
    },
  });

  const plan = planRecon(ctx, [a]);

  assert.equal(gathered, false); // nothing gathered
  assert.deepEqual(plan.adapters, ['website']);
  // identity.publicName is filled, so it is NOT reported as unfilled...
  assert.ok(!plan.unfilledTargets.includes('identity.publicName'));
  // ...but other recon targets (e.g. identity.gbp) still are.
  assert.ok(plan.unfilledTargets.includes('identity.gbp'));
});
