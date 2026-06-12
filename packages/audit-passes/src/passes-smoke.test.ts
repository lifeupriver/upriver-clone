// Baseline smoke tests: every base pass must resolve — never throw — on
// (a) a small populated fixture, (b) an empty pages dir, and (c) a sparse
// page record with all optional fields missing. This pins the "passes must
// not crash on sparse input" contract for the passes that previously had no
// tests at all.
import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { rmSync } from 'node:fs';

import type { AuditPassResult } from '@upriver/core';

import { makeClientDir, makePage } from './shared/test-helpers.js';
import {
  runSeo,
  runContent,
  runDesign,
  runSales,
  runLinks,
  runSchema,
  runAeo,
  runGeo,
  runLocal,
  runBacklinks,
  runCompetitors,
  type PassOptions,
} from './index.js';

// Same call shape the orchestrator uses (cli/src/commands/audit.ts): every
// pass must accept (slug, clientDir, opts?) positionally, even those that
// ignore opts.
type PassFn = (slug: string, clientDir: string, opts?: PassOptions) => Promise<AuditPassResult>;

const PASSES: ReadonlyArray<{ name: string; run: PassFn }> = [
  { name: 'seo', run: runSeo },
  { name: 'content', run: runContent },
  { name: 'design', run: runDesign },
  { name: 'sales', run: runSales },
  { name: 'links', run: runLinks },
  { name: 'schema', run: runSchema },
  { name: 'aeo', run: runAeo },
  { name: 'geo', run: runGeo },
  { name: 'local', run: runLocal },
  { name: 'backlinks', run: runBacklinks },
  { name: 'competitors', run: runCompetitors },
];

describe('audit pass smoke tests', () => {
  let populatedDir: string;
  let emptyDir: string;
  let sparseDir: string;
  let savedAhrefsKey: string | undefined;

  before(() => {
    // Keep the backlinks pass deterministic regardless of the host env.
    savedAhrefsKey = process.env['AHREFS_API_KEY'];
    delete process.env['AHREFS_API_KEY'];

    populatedDir = makeClientDir('upriver-smoke-populated-', [
      makePage({
        url: 'https://acme.example/',
        slug: 'home',
        metadata: {
          title: 'Acme Co — services in Springfield, IL',
          description: 'Acme provides dependable services in Springfield.',
          statusCode: 200,
          canonical: 'https://acme.example/',
        },
        content: {
          markdown:
            '# Welcome to Acme\n\nWe serve customers near me and across town — Acme is the trusted choice in Springfield, IL.\n\n![Team at work](https://acme.example/img/team-portrait-2024.jpg)',
          wordCount: 120,
          headings: [{ level: 1, text: 'Welcome to Acme' }],
        },
        links: {
          internal: ['https://acme.example/contact', 'https://acme.example/about'],
          external: ['https://www.facebook.com/acme'],
        },
        images: ['https://acme.example/img/team-portrait-2024.jpg'],
        extracted: {
          ctaButtons: [{ text: 'Contact Us', href: '/contact', type: 'primary', location: 'hero' }],
          contact: { phone: '555-555-1234', address: '1 Main St, Springfield, IL', email: 'hi@acme.example' },
          teamMembers: [{ name: 'Sam Smith', role: 'Owner' }],
          testimonials: [{ quote: 'Great work!', attribution: 'Pat, Springfield' }],
          faqs: [{ question: 'Do you offer estimates?', answer: 'Yes, every project starts with a free written estimate so you know the cost up front.' }],
          pricing: [{ item: 'Basic service', price: '$100' }],
          socialLinks: [{ platform: 'facebook', url: 'https://www.facebook.com/acme' }],
          eventSpaces: [],
        },
      }),
      makePage({
        url: 'https://acme.example/contact',
        slug: 'contact',
        metadata: { title: 'Contact Acme' },
        content: {
          markdown: 'Reach us any time.',
          wordCount: 4,
          headings: [{ level: 1, text: 'Contact' }],
        },
        links: { internal: ['https://acme.example/'], external: [] },
      }),
    ]);

    emptyDir = makeClientDir('upriver-smoke-empty-', []);

    // One page record where every optional field is absent: no metadata
    // values, no headings, empty extracted entries with optional sub-fields
    // (attribution, price, type, location, role) omitted.
    sparseDir = makeClientDir('upriver-smoke-sparse-', [
      makePage({
        url: 'https://sparse.example/page',
        extracted: {
          ctaButtons: [{ text: 'Send', href: '/send' }],
          contact: {},
          teamMembers: [{ name: 'Lee' }],
          testimonials: [{ quote: 'Fine.' }],
          faqs: [],
          pricing: [{ item: 'Thing' }],
          socialLinks: [],
          eventSpaces: [],
        },
      }),
    ]);
  });

  after(() => {
    if (savedAhrefsKey !== undefined) process.env['AHREFS_API_KEY'] = savedAhrefsKey;
    for (const dir of [populatedDir, emptyDir, sparseDir]) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const pass of PASSES) {
    describe(pass.name, () => {
      it('resolves with the right dimension and a 0-100 score on a populated fixture', async () => {
        const result = await pass.run('smoke-client', populatedDir, { vertical: 'generic' });
        assert.equal(result.dimension, pass.name);
        assert.ok(Number.isFinite(result.score), 'score must be a number');
        assert.ok(result.score >= 0 && result.score <= 100, `score ${result.score} out of range`);
        assert.ok(Array.isArray(result.findings));
        assert.equal(typeof result.summary, 'string');
        for (const f of result.findings) {
          assert.equal(f.dimension, pass.name);
        }
      });

      it('does not throw on an empty pages dir', async () => {
        const result = await pass.run('smoke-client', emptyDir);
        assert.equal(result.dimension, pass.name);
        assert.ok(result.score >= 0 && result.score <= 100);
      });

      it('does not throw on a page record with missing optional fields', async () => {
        const result = await pass.run('smoke-client', sparseDir);
        assert.equal(result.dimension, pass.name);
        assert.ok(result.score >= 0 && result.score <= 100);
      });
    });
  }
});
