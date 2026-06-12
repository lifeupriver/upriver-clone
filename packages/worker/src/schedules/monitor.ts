// F06 weekly monitor schedule.
//
// Fires every Monday at 8am ET (13:00 UTC during EST, close enough).
//
// Strategy: this single scheduled function reads the list of eligible
// clients, then fans out one stage.run event per client. The existing
// run-stage worker function picks each event up and runs the CLI's
// `monitor` command, identical to invoking `upriver monitor <slug>` locally.
//
// Eligibility = `client_admins` rows (monitor_enabled AND NOT admin_paused)
// UNION the MONITOR_SLUGS env list (bootstrap/override; see eligibility.ts).
// When a row carries notify_email, it is passed to the CLI as `--to` so the
// monitor report is emailed via Resend.

import { inngest } from '../client.js';
import { STAGE_RUN_EVENT } from '../events.js';
import { fetchClientAdminRows, mergeEligible, parseSlugList, type EligibleClient } from './eligibility.js';

const DEFAULT_CRON = process.env['MONITOR_DEFAULT_CADENCE'] ?? '0 13 * * MON';

export const monitorWeekly = inngest.createFunction(
  { id: 'monitor-weekly', name: 'F06 monitor — weekly fan-out across retainer clients' },
  { cron: DEFAULT_CRON },
  async ({ step }) => {
    const clients = await step.run('list-eligible-clients', async () => loadEligibleClients());
    if (clients.length === 0) return { dispatched: 0, slugs: [] };

    await Promise.all(
      clients.map((client) =>
        step.sendEvent(`enqueue-${client.slug}`, {
          name: STAGE_RUN_EVENT,
          data: {
            slug: client.slug,
            command: 'monitor',
            args: [],
            flags: {
              baseline: 'previous',
              lite: true,
              ...(client.notifyEmail ? { to: client.notifyEmail } : {}),
            },
          },
        }),
      ),
    );

    return { dispatched: clients.length, slugs: clients.map((c) => c.slug) };
  },
);

/**
 * Slugs eligible for this run: `client_admins` (service-client query; skips
 * with a one-time warning when the table/env is missing) merged with the
 * `MONITOR_SLUGS` env var (comma-separated). Empty list is the safe default —
 * the schedule runs but does nothing.
 */
async function loadEligibleClients(): Promise<EligibleClient[]> {
  const fromTable = await fetchClientAdminRows({ schedule: 'monitor' });
  return mergeEligible(parseSlugList(process.env['MONITOR_SLUGS']), fromTable);
}
