import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';

import { BaseCommand } from '../base-command.js';
import {
  classifyPage,
  buildBreadcrumb,
  buildFaqPage,
  buildLocalBusiness,
  buildOrganization,
  buildPersonForTeamMember,
  buildService,
  deriveBusinessFacts,
  type BusinessFacts,
} from '../schema-build/generators.js';

const SCHEMA_TYPE_OPTIONS = [
  'localbusiness',
  'faq',
  'service',
  'event',
  'review',
  'product',
  'article',
  'breadcrumb',
  'organization',
  'person',
] as const;

interface ManifestEntry {
  /** Relative path from clients/<slug>/ */
  path: string;
  schemas: string[];
  page?: string;
}

export default class SchemaBuild extends BaseCommand {
  static override description =
    'F02 — generate JSON-LD schemas (Organization, LocalBusiness, FAQ, Service, Breadcrumb, Person) for the rebuilt site, plus an install guide. Sells as a $500 standalone deliverable.';

  static override examples = [
    '<%= config.bin %> schema-build littlefriends',
    '<%= config.bin %> schema-build audreys --types=localbusiness,faq',
    '<%= config.bin %> schema-build audreys --no-pages',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    types: Flags.string({
      description: `Comma-separated schema types to generate. Default: all applicable. Options: ${SCHEMA_TYPE_OPTIONS.join(', ')}.`,
    }),
    'no-pages': Flags.boolean({
      description: 'Skip per-page schemas; produce only site-wide schemas.',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Re-run even if outputs exist.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SchemaBuild);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) {
      this.error(`Client directory not found: ${dir}. Run "upriver init ${slug}" first.`);
    }

    const schemaDir = join(dir, 'schema');
    const manifestPath = join(schemaDir, 'manifest.json');
    if (this.skipIfExists('schema/manifest.json', manifestPath, { force: flags.force })) return;
    mkdirSync(schemaDir, { recursive: true });
    mkdirSync(join(schemaDir, 'pages'), { recursive: true });

    const config = readClientConfig(slug);
    const vertical = config.vertical;
    const includeTypes = flags.types
      ? new Set(flags.types.split(',').map((t) => t.trim().toLowerCase()))
      : null;

    const audit = loadAuditPackage(dir);
    const facts = deriveBusinessFacts(audit, {
      name: config.name ?? slug,
      url: config.url ?? `https://${slug}.com`,
    });

    this.log(`\nGenerating schemas for "${slug}" (vertical=${vertical ?? 'generic'})...`);

    const manifest: ManifestEntry[] = [];

    // Site-wide
    const siteSchemas: Record<string, unknown> = {};
    const wantOrg = !includeTypes || includeTypes.has('organization');
    const wantLB = !includeTypes || includeTypes.has('localbusiness');
    if (wantOrg) siteSchemas['organization'] = buildOrganization(facts);
    if (wantLB) {
      const lb = buildLocalBusiness(facts, vertical);
      if (lb) siteSchemas['localbusiness'] = lb;
    }
    const sitePath = join(schemaDir, 'site.json');
    writeFileSync(sitePath, JSON.stringify(siteSchemas, null, 2), 'utf8');
    manifest.push({ path: 'schema/site.json', schemas: Object.keys(siteSchemas) });

    // Service schemas — derived from eventSpaces for venues, otherwise from
    // pricing rows. The audit-package shape doesn't include a services array
    // directly; we reuse the closest available structured content.
    const services = deriveServices(audit);
    if ((!includeTypes || includeTypes.has('service')) && services.length > 0) {
      const serviceList = services.map((s) =>
        buildService({
          name: s.name,
          provider: facts,
          ...(s.description ? { description: s.description } : {}),
        }),
      );
      const path = join(schemaDir, 'services.json');
      writeFileSync(path, JSON.stringify(serviceList, null, 2), 'utf8');
      manifest.push({ path: 'schema/services.json', schemas: ['service'] });
    }

    // Person schemas (team page)
    const team = audit?.contentInventory?.teamMembers ?? [];
    if ((!includeTypes || includeTypes.has('person')) && team.length > 0) {
      const persons = team.map((m) => buildPersonForTeamMember(m, facts));
      const path = join(schemaDir, 'team.json');
      writeFileSync(path, JSON.stringify(persons, null, 2), 'utf8');
      manifest.push({ path: 'schema/team.json', schemas: ['person'] });
    }

    // Per-page schemas
    if (!flags['no-pages']) {
      const pages = loadScrapedPages(join(dir, 'pages'));
      const wantBC = !includeTypes || includeTypes.has('breadcrumb');
      const wantFaq = !includeTypes || includeTypes.has('faq');
      for (const page of pages) {
        const blocks: Record<string, unknown> = {};
        const type = classifyPage(page);
        if (wantBC) {
          const crumbs = buildPageBreadcrumbs(page, facts);
          const bc = buildBreadcrumb(crumbs);
          if (bc) blocks['breadcrumb'] = bc;
        }
        if (wantFaq && (type === 'faq' || page.extracted.faqs.length > 0)) {
          const faq = buildFaqPage(page.extracted.faqs, page.url);
          if (faq) blocks['faq'] = faq;
        }
        if (Object.keys(blocks).length === 0) continue;
        const safeName = sanitizeSlug(page.slug);
        const path = join(schemaDir, 'pages', `${safeName}.json`);
        writeFileSync(path, JSON.stringify(blocks, null, 2), 'utf8');
        manifest.push({
          path: `schema/pages/${safeName}.json`,
          schemas: Object.keys(blocks),
          page: page.url,
        });
      }
    }

    // Install guide
    const installPath = join(dir, 'schema-install.md');
    writeFileSync(installPath, renderInstallGuide(facts, manifest, vertical), 'utf8');

    // Manifest
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          slug,
          generated_at: new Date().toISOString(),
          vertical: vertical ?? null,
          missing_geo: !facts.address,
          entries: manifest,
        },
        null,
        2,
      ),
      'utf8',
    );

    this.log('');
    this.log(`Wrote ${manifest.length} schema files under ${schemaDir}/`);
    this.log(`Wrote ${installPath}`);
    this.log(`Wrote ${manifestPath}`);
    if (!facts.address) {
      this.warn('No address available — LocalBusiness schemas omit address. Set address in client-config.yaml or contact-info to enable.');
    }
    if (!process.env['GOOGLE_GEOCODING_API_KEY']) {
      this.log('Note: GOOGLE_GEOCODING_API_KEY not set — geo coordinates omitted from LocalBusiness blocks.');
    }
  }
}

