import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inlineAssets } from './stage-preview.js';

const css = 'body { background: url(/images/bg.png); color: red }';
const assets: Record<string, Buffer> = {
  '/styles/site.css': Buffer.from(css),
  '/images/bg.png': Buffer.from('PNGDATA'),
  '/images/hero.jpg': Buffer.from('JPGDATA'),
  '/scripts/app.js': Buffer.from('console.log(1)'),
};
const read = (p: string): Buffer | null => assets[p] ?? null;

describe('inlineAssets (self-contained preview)', () => {
  it('inlines local stylesheets, including their url() image refs', () => {
    const html = '<html><head><link rel="stylesheet" href="/styles/site.css"></head><body></body></html>';
    const out = inlineAssets(html, read);
    assert.ok(!out.includes('<link'), 'link tag replaced');
    assert.match(out, /<style>[^]*color: red[^]*<\/style>/);
    assert.match(out, /url\(data:image\/png;base64,/);
  });

  it('inlines local images as data URIs and leaves remote ones alone', () => {
    const html = '<body><img src="/images/hero.jpg" alt=""><img src="https://cdn.example/x.jpg"></body>';
    const out = inlineAssets(html, read);
    assert.match(out, /src="data:image\/jpeg;base64,/);
    assert.ok(out.includes('https://cdn.example/x.jpg'), 'remote src untouched');
  });

  it('inlines local scripts preserving type=module', () => {
    const html = '<body><script type="module" src="/scripts/app.js"></script></body>';
    const out = inlineAssets(html, read);
    assert.match(out, /<script type="module">console\.log\(1\)<\/script>/);
  });

  it('leaves references to missing assets untouched rather than breaking them', () => {
    const html = '<body><img src="/images/nope.png"></body>';
    assert.equal(inlineAssets(html, read), html);
  });

  it('respects the total inline budget', () => {
    const big = Buffer.alloc(10_000_000, 65);
    const out = inlineAssets('<img src="/images/hero.jpg">', () => big, { totalBudgetBytes: 1000 });
    assert.ok(!out.includes('base64'), 'over-budget asset stays a reference');
  });
});
