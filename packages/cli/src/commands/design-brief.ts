import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir } from '@upriver/core';
import type { AuditPackage } from '@upriver/core';
import { buildDesignBrief } from '../docs/design-brief.js';

export default class DesignBrief extends BaseCommand {
  static override description = 'Generate Claude Design handoff brief from audit-package.json';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(DesignBrief);
    const { slug } = args;
    const dir = clientDir(slug);
    const pkgPath = join(dir, 'audit-package.json');
    if (!existsSync(pkgPath)) {
      this.error(
        `No audit-package.json at ${pkgPath}. Run "upriver synthesize ${slug}" first.`,
      );
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as AuditPackage;

    const briefPath = join(dir, 'claude-design-brief.md');
    writeFileSync(briefPath, buildDesignBrief(pkg), 'utf8');
    this.log(`Wrote ${briefPath}`);
  }
}
