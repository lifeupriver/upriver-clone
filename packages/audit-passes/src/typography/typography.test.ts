import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from './index.js';
import type { PageData } from '../shared/loader.js';

function page(opts: { url: string; slug: string; headings: Array<{ level: number; text: string }> }): PageData {
  return {
    url: opts.url,
    slug: opts.slug,
    scraped_at: new Date().toISOString(),
    metadata: {},
    content: { markdown: '', wordCount: 0, headings: opts.headings },
    links: { internal: [], external: [] },
    images: [],
    screenshots: { desktop: null, mobile: null },
    extracted: {
      ctaButtons: [],
      contact: {},
      teamMembers: [],
      testimonials: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath: null,
    hasBranding: false,
  };
}

describe('typography audit', () => {
  let clientDir: string;

  before(() => {
    clientDir = mkdtempSync(join(tmpdir(), 'upriver-typography-'));
    mkdirSync(join(clientDir, 'pages'));
    // No H1 → heading-hierarchy finding; one font → single-family finding.
    writeFileSync(
      join(clientDir, 'pages', 'home.json'),
      JSON.stringify(page({ url: 'https://test.com/', slug: 'home', headings: [{ level: 2, text: 'Welcome' }] })),
    );
    writeFileSync(
      join(clientDir, 'design-tokens.json'),
      JSON.stringify({
        extracted_at: new Date().toISOString(),
        source_url: 'https://test.com/',
        fonts: ['Inter'],
      }),
    );
  });

  after(() => {
    rmSync(clientDir, { recursive: true, force: true });
  });

  it("emits dimension 'typography', not 'design'", async () => {
    const result = await run('test-client', clientDir);
    assert.equal(result.dimension, 'typography');
    assert.ok(result.findings.length > 0);
    for (const f of result.findings) {
      assert.equal(f.dimension, 'typography');
      assert.match(f.id, /^typography-/);
    }
  });

  it("emits dimension 'typography' even with no scraped data", async () => {
    const result = await run('test-client', join(clientDir, 'does-not-exist'));
    assert.equal(result.dimension, 'typography');
  });
});
