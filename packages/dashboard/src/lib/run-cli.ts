import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flagsToArgs } from '@upriver/core';

import { assertLocalDataSource } from './data-source.js';

export { flagsToArgs };

/**
 * Resolve the absolute path to the upriver CLI bin (`packages/cli/bin/run.js`).
 *
 * Walks up from this module's location to find the monorepo root. The dashboard
 * package lives at `<root>/packages/dashboard/src/lib/run-cli.ts`, so the CLI
 * bin is at `<root>/packages/cli/bin/run.js`. We try a couple of well-known
 * candidates rather than walking arbitrarily — keeps the failure mode obvious.
 *
 * @returns Absolute path to `run.js`.
 * @throws Error if the bin cannot be located.
 */
export function resolveUpriverBin(): string {
  assertLocalDataSource();
  const thisFile = fileURLToPath(import.meta.url);
  // src/lib/run-cli.ts → src/lib → src → packages/dashboard
  const dashboardDir = resolve(dirname(thisFile), '..', '..');
  const candidates = [
    // Sibling package in the monorepo (the common case).
    join(dashboardDir, '..', 'cli', 'bin', 'run.js'),
    // From the monorepo root, when running via cwd-relative resolution.
    join(process.cwd(), 'packages', 'cli', 'bin', 'run.js'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `upriver CLI bin not found. Looked in:\n  ${candidates.join('\n  ')}\n` +
      'Make sure you are running the dashboard from the Upriver monorepo and ' +
      'that "pnpm install" has been run.',
  );
}

/**
 * Resolve the absolute path of the upriver monorepo root.
 *
 * The CLI is invoked with cwd set here so it picks up `clients/`, `.env`, etc.
 *
 * @returns Absolute path to the monorepo root (parent of `packages/`).
 * @throws Error if the root cannot be located.
 */
export function resolveRepoRoot(): string {
  const bin = resolveUpriverBin();
  // <root>/packages/cli/bin/run.js → <root>
  return resolve(dirname(bin), '..', '..', '..');
}

