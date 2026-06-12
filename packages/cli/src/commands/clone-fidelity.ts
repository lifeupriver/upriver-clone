import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import type { AuditFinding } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { extractCloneText } from '../clone-qa/extract-clone-text.js';
import {
  aggregateOverall,
  scorePage,
  type FidelityPolicyBlock,
  type FidelitySummary,
  type PageFidelity,
} from '../clone-qa/fidelity-scorer.js';
import { CLONE_FIDELITY_BAR, evaluateFidelityPolicy } from '../clone/hardening.js';
import { filterUnmatched, findCdnUrlsInRepo } from '../clone/download-missing.js';
import { buildAssetIndex, DEFAULT_CDN_HOSTS } from '../clone/rewrite-links.js';
import { resolveScaffoldPaths } from '../scaffold/template-writer.js';

/**
 * Spec 17b §4 — strict fidelity gate failure. Distinct so `run all
 * --strict-fidelity` (and CI) can tell "below the bar" from every other
 * failure. 61 is the spend-ceiling abort; 11–16/21–32/41–47/51–58 belong to
 * the e2e harnesses.
 */
export const EXIT_STRICT_FIDELITY = 62;

interface ClonedPage {
  /** Slug used for screenshots (`index.astro` -> `home`). */
  pageSlug: string;
  /** Filename without `.astro` extension. */
  fileSlug: string;
  /** Absolute path to the cloned `.astro` source. */
  astroPath: string;
}

/**
 * `clone-fidelity` — score the cloned site against the live site.
 *
 * Consumes existing screenshots produced by `clone-qa` and live screenshots
 * captured during scrape, and the per-page extracted-content JSON. Produces
 * a per-page pixel + copy fidelity score and writes `clone-qa/summary.json`.
 *
 * Roadmap: Workstream D.1.
 */
export default class CloneFidelity extends BaseCommand {
  static override description =
    'Score cloned site vs live (pixel + copy completeness); writes clone-qa/summary.json.';

