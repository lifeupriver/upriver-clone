import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import type { AuditPackage } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { buildGeoArtifacts } from '../../improve/geo-generator.js';

/**
 * `upriver improve geo <slug>` — generate deterministic GEO/AEO artifacts
 * from `audit-package.json`: `llms.txt`, `ai.txt`, FAQ + Organization
 * JSON-LD, and per-page TL;DR snippets. No LLM calls; pure data transform.
 *
 * Implements roadmap workstream E.6.
 */
export default class ImproveGeo extends BaseCommand {
  static override description =
    'Generate llms.txt, ai.txt, FAQ + Organization JSON-LD, and per-page TL;DR snippets from audit-package.json (E.6).';

  static override examples = [
    '<%= config.bin %> improve geo acme',
    '<%= config.bin %> improve geo acme --dry-run',
    '<%= config.bin %> improve geo acme --force',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'out-dir': Flags.string({
      description:
        'Override the public assets directory for llms.txt and ai.txt (default: <clientDir>/repo/public).',
    }),
    'dry-run': Flags.boolean({
      description: 'Print what would be written and exit without writing.',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Overwrite existing artifacts.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ImproveGeo);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    const auditPkgPath = join(dir, 'audit-package.json');
    const repoDir = join(dir, 'repo');

    if (!existsSync(dir)) {
      this.error(
        `Client directory not found at ${dir}. Run "upriver init <url> --slug ${slug}" first.`,
      );
    }
    if (!existsSync(auditPkgPath)) {
      this.error(
        `audit-package.json missing at ${auditPkgPath}. Run "upriver audit ${slug}" before improve geo.`,
      );
    }

    const dryRun = flags['dry-run'];
    if (!existsSync(repoDir) && !dryRun) {
      this.error(
        `Cloned repo not found at ${repoDir}. Run "upriver clone ${slug}" first.`,
      );
    }

    const pkg = readAuditPackage(auditPkgPath);
    const artifacts = buildGeoArtifacts(pkg);

    const publicDir = flags['out-dir']
      ? resolve(flags['out-dir'])
      : join(repoDir, 'public');
    const llmsTxtPath = join(publicDir, 'llms.txt');
    const aiTxtPath = join(publicDir, 'ai.txt');
    const geoJsonPath = join(dir, 'geo-artifacts.json');

    this.log(`\nimprove geo "${slug}"`);
    this.log(`  Client dir: ${dir}`);
    this.log(`  Public dir: ${publicDir}`);

    const geoJsonBody = JSON.stringify(
      {
        faqJsonLd: artifacts.faqJsonLd,
        organizationJsonLd: artifacts.organizationJsonLd,
        pageTldrs: artifacts.pageTldrs,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    if (dryRun) {
      this.log('\nDRY RUN — no files written.');
      this.log(`  would write: ${llmsTxtPath} (${byteLen(artifacts.llmsTxt)} bytes)`);
      this.log(`  would write: ${aiTxtPath} (${byteLen(artifacts.aiTxt)} bytes)`);
      this.log(`  would write: ${geoJsonPath} (${byteLen(geoJsonBody)} bytes)`);
      this.log(`  pageTldrs: ${Object.keys(artifacts.pageTldrs).length} entries`);
      this.log(`  faqJsonLd: ${artifacts.faqJsonLd ? 'present' : 'none'}`);
      return;
    }

    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

    this.writeArtifact('llms.txt', llmsTxtPath, artifacts.llmsTxt, { force: flags.force });
    this.writeArtifact('ai.txt', aiTxtPath, artifacts.aiTxt, { force: flags.force });
    this.writeArtifact('geo-artifacts.json', geoJsonPath, geoJsonBody, { force: flags.force });

    this.log('');
    this.log('Next steps to wire JSON-LD into the cloned site:');
    this.log(`  - Open ${join(repoDir, 'src/layouts/BaseLayout.astro')}`);
    this.log(
      '  - Inject the FAQ and Organization JSON-LD as <script type="application/ld+json"> tags',
    );
    this.log(`  - Source: ${geoJsonPath}`);
  }

  /**
   * Write a single artifact, honoring `skipIfExists` so `--force` is required
   * to overwrite. Logs `Wrote <path> (<bytes> bytes).` on success.
   *
   * @param label - Human-readable artifact name for skip messages.
   * @param path - Absolute path to the target file.
   * @param body - File contents to write (UTF-8).
   * @param opts - Write options. `force: true` disables the skip check.
   */
  private writeArtifact(
    label: string,
    path: string,
    body: string,
    opts: { force: boolean },
  ): void {
    if (this.skipIfExists(label, path, { force: opts.force })) return;
    writeFileSync(path, body, 'utf8');
    const size = statSync(path).size;
    this.log(`  Wrote ${path} (${size} bytes).`);
  }
}

/**
 * Read and JSON-parse an `audit-package.json` from disk. Errors clearly
 * if the file is unreadable or malformed.
 */
function readAuditPackage(path: string): AuditPackage {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as AuditPackage;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read audit-package.json at ${path}: ${msg}`);
  }
}

/**
 * Compute the UTF-8 byte length of a string. Used for dry-run reporting so
 * the output matches what would actually land on disk.
 */
function byteLen(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}
