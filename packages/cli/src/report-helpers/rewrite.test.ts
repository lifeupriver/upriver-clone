import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { rewriteHtml } from './rewrite.js';

const SLUG = 'acme-co';

describe('rewriteHtml', () => {
  it('rewrites Astro asset paths (href, src, action) to relative form', () => {
    const html = [
      '<link rel="stylesheet" href="/_astro/main.abc123.css">',
      '<script src="/_astro/index.abc123.js"></script>',
      '<form action="/_astro/handler"></form>',
    ].join('\n');

    const out = rewriteHtml(html, SLUG);

    assert.ok(out.includes('href="_astro/main.abc123.css"'));
    assert.ok(out.includes('src="_astro/index.abc123.js"'));
    assert.ok(out.includes('action="_astro/handler"'));
    assert.ok(!out.includes('/_astro/'));
  });

  it('rewrites favicon paths', () => {
    const html = '<link rel="icon" href="/favicon.svg"><img src="/favicon.png">';
    const out = rewriteHtml(html, SLUG);
    assert.ok(out.includes('href="favicon.svg"'));
    assert.ok(out.includes('src="favicon.png"'));
  });

  it('rewrites report nav links to per-tab filenames', () => {
    const html = [
      `<a href="/deliverables/${SLUG}">Overview</a>`,
      `<a href="/deliverables/${SLUG}/scorecard">Scorecard</a>`,
      `<a href="/deliverables/${SLUG}/findings">Findings</a>`,
      `<a href="/deliverables/${SLUG}/next-steps">Next steps</a>`,
    ].join('\n');

    const out = rewriteHtml(html, SLUG);

    assert.ok(out.includes('href="index.html"'));
    assert.ok(out.includes('href="scorecard.html"'));
    assert.ok(out.includes('href="findings.html"'));
    assert.ok(out.includes('href="next-steps.html"'));
    assert.ok(!out.includes('/deliverables/'));
  });

  it('rewrites the DeliverableLayout back-link to /clients/<slug>', () => {
    const html = `<a href="/clients/${SLUG}" class="back-link">Back</a>`;
    const out = rewriteHtml(html, SLUG);
    assert.ok(out.includes('href="index.html"'));
    assert.ok(!out.includes('/clients/'));
  });

  it('is idempotent: running twice produces the same result as once', () => {
    const html = [
      '<link href="/_astro/x.css">',
      '<link href="/favicon.svg">',
      `<a href="/deliverables/${SLUG}">Overview</a>`,
      `<a href="/deliverables/${SLUG}/scorecard">Scorecard</a>`,
      `<a href="/clients/${SLUG}">Back</a>`,
    ].join('\n');

    const once = rewriteHtml(html, SLUG);
    const twice = rewriteHtml(once, SLUG);
    assert.equal(twice, once);
  });

  it('flags unrewritten absolute paths via the onUnrewritten callback', () => {
    const html = '<a href="/some/unexpected/path">Stray</a>';
    const seen: string[] = [];
    rewriteHtml(html, SLUG, (m) => seen.push(m));
    assert.deepEqual(seen, ['/some/unexpected/path']);
  });

  it('does not mistake a different slug for the target slug', () => {
    const html = '<a href="/deliverables/other-co/scorecard">Other</a>';
    const out = rewriteHtml(html, SLUG);
    // Different-slug links are not rewritten by the nav rule; left as-is.
    assert.ok(out.includes('/deliverables/other-co/scorecard'));
  });
});
