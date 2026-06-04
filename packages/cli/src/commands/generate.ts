import { createInterface } from 'node:readline/promises';

import { Args, Flags } from '@oclif/core';
import type { DeliverableId } from '@upriver/schemas';

import { BaseCommand } from '../base-command.js';
import { resolveClientDataSourceOrFail } from '../generate/data-source.js';
import { runGenerate } from '../generate/engine.js';
import { claudeCliCall } from '../util/claude-cli.js';

export default class Generate extends BaseCommand {
  static override description =
    'Generate one AI Operating System document (doc-01..doc-12) from a client profile via a write-capable headless Claude Code session, gated on coverage and human-verify-required fields, with a Continue gate for review.';

  static override examples = [
    '<%= config.bin %> generate littlefriends --doc doc-01',
    '<%= config.bin %> generate littlefriends --doc doc-01 --dry-run',
    '<%= config.bin %> generate littlefriends --doc doc-02   # blocks: doc-02 needs verified HV pricing',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    doc: Flags.string({
      description: 'Deliverable id to generate (doc-01 … doc-12).',
      required: true,
    }),
    'dry-run': Flags.boolean({
      description: 'Report readiness and assembled prompt sizes without calling claude.',
      default: false,
    }),
    yes: Flags.boolean({
      description: 'Auto-approve at the Continue gate. Only honored for a previously-approved doc.',
      default: false,
    }),
    model: Flags.string({
      description: 'Model alias for the headless session.',
      default: 'sonnet',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    const outcome = await runGenerate(
      {
        slug: args.slug,
        id: flags.doc as DeliverableId,
        dryRun: flags['dry-run'],
        yes: flags.yes,
        model: flags.model,
      },
      {
        ds,
        call: claudeCliCall,
        log: (msg) => this.log(msg),
        isTty: Boolean(process.stdin.isTTY),
        promptApprove: () => this.askApprove(flags.doc),
        now: () => new Date().toISOString(),
      },
    );

    if (outcome.exitCode !== 0) this.exit(outcome.exitCode);
  }

  private async askApprove(id: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await rl.question(`Approve ${id}? [y/N] `)).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    } finally {
      rl.close();
    }
  }
}