  static override examples = [
    '<%= config.bin %> clone-fidelity audreys',
    '<%= config.bin %> clone-fidelity audreys --force',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    out: Flags.string({
      description: 'Path to summary.json (relative to clientDir if not absolute)',
      default: 'clone-qa/summary.json',
    }),
    'diff-dir': Flags.string({
      description: 'Output dir for per-page diff PNGs (relative to clientDir if not absolute)',
      default: 'clone-qa/diff',
    }),
    'clone-shots-dir': Flags.string({
      description: 'Directory of cloned screenshots (relative to clientDir if not absolute)',
      default: 'clone-qa/desktop',
    }),
    'live-shots-dir': Flags.string({
      description: 'Directory of live screenshots (relative to clientDir if not absolute)',
      default: 'screenshots/desktop',
    }),
    force: Flags.boolean({ description: 'Overwrite an existing summary.json', default: false }),
    'fidelity-bar': Flags.integer({
      description:
        'Per-page overall-score bar for the warn/strict policy (spec 17b §1; provisional calibration).',
      default: CLONE_FIDELITY_BAR,
    }),
    'strict-fidelity': Flags.boolean({
      description:
        'Fail (exit 62) when any page scores below the bar or could not be scored, instead of warn-and-record.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CloneFidelity);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(clientDir)) {
      this.error(`Client directory not found at ${clientDir}.`);
    }
    if (!existsSync(repoDir)) {
      this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);
    }

    const outPath = resolveUnder(clientDir, flags.out);
    const diffDir = resolveUnder(clientDir, flags['diff-dir']);
    const cloneShotsDir = resolveUnder(clientDir, flags['clone-shots-dir']);
    const liveShotsDir = resolveUnder(clientDir, flags['live-shots-dir']);

    if (this.skipIfExists('clone-qa/summary.json', outPath, { force: flags.force })) {
      // Resume path (`run all --from`): no rescoring, but the policy is still
      // applied to the existing summary so warn/strict behavior stays honest.
      const existing = JSON.parse(readFileSync(outPath, 'utf-8')) as FidelitySummary;
      this.applyFidelityPolicy(existing, outPath, flags['fidelity-bar'], flags['strict-fidelity']);
      return;
    }

    const pagesDir = join(repoDir, 'src', 'pages');
    if (!existsSync(pagesDir)) {
      this.error(`No cloned pages directory at ${pagesDir}.`);
    }

    const pages = discoverClonedPages(pagesDir);
    if (pages.length === 0) {
      this.error('No .astro pages found in cloned repo.');
    }

    this.log(`\nClone fidelity for "${slug}" — ${pages.length} pages`);
    this.log(`  Live shots:  ${liveShotsDir}`);
    this.log(`  Clone shots: ${cloneShotsDir}`);
    this.log(`  Diff dir:    ${diffDir}`);

    mkdirSync(diffDir, { recursive: true });

    const results: PageFidelity[] = [];
    for (const page of pages) {
      const livePath = join(liveShotsDir, `${page.pageSlug}.png`);
      const clonePath = join(cloneShotsDir, `${page.pageSlug}.png`);
      const diffOutPath = join(diffDir, `${page.pageSlug}.png`);
      const liveText = readLiveText(clientDir, page.pageSlug);
      const cloneText = extractCloneText(page.astroPath);

      const result = await scorePage({
        pageSlug: page.pageSlug,
        livePath: existsSync(livePath) ? livePath : null,
        clonePath: existsSync(clonePath) ? clonePath : null,
        diffOutPath,
        liveText,
        cloneText,
      });
      results.push(result);
      this.log(
        `  ${formatStatus(result.status)} ${page.pageSlug.padEnd(28)} ` +
          `pixel=${result.pixel.score} copy=${result.copy.score} overall=${result.overall}`,
      );
    }

    const overall = aggregateOverall(results);
    const summary: FidelitySummary = {
      generatedAt: new Date().toISOString(),
      overall,
      pages: results,
    };

    mkdirSync(resolve(outPath, '..'), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');

    const scored = results.filter((r) => r.status === 'scored');
    this.log(`\n  Wrote ${outPath}`);
    this.log(`  Overall fidelity: ${overall}/100 across ${scored.length} pages`);

    // D.3 — emit synthetic findings for low-scoring pages so `fixes plan`
    // can route them through the same workflow as audit findings.
    const findings = buildFidelityFindings(results);

    // D.4 — promote the unmatched-CDN-URL check from `finalize` into a fidelity
    // gate. If the cloned repo still references live CDN hosts that aren't in
    // the asset manifest, that's a hard fidelity failure (broken images on
    // first load if the live CDN ever rotates).
    const cdnFinding = scanUnmatchedCdn(repoDir, clientDir);
    if (cdnFinding) {
      findings.push(cdnFinding);
      this.log(`  Unmatched CDN URLs detected in cloned repo — emitting fidelity gate finding`);
    }

    const findingsPath = join(clientDir, 'clone-fidelity-findings.json');
    writeFileSync(
      findingsPath,
      `${JSON.stringify({ generatedAt: summary.generatedAt, findings }, null, 2)}\n`,
      'utf-8',
    );
    if (findings.length > 0) {
      this.log(`  Wrote ${findings.length} fidelity finding(s) to ${findingsPath}`);
    } else {
      this.log(`  No fidelity findings (all pages >= ${FIDELITY_THRESHOLD} or unscored)`);
    }
    this.log('');

    // Spec 17b §1 — per-page bar policy, applied LAST so every artifact
    // (summary, findings) is on disk before a strict gate can abort.
    this.applyFidelityPolicy(summary, outPath, flags['fidelity-bar'], flags['strict-fidelity']);
  }

  /**
   * Evaluate the per-page policy, record it into summary.json, and warn or
   * (under --strict-fidelity) fail with exit 62. Warn-and-record is the
   * default: below-bar pages land, flagged here and routed by `fixes plan`.
   */
  private applyFidelityPolicy(
    summary: FidelitySummary,
    outPath: string,
    bar: number,
    strict: boolean,
  ): void {
    const result = evaluateFidelityPolicy(summary, bar);
    const policy: FidelityPolicyBlock = {
      bar,
      strict,
      belowBar: result.belowBar,
      unscored: result.unscored,
      evaluatedAt: new Date().toISOString(),
    };
    summary.policy = policy;
    writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');

    if (result.pass) {
      this.log(`  Fidelity policy: every page >= ${bar} — pass.`);
      return;
    }
    for (const p of result.belowBar) {
      this.warn(`fidelity: page "${p.pageSlug}" scored ${p.overall} — below the ${bar} bar`);
    }
    for (const slug of result.unscored) {
      this.warn(`fidelity: page "${slug}" could not be scored (fail-closed under --strict-fidelity)`);
    }
    if (strict) {
      this.error(
        `--strict-fidelity: ${result.belowBar.length} below-bar / ${result.unscored.length} unscored page(s); see clone-qa/summary.json policy block.`,
        { exit: EXIT_STRICT_FIDELITY },
      );
    }
    this.log(`  Recorded in clone-qa/summary.json (policy block); fixes plan routes below-${FIDELITY_THRESHOLD} pages.`);
  }
}

/**
 * Resolve a flag value as absolute, otherwise relative to clientDir.
 */
function resolveUnder(clientDir: string, p: string): string {
  return isAbsolute(p) ? p : join(clientDir, p);
}

/**
 * Map an Astro filename in `src/pages` to a screenshot page slug. `index.astro`
 * is the home page (matches the convention in `clone-qa.ts`).
 */
function discoverClonedPages(pagesDir: string): ClonedPage[] {
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.astro'))
    .map((f) => {
      const fileSlug = basename(f, '.astro');
      const pageSlug = fileSlug === 'index' ? 'home' : fileSlug;
      return { pageSlug, fileSlug, astroPath: join(pagesDir, f) };
    })
    .sort((a, b) => a.pageSlug.localeCompare(b.pageSlug));
}

/**
 * Read the live page's `content.markdown` (the cleanest source of "what the
 * live page says") from `clients/<slug>/pages/<page-slug>.json`. Returns the
 * empty string if the file is missing, unparsable, or has no markdown.
 */
function readLiveText(clientDir: string, pageSlug: string): string {
  const path = join(clientDir, 'pages', `${pageSlug}.json`);
  if (!existsSync(path)) return '';
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as { content?: { markdown?: string } };
    return parsed.content?.markdown ?? '';
  } catch {
    // TODO(roadmap): structured logging for clone-fidelity input failures.
    return '';
  }
}

