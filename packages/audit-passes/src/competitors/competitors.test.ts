import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { rmSync } from 'node:fs';

import { run } from './index.js';
import { makeClientDir, makePage } from '../shared/test-helpers.js';

describe('competitors audit pass', () => {
  let clientDir: string;

  before(() => {
    // Sparse single-page site: no event spaces, no testimonials, no tour —
    // the worst case that used to trigger every wedding-venue finding.
    clientDir = makeClientDir('upriver-competitors-', [
      makePage({
        url: 'https://acme-plumbing.example/',
        content: { markdown: 'Plumbing repair and installation.', wordCount: 5, headings: [] },
      }),
    ]);
  });

  after(() => {
    rmSync(clientDir, { recursive: true, force: true });
  });

  it('is call-compatible with the old 2-arg signature', async () => {
    const result = await run('acme', clientDir);
    assert.equal(result.dimension, 'competitors');
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it('does not emit wedding-venue findings for non-venue businesses', async () => {
    const result = await run('acme', clientDir, { vertical: 'generic' });
    const allCopy = result.findings
      .map((f) => `${f.title}\n${f.description}\n${f.recommendation}`)
      .join('\n');
    assert.doesNotMatch(allCopy, /venue|wedding|virtual tour|real weddings|couples/i);
    // The venue-space P0 was the headline bug: every business got it.
    assert.ok(
      !result.findings.some((f) => f.priority === 'p0'),
      'no venue-derived P0s for a generic business',
    );
  });

  it('omits venue findings when no vertical is provided at all', async () => {
    const result = await run('acme', clientDir, {});
    const titles = result.findings.map((f) => f.title).join('\n');
    assert.doesNotMatch(titles, /venue|wedding|virtual tour/i);
  });

  it('keeps venue table-stakes findings for wedding venues', async () => {
    const result = await run('venue', clientDir, { vertical: 'wedding-venue' });
    assert.ok(
      result.findings.some((f) => /No individual venue space pages/.test(f.title)),
      'venue-space P0 should still fire for wedding venues',
    );
    assert.ok(result.findings.some((f) => /virtual tour/i.test(f.title)));
    assert.ok(result.findings.some((f) => /real weddings/i.test(f.title)));
  });

  it('pulls review-source recommendations from the vertical pack', async () => {
    const medical = await run('clinic', clientDir, { vertical: 'medical' });
    const testimonialFinding = medical.findings.find((f) => /testimonials/.test(f.title));
    assert.ok(testimonialFinding, 'testimonial-volume finding expected on a site with none');
    assert.match(testimonialFinding.recommendation, /Zocdoc/);
    assert.doesNotMatch(testimonialFinding.recommendation, /WeddingWire|The Knot/);

    const wedding = await run('venue', clientDir, { vertical: 'wedding-venue' });
    const weddingTestimonials = wedding.findings.find((f) => /testimonials/.test(f.title));
    assert.ok(weddingTestimonials);
    assert.match(weddingTestimonials.recommendation, /WeddingWire/);
  });

  it('does not throw on an empty pages dir', async () => {
    const emptyDir = makeClientDir('upriver-competitors-empty-', []);
    try {
      const result = await run('acme', emptyDir, { vertical: 'retail' });
      assert.equal(result.dimension, 'competitors');
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
