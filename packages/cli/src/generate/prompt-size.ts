// F2 (Build Spec 11): a cheap pre-flight estimate of an assembled prompt's size,
// so `generate --all --dry-run` can flag a doc that would overflow the model
// session BEFORE a multi-hour run burns on it (07-e2e finding D8).
//
// The estimate is chars / CHARS_PER_TOKEN — deliberately crude; it only has to
// rank docs and catch the overflow zone, not predict the exact API token count.
//
// The default ceiling (50K est-tokens) is EMPIRICAL, not the model's raw window.
// In the prior synthetic run (07-e2e), docs 01–07 generated fine and doc-08
// failed with "Prompt is too long". Their assembled sizes by this estimator:
//   doc-06 (largest pass) 137,648 chars = 39.3K est-tok
//   doc-08 (first fail)   204,599 chars = 58.5K est-tok
//   doc-10 (worst)        302,604 chars = 86.5K est-tok
// So the failure boundary sits ~39–58K est-tok — far below the spec's nominal
// 150K (which nothing here approaches; a 150K ceiling would never fire). 50K sits
// in the gap: above every doc that succeeded, below every doc that overflowed.
// With F1 digests the worst doc (doc-10, 9 deps) projects to ~38.6K est-tok, back
// inside the proven-passing zone. See the spec-11 changelog for the full table.
//
// Coupling: DEFAULT_PROMPT_TOKEN_CEILING must exceed the worst-case digested
// prompt — max system spec (~66K chars) + max fan-in (9) × DIGEST_MAX_CHARS (9K)
// + slice — or F1 stops being sufficient. Raising the digest cap or fan-in
// without raising this ceiling reintroduces the overflow.

import type { DeliverableId } from '@upriver/schemas';

export const CHARS_PER_TOKEN = 3.5;
export const DEFAULT_PROMPT_TOKEN_CEILING = 50_000;

export interface PromptSize {
  id: DeliverableId;
  systemChars: number;
  userChars: number;
  totalChars: number;
  estTokens: number;
  ceiling: number;
  overCeiling: boolean;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** The active ceiling: `UPRIVER_PROMPT_TOKEN_CEILING` if a positive integer, else the default. */
export function promptTokenCeiling(): number {
  const raw = process.env['UPRIVER_PROMPT_TOKEN_CEILING'];
  if (raw !== undefined) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return DEFAULT_PROMPT_TOKEN_CEILING;
}

export function assessPromptSize(
  id: DeliverableId,
  system: string,
  user: string,
  ceiling: number = promptTokenCeiling(),
): PromptSize {
  const totalChars = system.length + user.length;
  const estTokens = estimateTokens(system + user);
  return {
    id,
    systemChars: system.length,
    userChars: user.length,
    totalChars,
    estTokens,
    ceiling,
    overCeiling: estTokens > ceiling,
  };
}
