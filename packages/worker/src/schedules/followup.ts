// F07 long-cadence followup schedule.
//
// Most operators will invoke followup on demand rather than on a schedule.
// This function exists for the operators who want it: it runs daily,
// finds former clients whose engagement ended 180+ days ago and have
// `followup_enabled = true`, and fans out one stage.run event per
// matching slug. The actual followup logic lives in the CLI.

import { inngest } from '../client.js';
import { STAGE_RUN_EVENT } from '../events.js';

const DEFAULT_CRON = process.env['FOLLOWUP_CADENCE'] ?? '0 14 * * MON';

export const followupDue = inngest.createFunction(
  { id: 'followup-due', name: 'F07 followup — fan-out for clients past the 180-day mark' },
  { cron: DEFAULT_CRON },
  async ({ step }) => {
    const slugs = await step.run('list-due-clients', async () => loadDueSlugs());
    if (slugs.length === 0) return { dispatched: 0, slugs: [] };

    await Promise.all(
      slugs.map((slug) =>
        step.sendEvent(`enqueue-followup-${slug}`, {
          name: STAGE_RUN_EVENT,
          data: { slug, command: 'followup', args: [], flags: { mode: 'both' } },
        }),
      ),
    );

    return { dispatched: slugs.length, slugs };
  },
);

/**
 * Load slugs whose engagement ended 180+ days ago. Until the
 * `client_admins` migration is applied, this is driven by the
 * `FOLLOWUP_SLUGS` env var (comma-separated). Empty list is the safe default.
 */
async function loadDueSlugs(): Promise<string[]> {
  const fromEnv = process.env['FOLLOWUP_SLUGS'];
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // TODO: once `client_admins` migration is applied, query:
  //   select slug from client_admins
  //   where followup_enabled
  //     and engagement_ended_at is not null
  //     and engagement_ended_at <= now() - interval '180 days'
  return [];
}
