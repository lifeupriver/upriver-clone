import { existsSync } from 'node:fs';

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

  /**
   * Returns true if the artifact at `path` already exists and the caller should skip
   * the work that would (re)produce it. Logs a one-line skip message when skipping.
   * Always returns false when `force` is true.
   *
   * Callers conventionally expose a `--force` flag and pass `flags.force` through.
   *
   * @param label - Human-readable name of the artifact (used in the skip log line).
   * @param path - Absolute path to the artifact file.
   * @param opts - Options. `force: true` disables the skip check.
   * @returns True if the artifact exists and the caller should skip; false otherwise.
   */
  protected skipIfExists(
    label: string,
    path: string,
    opts: { force?: boolean } = {},
  ): boolean {
    if (opts.force === true) return false;
    if (existsSync(path)) {
      this.log(`  [skip] ${label}: already exists at ${path}. Pass --force to overwrite.`);
      return true;
    }
    return false;
  }
}
