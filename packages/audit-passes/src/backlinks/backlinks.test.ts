import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { rmSync } from 'node:fs';

import { run } from './index.js';
import { makeClientDir, makePage } from '../shared/test-helpers.js';

describe('backlinks audit pass', () => {
  let clientDir: string;
  let savedKey: string | undefined;

  before(() => {
    savedKey = process.env['AHREFS_API_KEY'];
    delete process.env['AHREFS_API_KEY'];
    clientDir = makeClientDir('upriver-backlinks-', [
      makePage({
        url: 'https://lakeview-dental.example/',
        content: { markdown: 'Family dentistry.', wordCount: 2, headings: [] },
      }),
    ]);
  });

  after(() => {
    if (savedKey !== undefined) process.env['AHREFS_API_KEY'] = savedKey;
    rmSync(clientDir, { recursive: true, force: true });
  });

  it('is call-compatible with the old 2-arg signature', async () => {
    const result = await run('lakeview', clientDir);
    assert.equal(result.dimension, 'backlinks');
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it('recommends the vertical pack directories, not wedding directories', async () => {
    const result = await run('lakeview', clientDir, { vertical: 'medical' });
    const dirFinding = result.findings.find((f) => /directory profiles/i.test(f.title));
    assert.ok(dirFinding, 'directory-citation finding expected when nothing is linked');
    assert.match(dirFinding.recommendation, /Zocdoc/);
    assert.match(dirFinding.recommendation, /Healthgrades/);
    const allCopy = JSON.stringify(result.findings);
    assert.doesNotMatch(allCopy, /WeddingWire|The Knot|Zola|bridal|venues we love|wedding/i);
  });

  it('suppresses the directory finding when a pack directory is already linked', async () => {
    const linkedDir = makeClientDir('upriver-backlinks-linked-', [
      makePage({
        url: 'https://lakeview-dental.example/',
        links: { internal: [], external: ['https://www.zocdoc.com/practice/lakeview-dental-12345'] },
      }),
    ]);
    try {
      const result = await run('lakeview', linkedDir, { vertical: 'medical' });
      assert.ok(!result.findings.some((f) => /directory profiles/i.test(f.title)));
    } finally {
      rmSync(linkedDir, { recursive: true, force: true });
    }
  });

  it('keeps the honest "not analyzed" framing when no API key is set', async () => {
    const result = await run('lakeview', clientDir, { vertical: 'retail' });
    assert.ok(result.findings.some((f) => /Ahrefs API key not configured/i.test(f.title)));
    assert.match(result.summary, /API key not configured/i);
  });

  it('keeps the honest stub framing when the key is set but unimplemented', async () => {
    process.env['AHREFS_API_KEY'] = 'test-key';
    try {
      const result = await run('lakeview', clientDir, { vertical: 'fitness' });
      assert.ok(result.findings.some((f) => /not yet implemented/i.test(f.title)));
      assert.match(result.summary, /Ahrefs integration not implemented/i);
      const dirFinding = result.findings.find((f) => /directory profiles/i.test(f.title));
      assert.ok(dirFinding);
      assert.match(dirFinding.recommendation, /ClassPass/);
    } finally {
      delete process.env['AHREFS_API_KEY'];
    }
  });
});
