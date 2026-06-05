import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LocalFsClientDataSource } from '@upriver/core/data';
import { COVERAGE_MAP, type ClientProfile, type DeliverableId } from '@upriver/schemas';

import {
  aggregateMarkers,
  commitCommand,
  planBatch,
  runTier,
  tierIndexOf,
  type DocResult,
} from './batch.js';
import { docFileName, type GenerateDeps } from './engine.js';
import type { Manifest } from './manifest.js';
import { titleFor } from './report.js';
import type { ClaudeCall } from './runner.js';

const NOW = '2026-06-04T00:00:00.000Z';

// ── Pure profile builder: place an envelope at each requiresField path so
//    `deliverableReadiness` (which only walks envelopes) sees the chosen docs
//    as field-ready, optionally HV-verified. Not schema-valid — planBatch never
//    parses; it only reads via nearestEnvelope. ───────────────────────────────
function env(verified: boolean): unknown {
  return { value: ['x'], source: 'operator', confidence: 'high', verified, updatedAt: NOW };
}
function setEnv(root: Record<string, unknown>, path: string, verified: boolean): void {
  const star = path.indexOf('.*');
  const segs = (star >= 0 ? path.slice(0, star) : path).split('.');
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i] as string;
    if (typeof cur[s] !== 'object' || cur[s] === null || Array.isArray(cur[s])) cur[s] = {};
    cur = cur[s] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1] as string] = env(verified);
}
/** A profile where `ready` docs are field+HV ready and `noHv` docs are field-ready but HV-unverified. */
function makeProfile(ready: DeliverableId[], noHv: DeliverableId[] = []): ClientProfile {
  const root: Record<string, unknown> = {
    _meta: { version: 1, slug: 'lf', createdAt: NOW, updatedAt: NOW, revision: 1 },
  };
  for (const id of noHv) {
    const d = COVERAGE_MAP.find((x) => x.id === id)!;
    for (const p of d.requiresFields) setEnv(root, p, false);
  }
  for (const id of ready) {
    const d = COVERAGE_MAP.find((x) => x.id === id)!;
    for (const p of d.requiresFields) setEnv(root, p, d.requiresHvVerified.includes(p));
  }
  return root as unknown as ClientProfile;
}
const emptyManifest = (): Manifest => ({ version: 1, docs: {} });
function manifestApproved(ids: DeliverableId[]): Manifest {
  const docs: Manifest['docs'] = {};
  for (const id of ids) {
    docs[id] = { id, path: `docs/${id}.md`, generatedAt: NOW, specHash: 'h', profileSliceHash: 's', markers: 0, approved: true };
  }
  return { version: 1, docs };
}

test('tiering: independent ready docs land in tier 0', () => {
  const plan = planBatch(makeProfile(['doc-01', 'doc-02']), emptyManifest(), ['doc-01', 'doc-02']);
  assert.equal(plan.tiers.length, 1);
  assert.deepEqual(plan.tiers[0]?.docs, ['doc-01', 'doc-02']);
  assert.equal(plan.blocked.length, 0);
});

test('tiering: a ready downstream doc lands in a later tier than its in-run deps', () => {
  const plan = planBatch(
    makeProfile(['doc-01', 'doc-02', 'doc-04']),
    emptyManifest(),
    ['doc-01', 'doc-02', 'doc-04'],
  );
  assert.deepEqual(plan.tiers[0]?.docs, ['doc-01', 'doc-02']);
  assert.deepEqual(plan.tiers[1]?.docs, ['doc-04']);
});

test('tiering: a field-ready doc whose same-run upstream is blocked lands BLOCKED, not in a tier', () => {
  // doc-04 fully field/HV-ready, but its deps doc-01/doc-02 have no fields → blocked.
  const plan = planBatch(makeProfile(['doc-04']), emptyManifest(), ['doc-01', 'doc-02', 'doc-04']);
  const tieredIds = plan.tiers.flatMap((t) => t.docs);
  assert.ok(!tieredIds.includes('doc-04'), 'doc-04 must not be tiered');
  const d4 = plan.blocked.find((b) => b.id === 'doc-04')!;
  assert.ok(d4.reasons.includes('blocked-upstream'));
  assert.deepEqual(
    d4.blockingDocs.map((b) => `${b.id}:${b.kind}`).sort(),
    ['doc-01:blocked-this-run', 'doc-02:blocked-this-run'],
  );
});

