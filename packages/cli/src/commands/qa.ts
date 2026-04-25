import { Args, Flags } from '@oclif/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../base-command.js';
import {
  FirecrawlClient,
  clientDir as clientDirFor,
  readClientConfig,
} from '@upriver/core';
import type {
  AuditFinding,
  AuditPackage,
  AuditPassResult,
  FirecrawlScrapeResult,
} from '@upriver/core';
import {
  runSeo,
  runContent,
  runDesign,
  runSales,
  runLinks,
  runSchema,
  runAeo,
  runLocal,
  runBacklinks,
  runCompetitors,
} from '@upriver/audit-passes';

const PASSES = [
  { name: 'seo', fn: runSeo },
  { name: 'content', fn: runContent },
  { name: 'design', fn: runDesign },
  { name: 'sales', fn: runSales },
  { name: 'links', fn: runLinks },
  { name: 'schema', fn: runSchema },
  { name: 'aeo', fn: runAeo },
  { name: 'local', fn: runLocal },
  { name: 'backlinks', fn: runBacklinks },
  { name: 'competitors', fn: runCompetitors },
] as const;

interface PageRecord {
  url: string;
  slug: string;
  scraped_at: string;
  metadata: {
    title: string;
    description: string;
    statusCode?: number;
    canonical?: string;
    ogImage?: string;
  };
  content: {
    markdown: string;
    wordCount: number;
    headings: Array<{ level: number; text: string }>;
  };
  links: {
    internal: string[];
    external: string[];
  };
  images: string[];
  screenshots: { desktop: string | null; mobile: string | null };
  extracted: {
    ctaButtons: unknown[];
    contact: unknown;
    teamMembers: unknown[];
    testimonials: unknown[];
    faqs: unknown[];
    pricing: unknown[];
    socialLinks: unknown[];
    eventSpaces: unknown[];
  };
  rawHtmlPath: string | null;
  hasBranding: boolean;
}

export default class Qa extends BaseCommand {
  static override description =
    'Re-run all 10 audit passes against a preview URL and produce a QA report vs. the original audit';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'preview-url': Flags.string({
      description: 'Vercel preview URL to audit (required)',
      required: true,
    }),
    mode: Flags.string({ options: ['preview', 'production'], default: 'preview' }),
    'max-pages': Flags.integer({
      description: 'Cap pages re-scraped from the preview (default: 25)',
      default: 25,
    }),
    'skip-scrape': Flags.boolean({
      description: 'Reuse an existing qa/pages directory instead of re-scraping',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Qa);
    const { slug } = args;
    const previewUrl = flags['preview-url'];
    const dir = clientDirFor(slug);

    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const config = readClientConfig(slug);

    const originalPkgPath = join(dir, 'audit-package.json');
    if (!existsSync(originalPkgPath)) {
      this.error(`audit-package.json not found at ${originalPkgPath}. Run "upriver synthesize ${slug}" first.`);
    }
    const original = JSON.parse(readFileSync(originalPkgPath, 'utf8')) as AuditPackage;

    const scopeIds = readScopeIds(join(dir, 'fixes-plan-scope.md'), join(dir, 'fixes-plan.md'));

    const qaDir = join(dir, 'qa');
    const qaPagesDir = join(qaDir, 'pages');
    const qaAuditDir = join(qaDir, 'audit');
    mkdirSync(qaPagesDir, { recursive: true });
    mkdirSync(qaAuditDir, { recursive: true });

    // 1. Re-scrape preview URL
    if (!flags['skip-scrape']) {
      await this.scrapePreview(slug, previewUrl, qaPagesDir, flags['max-pages']);
    } else {
      this.log('  [skip-scrape] reusing existing qa/pages directory.');
    }

    // 2. Run all 10 audit passes against qa/ directory
    this.log(`\nRunning ${PASSES.length} audit passes against preview...`);
    const start = Date.now();
    const results = await Promise.allSettled(
      PASSES.map(async ({ name, fn }) => {
        try {
          return await (fn as (slug: string, dir: string) => Promise<AuditPassResult>)(slug, qaDir);
        } catch (err) {
          this.warn(`  [ERR] ${name}: ${String(err)}`);
          throw err;
        }
      }),
    );

    const passed: AuditPassResult[] = [];
    for (const r of results) if (r.status === 'fulfilled') passed.push(r.value);

    for (const res of passed) {
      writeFileSync(join(qaAuditDir, `${res.dimension}.json`), JSON.stringify(res, null, 2), 'utf8');
    }

    const newFindings = passed.flatMap((p) => p.findings);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    this.log(`  Completed ${passed.length}/${PASSES.length} passes in ${elapsed}s. ${newFindings.length} findings on preview.`);

    // 3. Compare to original findings
    const diff = diffFindings(original.findings, newFindings, scopeIds);

    // 4. Write QA report
    const reportPath = join(dir, 'qa-report.md');
    const overallScore = passed.length > 0
      ? Math.round(passed.reduce((s, r) => s + r.score, 0) / passed.length)
      : 0;
    const report = renderReport({
      client: original.meta.clientName,
      slug,
      siteUrl: config.url,
      previewUrl,
      originalScore: original.meta.overallScore,
      newScore: overallScore,
      diff,
      scopeIds,
    });
    writeFileSync(reportPath, report, 'utf8');

    this.log(`\nWrote ${reportPath}`);
    this.log(`  In-scope fixed:     ${diff.fixedInScope.length}`);
    this.log(`  In-scope still open:${diff.stillOpenInScope.length}`);
    this.log(`  New issues:         ${diff.newIssues.length}`);
    this.log(`  Out-of-scope open:  ${diff.stillOpenOutOfScope.length}`);
    this.log(`  Score: ${original.meta.overallScore} → ${overallScore}`);
  }

