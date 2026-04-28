import { existsSync } from 'node:fs';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { updateClientConfig } from '@upriver/core';
import { buildClientClaudeMd, buildProductMarketingContext } from '../../docs/client-docs.js';
import {
  applyDesignTokens,
  copyClientAssets,
  copyImages,
  copyTemplate,
  ensureClaudeMd,
  ensureProductMarketingContext,
  generateNav,
  loadAuditPackage,
  loadDesignTokens,
  loadPageRecords,
  resolveScaffoldPaths,
  seedFaqs,
  seedPages,
  seedTeam,
  seedTestimonials,
  writeChangelog,
} from '../../scaffold/template-writer.js';

export default class Scaffold extends BaseCommand {
  static override description = 'Generate Astro 6 hybrid repo for the client';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'supabase-project-ref': Flags.string({ description: 'Supabase project reference ID to record in client config' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Scaffold);
    const { slug } = args;
    const { clientDir, repoDir, templateDir } = resolveScaffoldPaths(slug);

    if (!existsSync(clientDir)) this.error(`Client directory not found: ${clientDir}`);
    if (!existsSync(templateDir)) this.error(`Scaffold template not found at ${templateDir}`);

    this.log(`\nScaffolding "${slug}" into ${repoDir}`);

    const pkg = loadAuditPackage(clientDir);
    const tokens = loadDesignTokens(clientDir);
    const pages = loadPageRecords(clientDir);

    this.log('  [1/9] Copying scaffold template...');
    copyTemplate(templateDir, repoDir);

    this.log('  [2/9] Importing client-provided fonts and logos...');
    const clientAssets = copyClientAssets(clientDir, repoDir);
    if (clientAssets.fonts.length > 0) {
      const families = [...new Set(clientAssets.fonts.map((f) => f.family))];
      this.log(`         Fonts: ${families.join(', ')} (${clientAssets.fonts.length} face(s))`);
    }
    if (clientAssets.logos.length > 0) {
      const brands = [...new Set(clientAssets.logos.map((l) => l.brand))];
      this.log(`         Logos: ${brands.join(', ')} (${clientAssets.logos.length} file(s))`);
    }
    if (clientAssets.fonts.length === 0 && clientAssets.logos.length === 0) {
      this.log(`         No client assets in ${clientDir}/assets/from client/ — falling back to substitutes.`);
    }

    this.log('  [3/9] Applying design tokens...');
    applyDesignTokens(repoDir, pkg.designSystem, tokens, clientAssets.fonts);

    this.log('  [4/9] Generating navigation...');
    generateNav(repoDir, pkg.siteStructure, pkg.meta.clientName);

    this.log('  [5/9] Seeding page collection...');
    const pagesWritten = seedPages(repoDir, pages, pkg.siteStructure.pages);

    this.log('  [6/9] Seeding testimonials, FAQs, team...');
    const tCount = seedTestimonials(repoDir, pkg.contentInventory);
    const fCount = seedFaqs(repoDir, pkg.contentInventory);
    const mCount = seedTeam(repoDir, pkg.contentInventory);

    this.log('  [7/9] Copying images...');
    const imgCount = copyImages(clientDir, repoDir);

    this.log('  [8/9] Writing CLAUDE.md and product-marketing-context...');
    ensureClaudeMd(repoDir, pkg, buildClientClaudeMd);
    ensureProductMarketingContext(repoDir, pkg, buildProductMarketingContext);

    this.log('  [9/9] Writing CHANGELOG.md...');
    writeChangelog(repoDir, pkg);

    if (flags['supabase-project-ref']) {
      updateClientConfig(slug, { supabase_project_ref: flags['supabase-project-ref'] });
    }

    this.log(`\nScaffolded ${repoDir}`);
    this.log(`  pages: ${pagesWritten}, testimonials: ${tCount}, faqs: ${fCount}, team: ${mCount}, images: ${imgCount}`);
    this.log(`Next: cd ${repoDir} && pnpm install && pnpm build`);
    this.log(`Then: upriver clone ${slug} --page /`);
  }
}
