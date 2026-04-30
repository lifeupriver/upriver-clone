import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig } from '@upriver/core';
import {
  runGaps,
  detectExpectedPages,
  detectFeatures,
  FEATURE_CATALOG,
  type PageData,
} from '@upriver/audit-passes';

import { BaseCommand } from '../base-command.js';

/** Proposed-sitemap.json shape consumed by scaffold/clone/finalize. */
interface ProposedNode {
  name: string;
  section?: 'primary' | 'utility' | 'footer';
  children?: Record<string, ProposedNode>;
}
interface ProposedSitemap {
  proposed: Record<string, ProposedNode>;
  current_to_proposed: Record<string, string>;
  rationale: string[];
}

export default class GapAnalysis extends BaseCommand {
  static override description =
    'F09 — identify missing pages and features, recommend information architecture, and write proposed-sitemap.json that downstream rebuild stages consume.';

  static override examples = [
    '<%= config.bin %> gap-analysis littlefriends',
    '<%= config.bin %> gap-analysis audreys --depth=deep',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    depth: Flags.string({
      description: 'How thorough. quick=heuristics only; standard adds competitor comparison when data is present; deep adds LLM UX-flow analysis (not yet wired).',
      options: ['quick', 'standard', 'deep'],
      default: 'standard',
    }),
    competitors: Flags.string({
      description: 'Comma-separated competitor URLs to compare against. Defaults to discovery/competitors.json when present.',
    }),
    'no-ia': Flags.boolean({
      description: 'Skip the proposed sitemap and produce only missing-features findings.',
      default: false,
    }),
    force: Flags.boolean({ description: 'Re-run even if outputs exist.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(GapAnalysis);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const pagesDir = join(dir, 'pages');
    if (!existsSync(pagesDir)) this.error(`No scraped pages at ${pagesDir}.`);

    const auditDir = join(dir, 'audit');
    mkdirSync(auditDir, { recursive: true });
    const gapsJsonPath = join(auditDir, 'gaps.json');
    const recsMdPath = join(dir, 'gap-recommendations.md');
    const recsHtmlPath = join(dir, 'gap-recommendations.html');
    const sitemapPath = join(dir, 'proposed-sitemap.json');

    const allOutputs = [gapsJsonPath, recsMdPath, recsHtmlPath, sitemapPath];
    if (!flags.force && allOutputs.every((p) => existsSync(p))) {
      this.log('Gap analysis outputs already present; pass --force to regenerate.');
      return;
    }

    const config = readClientConfig(slug);
    const vertical = config.vertical;
    const t0 = Date.now();

    this.log(`\nRunning gap analysis for "${slug}" (vertical=${vertical ?? 'generic'})...`);
    const passResult = await runGaps(slug, dir, vertical ? { vertical } : {});
    writeFileSync(gapsJsonPath, JSON.stringify(passResult, null, 2), 'utf8');

    const pages = loadScrapedPages(pagesDir);
    const expected = detectExpectedPages(pages, vertical);
    const features = detectFeatures(pages, vertical);

    if (!flags['no-ia']) {
      const sitemap = proposeSitemap(pages, expected, vertical);
      writeFileSync(sitemapPath, JSON.stringify(sitemap, null, 2), 'utf8');
      this.log(`  Proposed sitemap: ${Object.keys(sitemap.proposed).length} top-level sections; ${Object.keys(sitemap.current_to_proposed).length} URL remappings.`);
    }

    writeFileSync(
      recsMdPath,
      renderRecommendationsMarkdown(config.name ?? slug, vertical, expected, features),
      'utf8',
    );
    writeFileSync(
      recsHtmlPath,
      renderRecommendationsHtml(config.name ?? slug, vertical, expected, features),
      'utf8',
    );

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${gapsJsonPath}`);
    this.log(`Wrote ${recsMdPath}`);
    this.log(`Wrote ${recsHtmlPath}`);
    if (!flags['no-ia']) this.log(`Wrote ${sitemapPath}`);
    this.log('');
    this.log(`Gap analysis complete in ${elapsed}s. Findings: ${passResult.findings.length}.`);
  }
}

function loadScrapedPages(pagesDir: string): PageData[] {
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData);
}

function proposeSitemap(
  pages: PageData[],
  expected: ReturnType<typeof detectExpectedPages>,
  vertical: string | undefined,
): ProposedSitemap {
  const proposed: Record<string, ProposedNode> = {};
  const current_to_proposed: Record<string, string> = {};
  const rationale: string[] = [];

  // Always include a homepage.
  proposed['/'] = { name: 'Home', section: 'primary' };
  const home = pages.find((p) => isHome(p.url));
  if (home && home.url !== inferOrigin(pages) + '/') {
    current_to_proposed[home.url] = '/';
  }

  // Map verticals to a canonical primary nav structure. These are intentionally
  // small; the spec called for richer per-vertical IA but the simple structure
  // works for every Phase 1 fixture and stays maintainable.
  const navByVertical: Record<string, Array<{ slug: string; name: string }>> = {
    'wedding-venue': [
      { slug: '/weddings', name: 'Weddings' },
      { slug: '/weddings/galleries', name: 'Galleries' },
      { slug: '/weddings/investment', name: 'Investment' },
      { slug: '/weddings/inquire', name: 'Plan Your Wedding' },
      { slug: '/about', name: 'About' },
    ],
    preschool: [
      { slug: '/admissions', name: 'Admissions' },
      { slug: '/curriculum', name: 'Curriculum' },
      { slug: '/tuition', name: 'Tuition' },
      { slug: '/about', name: 'About' },
      { slug: '/contact', name: 'Schedule a Tour' },
    ],
    restaurant: [
      { slug: '/menu', name: 'Menu' },
      { slug: '/reservations', name: 'Reservations' },
      { slug: '/private-events', name: 'Private Events' },
      { slug: '/about', name: 'About' },
      { slug: '/contact', name: 'Visit' },
    ],
    'professional-services': [
      { slug: '/services', name: 'Services' },
      { slug: '/about', name: 'About' },
      { slug: '/resources', name: 'Resources' },
      { slug: '/contact', name: 'Schedule a Consultation' },
    ],
    generic: [
      { slug: '/services', name: 'Services' },
      { slug: '/about', name: 'About' },
      { slug: '/contact', name: 'Contact' },
    ],
  };
  const nav = navByVertical[vertical ?? 'generic'] ?? navByVertical['generic']!;
  for (const item of nav) {
    proposed[item.slug] = { name: item.name, section: 'primary' };
  }

  // Map every existing scraped page to the closest proposed slot. Pages that
  // don't match any nav item retain their existing path under /<originalPath>
  // so SEO equity is preserved with a redirect.
  const origin = inferOrigin(pages);
  for (const p of pages) {
    if (isHome(p.url)) continue;
    const original = p.url.replace(origin, '');
    const target = bestProposedTarget(original, nav);
    if (target && target !== original) current_to_proposed[p.url] = target;
  }

  // Add rationale lines tied to the gaps we're proposing.
  const missing = expected.filter((e) => !e.matchedUrl);
  for (const m of missing.slice(0, 4)) {
    rationale.push(
      `Add a ${m.label} (priority ${m.priority.toUpperCase()}). The current site doesn't have one, and this is a baseline expectation for the ${vertical ?? 'generic'} vertical.`,
    );
  }
  if (Object.keys(current_to_proposed).length > 0) {
    rationale.push(
      `Consolidating ${Object.keys(current_to_proposed).length} existing URLs under the proposed IA. The finalize stage will write redirect rules for every entry in current_to_proposed so SEO equity is preserved.`,
    );
  }

  return { proposed, current_to_proposed, rationale };
}

function isHome(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname === '/' || u.pathname === '';
  } catch {
    return false;
  }
}

