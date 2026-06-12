import { Args } from '@oclif/core';
import { parse as parseYaml } from 'yaml';

import type { ClientConfig } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { PITCH_STATE_VERSION, type PitchState } from '../../pitch/state.js';
import type { PitchShareInfo } from '../../pitch/share.js';
import { formatSpendWithActuals } from '../../spend/actuals.js';
import { estimateUsd } from '../../pitch/ledger.js';
import { summarizeUsageText } from '../../util/cost-summary.js';

interface Row {
  slug: string;
  status: string;
  spend: string;
  expires: string;
  answered: string;
  viewed: string;
  sentAt: string;
}

export default class PitchStatus extends BaseCommand {
  static override description =
    'Funnel view over stage:prospect clients — pitch state, est. spend, preview expiry, questionnaire answered, sent-at.';

  static override examples = [
    '<%= config.bin %> pitch status',
    '<%= config.bin %> pitch status wildflourbakery',
  ];

  static override args = {
    slug: Args.string({ description: 'Limit to one prospect', required: false }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(PitchStatus);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    const slugs = args.slug ? [args.slug] : await ds.listClientSlugs();
    const rows: Row[] = [];

    for (const slug of slugs.sort()) {
      const configRaw = await ds.readClientFileText(slug, 'client-config.yaml');
      if (!configRaw) continue;
      let config: Partial<ClientConfig>;
      try {
        config = parseYaml(configRaw) as Partial<ClientConfig>;
      } catch {
        continue;
      }
      if (config.stage !== 'prospect' && !args.slug) continue;

      const stateRaw = await ds.readClientFileText(slug, 'pitch/state.json');
      let state: PitchState | null = null;
      if (stateRaw) {
        try {
          const parsed = JSON.parse(stateRaw) as PitchState;
          state = parsed.v === PITCH_STATE_VERSION ? parsed : null;
        } catch {
          state = null;
        }
      }

      const shareRaw = await ds.readClientFileText(slug, 'pitch/share.json');
      let expires = '—';
      if (shareRaw) {
        try {
          const share = JSON.parse(shareRaw) as PitchShareInfo;
          expires = share.revoked
            ? 'revoked'
            : Date.parse(share.expiresAt) <= Date.now()
              ? 'expired'
              : share.expiresAt.slice(0, 10);
        } catch {
          expires = '?';
        }
      }

      const responsesRaw = await ds.readClientFileText(slug, 'interview-responses.json');
      let answered = 'no';
      if (responsesRaw) {
        try {
          const answers = (JSON.parse(responsesRaw) as { answers?: Record<string, string> }).answers ?? {};
          const n = Object.values(answers).filter((v) => typeof v === 'string' && v.trim() !== '').length;
          answered = n > 0 ? `${n} answers` : 'no';
        } catch {
          answered = '?';
        }
      }

      // Spec 17b §3 — credits become actuals when the usage log exists;
      // agent time stays an estimate (reporting-time only, enforcement is
      // untouched).
      let actualCreditsUsd: number | null = null;
      const usageRaw = await ds.readClientFileText(slug, 'token-and-credit-usage.log');
      if (usageRaw) {
        const usage = summarizeUsageText(usageRaw);
        if (usage.totalEvents > 0) {
          actualCreditsUsd = estimateUsd({ firecrawlCredits: usage.totalCredits, agentSeconds: 0 });
        }
      }

      // Spec 18 §5 — first-party open signal recorded by the portal route.
      let viewed = '—';
      const viewsRaw = await ds.readClientFileText(slug, 'pitch/views.json');
      if (viewsRaw) {
        try {
          const views = JSON.parse(viewsRaw) as { v?: number; firstViewedAt?: string };
          viewed = views.v === 1 && views.firstViewedAt ? views.firstViewedAt.slice(0, 10) : '?';
        } catch {
          viewed = '?';
        }
      }

      rows.push({
        slug,
        status: state?.status ?? (config.stage === 'prospect' ? 'no state' : `stage: ${config.stage ?? 'client'}`),
        spend: state ? formatSpendWithActuals(state.ledger, actualCreditsUsd) : '—',
        expires,
        answered,
        viewed,
        sentAt: state?.sentAt?.slice(0, 10) ?? '—',
      });
    }

    if (rows.length === 0) {
      this.log(args.slug ? `No client dir for "${args.slug}".` : 'No prospects (stage: prospect) found.');
      return;
    }

    // The spend cell grew an est+act split (spec 17b §3) — size the column
    // to the widest value so the table stays aligned either way.
    const spendW = Math.max(11, ...rows.map((r) => r.spend.length + 2));
    this.log('');
    this.log(
      `${'SLUG'.padEnd(26)}${'STATUS'.padEnd(15)}${'SPEND'.padEnd(spendW)}${'EXPIRES'.padEnd(12)}${'ANSWERED'.padEnd(12)}${'VIEWED'.padEnd(12)}SENT`,
    );
    for (const r of rows) {
      this.log(
        `${r.slug.padEnd(26)}${r.status.padEnd(15)}${r.spend.padEnd(spendW)}${r.expires.padEnd(12)}${r.answered.padEnd(12)}${r.viewed.padEnd(12)}${r.sentAt}`,
      );
    }
  }
}
