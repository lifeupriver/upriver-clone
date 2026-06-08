// The headline regression test for Build Spec 11 / 07-e2e finding D8: the prompt
// overflow that capped the prior run at doc-08. Uses the REAL committed
// clients/littlefriends/docs/* as fixtures (the prior run's output). Proves:
//   1. doc-08's prompt with full upstream bodies OVERFLOWS the ceiling (the bug),
//   2. with F1 digests it lands UNDER the ceiling (the fix),
//   3. the worst-case fan-in (doc-10, 9 deps) stays under the ceiling (12/12),
//   4. no doc that SUCCEEDED in the prior run (01–07) is falsely flagged FAIL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COVERAGE_MAP, type DeliverableId } from '@upriver/schemas';
import { LocalFsClientDataSource } from '@upriver/core/data';

import { buildPrompt, type UpstreamDoc } from './prompt-builder.js';
import { docFileName } from './engine.js';
import { readProfile } from './profile-io.js';
import { readManifest } from './manifest.js';
import { DIGEST_MAX_CHARS, extractDigest } from './upstream-digest.js';
import { assessPromptSize, estimateTokens, promptTokenCeiling } from './prompt-size.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SLUG = 'littlefriends';
process.env['UPRIVER_SPECS_DIR'] = join(REPO, '.planning/intake-profile-engine/specs-reference');

const ds = new LocalFsClientDataSource({ baseDir: join(REPO, 'clients') });
const requiresDocsOf = (id: DeliverableId): DeliverableId[] =>
  COVERAGE_MAP.find((d) => d.id === id)?.requiresDocs ?? [];
const titleOf = (id: DeliverableId): string => COVERAGE_MAP.find((d) => d.id === id)?.title ?? id;

async function bodyOf(id: DeliverableId): Promise<string> {
  const m = await readManifest(ds, SLUG);
  const path = m.docs[id]?.path ?? `docs/${docFileName(id, titleOf(id))}`;
  return (await ds.readClientFileText(SLUG, path)) ?? '';
}

test('regression: doc-08 overflows with full upstream bodies but fits with F1 digests', async (t) => {
  const profile = await readProfile(ds, SLUG);
  if (!profile || !existsSync(join(REPO, 'clients', SLUG, 'docs', 'doc-07-faq-bank.md'))) {
    t.skip('committed littlefriends fixtures not present');
    return;
  }

  const deps = requiresDocsOf('doc-08'); // doc-01, doc-02, doc-03, doc-07
  const bodies = new Map<DeliverableId, string>();
  for (const id of deps) bodies.set(id, await bodyOf(id));

  const full: UpstreamDoc[] = deps.map((id) => ({ id, digest: bodies.get(id) ?? '' }));
  const digested: UpstreamDoc[] = deps.map((id) => ({ id, digest: extractDigest(bodies.get(id) ?? '') }));

  const base = { id: 'doc-08' as DeliverableId, profile, outputPath: 'doc-08-email-templates.md' };
  const sizeFull = assessPromptSize('doc-08', ...promptParts(buildPrompt({ ...base, upstreamDocs: full })));
  const sizeDigest = assessPromptSize('doc-08', ...promptParts(buildPrompt({ ...base, upstreamDocs: digested })));

  assert.equal(sizeFull.overCeiling, true, `full doc-08 should overflow (est ${sizeFull.estTokens} / ${sizeFull.ceiling})`);
  assert.equal(sizeDigest.overCeiling, false, `digested doc-08 should fit (est ${sizeDigest.estTokens} / ${sizeDigest.ceiling})`);
  assert.ok(sizeDigest.estTokens < sizeFull.estTokens);
});

test('worst-case fan-in invariant: max system + 9 digests + slice stays under the ceiling', () => {
  // Conservative bounds observed in 07-e2e: largest assembled system spec ≈ 66K
  // chars (doc-08), largest profile slice ≈ 6K chars. Max fan-in is 9 (doc-10).
  const MAX_SYSTEM_CHARS = 66_000;
  const MAX_SLICE_CHARS = 6_000;
  const MAX_FAN_IN = 9;
  const worstChars = MAX_SYSTEM_CHARS + MAX_FAN_IN * DIGEST_MAX_CHARS + MAX_SLICE_CHARS;
  assert.ok(
    estimateTokens('x'.repeat(worstChars)) < promptTokenCeiling(),
    `worst-case ${estimateTokens('x'.repeat(worstChars))} est-tok must stay under ${promptTokenCeiling()}`,
  );
});

test('docs that succeeded in the prior run (01–07) are never falsely flagged FAIL with digests', async (t) => {
  const profile = await readProfile(ds, SLUG);
  if (!profile || !existsSync(join(REPO, 'clients', SLUG, 'docs', 'doc-07-faq-bank.md'))) {
    t.skip('committed littlefriends fixtures not present');
    return;
  }
  const ids: DeliverableId[] = ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06', 'doc-07'];
  for (const id of ids) {
    const deps = requiresDocsOf(id);
    const upstreamDocs: UpstreamDoc[] = [];
    for (const dep of deps) upstreamDocs.push({ id: dep, digest: extractDigest(await bodyOf(dep)) });
    const size = assessPromptSize(id, ...promptParts(buildPrompt({ id, profile, outputPath: `${id}.md`, upstreamDocs })));
    assert.equal(size.overCeiling, false, `${id} must not FAIL at the ceiling (est ${size.estTokens} / ${size.ceiling})`);
  }
});

function promptParts(p: { system: string; user: string }): [string, string] {
  return [p.system, p.user];
}
