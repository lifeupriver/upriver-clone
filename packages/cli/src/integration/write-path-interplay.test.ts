// Tier-2 integration seam #4: the four write paths interplaying through the one
// shared merge arbiter. import (operator) → migrate-intake (operator) →
// extract-transcript (transcript) → recon (recon), persisted exactly as each
// command persists (merge → bumpMeta → writeProfile → appendConflicts), against
// an in-memory data source. Asserts the cross-component invariants the specs
// each guarantee in isolation but never exercised together:
//   1. `_meta.revision` increases monotonically across every write;
//   2. `profile-conflicts.json` stays coherent (entries accumulate, never drop);
//   3. no component ever flips a field to `verified: true` — only an operator
//      `profile verify` does, which this pipeline never calls.
// No LLM/API: the transcript/recon orchestrators take already-reconciled
// candidates, so the test is deterministic.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyProfile,
  isEnvelope,
  nearestEnvelope,
  type ClientProfile,
  type ProfileField,
} from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';
import type { ClientIntake } from '@upriver/core';

import {
  appendConflicts,
  bumpMeta,
  readConflicts,
  readProfile,
  writeProfile,
} from '../generate/profile-io.js';
import { planImport } from '../generate/profile-merge.js';
import { planMigration } from '../util/intake-reader.js';
import { applyCandidates } from '../transcript/apply.js';
import { mergeCandidates } from '../recon/merge-candidates.js';
import type { ReconciledCandidate } from '../transcript/types.js';
import type { PathedCandidate } from '../recon/types.js';

/** In-memory data source — the write paths only touch read/writeClientFileText. */
class MemoryDataSource implements ClientDataSource {
  readonly kind = 'memory';
  private files = new Map<string, string>();
  private key(slug: string, path: string): string {
    return `${slug}/${path}`;
  }
  async listClientSlugs(): Promise<string[]> {
    return [];
  }
  async fileExists(slug: string, path: string): Promise<boolean> {
    return this.files.has(this.key(slug, path));
  }
  async readClientFile(slug: string, path: string): Promise<Uint8Array | null> {
    const t = this.files.get(this.key(slug, path));
    return t === undefined ? null : new TextEncoder().encode(t);
  }
  async readClientFileText(slug: string, path: string): Promise<string | null> {
    return this.files.get(this.key(slug, path)) ?? null;
  }
  async writeClientFile(slug: string, path: string, body: Uint8Array | string): Promise<void> {
    this.files.set(this.key(slug, path), typeof body === 'string' ? body : new TextDecoder().decode(body));
  }
  async listClientFiles(): Promise<string[]> {
    return [];
  }
  async signClientFileUrl(): Promise<string | null> {
    return null;
  }
}

const SLUG = 'interplay';

function setEnv(root: Record<string, unknown>, path: string, env: ProfileField<unknown>): void {
  const segs = path.split('.');
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i] as string;
    if (typeof cur[seg] !== 'object' || cur[seg] === null) cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1] as string] = env;
}

function countVerified(node: unknown): number {
  if (isEnvelope(node)) return node.verified === true ? 1 : 0;
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return 0;
  let n = 0;
  for (const v of Object.values(node as Record<string, unknown>)) n += countVerified(v);
  return n;
}

function legacyIntake(): ClientIntake {
  return {
    version: 1,
    findingDecisions: { 'seo-001': 'fix' },
    pageWants: { home: 'Warmer hero.' },
    referenceSites: ['https://example.com'],
    scopeTier: 'rebuild',
    submittedAt: '2026-04-28T00:00:00.000Z',
    updatedAt: '2026-05-01T12:34:56.000Z',
  };
}

const env = (value: unknown, source: ProfileField<unknown>['source'], verified: boolean, now: string): ProfileField<unknown> => ({
  value,
  source,
  confidence: 'high',
  verified,
  updatedAt: now,
});

