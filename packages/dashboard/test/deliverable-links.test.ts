import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  deliverableHref,
  missingDeliverableRedirect,
  reportTabs,
} from '../src/lib/deliverable-links.js';

const TOKEN = 'tok_1234567890abcdef';

describe('deliverableHref — token-preserving portal links', () => {
  it('builds a bare path when no token is present (operator session)', () => {
    assert.equal(deliverableHref('acme', '', null), '/deliverables/acme');
    assert.equal(deliverableHref('acme', '/scorecard', null), '/deliverables/acme/scorecard');
  });

  it('appends ?t=<token> when a token is present', () => {
    assert.equal(deliverableHref('acme', '', TOKEN), `/deliverables/acme?t=${TOKEN}`);
    assert.equal(
      deliverableHref('acme', '/next-steps', TOKEN),
      `/deliverables/acme/next-steps?t=${TOKEN}`,
    );
  });

  it('URL-encodes the token', () => {
    assert.equal(
      deliverableHref('acme', '', 'a b+c/d&e=f'),
      '/deliverables/acme?t=a%20b%2Bc%2Fd%26e%3Df',
    );
  });

  it('treats an empty-string token as absent (middleware would reject ?t=)', () => {
    assert.equal(deliverableHref('acme', '/findings', ''), '/deliverables/acme/findings');
  });

  it('joins with & when the path already carries a query string', () => {
    assert.equal(
      deliverableHref('acme', '/interview?token=x', 'y0123456789abcdef'),
      '/deliverables/acme/interview?token=x&t=y0123456789abcdef',
    );
  });

  it('encodes the slug defensively', () => {
    assert.equal(deliverableHref('a/b', '', null), '/deliverables/a%2Fb');
  });
});

describe('reportTabs — the report shell tab strip', () => {
  it('keeps the four tabs in order with stable ids and labels', () => {
    const tabs = reportTabs('acme', null);
    assert.deepEqual(
      tabs.map(t => t.id),
      ['overview', 'scorecard', 'findings', 'next-steps'],
    );
    assert.deepEqual(
      tabs.map(t => t.label),
      ['Overview', 'Scorecard', 'Findings', 'Next steps'],
    );
  });

  it('operator (no token): every href is the clean path with no query', () => {
    const tabs = reportTabs('acme', null);
    assert.deepEqual(
      tabs.map(t => t.href),
      [
        '/deliverables/acme',
        '/deliverables/acme/scorecard',
        '/deliverables/acme/findings',
        '/deliverables/acme/next-steps',
      ],
    );
    for (const tab of tabs) {
      assert.ok(!tab.href.includes('?'), `${tab.id} href must carry no query for operators`);
    }
  });

  it('share-token client: EVERY tab href carries ?t=<token> (the P0 regression)', () => {
    const tabs = reportTabs('acme', TOKEN);
    assert.equal(tabs.length, 4);
    for (const tab of tabs) {
      assert.ok(
        tab.href.includes(`?t=${TOKEN}`),
        `${tab.id} tab dropped the share token: ${tab.href}`,
      );
      assert.ok(
        tab.href.startsWith('/deliverables/acme'),
        `${tab.id} tab must stay on the portal surface: ${tab.href}`,
      );
    }
  });
});

describe('missingDeliverableRedirect — not-yet-ready deliverables', () => {
  it('sends token holders to the branded not-ready page, token preserved', () => {
    assert.equal(
      missingDeliverableRedirect('acme', TOKEN),
      `/deliverables/acme/not-ready?t=${TOKEN}`,
    );
  });

  it('sends operators (no token) to the client workspace, as before', () => {
    assert.equal(missingDeliverableRedirect('acme', null), '/clients/acme');
    assert.equal(missingDeliverableRedirect('acme', ''), '/clients/acme');
  });
});

// ---------------------------------------------------------------------------
// Source-level regression guard. The node:test harness can't render .astro,
// so assert on the page/layout sources: any literal `/deliverables/...` href
// template must carry the share token (`t=`). Token-preserving links built via
// deliverableHref()/reportTabs() don't match the literal pattern and are
// inherently safe; what this catches is someone re-adding a hard-coded
// href={`/deliverables/${slug}/...`} that strands share-token clients on the
// operator login (the audit P0).
// ---------------------------------------------------------------------------

const PORTAL_PAGES_DIR = fileURLToPath(
  new URL('../../src/pages/deliverables/[slug]/', import.meta.url),
);
const LAYOUTS = ['ReportLayout.astro', 'DeliverableLayout.astro'].map(name =>
  fileURLToPath(new URL(`../../src/layouts/${name}`, import.meta.url)),
);

function portalSources(): Array<{ file: string; source: string }> {
  const pages = readdirSync(PORTAL_PAGES_DIR)
    .filter(f => f.endsWith('.astro'))
    .map(f => join(PORTAL_PAGES_DIR, f));
  return [...pages, ...LAYOUTS].map(file => ({ file, source: readFileSync(file, 'utf8') }));
}

describe('portal sources — no token-less hard-coded /deliverables links', () => {
  it('every literal href={`/deliverables/...`} carries t=', () => {
    for (const { file, source } of portalSources()) {
      const literalHrefs = source.match(/href=\{`\/deliverables\/[^`]*`\}/g) ?? [];
      for (const href of literalHrefs) {
        assert.ok(
          href.includes('t='),
          `${file}: hard-coded token-less portal link (use deliverableHref): ${href}`,
        );
      }
    }
  });

  it('no literal Astro.redirect(`/deliverables/...`) drops the token', () => {
    for (const { file, source } of portalSources()) {
      const literalRedirects = source.match(/Astro\.redirect\(`\/deliverables\/[^`]*`\)/g) ?? [];
      for (const redirect of literalRedirects) {
        assert.ok(
          redirect.includes('t='),
          `${file}: token-dropping redirect (use deliverableHref): ${redirect}`,
        );
      }
    }
  });

  it('ReportLayout builds its tabs via reportTabs() with the URL token', () => {
    const source = readFileSync(LAYOUTS[0]!, 'utf8');
    assert.match(source, /reportTabs\(/, 'ReportLayout must consume reportTabs()');
    assert.match(
      source,
      /Astro\.url\.searchParams\.get\('t'\)/,
      'ReportLayout must read the share token from the request URL',
    );
  });

  it('DeliverableLayout back-link is token-aware (no hard-coded /clients href)', () => {
    const source = readFileSync(LAYOUTS[1]!, 'utf8');
    assert.ok(
      !source.includes('href={`/clients/${slug}`}'),
      'DeliverableLayout back-link must not hard-code the operator route',
    );
    assert.match(
      source,
      /Astro\.url\.searchParams\.get\('t'\)/,
      'DeliverableLayout must read the share token from the request URL',
    );
  });
});
