import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// Source-level guard: the node:test harness can't render .astro, so assert on
// the page source. The "Prefer a form?" fallback link is the one client-facing
// link that was malformed — it carried only ?token= (the page gate) and not
// ?t= (the middleware share-token gate), so in supabase mode an anonymous client
// who clicked it was bounced to /login. Both params must carry the same token.
const SRC = fileURLToPath(
  new URL('../../src/pages/deliverables/[slug]/intake-chat.astro', import.meta.url),
);

describe('intake-chat no-JS fallback link — middleware + page gates', () => {
  const source = readFileSync(SRC, 'utf8');

  it('carries BOTH ?t= and ?token= (same minted value) so anonymous clients clear both gates', () => {
    assert.match(
      source,
      /\/deliverables\/\$\{slug\}\/interview\?t=\$\{token\}&token=\$\{token\}/,
      'fallback link must carry ?t=${token}&token=${token}',
    );
  });

  it('no ?token=-only fallback link remains (the supabase-mode dead end)', () => {
    assert.ok(
      !source.includes('interview?token=${token}'),
      'found a ?token=-only /interview link — it omits the ?t= middleware gate',
    );
  });
});
