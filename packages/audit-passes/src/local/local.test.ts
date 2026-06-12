import { strict as assert } from 'node:assert';
import { describe, it, after } from 'node:test';
import { rmSync } from 'node:fs';

import { run } from './index.js';
import { makeClientDir, makePage } from '../shared/test-helpers.js';

const DENSITY_TITLE = /Low local keyword density/i;

describe('local audit pass', () => {
  const dirs: string[] = [];
  const fixture = (prefix: string, markdown: string): string => {
    const dir = makeClientDir(prefix, [
      makePage({
        url: 'https://acme.example/',
        content: { markdown, wordCount: markdown.split(/\s+/).length, headings: [] },
      }),
    ]);
    dirs.push(dir);
    return dir;
  };

  after(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  it("credits configured place tokens — an Austin business with city='Austin' matches", async () => {
    const dir = fixture(
      'upriver-local-austin-',
      'Emergency plumbing repair across Austin and the surrounding neighborhoods. Call us today.',
    );
    const result = await run('austin-plumber', dir, { vertical: 'home-services', city: 'Austin' });
    assert.ok(
      !result.findings.some((f) => DENSITY_TITLE.test(f.title)),
      'mentioning the configured city must satisfy the locality check',
    );
  });

  it('matches serviceArea towns too, with regex metacharacters escaped', async () => {
    const dir = fixture(
      'upriver-local-area-',
      'Proudly serving Coeur d\'Alene (and nearby towns) since 2009.',
    );
    const result = await run('idaho-hvac', dir, {
      city: 'Post Falls',
      serviceArea: ["Coeur d'Alene", 'Hayden (north)'],
    });
    assert.ok(!result.findings.some((f) => DENSITY_TITLE.test(f.title)));
  });

  it('no longer credits the old hardcoded NY town list', async () => {
    const dir = fixture(
      'upriver-local-ny-',
      'Serving the Hudson Valley and Catskill region. Visit us between Woodstock and Rhinebeck, upstate.',
    );
    // No locality config: NY tokens used to count as 1 of the 2 required
    // generic matches. With the hardcode removed, this copy alone no longer
    // passes the check.
    const result = await run('ny-biz', dir, {});
    assert.ok(
      result.findings.some((f) => DENSITY_TITLE.test(f.title)),
      'NY town names must not be treated as universal locality signals',
    );
  });

  it('flags a configured business whose city never appears on the site', async () => {
    const dir = fixture('upriver-local-missing-', 'We fix pipes. Contact us for a quote.');
    const result = await run('acme', dir, { city: 'Boston' });
    const density = result.findings.find((f) => DENSITY_TITLE.test(f.title));
    assert.ok(density);
    assert.match(density.evidence ?? '', /Boston/);
  });

  it('keeps default behavior when locality opts are absent (generic patterns only)', async () => {
    const localized = fixture(
      'upriver-local-default-ok-',
      'Looking for a plumber near me? We are the trusted plumber in Austin, TX.',
    );
    const okResult = await run('acme', localized, {});
    assert.ok(!okResult.findings.some((f) => DENSITY_TITLE.test(f.title)));

    const unlocalized = fixture('upriver-local-default-miss-', 'We fix pipes. Contact us.');
    const missResult = await run('acme', unlocalized, {});
    assert.ok(missResult.findings.some((f) => DENSITY_TITLE.test(f.title)));
  });

  it('skips the entire pass when localBusiness === false', async () => {
    const dir = fixture('upriver-local-gate-', 'We sell software worldwide.');
    const result = await run('saas-co', dir, { localBusiness: false });
    assert.equal(result.dimension, 'local');
    assert.equal(result.findings.length, 0);
    assert.equal(result.score, 90, 'gate-off must use the no-findings score convention');
    assert.match(result.summary, /not a local business/i);
    assert.match(result.summary, /skipped/i);
  });

  it('still runs normally when localBusiness is undefined or true', async () => {
    const dir = fixture('upriver-local-on-', 'We fix pipes.');
    const defaultResult = await run('acme', dir, {});
    assert.ok(defaultResult.findings.length > 0, 'default keeps current behavior');
    const explicitTrue = await run('acme', dir, { localBusiness: true });
    assert.ok(explicitTrue.findings.length > 0);
  });
});