  private async scrapePreview(
    slug: string,
    previewUrl: string,
    qaPagesDir: string,
    maxPages: number,
  ): Promise<void> {
    const apiKey = this.getFirecrawlKey();
    const fc = new FirecrawlClient({
      apiKey,
      clientSlug: slug,
      command: 'qa',
      creditLogPath: join(clientDirFor(slug), 'token-and-credit-usage.log'),
    });

    this.log(`\nDiscovering preview URLs from ${previewUrl}...`);
    let urls: string[] = [];
    try {
      const map = await fc.map(previewUrl);
      urls = map.urls;
    } catch (err) {
      this.warn(`Firecrawl Map failed: ${err instanceof Error ? err.message : String(err)}. Falling back to root only.`);
      urls = [previewUrl];
    }
    if (urls.length === 0) urls = [previewUrl];
    if (urls.length > maxPages) {
      this.log(`  Discovered ${urls.length} URLs; capping to ${maxPages} for QA.`);
      urls = urls.slice(0, maxPages);
    } else {
      this.log(`  Discovered ${urls.length} URL(s).`);
    }

    this.log(`\nScraping ${urls.length} preview page(s)...`);
    const scraped = await fc.batchScrape(urls, {
      formats: ['markdown', 'rawHtml', 'links', 'summary'],
      onlyMainContent: false,
    });

    // rawHtml files go into qa/rawhtml/
    const rawHtmlDir = join(qaPagesDir, '..', 'rawhtml');
    mkdirSync(rawHtmlDir, { recursive: true });

    for (const r of scraped) {
      const pageUrl = r.url || r.metadata?.sourceURL || r.metadata?.url || '';
      if (!pageUrl) continue;
      const slugName = urlToSlug(pageUrl);
      let rawHtmlPath: string | null = null;
      if (r.rawHtml) {
        rawHtmlPath = join(rawHtmlDir, `${slugName}.html`);
        writeFileSync(rawHtmlPath, r.rawHtml, 'utf8');
      }
      const record = buildPageRecord(r, pageUrl, rawHtmlPath);
      writeFileSync(join(qaPagesDir, `${slugName}.json`), JSON.stringify(record, null, 2), 'utf8');
    }
    this.log(`  ${scraped.length} page(s) scraped.`);
  }
}

function urlToSlug(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '') || '/';
    if (path === '/') return 'home';
    return path
      .slice(1)
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 80);
  } catch {
    return 'unknown';
  }
}

