import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PITCH_DOCS, isPitchDoc, buildPitchContext, PITCH_CONTEXT_MAX_CHARS } from './teasers.js';
import { M1_DOCS, WEB_DOCS, GENERATABLE } from '../generate/engine.js';
import { specPathFor } from '../generate/spec-loader.js';
import { buildPrompt } from '../generate/prompt-builder.js';
import { COVERAGE_MAP, createEmptyProfile, type ClientProfile, type ProfileField, type Source } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

// Tests run with cwd=packages/cli; point the spec loader at the repo's real
// specs-reference so the committed pitch production specs are what's tested.
// dist/pitch/teasers.test.js → four levels up is the repo root.
process.env['UPRIVER_SPECS_DIR'] = fileURLToPath(
  new URL('../../../../.planning/intake-profile-engine/specs-reference', import.meta.url),
);

function fakeDs(files: Record<string, string>): ClientDataSource {
  return {
    fileExists: async (_slug: string, path: string) => path in files,
    readClientFileText: async (_slug: string, path: string) => files[path] ?? null,
  } as unknown as ClientDataSource;
}

const auditPackage = JSON.stringify({
  meta: { clientName: 'Wildflour Bakery' },
  findings: [
    { id: 'f2', priority: 'p1', title: 'No alt text on gallery', description: 'imgs lack alt', why_it_matters: 'a11y + SEO', recommendation: 'add alt', page: '/' },
    { id: 'f1', priority: 'p0', title: 'Missing homepage CTA', description: 'no CTA above fold', why_it_matters: 'conversions', recommendation: 'add CTA', page: '/' },
    { id: 'f3', priority: 'p2', title: 'Slow LCP', description: 'hero is 4MB', why_it_matters: 'speed', recommendation: 'compress', page: '/' },
    { id: 'f4', priority: 'p0', title: 'No local schema', description: 'no LocalBusiness JSON-LD', why_it_matters: 'local search', recommendation: 'add schema', page: '/' },
  ],
});
const homePage = JSON.stringify({
  url: 'https://wildflour.example/',
  content: { markdown: '# Fresh bread daily\nWe bake sourdough every morning in Hudson.' },
});
const clientConfig = 'slug: wb\nname: Wildflour\nurl: https://wildflour.example\nvertical: restaurant\nstage: prospect\n';

describe('PITCH_DOCS registration', () => {
  it('registers exactly four pitch teasers', () => {
    assert.equal(PITCH_DOCS.length, 4);
    for (const id of PITCH_DOCS) assert.match(id, /^doc-pitch-0[1-4]$/);
  });

  it('pitch docs are generatable but excluded from --all and --web scopes', () => {
    for (const id of PITCH_DOCS) {
      assert.ok(GENERATABLE.includes(id), `${id} not generatable`);
      assert.ok(!M1_DOCS.includes(id), `${id} must not be in M1`);
      assert.ok(!WEB_DOCS.includes(id), `${id} must not be in WEB`);
      assert.ok(isPitchDoc(id));
    }
    assert.ok(!isPitchDoc('doc-01'));
  });

  it('pitch coverage entries have no HV gates and no upstream deps (recon-only teasers)', () => {
    for (const id of PITCH_DOCS) {
      const d = COVERAGE_MAP.find((x) => x.id === id);
      assert.ok(d, `${id} missing from COVERAGE_MAP`);
      assert.deepEqual(d?.requiresHvVerified, []);
      assert.deepEqual(d?.requiresDocs, []);
    }
  });
});

describe('pitch production specs (the teaser prompts)', () => {
  it('every pitch spec exists, forbids pricing, and contains no dollar amounts', () => {
    for (const id of PITCH_DOCS) {
      const spec = readFileSync(specPathFor(id), 'utf8');
      assert.ok(spec.length > 200, `${id} spec is too thin to drive generation`);
      assert.match(spec, /no pricing|never (mention|include|state).*pric/i, `${id} spec must forbid pricing`);
      assert.doesNotMatch(spec, /\$\s?\d/, `${id} spec must not contain dollar amounts`);
    }
  });

  it('the voice-sample spec constrains rewrites to the scraped copy', () => {
    const spec = readFileSync(specPathFor('doc-pitch-03'), 'utf8');
    assert.match(spec, /only.*(scraped|provided).*(copy|text)|rewrite.*(provided|scraped)/i);
  });

  it('the vertical-snapshot spec has an explicit generic fallback', () => {
    const spec = readFileSync(specPathFor('doc-pitch-04'), 'utf8');
    assert.match(spec, /generic/i);
  });
});

describe('buildPitchContext', () => {
  it('surfaces top findings p0-first, the homepage copy, and the vertical', async () => {
    const ds = fakeDs({
      'audit-package.json': auditPackage,
      'pages/home.json': homePage,
      'client-config.yaml': clientConfig,
    });
    const ctx = await buildPitchContext(ds, 'wb');
    const firstP0 = ctx.indexOf('Missing homepage CTA');
    const p1 = ctx.indexOf('No alt text');
    assert.ok(firstP0 >= 0 && p1 >= 0 && firstP0 < p1, 'p0 findings come before p1');
    assert.match(ctx, /Fresh bread daily/);
    assert.match(ctx, /restaurant/);
  });

  it('degrades gracefully when artifacts are missing', async () => {
    const ctx = await buildPitchContext(fakeDs({}), 'wb');
    assert.match(ctx, /no audit findings/i);
    assert.match(ctx, /no scraped homepage/i);
  });

  it('caps the context size', async () => {
    const huge = JSON.stringify({
      url: 'https://x.example/',
      content: { markdown: 'word '.repeat(100_000) },
    });
    const ctx = await buildPitchContext(fakeDs({ 'pages/home.json': huge }), 'wb');
    assert.ok(ctx.length <= PITCH_CONTEXT_MAX_CHARS, `${ctx.length} > ${PITCH_CONTEXT_MAX_CHARS}`);
  });
});

describe('buildPrompt extraUserContext', () => {
  it('injects the pitch recon context into the user prompt', () => {
    const env = <T,>(value: T): ProfileField<T> => ({
      value,
      source: 'operator' as Source,
      confidence: null,
      verified: false,
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const profile = createEmptyProfile('wb', '2026-06-12T00:00:00.000Z') as any;
    profile.identity ??= {};
    profile.identity.publicName = env('Wildflour Bakery');
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const prompt = buildPrompt({
      id: 'doc-pitch-02',
      profile: profile as ClientProfile,
      outputPath: 'doc-pitch-02-top-3-quick-wins.md',
      upstreamDocs: [],
      extraUserContext: 'PITCH-CONTEXT-SENTINEL',
    });
    assert.match(prompt.user, /PITCH-CONTEXT-SENTINEL/);
    assert.match(prompt.system, /UNCONFIRMED/);
  });
});
