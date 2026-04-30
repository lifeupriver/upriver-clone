import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import type { AuditPackage, SitePage } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { captureUxProfile, type UxProfile } from '../ux-capture/profile.js';

export default class CaptureUx extends BaseCommand {
  static override description =
    'Profile interactive UX (carousels, animations, hover/scroll effects, sticky elements, video/iframe widgets) for every live page. Writes clients/<slug>/ux-profile/<page>.json plus optional flipbook + video.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    page: Flags.string({ description: 'Single page slug (e.g. "home" or "admissions")' }),
    'no-video': Flags.boolean({ description: 'Skip 10s page-recording video.' }),
    'no-flipbook': Flags.boolean({ description: 'Skip the 5-stop scroll flipbook PNG.' }),
    'desktop-only': Flags.boolean({ description: 'Only desktop (1440x900). Default profiles desktop + mobile.' }),
    'hover-limit': Flags.integer({
      description: 'Max number of CTAs to probe for hover-state diffs per page.',
      default: 24,
    }),
    'carousel-watch-ms': Flags.integer({
      description: 'How long to watch each detected carousel for autoplay timing.',
      default: 12_000,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CaptureUx);
    const { slug } = args;
    const dir = clientDir(slug);
    const auditPath = join(dir, 'audit-package.json');
    if (!existsSync(auditPath)) {
      this.error(`audit-package.json not found at ${auditPath}. Run "upriver synthesize ${slug}" first.`);
    }
    const pkg = JSON.parse(readFileSync(auditPath, 'utf8')) as AuditPackage;
    const allPages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);
    const pages = flags.page
      ? allPages.filter((p) => slugify(p) === flags.page || p.slug === flags.page)
      : allPages;
    if (pages.length === 0) {
      this.error(flags.page ? `No page matched "${flags.page}".` : 'No pages in siteStructure.');
    }

    const outDir = resolve(dir, 'ux-profile');
    mkdirSync(outDir, { recursive: true });

    // Resolve playwright from this package's node_modules.
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();

    this.log(`Profiling UX for ${pages.length} page(s) → ${outDir}`);

    const viewports: Array<'desktop' | 'mobile'> = flags['desktop-only']
      ? ['desktop']
      : ['desktop', 'mobile'];

    const summary: Array<{ page: string; viewport: string; carousels: number; animations: number; sticky: number; hoverEffects: number; videos: number }> = [];

    for (const page of pages) {
      const fileSlug = slugify(page);
      this.log(`\n${page.url} → ${fileSlug}`);
      const profiles: Record<string, UxProfile> = {};
      for (const v of viewports) {
        try {
          const profile = await captureUxProfile(browser, {
            url: page.url,
            pageSlug: fileSlug,
            outDir,
            viewport: v,
            recordVideo: !flags['no-video'],
            flipbook: !flags['no-flipbook'],
            carouselWatchMs: flags['carousel-watch-ms'],
            hoverProbeLimit: flags['hover-limit'],
          });
          profiles[v] = profile;
          summary.push({
            page: fileSlug,
            viewport: v,
            carousels: profile.carousels.length,
            animations: profile.animations.length,
            sticky: profile.sticky.length,
            hoverEffects: profile.hoverEffects.length,
            videos: profile.videos.length,
          });
          this.log(
            `  [${v}] carousels=${profile.carousels.length} animations=${profile.animations.length} ` +
              `sticky=${profile.sticky.length} hover=${profile.hoverEffects.length} videos=${profile.videos.length}`,
          );
        } catch (err) {
          this.warn(`  [${v}] failed: ${(err as Error).message}`);
        }
      }
      writeFileSync(
        join(outDir, `${fileSlug}.json`),
        JSON.stringify(profiles, null, 2),
        'utf8',
      );
    }

    writeFileSync(
      join(outDir, 'summary.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), results: summary }, null, 2),
    );

    await browser.close();
    this.log(`\nUX profile complete. ${summary.length} viewport-pages profiled.`);
    this.log(`Open clients/${slug}/ux-profile/<page>.json for the structured dossier,`);
    this.log(`and clients/${slug}/ux-profile/<page>-<viewport>-flipbook.png for the scroll flipbook.`);
  }
}

function slugify(p: SitePage): string {
  if (p.slug === 'home' || p.slug === '/' || p.slug === '') return 'home';
  return p.slug.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}