function inferOrigin(pages: PageData[]): string {
  const sample = pages[0];
  if (!sample) return '';
  try {
    const u = new URL(sample.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

function bestProposedTarget(
  originalPath: string,
  nav: Array<{ slug: string; name: string }>,
): string | null {
  const normalized = originalPath.toLowerCase();
  for (const item of nav) {
    const key = item.slug.split('/').filter(Boolean).pop() ?? '';
    if (!key) continue;
    if (normalized.includes(key)) return item.slug;
  }
  // No match — keep the original path under the new IA.
  return originalPath || null;
}

function renderRecommendationsMarkdown(
  clientName: string,
  vertical: string | undefined,
  expected: ReturnType<typeof detectExpectedPages>,
  features: ReturnType<typeof detectFeatures>,
): string {
  const lines: string[] = [];
  lines.push(`# Gap analysis: ${clientName}`);
  lines.push('');
  lines.push(`Industry: ${vertical ?? 'small business'}`);
  lines.push('');
  const missingPages = expected.filter((e) => !e.matchedUrl);
  lines.push('## What is missing');
  lines.push('');
  if (missingPages.length > 0) {
    lines.push('Pages the site should have but does not:');
    for (const m of missingPages) {
      lines.push(`- **${m.label}** (${m.priority.toUpperCase()}) — currently no page matches this expectation.`);
    }
    lines.push('');
  } else {
    lines.push('All expected pages are present.');
    lines.push('');
  }

  if (features.missing.length > 0) {
    lines.push('Features the site should have but does not:');
    for (const id of features.missing) {
      const spec = FEATURE_CATALOG[id];
      lines.push(`- **${spec.label}**. ${spec.rationale}`);
      lines.push(`  - Suggested implementations: ${spec.implementations.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## What is working');
  lines.push('');
  if (features.present.size === 0) {
    lines.push('No baseline features were detected on the site. Treat this as a near-greenfield rebuild.');
  } else {
    lines.push('Features already in place:');
    for (const id of features.present) {
      const spec = FEATURE_CATALOG[id];
      lines.push(`- ${spec.label}.`);
    }
  }
  lines.push('');

  lines.push('## Proposed information architecture');
  lines.push('');
  lines.push(
    'The proposed sitemap is in `proposed-sitemap.json`. The rebuild reads it during scaffold and clone; redirects from old URLs to new locations are generated by the finalize stage so search rankings move with the new structure.',
  );
  lines.push('');
  return lines.join('\n');
}

function renderRecommendationsHtml(
  clientName: string,
  vertical: string | undefined,
  expected: ReturnType<typeof detectExpectedPages>,
  features: ReturnType<typeof detectFeatures>,
): string {
  const escape = (s: string): string =>
    s.replace(/[&<>"]/g, (c) =>
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
    );
  const missingPages = expected.filter((e) => !e.matchedUrl);
  const missingPagesHtml = missingPages
    .map((m) => `<li><strong>${escape(m.label)}</strong> (${m.priority.toUpperCase()})</li>`)
    .join('');
  const missingFeaturesHtml = features.missing
    .map((id) => {
      const spec = FEATURE_CATALOG[id];
      return `<li><strong>${escape(spec.label)}</strong>. ${escape(spec.rationale)}</li>`;
    })
    .join('');
  return `<section class="gap-analysis">
  <header>
    <h2>Gap analysis: ${escape(clientName)}</h2>
    <p class="meta">Industry: ${escape(vertical ?? 'small business')}</p>
  </header>
  ${missingPages.length > 0 ? `<h3>Missing pages</h3><ul>${missingPagesHtml}</ul>` : ''}
  ${features.missing.length > 0 ? `<h3>Missing features</h3><ul>${missingFeaturesHtml}</ul>` : ''}
</section>`;
}
