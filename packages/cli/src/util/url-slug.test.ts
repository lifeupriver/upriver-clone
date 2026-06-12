import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { urlToSlug } from './url-slug.js';

describe('urlToSlug', () => {
  it('keeps clean slugs for flat ascii paths (fixture compatibility)', () => {
    assert.equal(urlToSlug('https://wildflour.example/'), 'home');
    assert.equal(urlToSlug('https://wildflour.example/menu'), 'menu');
    assert.equal(urlToSlug('https://wildflour.example/about-us/'), 'about-us');
  });

  it('distinguishes nested paths from their flattened twins', () => {
    const nested = urlToSlug('https://x.example/about/us');
    const flat = urlToSlug('https://x.example/about-us');
    assert.equal(flat, 'about-us');
    assert.notEqual(nested, flat);
    assert.match(nested, /^about-us-[0-9a-f]{6}$/);
  });

  it('gives distinct slugs to distinct non-ascii paths instead of collapsing all to one', () => {
    const ru = urlToSlug('https://x.example/о-нас');
    const ja = urlToSlug('https://x.example/予約');
    assert.notEqual(ru, ja);
    assert.match(ru, /^page-[0-9a-f]{6}$/);
    assert.match(ja, /^page-[0-9a-f]{6}$/);
    // Deterministic across runs.
    assert.equal(ru, urlToSlug('https://x.example/о-нас'));
  });

  it('disambiguates query strings and long truncated paths', () => {
    const a = urlToSlug('https://x.example/blog?page=1');
    const b = urlToSlug('https://x.example/blog?page=2');
    assert.notEqual(a, b);

    const long1 = urlToSlug(`https://x.example/${'a'.repeat(80)}1`);
    const long2 = urlToSlug(`https://x.example/${'a'.repeat(80)}2`);
    assert.notEqual(long1, long2);
  });

  it('returns "unknown" for unparseable urls', () => {
    assert.equal(urlToSlug('not a url'), 'unknown');
  });
});