function buildPageRecord(
  r: FirecrawlScrapeResult,
  pageUrl: string,
  rawHtmlPath: string | null,
): PageRecord {
  const md = r.markdown ?? '';
  const headings = extractHeadings(md);
  const wordCount = md.split(/\s+/).filter(Boolean).length;
  const allLinks = r.links ?? [];
  let baseHost = '';
  try {
    baseHost = new URL(pageUrl).hostname;
  } catch {
    /* ignore */
  }
  const internal = allLinks
    .filter((l) => {
      if (!l?.href) return false;
      try {
        return new URL(l.href).hostname === baseHost;
      } catch {
        return l.href.startsWith('/');
      }
    })
    .map((l) => l.href);
  const external = allLinks
    .filter((l) => {
      if (!l?.href) return false;
      try {
        return new URL(l.href).hostname !== baseHost;
      } catch {
        return false;
      }
    })
    .map((l) => l.href);

  return {
    url: pageUrl,
    slug: urlToSlug(pageUrl),
    scraped_at: new Date().toISOString(),
    metadata: {
      title: r.metadata?.title ?? '',
      description: r.metadata?.description ?? '',
      ...(r.metadata?.statusCode !== undefined ? { statusCode: r.metadata.statusCode } : {}),
      ...(r.metadata?.canonical !== undefined ? { canonical: r.metadata.canonical } : {}),
      ...(r.metadata?.ogImage !== undefined ? { ogImage: r.metadata.ogImage } : {}),
    },
    content: { markdown: md, wordCount, headings },
    links: { internal, external },
    images: [],
    screenshots: { desktop: null, mobile: null },
    extracted: {
      ctaButtons: [],
      contact: {},
      teamMembers: [],
      testimonials: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath,
    hasBranding: false,
  };
}

function extractHeadings(markdown: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m?.[1] && m?.[2]) headings.push({ level: m[1].length, text: m[2].trim() });
  }
  return headings;
}

function readScopeIds(scopePath: string, planPath: string): Set<string> {
  const ids = new Set<string>();
  const pattern = /\b([a-z]+-\d{3})\b/gi;
  for (const path of [scopePath, planPath]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    // Prefer a "## In scope" section if present so "## Deferred" items are excluded
    const sectionMatch = text.match(/##\s+In\s*scope\s*\n([\s\S]*?)(?=\n##\s|$)/i);
    const searchIn = sectionMatch ? sectionMatch[1] ?? text : text;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(searchIn)) !== null) {
      if (m[1]) ids.add(m[1].toLowerCase());
    }
    if (ids.size > 0) break; // Prefer scope doc if present
  }
  return ids;
}

interface FindingDiff {
  fixedInScope: AuditFinding[];
  stillOpenInScope: Array<{ original: AuditFinding; preview: AuditFinding | null }>;
  newIssues: AuditFinding[];
  stillOpenOutOfScope: AuditFinding[];
}

function diffFindings(
  originalFindings: AuditFinding[],
  previewFindings: AuditFinding[],
  scopeIds: Set<string>,
): FindingDiff {
  // Match by dimension + normalized title. We do NOT rely on finding IDs
  // between runs because IDs are assigned in order and the preview can have
  // a different count.
  const key = (f: AuditFinding) => `${f.dimension}::${normalizeTitle(f.title)}`;
  const previewByKey = new Map<string, AuditFinding>();
  for (const p of previewFindings) previewByKey.set(key(p), p);
  const originalByKey = new Map<string, AuditFinding>();
  for (const o of originalFindings) originalByKey.set(key(o), o);

  const fixedInScope: AuditFinding[] = [];
  const stillOpenInScope: Array<{ original: AuditFinding; preview: AuditFinding | null }> = [];
  const stillOpenOutOfScope: AuditFinding[] = [];

  for (const o of originalFindings) {
    const match = previewByKey.get(key(o));
    const inScope = scopeIds.size === 0 ? o.priority === 'p0' || o.priority === 'p1' : scopeIds.has(o.id.toLowerCase());
    if (!match) {
      if (inScope) fixedInScope.push(o);
      continue;
    }
    if (inScope) stillOpenInScope.push({ original: o, preview: match });
    else stillOpenOutOfScope.push(o);
  }

  const newIssues: AuditFinding[] = [];
  for (const p of previewFindings) {
    if (!originalByKey.has(key(p))) newIssues.push(p);
  }

  return { fixedInScope, stillOpenInScope, newIssues, stillOpenOutOfScope };
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/\s+/g, ' ').replace(/[\d]+/g, '#').trim();
}

