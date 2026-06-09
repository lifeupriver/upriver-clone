import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalFsClientDataSource } from '@upriver/core/data';
import { createEmptyProfile, type DeliverableId } from '@upriver/schemas';
import { readManifest } from './manifest.js';
import { writeProfile } from './profile-io.js';
import { docFileName, GENERATABLE, M1_DOCS, WEB_DOCS, runGenerate, type GenerateDeps } from './engine.js';
import { ALL_DOCS } from './batch.js';
import { titleFor } from './report.js';
import type { ClaudeCall } from './runner.js';

const NOW = '2026-06-04T00:00:00.000Z';

test('M1_DOCS covers the full 18-doc AI Operating System (i01 uploads all 18)', () => {
  const expected = Array.from({ length: 18 }, (_, i) => `doc-${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual([...M1_DOCS], expected);
});

test('website tier (--web) is excluded from --all default scope and registered in GENERATABLE (Build Spec 10)', () => {
  // `--all` defaults to ALL_DOCS (= M1_DOCS): the website tier must NOT ride it.
  for (const id of WEB_DOCS) {
    assert.ok(!ALL_DOCS.includes(id), `${id} must be excluded from --all's default scope`);
    assert.ok(!M1_DOCS.includes(id), `${id} must not be in M1_DOCS`);
    assert.ok(GENERATABLE.includes(id), `${id} must be generatable (single --doc / --web)`);
  }
  // The bridge registers doc-web-prd (A); design-system (C) is added with its row.
  assert.ok(WEB_DOCS.includes('doc-web-prd'), 'doc-web-prd is in the website tier');
});
const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../schemas/src/fixtures/littlefriends.profile.json',
);

function specsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'upriver-eng-specs-'));
  mkdirSync(join(dir, 'ai-operating-system'), { recursive: true });
  writeFileSync(join(dir, 'ai-operating-system', '01-brand-voice-guide-spec.md'), '# DOC-01 SPEC BODY');
  writeFileSync(join(dir, 'ai-operating-system', '02-business-facts-reference-spec.md'), '# DOC-02 SPEC BODY');
  mkdirSync(join(dir, 'infrastructure'), { recursive: true });
  writeFileSync(join(dir, 'infrastructure', 'I07-client-account-access-governance-spec.md'), '# I07 SPEC BODY');
  writeFileSync(join(dir, 'infrastructure', 'I01-client-claude-project-setup-spec.md'), '# I01 SPEC BODY');
  return dir;
}
function ds(): LocalFsClientDataSource {
  return new LocalFsClientDataSource({ baseDir: mkdtempSync(join(tmpdir(), 'upriver-eng-ds-')) });
}
async function seedFixture(d: LocalFsClientDataSource): Promise<void> {
  await d.writeClientFile('littlefriends', 'profile.json', readFileSync(FIXTURE, 'utf8'));
}
function deps(
  d: LocalFsClientDataSource,
  call: ClaudeCall,
  opts: { isTty?: boolean; promptApprove?: () => Promise<boolean> } = {},
): { deps: GenerateDeps; out: () => string } {
  const logs: string[] = [];
  return {
    deps: {
      ds: d,
      call,
      log: (m) => logs.push(m),
      isTty: opts.isTty ?? false,
      promptApprove: opts.promptApprove ?? (async () => false),
      now: () => NOW,
    },
    out: () => logs.join('\n'),
  };
}
/** A mock claude call that writes the doc the engine expects, for `id`. */
function writingCall(id: DeliverableId, content = '# Doc\n\nbody'): { call: ClaudeCall; calls: () => number } {
  let n = 0;
  const fileName = docFileName(id, titleFor(id));
  const call: ClaudeCall = async (o) => {
    n += 1;
    writeFileSync(join(o.cwd as string, fileName), content);
    return { text: '', fromCache: false, cachePath: '', costUsd: null, inputTokens: null, outputTokens: null };
  };
  return { call, calls: () => n };
}
const explodingCall: ClaudeCall = async () => {
  throw new Error('claude must not be called');
};
const opts = (id: DeliverableId, over: Partial<{ dryRun: boolean; yes: boolean }> = {}) => ({
  slug: 'littlefriends',
  id,
  dryRun: over.dryRun ?? false,
  yes: over.yes ?? false,
  model: 'sonnet',
});

test('an out-of-scope doc id errors (exit 2), no claude call', async () => {
  const { deps: dp } = deps(ds(), explodingCall);
  const r = await runGenerate(opts('doc-13' as DeliverableId), dp);
  assert.equal(r.status, 'error');
  assert.equal(r.exitCode, 2);
  assert.equal(r.claudeCalls, 0);
});

test('a missing profile errors with the import hint', async () => {
  const { deps: dp, out } = deps(ds(), explodingCall);
  const r = await runGenerate(opts('doc-01'), dp);
  assert.equal(r.exitCode, 2);
  assert.match(out(), /profile import/);
});

