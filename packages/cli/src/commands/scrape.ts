import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class Scrape extends BaseCommand {
  static override description = 'Run the full deep scrape pass: markdown, html, rawHtml, screenshots, images, links, branding, json extraction';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver scrape — coming in Session 2');
  }
}
