import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertLocalDataSource } from './data-source.js';

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

/**
 * Convert a flags object into an alternating CLI arg array suitable for
 * `child_process.spawn`.
 *
 * - `true` becomes `--<key>`.
 * - `false` is omitted entirely (caller can pre-translate to `--no-<key>` if
 *   they want — keeping this helper deliberately simple).
 * - Strings and numbers become `--<key>` followed by the stringified value as
 *   a separate argv entry, so values are never concatenated and shell
 *   metacharacters are inert.
 *
 * @param flags - Plain object whose values are string, number, or boolean.
 * @returns Array of argv tokens, e.g. `['--slug', 'audreys', '--name', 'Audrey']`.
 */
export function flagsToArgs(flags: Record<string, string | boolean | number>): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (value === false || value === undefined || value === null) continue;
    if (value === true) {
      out.push(`--${key}`);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(`--${key}`, String(value));
      continue;
    }
    // Defensive: drop unsupported types rather than crash. The API endpoint
    // validates body shape upstream, so this branch should be unreachable.
    // TODO(roadmap): if we expand the flag types, normalize here.
  }
  return out;
}