function deriveServices(
  audit: AuditPackage | null,
): Array<{ name: string; description?: string }> {
  const out: Array<{ name: string; description?: string }> = [];
  for (const ev of audit?.contentInventory?.eventSpaces ?? []) {
    out.push({ name: ev.name, description: ev.description });
  }
  for (const p of audit?.contentInventory?.pricing ?? []) {
    out.push({ name: p.item });
  }
  // Dedupe by name, prefer entries with descriptions.
  const seen = new Map<string, { name: string; description?: string }>();
  for (const s of out) {
    const existing = seen.get(s.name);
    if (!existing || (s.description && !existing.description)) seen.set(s.name, s);
  }
  return [...seen.values()];
}

function loadAuditPackage(dir: string): AuditPackage | null {
  const path = join(dir, 'audit-package.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as AuditPackage;
}

function loadScrapedPages(pagesDir: string): PageData[] {
  if (!existsSync(pagesDir)) return [];
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData);
}

function buildPageBreadcrumbs(
  page: PageData,
  facts: BusinessFacts,
): Array<{ name: string; url: string }> {
  const url = new URL(page.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const crumbs: Array<{ name: string; url: string }> = [{ name: 'Home', url: facts.url }];
  let acc = facts.url.replace(/\/$/, '');
  for (const seg of segments) {
    acc += `/${seg}`;
    const name = page.metadata.title && segments.indexOf(seg) === segments.length - 1
      ? page.metadata.title
      : seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ name, url: acc });
  }
  return crumbs.length > 1 ? crumbs : [];
}

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase() || 'index';
}

function renderInstallGuide(
  facts: BusinessFacts,
  manifest: ManifestEntry[],
  vertical: string | undefined,
): string {
  const lines: string[] = [];
  lines.push(`# Schema install guide: ${facts.name}`);
  lines.push('');
  lines.push(
    `This package contains ${manifest.length} JSON-LD schema files generated for ${facts.url}. Three install paths below; pick the one that matches the platform.`,
  );
  lines.push('');
  lines.push('## Option A: Astro component (recommended for Upriver-rebuilt sites)');
  lines.push('');
  lines.push('Drop this component into `src/components/` and import it in any layout or page:');
  lines.push('');
  lines.push('```astro');
  lines.push('---');
  lines.push("import site from '../../schema/site.json';");
  lines.push("// import faq from '../../schema/pages/faq.json'; // when applicable");
  lines.push('---');
  lines.push('<script type="application/ld+json" set:html={JSON.stringify(site.organization)} />');
  lines.push('<script type="application/ld+json" set:html={JSON.stringify(site.localbusiness)} />');
  lines.push('```');
  lines.push('');
  lines.push('## Option B: raw HTML (for sites still on the old platform)');
  lines.push('');
  lines.push('Paste this into the `<head>` of every page. The Organization and LocalBusiness blocks are site-wide.');
  lines.push('');
  lines.push('```html');
  lines.push('<script type="application/ld+json">');
  lines.push('  /* paste contents of schema/site.json organization key here */');
  lines.push('</script>');
  lines.push('<script type="application/ld+json">');
  lines.push('  /* paste contents of schema/site.json localbusiness key here */');
  lines.push('</script>');
  lines.push('```');
  lines.push('');
  lines.push('## Option C: WordPress');
  lines.push('');
  lines.push(
    'Use the "Insert Headers and Footers" plugin or any equivalent. Paste each schema into its own `<script type="application/ld+json">` block. For per-page schemas (FAQ, Breadcrumb), use a page-scoped insertion plugin so the block only appears on the matching URL.',
  );
  lines.push('');
  lines.push('## Files generated');
  lines.push('');
  for (const entry of manifest) {
    const types = entry.schemas.join(', ');
    lines.push(`- \`${entry.path}\` — ${types}${entry.page ? ` (for ${entry.page})` : ''}`);
  }
  lines.push('');
  lines.push('## Validation');
  lines.push('');
  lines.push(
    'Validate every block at https://search.google.com/test/rich-results before publishing. The `LocalBusiness` block should be visible to Google within 24 hours of publish; FAQ and Breadcrumb rich results may take 7-14 days.',
  );
  lines.push('');
  if (vertical === 'wedding-venue') {
    lines.push(
      'Note: this package uses `EventVenue` instead of the unofficial `WeddingVenue` type for strict-validator compatibility. Add `additionalType: "https://schema.org/WeddingVenue"` if you want to expose the wedding-specific signal.',
    );
    lines.push('');
  }
  return lines.join('\n');
}
