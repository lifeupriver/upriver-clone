import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { isValidCssColor } from '../src/lib/css-color.js';

// CoverHeader.astro interpolates the (scraped) accent into an inline style
// attribute, so the validator must FULL-match — a prefix check would admit
// CSS-injection payloads that begin with a valid color.
describe('isValidCssColor — scraped accent gate', () => {
  it('accepts hex colors of length 3–8', () => {
    for (const v of ['#fff', '#FFFF', '#1a2b3c', '#1a2b3c4d', '  #B86C2A  ']) {
      assert.equal(isValidCssColor(v), true, `expected ${v} to be accepted`);
    }
  });

  it('accepts rgb()/rgba() forms', () => {
    for (const v of ['rgb(0, 0, 0)', 'rgba(241, 85, 26, 0.5)', 'rgb(100% 50% 0%)']) {
      assert.equal(isValidCssColor(v), true, `expected ${v} to be accepted`);
    }
  });

  it('accepts hsl()/hsla() forms (deg units allowed)', () => {
    for (const v of ['hsl(20, 90%, 55%)', 'hsla(20, 90%, 55%, 0.8)', 'hsl(120deg 50% 50%)']) {
      assert.equal(isValidCssColor(v), true, `expected ${v} to be accepted`);
    }
  });

  it('rejects CSS-injection payloads that merely start with a color', () => {
    const payloads = [
      '#fff;background:url(https://evil.example/x)',
      '#fff} body { display:none } .x{color:#fff',
      'rgb(0,0,0);position:fixed;inset:0',
      'rgba(0,0,0,1)}*{visibility:hidden}',
      'hsl(0, 0%, 0%);font-family:url(x)',
      'rgb(calc(0),0,0)',
      'rgb(var(--x))',
      'hsl(0,0%,0%) url(javascript:alert(1))',
    ];
    for (const v of payloads) {
      assert.equal(isValidCssColor(v), false, `expected ${JSON.stringify(v)} to be rejected`);
    }
  });

  it('rejects non-color garbage, bad hex lengths, and empty/missing values', () => {
    const bad = ['', null, undefined, 'red', 'url(#fff)', '#ff', '#fffffffff', '#ggg', 'rgb', 'hsl()extra'];
    for (const v of bad) {
      assert.equal(isValidCssColor(v as string | null | undefined), false, `expected ${JSON.stringify(v)} to be rejected`);
    }
  });
});