test('--dry-run reports readiness + prompt sizes with zero claude calls', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { call, calls } = writingCall('doc-01');
  const { deps: dp, out } = deps(d, call);
  const r = await runGenerate(opts('doc-01', { dryRun: true }), dp);
  assert.equal(r.status, 'dry-run');
  assert.equal(r.claudeCalls, 0);
  assert.equal(calls(), 0);
  assert.match(out(), /READY/);
  assert.match(out(), /system prompt: \d+ chars/);
});

test('doc-02 blocks on unverified HV, names the pricing fields, never calls claude', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { deps: dp, out } = deps(d, explodingCall);
  const r = await runGenerate(opts('doc-02'), dp);
  assert.equal(r.status, 'blocked');
  assert.equal(r.exitCode, 1);
  assert.equal(r.claudeCalls, 0);
  assert.match(out(), /unverified human-verify-required/);
  assert.match(out(), /pricing\./);
});

test('an unready doc (missing fields) blocks and names the blockers', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await writeProfile(d, 'littlefriends', createEmptyProfile('littlefriends', NOW));
  const { deps: dp, out } = deps(d, explodingCall);
  const r = await runGenerate(opts('doc-01'), dp);
  assert.equal(r.status, 'blocked');
  assert.equal(r.exitCode, 1);
  assert.match(out(), /missing fields/);
  assert.match(out(), /identity\.publicName/);
});

test('--yes refuses to approve a never-approved doc (generates, leaves unapproved)', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01');
  const { deps: dp, out } = deps(d, call, { isTty: false });
  const r = await runGenerate(opts('doc-01', { yes: true }), dp);
  assert.equal(r.status, 'generated');
  assert.equal(r.approved, false);
  assert.equal(r.claudeCalls, 1);
  assert.match(out(), /Refusing --yes/);
  const manifest = await readManifest(d, 'littlefriends');
  assert.equal(manifest.docs['doc-01']?.approved, false);
});

test('an interactive approval persists approved:true in the manifest', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01');
  const { deps: dp } = deps(d, call, { isTty: true, promptApprove: async () => true });
  const r = await runGenerate(opts('doc-01'), dp);
  assert.equal(r.status, 'generated');
  assert.equal(r.approved, true);
  const manifest = await readManifest(d, 'littlefriends');
  assert.equal(manifest.docs['doc-01']?.approved, true);
  assert.equal(manifest.docs['doc-01']?.path, 'docs/doc-01-brand-voice-guide.md');
});

test('a provisioning id (i07) is in scope — dry-run loads its spec, reports readiness, zero claude calls', async () => {
  // Proves the scope gate widened to the i-series (no exit-2 out-of-scope error) and the
  // infrastructure spec loads. i07 is HV-dense and unverified in the fixture → BLOCKED (the demo).
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { deps: dp, out } = deps(d, explodingCall);
  const r = await runGenerate(opts('i07' as DeliverableId, { dryRun: true }), dp);
  assert.equal(r.status, 'dry-run');
  assert.equal(r.exitCode, 0);
  assert.equal(r.claudeCalls, 0);
  assert.match(out(), /BLOCKED/);
  assert.match(out(), /system prompt: \d+ chars/);
});

test('a provisioning artifact (i01) references upstream docs by TITLE, not full digests, so its 19-way fan-in stays tiny', async () => {
  // i01 ("Client Claude Project") requires all 18 docs + i07. Ingesting 19 full
  // digests (~171K chars) overflows the model session — i01 is a runbook that
  // UPLOADS the docs by filename, it does not synthesize from their content. So
  // provisioning artifacts get a title list, keeping the prompt small.
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { deps: dp } = deps(d, explodingCall);
  const r = await runGenerate(opts('i01' as DeliverableId, { dryRun: true }), dp);
  assert.equal(r.status, 'dry-run');
  assert.ok(
    (r.promptSize?.userChars ?? 0) < 5_000,
    `i01 upstream should be a title list (small), got ${r.promptSize?.userChars} user chars`,
  );
  assert.equal(r.promptSize?.overCeiling, false);
});

test('the engine scans [OPERATOR ACTION] click-ops into operatorActions alongside [NEEDS CONFIRMATION]', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const body = '# Artifact\n\n[NEEDS CONFIRMATION: which plan tier?]\n[OPERATOR ACTION: create the client Project]\n';
  const { call } = writingCall('doc-01', body);
  const { deps: dp } = deps(d, call, { isTty: true, promptApprove: async () => true });
  const r = await runGenerate(opts('doc-01'), dp);
  assert.deepEqual(r.markers, ['which plan tier?']);
  assert.deepEqual(r.operatorActions, ['create the client Project']);
});

test('markers in the generated doc are scanned and recorded', async () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01', '# Doc\n\n[NEEDS CONFIRMATION: who is the owner?]\nbody');
  const { deps: dp } = deps(d, call, { isTty: true, promptApprove: async () => true });
  const r = await runGenerate(opts('doc-01'), dp);
  assert.deepEqual(r.markers, ['who is the owner?']);
  const manifest = await readManifest(d, 'littlefriends');
  assert.equal(manifest.docs['doc-01']?.markers, 1);
});