test('plan reasons distinguish missing-fields from unverified-HV', () => {
  // doc-01 has no fields → missing-fields only; doc-02 fields filled but HV unverified.
  const plan = planBatch(makeProfile([], ['doc-02']), emptyManifest(), ['doc-01', 'doc-02']);
  const d1 = plan.blocked.find((b) => b.id === 'doc-01')!;
  const d2 = plan.blocked.find((b) => b.id === 'doc-02')!;
  assert.deepEqual(d1.reasons, ['missing-fields']);
  assert.deepEqual(d2.reasons, ['unverified-hv']);
  assert.equal(d2.readiness.missingFields.length, 0);
  assert.ok(d2.readiness.unverifiedHv.length > 0);
});

test('--docs subset: an out-of-subset, unapproved dep blocks with the right classification', () => {
  // doc-06 field/HV-ready; deps doc-01/02/05 neither approved nor in the subset.
  const plan = planBatch(makeProfile(['doc-06']), emptyManifest(), ['doc-06']);
  assert.equal(plan.tiers.length, 0);
  const d6 = plan.blocked.find((b) => b.id === 'doc-06')!;
  assert.ok(d6.reasons.includes('blocked-upstream'));
  assert.ok(d6.blockingDocs.every((b) => b.kind === 'unapproved-out-of-scope'));
  assert.deepEqual(d6.blockingDocs.map((b) => b.id).sort(), ['doc-01', 'doc-02', 'doc-05']);
});

test('--docs subset: an already-approved dep satisfies an out-of-subset edge', () => {
  const plan = planBatch(makeProfile(['doc-06']), manifestApproved(['doc-01', 'doc-02', 'doc-05']), ['doc-06']);
  assert.deepEqual(plan.tiers[0]?.docs, ['doc-06']);
  assert.equal(plan.blocked.length, 0);
});

test('tierIndexOf locates the resume tier; -1 for a blocked/out-of-scope id (--from)', () => {
  const plan = planBatch(makeProfile(['doc-01', 'doc-02', 'doc-04']), emptyManifest(), ['doc-01', 'doc-02', 'doc-04']);
  assert.equal(tierIndexOf(plan, 'doc-04'), 1);
  assert.equal(tierIndexOf(plan, 'doc-01'), 0);
  assert.equal(tierIndexOf(plan, 'doc-09'), -1);
});

test('aggregateMarkers groups markers by doc and totals them', () => {
  const docs: DocResult[] = [
    { id: 'doc-01', title: 'A', status: 'produced', markers: ['q1', 'q2'], words: 10 },
    { id: 'doc-02', title: 'B', status: 'produced', markers: [], words: 5 },
    { id: 'doc-03', title: 'C', status: 'failed', markers: [], words: 0, reason: 'x' },
    { id: 'doc-04', title: 'D', status: 'reused', markers: ['q3'], words: 7 },
  ];
  const agg = aggregateMarkers(docs);
  assert.equal(agg.total, 3);
  assert.deepEqual(agg.byDoc.map((g) => g.id), ['doc-01', 'doc-04']);
});

test('commitCommand names the produced paths + manifest and the tier docs', () => {
  const cmd = commitCommand('lf', { index: 0, docs: ['doc-01', 'doc-02'] }, ['docs/a.md', 'docs/b.md']);
  assert.match(cmd, /git add -f clients\/lf\/docs\/a\.md clients\/lf\/docs\/b\.md clients\/lf\/docs\/manifest\.json/);
  assert.match(cmd, /approve tier 0 — doc-01, doc-02/);
});

