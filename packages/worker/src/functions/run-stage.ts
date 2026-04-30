import { inngest } from '../client.js';
import { STAGE_RUN_EVENT, stageRunPayloadSchema } from '../events.js';

/**
 * Allowlist of pipeline-stage CLI commands the worker is willing to run.
 * Mirrors the dashboard's `ALLOWED_COMMANDS` in
 * `packages/dashboard/src/pages/api/run/[command].ts`. Any command not here
 * fails fast inside the function instead of being spawned. Keep these two
 * lists in lockstep until we extract a shared module.
 */
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  'init',
  'scrape',
  'audit',
  'synthesize',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
]);

/**
 * Generic per-stage runner. One Inngest function handles every pipeline stage;
 * the `command` field of the event picks which CLI subcommand to spawn.
 *
 * Steps (filled in during Phase 3.5 once the worker container exists):
 *   1. validate — reject unknown commands.
 *   2. pull — download `clients/<slug>/` from Supabase Storage to ephemeral disk.
 *   3. run — spawn `upriver <command> <slug> ...args ...flags`, stream logs.
 *   4. push — upload the modified `clients/<slug>/` back to the bucket.
 *
 * Each is its own `step.run` so Inngest can retry independently and persist
 * intermediate state across restarts.
 *
 * Concurrency: capped at 3 so a single operator can't fan out and starve the
 * container pool. Per-slug serialization is enforced separately so two stages
 * can't race on the same client directory.
 */
export const runStage = inngest.createFunction(
  {
    id: 'run-stage',
    name: 'Run pipeline stage',
    concurrency: [
      { limit: 3 },
      { key: 'event.data.slug', limit: 1 },
    ],
    retries: 1,
  },
  { event: STAGE_RUN_EVENT },
  async ({ event, step }) => {
    const payload = await step.run('validate', () => {
      const parsed = stageRunPayloadSchema.parse(event.data);
      if (!ALLOWED_COMMANDS.has(parsed.command)) {
        throw new Error(`command not allowed: ${parsed.command}`);
      }
      return parsed;
    });

    // Phase 3.5 will replace this stub with the real bucket-pull, spawn, and
    // bucket-push steps. Returning the validated payload now keeps the
    // function shippable + observable while the container image is built.
    return { status: 'queued-stub', payload };
  },
);
