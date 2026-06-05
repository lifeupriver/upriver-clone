/**
 * Allowlist of pipeline-stage CLI commands the dashboard may enqueue onto the
 * worker. Mirrors `ALLOWED_COMMANDS` in `api/run/[command].ts` and the worker's
 * `functions/allowed-commands.ts`. All three move together when the pipeline
 * gains or loses a command.
 *
 * Kept dependency-free (no `@upriver/worker`, no Astro) so the gate contract is
 * unit-testable without the worker runtime.
 */
export const ENQUEUE_ALLOWED_COMMANDS: ReadonlyArray<string> = [
  'init',
  'scrape',
  'audit',
  'synthesize',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
  // M2/M5 deliverable generation (DAG-batch docs 01–12 + provisioning I01–I09).
  // Not a linear pipeline stage; enqueued on demand from the deliverables view.
  'generate',
];
