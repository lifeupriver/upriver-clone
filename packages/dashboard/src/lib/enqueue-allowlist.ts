/**
 * Allowlist of pipeline-stage CLI commands the dashboard may enqueue onto the
 * worker. This is the dashboard-side gate for the hosted path
 * (`/api/enqueue/<command>`); `RUN_ALLOWED_COMMANDS` in `run-allowlist.ts`
 * gates the local-spawn path, and the worker re-validates every event against
 * its own `functions/allowed-commands.ts` before spawning — a command must be
 * allowlisted HERE and worker-side to actually run hosted. The lists are
 * maintained together but are not byte-identical (e.g. the local list also
 * carries operator-laptop-only commands).
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
  'finalize',
  'clone-fidelity',
  'fixes-plan',
  'qa',
  'improve',
  // M2/M5 deliverable generation (DAG-batch docs 01–12 + provisioning I01–I09).
  // Not a linear pipeline stage; enqueued on demand from the deliverables view.
  'generate',
];