const FIDELITY_THRESHOLD = 80;

/**
 * Synthesize one `AuditFinding` per scored page that fell below
 * `FIDELITY_THRESHOLD`. The shape mirrors audit findings so `fixes plan` can
 * merge them in unmodified.
 *
 * @param pages - Per-page fidelity scores from the run.
 * @returns Array of synthetic findings (possibly empty).
 */
export function buildFidelityFindings(pages: PageFidelity[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const p of pages) {
    if (p.status !== 'scored') continue;
    if (p.overall >= FIDELITY_THRESHOLD) continue;
    const pixel = p.pixel.score;
    const copy = p.copy.score;
    const lagging = pixel < copy ? 'pixel parity' : copy < pixel ? 'copy completeness' : 'both pixel and copy parity';
    findings.push({
      id: `clone-fidelity-${p.pageSlug}`,
      dimension: 'design',
      priority: 'p1',
      effort: 'medium',
      title: `Clone fidelity for /${p.pageSlug} is ${p.overall}/100`,
      description: `The cloned ${p.pageSlug} page scored ${p.overall}/100 against live (pixel ${pixel}, copy ${copy}). Lagging dimension: ${lagging}.`,
      why_it_matters:
        'Low fidelity erodes client trust at the dogfood preview and produces a worse baseline for subsequent improvement tracks. Closing the gap before improve runs prevents compounding divergence.',
      recommendation: `Inspect clone-qa/diff/${p.pageSlug}.png, then update the corresponding cloned page (\`src/pages/${p.pageSlug === 'home' ? 'index' : p.pageSlug}.astro\` and any referenced components) to bring ${lagging} back above ${FIDELITY_THRESHOLD}.`,
      evidence: `clone-qa/diff/${p.pageSlug}.png`,
      page: p.pageSlug,
      estimatedImpact: {
        scorePoints: Math.max(2, FIDELITY_THRESHOLD - p.overall),
        description: `restore page fidelity from ${p.overall} to ${FIDELITY_THRESHOLD}+`,
      },
    });
  }
  return findings;
}

/**
 * D.4 — scan the cloned repo for live-CDN URLs that aren't in the asset
 * manifest, and return one fidelity finding if any are present. Returns null
 * when the repo / manifest are missing (treated as "fidelity not gated").
 */
export function scanUnmatchedCdn(repoDir: string, clientDir: string): AuditFinding | null {
  const srcDir = join(repoDir, 'src');
  const manifestPath = join(clientDir, 'asset-manifest.json');
  if (!existsSync(srcDir) || !existsSync(manifestPath)) return null;
  let imageManifest: Map<string, string>;
  let filenameToLocal: Map<string, string>;
  let inferredCdnHosts: string[];
  try {
    ({ imageManifest, filenameToLocal, inferredCdnHosts } = buildAssetIndex(manifestPath));
  } catch {
    return null;
  }
  const cdnHosts = Array.from(new Set([...DEFAULT_CDN_HOSTS, ...inferredCdnHosts]));
  const found = findCdnUrlsInRepo(srcDir, cdnHosts);
  const unmatched = filterUnmatched(found, imageManifest, filenameToLocal);
  if (unmatched.length === 0) return null;
  const sample = unmatched.slice(0, 5).join(', ');
  return {
    id: 'clone-fidelity-cdn',
    dimension: 'design',
    priority: 'p0',
    effort: 'medium',
    title: `${unmatched.length} unmatched CDN URL(s) still in cloned repo`,
    description: `The cloned repo references ${unmatched.length} URL(s) on a known live CDN host that are not present in asset-manifest.json. These will 404 (or rot) once the live site rotates them.`,
    why_it_matters:
      'Live-CDN references are a fidelity time bomb: they look fine in dev because the live host is up, then break when the original site moves assets. Operators expect a finalized clone to be self-contained.',
    recommendation: `Re-run \`upriver finalize ${basename(clientDir)} --download-missing\` to fetch and rewrite the unmatched URLs to local /images paths.`,
    evidence: `Unmatched (first 5): ${sample}${unmatched.length > 5 ? `, +${unmatched.length - 5} more` : ''}`,
    estimatedImpact: { scorePoints: 8, description: 'eliminates all live-CDN dependencies' },
  };
}

/** Short status indicator for the per-page log line. */
function formatStatus(status: PageFidelity['status']): string {
  switch (status) {
    case 'scored':
      return '[ok]';
    case 'no-live-shot':
      return '[no-live]';
    case 'no-clone-shot':
      return '[no-clone]';
    case 'error':
      return '[err]';
  }
}
