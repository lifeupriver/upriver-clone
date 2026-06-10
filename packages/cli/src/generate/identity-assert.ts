/**
 * P2 (Build Spec 14): the post-generation identity assert. An artifact that
 * never names the client (i06's "JCC" mislabel) or that names another client's
 * business (the attempted "Camera City" contamination, finding D3) is a
 * generation defect — throw so it fails like any other generation error and
 * the retry machinery gets a genuine second attempt, instead of persisting a
 * mislabeled client-facing doc.
 */
export interface IdentityAssertInput {
  content: string;
  /** This client's identity.publicName. */
  publicName: string;
  /** Other clients' publicNames (the cross-client contamination denylist). */
  foreignNames: string[];
}

/** Names shorter than this would substring-match ordinary prose; skip them. */
const MIN_NAME_LENGTH = 4;

export function assertIdentity(input: IdentityAssertInput): void {
  const content = input.content.toLowerCase();
  const name = input.publicName.trim();
  if (name.length >= MIN_NAME_LENGTH && !content.includes(name.toLowerCase())) {
    throw new Error(
      `identity assert: the artifact never names the client ("${input.publicName}"). ` +
        'A client deliverable that does not know who the client is cannot ship.',
    );
  }
  for (const foreign of input.foreignNames) {
    const f = foreign.trim();
    if (f.length < MIN_NAME_LENGTH) continue;
    if (f.toLowerCase() === name.toLowerCase()) continue;
    if (content.includes(f.toLowerCase())) {
      throw new Error(
        `identity assert: the artifact names another client's business ("${foreign}") — cross-client contamination.`,
      );
    }
  }
}
