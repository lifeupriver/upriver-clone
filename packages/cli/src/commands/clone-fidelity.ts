import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../base-command.js';
import { extractCloneText } from '../clone-qa/extract-clone-text.js';
import {
  aggregateOverall,
  scorePage,
  type FidelitySummary,
  type PageFidelity,
} from '../clone-qa/fidelity-scorer.js';
import { resolveScaffoldPaths } from '../scaffold/template-writer.js';

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

    if (this.skipIfExists('clone-qa/summary.json', outPath, { force: flags.force })) return;

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
    this.log('');
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