test('write-path interplay: import → migrate → transcript → recon (rev monotonic, conflicts coherent, never auto-verified)', async () => {
  const ds = new MemoryDataSource();
  const revs: number[] = [];
  const revAfterWrite = async (): Promise<number> => (await readProfile(ds, SLUG))!._meta.revision;

  // 1) import (operator): seed publicName (unverified) + a VERIFIED operator deposit.
  const t1 = '2026-06-01T00:00:00.000Z';
  const seed = createEmptyProfile(SLUG, t1) as unknown as Record<string, unknown>;
  setEnv(seed, 'identity.publicName', env('Little Friends Learning Loft', 'operator', false, t1));
  setEnv(seed, 'pricing.deposit', env('one month tuition', 'operator', true, t1));
  const importPlan = planImport(null, seed as unknown as ClientProfile, t1, false);
  await writeProfile(ds, SLUG, importPlan.toWrite);
  revs.push(await revAfterWrite());

  // 2) migrate-intake (operator): fold legacy intake into auditDecisions.
  const t2 = '2026-06-02T00:00:00.000Z';
  const migration = planMigration(await readProfile(ds, SLUG), legacyIntake(), SLUG, t2);
  assert.equal(migration.kind, 'apply');
  if (migration.kind === 'apply') await writeProfile(ds, SLUG, migration.toWrite);
  revs.push(await revAfterWrite());

  // 3) extract-transcript (transcript): one gap-fill + two conflicts vs operator.
  const t3 = '2026-06-03T00:00:00.000Z';
  const transcriptCands: ReconciledCandidate[] = [
    { path: 'capacity.bookingLeadTime', value: { typical: '8–10 weeks', minimum: '2 weeks' }, quote: 'about eight to ten weeks', confidence: 'high', chunkIndices: [0] },
    { path: 'identity.publicName', value: 'LF Loft', quote: 'we call it LF Loft', confidence: 'medium', chunkIndices: [0] },
    { path: 'pricing.deposit', value: 'two months tuition', quote: 'the deposit is two months', confidence: 'medium', chunkIndices: [1] },
  ];
  const tRes = applyCandidates((await readProfile(ds, SLUG))!, transcriptCands, t3);
  await writeProfile(ds, SLUG, bumpMeta(tRes.profile, t3));
  await appendConflicts(ds, SLUG, tRes.conflicts);
  revs.push(await revAfterWrite());
  assert.equal(tRes.conflicts.length, 2, 'transcript: publicName + deposit conflict; bookingLeadTime fills');

  // 4) recon: one gap-fill + two conflicts (vs verified operator, vs transcript).
  const t4 = '2026-06-04T00:00:00.000Z';
  const reconCands: PathedCandidate[] = [
    { path: 'governance.regulatedData', value: ['children medical records'], source: 'recon', confidence: 'low' },
    { path: 'pricing.deposit', value: 'deposit $75', source: 'recon', confidence: 'low' },
    { path: 'capacity.bookingLeadTime', value: { typical: '6 weeks', minimum: '1 week' }, source: 'recon', confidence: 'low' },
  ];
  const rRes = mergeCandidates((await readProfile(ds, SLUG))!, reconCands, t4);
  await writeProfile(ds, SLUG, bumpMeta(rRes.profile, t4));
  await appendConflicts(ds, SLUG, rRes.conflicts);
  revs.push(await revAfterWrite());
  assert.equal(rRes.conflicts.length, 2, 'recon: deposit (verified) + bookingLeadTime (transcript) conflict; regulatedData fills');

  // --- invariant 1: monotonically increasing revision across every write ---
  for (let i = 1; i < revs.length; i++) {
    assert.ok(revs[i]! > revs[i - 1]!, `revision must increase: ${revs.join(' → ')}`);
  }
  assert.deepEqual(revs, [1, 2, 3, 4]);

  // --- invariant 2: profile-conflicts.json coherent ---
  const queue = await readConflicts(ds, SLUG);
  assert.equal(queue.length, 4, 'all four conflicts accumulated, none dropped or overwritten');
  for (const e of queue) {
    assert.ok(typeof e.path === 'string' && e.path.length > 0, 'entry has a path');
    assert.ok(isEnvelope(e.existing), 'entry.existing is a real envelope');
    assert.ok(e.candidate != null && typeof e.candidate.source === 'string', 'entry.candidate has a source');
    assert.ok(typeof e.queuedAt === 'string' && e.queuedAt.length > 0, 'entry has queuedAt');
  }
  assert.deepEqual(
    queue.map((e) => e.path).sort(),
    ['capacity.bookingLeadTime', 'identity.publicName', 'pricing.deposit', 'pricing.deposit'],
  );

  // --- invariant 3: no component ever flips verified ---
  const finalProfile = (await readProfile(ds, SLUG))!;
  const asObj = finalProfile as unknown as Record<string, unknown>;
  assert.equal(countVerified(finalProfile), 1, 'exactly one verified field — the operator seed, untouched');
  const deposit = nearestEnvelope(asObj, 'pricing.deposit');
  assert.equal(deposit?.verified, true);
  assert.equal(deposit?.value, 'one month tuition', 'verified operator value never overwritten by transcript/recon');
  const lead = nearestEnvelope(asObj, 'capacity.bookingLeadTime');
  assert.equal(lead?.source, 'transcript', 'transcript won the empty slot');
  assert.equal(lead?.verified, false, 'transcript fill is unverified');
  const regulated = nearestEnvelope(asObj, 'governance.regulatedData');
  assert.equal(regulated?.source, 'recon', 'recon filled the gap');
  assert.equal(regulated?.verified, false, 'recon fill is unverified');
});
