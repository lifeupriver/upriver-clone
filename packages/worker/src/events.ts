import { z } from 'zod';

/**
 * Event name for "operator clicked Run on a pipeline stage". The dashboard
 * sends this; the worker consumes it. Versioned in the name so we can evolve
 * the payload shape without ambiguity (`upriver/stage.run.v2` etc.).
 */
export const STAGE_RUN_EVENT = 'upriver/stage.run' as const;

/**
 * Payload schema for {@link STAGE_RUN_EVENT}.
 *
 * - `slug` — client slug; the worker pulls `clients/<slug>/` from the bucket
 *   into its ephemeral disk before running the CLI command.
 * - `command` — must match the dashboard's ALLOWED_COMMANDS allowlist; the
 *   worker re-validates before spawning.
 * - `args` — positional args appended after `<slug>` in the spawn argv.
 * - `flags` — flag map; serialized with the same rules as `flagsToArgs` in
 *   `dashboard/src/lib/run-cli.ts`.
 */
export const stageRunPayloadSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be kebab-case'),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  flags: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type StageRunPayload = z.infer<typeof stageRunPayloadSchema>;
