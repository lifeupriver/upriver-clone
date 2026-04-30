import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { applyRedirectsToVercelConfig, buildRedirectRules, pathOf } from './redirects.js';

describe('finalize redirects', () => {
  it('strips scheme and host, keeps path', () => {
    assert.equal(pathOf('https://test.com/old-page'), '/old-page');
    assert.equal(pathOf('https://test.com/old?q=1#x'), '/old');
    assert.equal(pathOf('/relative'), '/relative');
    assert.equal(pathOf('relative'), '/relative');
  });

  it('builds rules from a current_to_proposed map', () => {
    const rules = buildRedirectRules({
      'https://test.com/our-venue': '/about',
      'https://test.com/photo-gallery': '/weddings/galleries',
      'https://test.com/contact-us': '/contact-us',
    });
    assert.equal(rules.length, 2);
    assert.equal(rules[0]?.source, '/our-venue');
    assert.equal(rules[0]?.destination, '/about');
    assert.equal(rules[0]?.permanent, true);
  });

  it('writes new vercel.json when none exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'redir-test-'));
    const result = applyRedirectsToVercelConfig(dir, [
      { source: '/old', destination: '/new', permanent: true },
    ]);
    assert.equal(result.count, 1);
    const config = JSON.parse(readFileSync(join(dir, 'vercel.json'), 'utf8'));
    assert.equal(config.redirects.length, 1);
  });

  it('preserves operator-added rules and replaces only Upriver-owned entries on re-run', () => {
    const dir = mkdtempSync(join(tmpdir(), 'redir-test-'));
    // Operator hand-edits vercel.json with their own rule.
    writeFileSync(
      join(dir, 'vercel.json'),
      JSON.stringify({
        redirects: [{ source: '/operator-rule', destination: '/op-target', permanent: true }],
      }),
    );

    // First Upriver run.
    applyRedirectsToVercelConfig(dir, [{ source: '/old1', destination: '/new1', permanent: true }]);
    let config = JSON.parse(readFileSync(join(dir, 'vercel.json'), 'utf8'));
    assert.equal(config.redirects.length, 2);

    // Second Upriver run with a different set — our entry should be replaced, operator's preserved.
    applyRedirectsToVercelConfig(dir, [{ source: '/old2', destination: '/new2', permanent: true }]);
    config = JSON.parse(readFileSync(join(dir, 'vercel.json'), 'utf8'));
    const sources = config.redirects.map((r: { source: string }) => r.source).sort();
    assert.deepEqual(sources, ['/old2', '/operator-rule']);
  });

  it('skips Upriver rules whose source collides with an operator rule', () => {
    const dir = mkdtempSync(join(tmpdir(), 'redir-test-'));
    writeFileSync(
      join(dir, 'vercel.json'),
      JSON.stringify({
        redirects: [{ source: '/contested', destination: '/operator-target', permanent: true }],
      }),
    );
    const result = applyRedirectsToVercelConfig(dir, [
      { source: '/contested', destination: '/upriver-target', permanent: true },
      { source: '/clear', destination: '/elsewhere', permanent: true },
    ]);
    assert.deepEqual(result.preserved, ['/contested']);
    assert.equal(result.count, 1);
    const config = JSON.parse(readFileSync(join(dir, 'vercel.json'), 'utf8'));
    const contestedRule = config.redirects.find((r: { source: string }) => r.source === '/contested');
    assert.equal(contestedRule.destination, '/operator-target');
  });
});
