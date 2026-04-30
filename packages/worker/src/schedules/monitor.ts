// F06 weekly monitor schedule.
//
// Fires every Monday at 8am ET (13:00 UTC during EST, close enough). Per-
// client overrides are intended to live in `client_admins.monitor_schedule`
// — when the table exists, the schedule below filters its fan-out to clients
// where monitoring_enabled = true and paused = false.
//
// Strategy: this single scheduled function reads the list of eligible
// clients, then fans out one stage.run event per client. The existing
// run-stage worker function picks each event up and runs the CLI's
// `monitor` command, identical to invoking `upriver monitor <slug>` locally.

import { inngest } from '../client.js';
import { STAGE_RUN_EVENT } from '../events.js';

const DEFAULT_CRON = process.env['MONITOR_DEFAULT_CADENCE'] ?? '0 13 * * MON';

export const monitorWeekly = inngest.createFunction(
  { id: 'monitor-weekly', name: 'F06 monitor — weekly fan-out across retainer clients' },
  { cron: DEFAULT_CRON },
  async ({ step }) => {
    const slugs = await step.run('list-eligible-clients', async () => loadEligibleSlugs());
    if (slugs.length === 0) return { dispatched: 0, slugs: [] };

    await Promise.all(
      slugs.map((slug) =>
        step.sendEvent(`enqueue-${slug}`, {
          name: STAGE_RUN_EVENT,
          data: {
            slug,
            command: 'monitor',
            args: [],
            flags: { baseline: 'previous', lite: true },
          },
        }),
      ),
    );

    return { dispatched: slugs.length, slugs };
  },
);

/**
 * Load slugs eligible for this run. The roadmap specifies a `client_admins`
 * Supabase table; until the migration is applied, this falls back to the
 * `MONITOR_SLUGS` env var (comma-separated). Returning an empty list is the
 * safe default — schedule runs but does nothing.
 */
async function loadEligibleSlugs(): Promise<string[]> {
  const fromEnv = process.env['MONITOR_SLUGS'];
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // TODO: once `client_admins` migration is applied, query:
  //   select slug from client_admins where monitoring_enabled and not paused
  return [];
}
