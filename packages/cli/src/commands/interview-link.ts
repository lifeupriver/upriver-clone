import { Args, Flags } from '@oclif/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import {
  buildInterviewUrl,
  loadOrCreateInterviewShare,
} from '../interview/share.js';

export default class InterviewLink extends BaseCommand {
  static override description =
    'Mint (or reuse) the magic-link URL the client uses to fill out their interview.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'base-url': Flags.string({
      description:
        'Public dashboard origin, e.g. https://upriver.example.com. Defaults to UPRIVER_DASHBOARD_BASE_URL or http://localhost:4400.',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(InterviewLink);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) {
      this.error(`Client directory not found: ${dir}`);
    }
    const guidePath = join(dir, 'interview-guide.md');
    if (!existsSync(guidePath)) {
      this.warn(
        `interview-guide.md not found at ${guidePath} — the link will resolve to an empty form until the guide exists.`,
      );
    }

    const baseUrl =
      flags['base-url'] ??
      process.env['UPRIVER_DASHBOARD_BASE_URL'] ??
      'http://localhost:4400';

    const share = loadOrCreateInterviewShare(slug, baseUrl);
    const url = buildInterviewUrl(slug, share);

    this.log(`\nInterview link for ${slug}:`);
    this.log(`  ${url}\n`);
    this.log(`Token created: ${share.createdAt}`);
    this.log(`Token: ${share.token}`);
    this.log(
      `Send the URL to the client. Their answers persist to clients/${slug}/interview-responses.json.`,
    );
  }
}
