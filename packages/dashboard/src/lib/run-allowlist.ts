/**
 * Allowlist + argv mapping for CLI commands the operator GUI may spawn via
 * `POST /api/run/<command>` (local data source only). Anything outside the
 * list returns 400. New commands must be added explicitly so a future routing
 * mistake (or a path-traversal attempt via the dynamic route segment) cannot
 * spawn arbitrary node binaries.
 *
 * Kept dependency-free (no Astro, no node imports) so the gate contract is
 * unit-testable — same shape as `enqueue-allowlist.ts`.
 */
export const RUN_ALLOWED_COMMANDS: ReadonlyArray<string> = [
  'init',
  'scrape',
  'audit',
  'audit-media',
  'gap-analysis',
  'video-audit',
  'synthesize',
  'voice-extract',
  'blog-topics',
  'schema-build',
  'design-brief',
  'scaffold',
  'clone',
  'finalize',
  'clone-fidelity',
  'fixes-plan',
  'qa',
  'improve',
  'generate',
  'process-interview',
  'interview-link',
  'monitor',
  'followup',
  'prototype-app',
  'custom-tools',
  'admin-deploy',
  'admin-status',
  'admin-pause',
  'admin-rotate-pin',
];

/**
 * Dashboard command id → CLI argv when they differ. The CLI uses oclif with
 * `topicSeparator: " "`, so the `fixes-plan` stage id is really the
 * two-token command `fixes plan` (`packages/cli/src/commands/fixes/plan.ts`;
 * the same mapping lives in `COMMAND_NAME_OVERRIDES` in
 * `packages/cli/src/commands/run/all.ts`). Spawning the hyphenated id would
 * make oclif fail with "command fixes-plan not found".
 */
const COMMAND_ARGV_OVERRIDES: Readonly<Record<string, readonly string[]>> = {
  'fixes-plan': ['fixes', 'plan'],
};

/**
 * Resolve the argv tokens for an allowlisted command id.
 *
 * @param command - A member of `RUN_ALLOWED_COMMANDS`.
 * @returns The argv slice to place after the CLI bin path.
 */
export function commandArgv(command: string): readonly string[] {
  return COMMAND_ARGV_OVERRIDES[command] ?? [command];
}
