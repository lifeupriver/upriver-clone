/**
 * Per-finding decision recorded by a client during intake.
 *
 * - `fix`: client wants this addressed in scope.
 * - `skip`: client explicitly does not want this addressed.
 * - `discuss`: client wants to talk this through; default for unanswered findings.
 */
export type FindingDecision = 'fix' | 'skip' | 'discuss';

/**
 * Scope tier the client believes fits their situation.
 *
 * Mirrors the three-tier pricing on the next-steps page.
 */
export type ScopeTier = 'polish' | 'rebuild' | 'rebuild-plus-content';

/**
 * Persisted client intake collected from the report's next-steps page.
 *
 * Stored at `clients/<slug>/intake.json`. Treat as the canonical record of
 * client intent for an audit; downstream tooling (proposal, scope doc, kickoff)
 * reads this file rather than re-prompting the client.
 */
export interface ClientIntake {
  /** Schema version. Bump on breaking changes. */
  version: 1;
  /**
   * Decision per finding id. Keys correspond to `AuditFinding.id`. Missing
   * entries imply `'discuss'` (no decision yet).
   */
  findingDecisions: Record<string, FindingDecision>;
  /**
   * Free-text per page slug — what the client wants the page to do better.
   * Keys correspond to `SitePage.slug`. Each value is capped at 4000 chars
   * by the persistence layer.
   */
  pageWants: Record<string, string>;
  /**
   * URLs of reference sites the client wants to draw inspiration from.
   * Each entry is validated as a parseable URL on write; capped at 20.
   */
  referenceSites: string[];
  /** Selected scope tier; null = undecided. */
  scopeTier: ScopeTier | null;
  /** ISO timestamp set on first POST; null until the form has been submitted. */
  submittedAt: string | null;
  /** ISO timestamp of the most recent write. */
  updatedAt: string;
}