function renderReport(args: {
  client: string;
  slug: string;
  siteUrl: string;
  previewUrl: string;
  originalScore: number;
  newScore: number;
  diff: FindingDiff;
  scopeIds: Set<string>;
}): string {
  const { client, slug, siteUrl, previewUrl, originalScore, newScore, diff, scopeIds } = args;
  const date = new Date().toISOString().slice(0, 10);
  const delta = newScore - originalScore;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  const scopeSource = scopeIds.size > 0 ? `scope doc (${scopeIds.size} finding(s))` : 'implicit scope = all P0 + P1 findings';

  const lines: string[] = [];
  lines.push(`# QA report — ${client}`);
  lines.push('');
  lines.push(`Generated: ${date}`);
  lines.push(`Slug: \`${slug}\``);
  lines.push(`Source site: ${siteUrl}`);
  lines.push(`Preview URL: ${previewUrl}`);
  lines.push(`Scope: ${scopeSource}`);
  lines.push('');
  lines.push(`**Score:** ${originalScore}/100 → ${newScore}/100 (${deltaStr})`);
  lines.push('');
  lines.push('| Bucket | Count |');
  lines.push('|--------|-------|');
  lines.push(`| In-scope fixed | ${diff.fixedInScope.length} |`);
  lines.push(`| In-scope still open | ${diff.stillOpenInScope.length} |`);
  lines.push(`| New issues introduced | ${diff.newIssues.length} |`);
  lines.push(`| Out-of-scope still open (for reference) | ${diff.stillOpenOutOfScope.length} |`);
  lines.push('');

  lines.push('## In-scope items fixed');
  lines.push('');
  if (diff.fixedInScope.length === 0) {
    lines.push('_None — either nothing in scope was fixed yet, or there were no in-scope findings._');
  } else {
    lines.push('| ID | Priority | Dimension | Title |');
    lines.push('|----|----------|-----------|-------|');
    for (const f of diff.fixedInScope) {
      lines.push(`| ${f.id} | ${f.priority.toUpperCase()} | ${f.dimension} | ${escapePipes(f.title)} |`);
    }
  }
  lines.push('');

  lines.push('## In-scope items still open');
  lines.push('');
  if (diff.stillOpenInScope.length === 0) {
    lines.push('_None — every in-scope finding is resolved on the preview._');
  } else {
    lines.push('| ID | Priority | Dimension | Title | Why it still matters |');
    lines.push('|----|----------|-----------|-------|----------------------|');
    for (const { original } of diff.stillOpenInScope) {
      lines.push(
        `| ${original.id} | ${original.priority.toUpperCase()} | ${original.dimension} | ${escapePipes(original.title)} | ${escapePipes(truncate(original.why_it_matters, 120))} |`,
      );
    }
  }
  lines.push('');

  lines.push('## New issues introduced on the preview');
  lines.push('');
  if (diff.newIssues.length === 0) {
    lines.push('_None — no regressions detected._');
  } else {
    lines.push('| Priority | Dimension | Title | Recommendation |');
    lines.push('|----------|-----------|-------|----------------|');
    for (const f of diff.newIssues) {
      lines.push(
        `| ${f.priority.toUpperCase()} | ${f.dimension} | ${escapePipes(f.title)} | ${escapePipes(truncate(f.recommendation, 140))} |`,
      );
    }
  }
  lines.push('');

  if (diff.stillOpenOutOfScope.length > 0) {
    lines.push('## Out-of-scope items still open (for the next engagement)');
    lines.push('');
    lines.push('These findings are open on the preview but were not included in the fixes scope.');
    lines.push('');
    lines.push('| ID | Priority | Dimension | Title |');
    lines.push('|----|----------|-----------|-------|');
    for (const f of diff.stillOpenOutOfScope) {
      lines.push(`| ${f.id} | ${f.priority.toUpperCase()} | ${f.dimension} | ${escapePipes(f.title)} |`);
    }
    lines.push('');
  }

  lines.push('## What to do next');
  lines.push('');
  if (diff.stillOpenInScope.length > 0) {
    lines.push(
      `- Re-run \`upriver fixes apply ${slug} --finding <id>\` for each in-scope item still open, or fix manually and re-run \`upriver qa ${slug}\`.`,
    );
  }
  if (diff.newIssues.length > 0) {
    lines.push(
      '- Review new issues — these were introduced during the fixes pass. File a finding for each before merging.',
    );
  }
  if (diff.stillOpenInScope.length === 0 && diff.newIssues.length === 0) {
    lines.push('- Scope is green. Proceed to `upriver launch-checklist` and cut over DNS.');
  }
  lines.push('');
  return lines.join('\n');
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

