// Finding-ID extraction from plan/scope markdown.
//
// IDs come in several grammars (`seo-001`, `content-deep-001`,
// `clone-fidelity-home`), and a guessed regex silently dropped everything
// but the base `dim-NNN` shape — deep-pass and fidelity findings never made
// it from `fixes plan` into `fixes apply`. Matching against the *known* IDs
// from the audit package can't drift when a new ID grammar appears.

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the subset of `knownIds` that appear in `text` as whole tokens
 * (not embedded in a longer id-like token). Case-insensitive; returned ids
 * keep their canonical casing from `knownIds`.
 */
export function findingIdsInText(text: string, knownIds: Iterable<string>): Set<string> {
  const found = new Set<string>();
  for (const id of knownIds) {
    if (!id) continue;
    const pattern = new RegExp(`(?<![a-z0-9-])${escapeRegExp(id)}(?![a-z0-9-])`, 'i');
    if (pattern.test(text)) found.add(id);
  }
  return found;
}