// ── runTier (integration with the real engine, claude injected) ──────────────
function specsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'upriver-batch-specs-'));
  mkdirSync(join(dir, 'ai-operating-system'), { recursive: true });
  for (const n of ['01-brand-voice-guide', '02-business-facts-reference']) {
    writeFileSync(join(dir, 'ai-operating-system', `${n}-spec.md`), `# spec ${n}`);
  }
  return dir;
}
const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../schemas/src/fixtures/littlefriends.profile.json',
);
function seededDs(): LocalFsClientDataSource {
  const d = new LocalFsClientDataSource({ baseDir: mkdtempSync(join(tmpdir(), 'upriver-batch-ds-')) });
  return d;
}
/** The fixture has doc-02's HV fields filled-but-unverified; verify them so doc-02 is gen-ready. */
function isEnv(x: unknown): x is { verified: boolean } {
  return typeof x === 'object' && x !== null && !Array.isArray(x) && 'value' in x && 'verified' in x;
}
function readyFixture(): string {
  const obj = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, unknown>;
  const hv = COVERAGE_MAP.find((d) => d.id === 'doc-02')!.requiresHvVerified;
  for (const path of hv) {
    let cur: unknown = obj;
    for (const seg of path.split('.')) {
      if (isEnv(cur)) break;
      if (cur === null || typeof cur !== 'object') break;
      cur = Array.isArray(cur) ? cur[seg === '*' ? 0 : Number(seg)] : (cur as Record<string, unknown>)[seg];
    }
    if (isEnv(cur)) cur.verified = true;
  }
  return JSON.stringify(obj);
}
function deps(d: LocalFsClientDataSource, call: ClaudeCall): { deps: GenerateDeps; out: () => string } {
  const logs: string[] = [];
  return {
    deps: { ds: d, call, log: (m) => logs.push(m), isTty: false, promptApprove: async () => false, now: () => NOW },
    out: () => logs.join('\n'),
  };
}
/** A claude call that writes the expected doc file for `id`, but throws for ids in `boom`. */
function partialCall(boom: Set<DeliverableId>, content = '# Doc\n[NEEDS CONFIRMATION: q?]\n'): { call: ClaudeCall; calls: () => number } {
  let n = 0;
  const call: ClaudeCall = async (o) => {
    n += 1;
    const id = o.command?.replace('generate:', '') as DeliverableId;
    if (boom.has(id)) throw new Error(`claude failed for ${id}`);
    writeFileSync(join(o.cwd as string, docFileName(id, titleFor(id))), content);
    return { text: '', fromCache: false, cachePath: '', costUsd: null, inputTokens: null, outputTokens: null };
  };
  return { call, calls: () => n };
}

test('runTier: failure isolation — one doc fails, the rest of the tier still generate', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = seededDs();
  await d.writeClientFile('littlefriends', 'profile.json', readyFixture());
  const { call } = partialCall(new Set<DeliverableId>(['doc-02']));
  const { deps: dp } = deps(d, call);
  const tr = await runTier(
    { index: 0, docs: ['doc-01', 'doc-02'] },
    { slug: 'littlefriends', dryRun: false, yes: false, model: 'sonnet' },
    dp,
    new Set(),
  );
  assert.deepEqual(tr.produced, ['doc-01']);
  assert.deepEqual(tr.failed, ['doc-02']);
  assert.equal(tr.docs.find((x) => x.id === 'doc-01')?.markers.length, 1);
  assert.match(tr.docs.find((x) => x.id === 'doc-02')?.reason ?? '', /claude failed/);
});

test('runTier: a doc whose upstream failed this run is skipped, never calls claude', async () => {
  const d = seededDs();
  const { call, calls } = partialCall(new Set());
  const { deps: dp } = deps(d, call);
  const tr = await runTier(
    { index: 1, docs: ['doc-04'] },
    { slug: 'littlefriends', dryRun: false, yes: false, model: 'sonnet' },
    dp,
    new Set<DeliverableId>(['doc-02']),
  );
  assert.deepEqual(tr.skipped, ['doc-04']);
  assert.equal(calls(), 0);
  assert.match(tr.docs[0]?.reason ?? '', /doc-02/);
});
