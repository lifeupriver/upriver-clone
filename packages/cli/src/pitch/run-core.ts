// `pitch run` building blocks (Spec 19 §1), kept pure/ds-injectable so the
// step plan, the clobber guard, and the profile seed are unit-tested away
// from the oclif command and the subprocesses it spawns.

import { parse as parseYaml } from 'yaml';
import { createEmptyProfile, type ProfileField } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';
import type { ClientConfig } from '@upriver/core';
import { getVerticalPack } from '@upriver/audit-passes';
import type { PitchStep } from './ledger.js';
import { PITCH_DOCS } from './teasers.js';

export interface PitchStepDef {
  id: string;
  describe: string;
  /** Spawn kind: an upriver CLI subprocess, a pnpm step in the repo, or in-process work. */
  kind: 'cli' | 'pnpm' | 'internal';
  /** argv for kind 'cli' (upriver args) or 'pnpm' (pnpm args). */
  argv?: string[];
  /** Ledger step checked (BEFORE) and recorded (after) when set. */
  costed?: PitchStep;
}

/**
 * The per-prospect step plan, in execution order. One place, so the
 * `--dry-run` print, the executor, and the tests can never disagree.
 */
export function buildPitchSteps(url: string, slug: string): PitchStepDef[] {
  return [
    {
      id: 'init',
      describe: 'create client dir + Firecrawl site map',
      kind: 'cli',
      argv: ['init', url, '--slug', slug],
      costed: 'init-map',
    },
    {
      id: 'profile-seed',
      describe: 'seed a minimal recon-sourced profile (publicName/website/category)',
      kind: 'internal',
    },
    {
      id: 'scrape',
      describe: 'scrape the homepage only (rate-limited, 1-page cap)',
      kind: 'cli',
      argv: ['scrape', slug, '--pages', '/', '--max-pages', '1'],
      costed: 'scrape-home',
    },
    { id: 'audit', describe: 'audit passes over the homepage', kind: 'cli', argv: ['audit', slug] },
    {
      id: 'synthesize',
      describe: 'compose audit-package.json (the Spec 18 harvest artifact)',
      kind: 'cli',
      argv: ['synthesize', slug],
    },
    { id: 'scaffold', describe: 'generate the Astro repo', kind: 'cli', argv: ['scaffold', slug] },
    {
      id: 'clone',
      describe: 'agent-clone the homepage (no Bash, scrubbed env, hard timeout)',
      kind: 'cli',
      argv: ['clone', slug, '--page', '/', '--no-pr', '--no-verify'],
      costed: 'clone-home',
    },
    {
      id: 'fidelity',
      describe: 'score the clone, then gate: below minimum nothing is staged',
      kind: 'cli',
      argv: ['clone-fidelity', slug],
    },
    {
      id: 'build-install',
      describe: 'install repo deps (frozen lockfile)',
      kind: 'pnpm',
      argv: ['install', '--frozen-lockfile'],
    },
    { id: 'build', describe: 'build the static homepage', kind: 'pnpm', argv: ['build'] },
    {
      id: 'stage',
      describe: 'stage a self-contained preview to pitch/preview/index.html',
      kind: 'internal',
    },
    ...PITCH_DOCS.map(
      (id): PitchStepDef => ({
        id,
        describe: `generate teaser ${id}`,
        kind: 'cli',
        argv: ['generate', slug, '--doc', id, '--yes'],
        costed: 'teasers',
      }),
    ),
    {
      id: 'questionnaire',
      describe: 'write the prospect interview guide + mint the magic link',
      kind: 'internal',
    },
    { id: 'share', describe: 'mint the preview share token (expiring)', kind: 'internal' },
    { id: 'email', describe: 'draft the outreach email (NOT sent)', kind: 'internal' },
  ];
}

/**
 * Refuse to run a pitch against a real client's directory. Returns the
 * refusal message, or null when the run may proceed. A dir is a prospect's
 * only when its config says `stage: prospect`; anything else (including a
 * stage-less pre-Spec-19 config) is a paying client.
 */
export async function checkClobberGuard(
  ds: ClientDataSource,
  slug: string,
  force: boolean,
): Promise<string | null> {
  const raw = await ds.readClientFileText(slug, 'client-config.yaml');
  if (raw === null || force) return null;
  let config: Partial<ClientConfig> | null = null;
  try {
    config = parseYaml(raw) as Partial<ClientConfig>;
  } catch {
    config = null;
  }
  if (config?.stage === 'prospect') return null;
  return (
    `clients/${slug}/ already exists and is not a prospect (stage: ${config?.stage ?? 'unset = client'}). ` +
    'A pitch run must never clobber a client. Pass --force-prospect only if you are certain.'
  );
}

/**
 * Seed the minimal profile a prospect needs for teaser generation:
 * publicName, website, and a category from the vertical pack — all
 * source: 'recon', confidence: 'low', so Spec 14 hedging tags every one of
 * them [UNCONFIRMED] in generated docs. Never touches an existing profile
 * (a full `recon` run, when the operator opts into it, does that properly).
 */
export async function seedProspectProfile(
  ds: ClientDataSource,
  slug: string,
  opts: { name: string; url: string; vertical?: string; now?: string },
): Promise<boolean> {
  if ((await ds.readClientFileText(slug, 'profile.json')) !== null) return false;
  const now = opts.now ?? new Date().toISOString();
  const env = <T,>(value: T): ProfileField<T> => ({
    value,
    source: 'recon',
    confidence: 'low',
    verified: false,
    updatedAt: now,
  });
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const profile = createEmptyProfile(slug, now) as any;
  profile.identity ??= {};
  profile.identity.publicName = env(opts.name);
  profile.identity.website = env(opts.url);
  profile.identity.category = env(getVerticalPack(opts.vertical).noun);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  await ds.writeClientFile(slug, 'profile.json', `${JSON.stringify(profile, null, 2)}\n`);
  return true;
}
