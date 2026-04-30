import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import {
  buildPrototype,
  servicesLabelFor,
  type DesignTokens,
} from '../prototype/builder.js';

export default class PrototypeApp extends BaseCommand {
  static override description =
    'F04 — generate an Expo React Native prototype for the client. The output is a complete project ready to run via `cd clients/<slug>/app-prototype && npm install && npx expo start`.';

  static override examples = [
    '<%= config.bin %> prototype-app littlefriends',
    '<%= config.bin %> prototype-app audreys --screens=home,services,contact,about',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    screens: Flags.string({
      description: 'Comma-separated screen list (informational; the template ships with 4 fixed tabs).',
    }),
    'brand-spec': Flags.string({
      description: 'Optional path to a JSON file containing a custom { primary, accent, ... } colour spec.',
    }),
    publish: Flags.boolean({
      description: 'Run `expo publish` and write qr-code.png. Requires EXPO_TOKEN. Not yet wired in this build.',
      default: false,
    }),
    force: Flags.boolean({ description: 'Overwrite an existing prototype directory.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PrototypeApp);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const outputDir = join(dir, 'app-prototype');
    if (existsSync(outputDir) && !flags.force) {
      this.error(`Prototype already exists at ${outputDir}. Pass --force to regenerate.`);
    }

    const config = readClientConfig(slug);
    const audit = loadAuditPackage(dir);
    const designTokens = loadDesignTokens(dir, flags['brand-spec']);
    const authenticImageUrls = loadAuthenticImages(dir);
    const fallbackImageUrls = loadAllScrapedImages(dir);

    const templateDir = resolveTemplateDir();
    if (!existsSync(templateDir)) {
      this.error(`Prototype template not found at ${templateDir}. Re-run \`pnpm install\`.`);
    }

    const t0 = Date.now();
    this.log(`\nGenerating Expo prototype for "${slug}"...`);

    const result = buildPrototype({
      slug,
      clientName: config.name ?? slug,
      ...(config.vertical !== undefined ? { vertical: config.vertical } : { vertical: undefined }),
      audit,
      designTokens,
      authenticImageUrls,
      fallbackImageUrls,
      heroOverride: null,
      servicesLabel: servicesLabelFor(config.vertical),
      templateDir,
      outputDir,
    });

    writeFileSync(join(outputDir, 'PREVIEW.md'), renderPreviewMd(slug, config.name ?? slug, result.themeColors), 'utf8');

    if (flags.publish) {
      this.warn('--publish is not yet wired in this build. Run `cd clients/<slug>/app-prototype && npx expo start` and use the QR code Expo prints in the terminal.');
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${result.filesWritten.length} files to ${outputDir}/`);
    this.log(`Brand colors: primary ${result.themeColors.primary}, accent ${result.themeColors.accent}.`);
    if (result.content.heroImage) this.log(`Hero image: ${result.content.heroImage}`);
    this.log(`Services: ${result.content.services.length}, team: ${result.content.team.length}, gallery: ${result.content.galleryImages.length}.`);
    this.log('');
    this.log(`Prototype complete in ${elapsed}s.`);
    this.log(`Next: cd ${outputDir} && npm install && npx expo start`);
  }
}

function resolveTemplateDir(): string {
  // ESM-friendly module location → package's dist directory at runtime.
  // The template lives at packages/app-prototype-template/template/, which is
  // four levels up from packages/cli/dist/commands/prototype-app.js.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', '..', 'app-prototype-template', 'template');
}

function loadAuditPackage(dir: string): AuditPackage | null {
  const p = join(dir, 'audit-package.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as AuditPackage;
}

function loadDesignTokens(dir: string, brandSpec: string | undefined): DesignTokens | null {
  if (brandSpec) {
    if (!existsSync(brandSpec)) throw new Error(`--brand-spec path not found: ${brandSpec}`);
    return JSON.parse(readFileSync(brandSpec, 'utf8')) as DesignTokens;
  }
  const p = join(dir, 'design-tokens.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as DesignTokens;
}

function loadAuthenticImages(dir: string): string[] {
  const p = join(dir, 'audit', 'media-inventory.json');
  if (!existsSync(p)) return [];
  try {
    const inv = JSON.parse(readFileSync(p, 'utf8')) as {
      sampled: Array<{ url: string; classification: string; quality_score: number }>;
    };
    return inv.sampled
      .filter((r) => r.classification === 'authentic' || (r.classification === 'unknown' && r.quality_score >= 50))
      .map((r) => r.url);
  } catch {
    return [];
  }
}

function loadAllScrapedImages(dir: string): string[] {
  const pagesDir = join(dir, 'pages');
  if (!existsSync(pagesDir)) return [];
  const set = new Set<string>();
  for (const f of readdirSync(pagesDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const page = JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as { images?: string[] };
      for (const u of page.images ?? []) set.add(u);
    } catch {
      // skip
    }
  }
  return [...set];
}

function renderPreviewMd(slug: string, brandName: string, colors: { primary: string; accent: string }): string {
  return `# ${brandName} — mobile prototype

This is an Expo React Native prototype generated by \`upriver prototype-app ${slug}\`.

## Run it

\`\`\`bash
cd clients/${slug}/app-prototype
npm install
npx expo start
\`\`\`

Expo prints a QR code in the terminal. Open the Expo Go app on an iPhone and point the camera at the QR code; the prototype loads in seconds.

## Brand colours used

- primary: \`${colors.primary}\`
- accent: \`${colors.accent}\`

## What is in here

- 4 tabs: Home, About, ${slug}, Contact
- Home pulls hero image and gallery images from authentic photography flagged by F01 media audit (with a graceful fallback to all scraped images when F01 has not run)
- Contact uses native iOS APIs: tap Phone to dial, tap Email to compose, tap Address to open Apple Maps
- Theme colours pulled from the rebuilt site's design tokens
- Content (about, services, team, contact info) pulled from the audit package

## To regenerate

Re-running \`upriver prototype-app ${slug} --force\` overwrites every file. Hand-edits are safe to make in this directory but will be lost on regenerate; treat this as a sales artefact, not a long-lived codebase.

## To publish to Expo for client preview

The roadmap calls for an \`--publish\` flag that runs \`expo publish\` and renders a stable QR code. That path is not yet wired (it requires an EXPO_TOKEN and an Expo account). For now, the QR code Expo prints in the terminal during \`npx expo start\` is sufficient for any iPhone on the same network. To share a stable link with the client, run \`eas update\` with your own Expo account.
`;
}
