import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyProfile, type ClientProfile, type ProfileField, type Source } from '@upriver/schemas';
import { buildPrompt, MARKER_INSTRUCTION } from './prompt-builder.js';

const NOW = '2026-06-04T00:00:00.000Z';

function specsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'upriver-pb-'));
  mkdirSync(join(dir, 'ai-operating-system'), { recursive: true });
  writeFileSync(join(dir, 'ai-operating-system', '01-brand-voice-guide-spec.md'), '# DOC-01 SPEC BODY');
  writeFileSync(join(dir, 'ai-operating-system', '04-content-library-spec.md'), '# DOC-04 SPEC BODY');
  mkdirSync(join(dir, 'infrastructure'), { recursive: true });
  writeFileSync(join(dir, 'infrastructure', 'I07-client-account-access-governance-spec.md'), '# I07 SPEC BODY');
  return dir;
}

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
const env = <T,>(value: T): ProfileField<T> => ({
  value,
  source: 'operator' as Source,
  confidence: null,
  verified: false,
  updatedAt: NOW,
});

test('system prompt carries spec, voice rules, marker instruction, and output path', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'identity.publicName': env('LF') });
  const { system, user } = buildPrompt({
    id: 'doc-01',
    profile: p,
    outputPath: 'doc-01-brand-voice-guide.md',
    upstreamDocs: [],
  });
  assert.match(system, /DOC-01 SPEC BODY/);
  assert.match(system, /first-person singular/);
  assert.ok(system.includes(MARKER_INSTRUCTION));
  assert.match(system, /doc-01-brand-voice-guide\.md/);
  assert.match(user, /identity\.publicName: LF/);
  assert.match(user, /no upstream documents/);
});

test('F4: a doc output contract requires a relative path inside the working directory', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'identity.publicName': env('LF') });
  const { system } = buildPrompt({ id: 'doc-01', profile: p, outputPath: 'doc-01.md', upstreamDocs: [] });
  assert.match(system, /relative path/i);
  assert.match(system, /absolute path/i);
});

test('a doc system prompt does NOT carry the provisioning operator-action contract', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'identity.publicName': env('LF') });
  const { system } = buildPrompt({ id: 'doc-01', profile: p, outputPath: 'doc-01.md', upstreamDocs: [] });
  assert.doesNotMatch(system, /OPERATOR ACTION/);
  assert.doesNotMatch(system, /Operator runbook/);
});

test('an i-series system prompt swaps in the provisioning output contract + operator-action marker', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'governance.dataResidency': env('US') });
  const { system } = buildPrompt({
    id: 'i07',
    profile: p,
    outputPath: 'littlefriends-access-governance.md',
    upstreamDocs: [],
  });
  assert.match(system, /I07 SPEC BODY/);
  assert.match(system, /client provisioning artifact/);
  assert.match(system, /Operator runbook/);
  assert.match(system, /Operator must do \(cannot be generated\)/);
  assert.match(system, /\[OPERATOR ACTION:/);
  // both marker classes are present for provisioning
  assert.ok(system.includes(MARKER_INSTRUCTION));
});

test('user prompt includes upstream doc digests when provided', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'content.photos': { storage: env('Drive') } });
  const { user } = buildPrompt({
    id: 'doc-04',
    profile: p,
    outputPath: 'doc-04-content-library.md',
    upstreamDocs: [{ id: 'doc-01', digest: 'BRAND VOICE DIGEST' }],
  });
  assert.match(user, /Upstream document digest: doc-01/);
  assert.match(user, /BRAND VOICE DIGEST/);
});
