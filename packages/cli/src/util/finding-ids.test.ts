import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findingIdsInText } from './finding-ids.js';

describe('findingIdsInText', () => {
  it('matches every shipped id grammar, not just dim-NNN', () => {
    const known = [
      'seo-001',
      'content-deep-001',
      'conversion-psychology-deep-002',
      'clone-fidelity-home',
      'clone-fidelity-cdn',
    ];
    const plan = `
## Phase 1
- [ ] seo-001 — missing title tags
- [ ] content-deep-001 — thin service pages
| clone-fidelity-home | P0 | pixel score below bar |
Also fix conversion-psychology-deep-002.
`;
    const got = findingIdsInText(plan, known);
    assert.deepEqual(
      [...got].sort(),
      ['clone-fidelity-home', 'content-deep-001', 'conversion-psychology-deep-002', 'seo-001'],
    );
  });

  it('does not match ids embedded in longer tokens', () => {
    const got = findingIdsInText('see seo-0011 and pre-seo-001 notes', ['seo-001']);
    assert.equal(got.size, 0);
  });

  it('is case-insensitive but returns canonical casing', () => {
    const got = findingIdsInText('Fix SEO-001 first', ['seo-001']);
    assert.deepEqual([...got], ['seo-001']);
  });
});
