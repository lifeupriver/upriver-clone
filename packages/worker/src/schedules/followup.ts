// F07 long-cadence followup schedule.
//
// Most operators will invoke followup on demand rather than on a schedule.
// This function exists for the operators who want it: it runs weekly, finds
// former clients whose engagement ended 180+ days ago and have
// `followup_enabled = true`, and fans out one stage.run event per matching
// slug. The actual followup logic lives in the CLI.
//
// Eligibility = `client_admins` rows (followup_enabled AND NOT admin_paused
// AND engagement_ended_at ≤ now() - 180 days) UNION the FOLLOWUP_SLUGS env
// list. Env slugs bypass the 180-day check — listing a slug there is an
// explicit operator override. Rows with notify_email get `--to` so the
// re-engagement note is emailed via Resend.

import { inngest } from '../client.js';
import { STAGE_RUN_EVENT } from '../events.js';
import { fetchClientAdminRows, mergeEligible, parseSlugList, type EligibleClient } from './eligibility.js';

const DEFAULT_CRON = process.env['FOLLOWUP_CADENCE'] ?? '0 14 * * MON';

export const followupDue = inngest.createFunction(
  { id: 'followup-due', name: 'F07 followup — fan-out for clients past the 180-day mark' },
  { cron: DEFAULT_CRON },
  async ({ step }) => {
    const clients = await step.run('list-due-clients', async () => loadDueClients());
    if (clients.length === 0) return { dispatched: 0, slugs: [] };

    await Promise.all(
      clients.map((client) =>
        step.sendEvent(`enqueue-followup-${client.slug}`, {
          name: STAGE_RUN_EVENT,
          data: {
            slug: client.slug,
            command: 'followup',
            args: [],
            flags: {
              mode: 'both',
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
 * Slugs whose engagement ended 180+ days ago, per `client_admins` (service-
 * client query; skips with a one-time warning when the table/env is missing),
 * merged with the `FOLLOWUP_SLUGS` env var (comma-separated). Empty list is
 * the safe default.
 */
async function loadDueClients(): Promise<EligibleClient[]> {
  const fromTable = await fetchClientAdminRows({ schedule: 'followup' });
  return mergeEligible(parseSlugList(process.env['FOLLOWUP_SLUGS']), fromTable);
}
