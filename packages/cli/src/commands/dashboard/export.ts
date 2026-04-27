import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';

export default class DashboardExport extends BaseCommand {
  static override description =
    'Open client deliverables in the browser for PDF export';

  static override examples = [
    '<%= config.bin %> dashboard export acme-plumbing',
    '<%= config.bin %> dashboard export acme-plumbing --type design-brief',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    port: Flags.integer({
      description: 'Dashboard port (must be running)',
      default: 4321,
    }),
    type: Flags.string({
      description: 'Deliverable type to open',
      options: ['audit-report', 'design-brief', 'all'],
      default: 'all',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DashboardExport);
    const { slug } = args;
    const base = `http://localhost:${flags.port}`;

    const urls: string[] = [];

    if (flags.type === 'all' || flags.type === 'audit-report') {
      urls.push(`${base}/deliverables/${slug}/audit-report`);
    }

    if (flags.type === 'all' || flags.type === 'design-brief') {
      urls.push(`${base}/deliverables/${slug}/design-brief`);
    }

    this.log('');
    this.log(`  Deliverables for "${slug}":`);
    this.log('');

    for (const url of urls) {
      this.log(`  ${url}`);
    }

    this.log('');
    this.log('  Open each URL in your browser and use File > Print > Save as PDF.');
    this.log('  Make sure the dashboard is running: upriver dashboard');
    this.log('');
  }
}
