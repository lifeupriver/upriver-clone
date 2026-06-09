import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir } from '@upriver/core';
import { buildDesignBrief } from '../docs/design-brief.js';
import { resolveWebInputs } from '../web-bridge/inputs.js';

export default class DesignBrief extends BaseCommand {
  static override description = 'Generate Claude Design handoff brief from audit-package.json';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(DesignBrief);
    const { slug } = args;
    const dir = clientDir(slug);
    // Profile-first inputs (Build Spec 10): the design brief is built from the
    // profile's verified facts when present, falling back to the audit-package.
    const { pkg } = await resolveWebInputs(slug);

    const briefPath = join(dir, 'claude-design-brief.md');
    writeFileSync(briefPath, buildDesignBrief(pkg), 'utf8');
    this.log(`Wrote ${briefPath}`);
  }
}
