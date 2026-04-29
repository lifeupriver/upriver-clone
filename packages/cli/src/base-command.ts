import { Command } from '@oclif/core';
import { readClientConfig } from '@upriver/core';
import type { ClientConfig } from '@upriver/core';
import { describeEnvVar } from './util/env.js';

export abstract class BaseCommand extends Command {
  protected getConfig(slug: string): ClientConfig {
    return readClientConfig(slug);
  }

  protected requireEnv(name: string): string {
    const val = process.env[name];
    if (!val) {
      this.error(describeEnvVar(name));
    }
    return val;
  }

  protected getFirecrawlKey(): string {
    return this.requireEnv('FIRECRAWL_API_KEY');
  }
}
