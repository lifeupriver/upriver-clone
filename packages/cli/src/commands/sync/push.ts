import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { createSupabaseClientDataSourceFromEnv } from '@upriver/core/data';

import { BaseCommand } from '../../base-command.js';

/**
 * Phase 2.4 — push local `clients/<slug>/` artifacts to the Supabase Storage
 * bucket. The hosted dashboard reads from the bucket when
 * `UPRIVER_DATA_SOURCE=supabase` is set on its deployment.
 *
 * Skip patterns are intentionally short. Anything large or regeneratable
 * (`repo/`, `screenshots/raw/`) is the operator's call via `--exclude`.
 */
const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.git']);
const DEFAULT_SKIP_FILES = new Set(['.DS_Store']);

export default class SyncPush extends BaseCommand {
  static override description =
    'Upload clients/<slug>/ artifacts to the Supabase Storage bucket so the hosted dashboard can read them.';

  static override examples = [
    '<%= config.bin %> sync push audreys',
    '<%= config.bin %> sync push audreys --exclude repo --exclude screenshots/raw',
    '<%= config.bin %> sync push audreys --dry-run',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    exclude: Flags.string({
      description:
        'POSIX-style relative path to skip (repeatable). e.g. --exclude repo --exclude screenshots/raw',
      multiple: true,
      default: [],
    }),
    'dry-run': Flags.boolean({
      description: 'Walk and report what would be uploaded; do not write.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SyncPush);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = clientDir(slug, base);
    if (!existsSync(dir)) {
      this.error(`Client directory not found at ${dir}.`);
    }

    const exclude = new Set(flags.exclude.map(e => e.replace(/^\/+|\/+$/g, '')));
    const files = collectFiles(dir, dir, exclude);

    if (files.length === 0) {
      this.log(`No files to upload for "${slug}" (after exclusions).`);
      return;
    }

    this.log(`\nsync push ${slug} → bucket clients/${slug}/`);
    this.log(`  ${files.length} file(s)${exclude.size > 0 ? `, excluding: ${[...exclude].join(', ')}` : ''}`);

    if (flags['dry-run']) {
      for (const f of files) {
        const stat = statSync(join(dir, f));
        this.log(`  ~ ${f}  (${(stat.size / 1024).toFixed(1)} KB)`);
      }
      this.log('\n(dry-run; no uploads performed)');
      return;
    }

    const ds = createSupabaseClientDataSourceFromEnv();
    let uploaded = 0;
    let bytes = 0;
    for (const rel of files) {
      const body = readFileSync(join(dir, rel));
      try {
        await ds.writeClientFile(slug, rel, body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.error(`Failed uploading ${rel}: ${msg}`);
      }
      uploaded += 1;
      bytes += body.byteLength;
      this.log(`  + ${rel}  (${(body.byteLength / 1024).toFixed(1)} KB)`);
    }

    this.log(`\nUploaded ${uploaded} file(s), ${(bytes / 1024).toFixed(1)} KB total.`);
  }
}

/**
 * Walk `dir` recursively and collect POSIX-relative file paths under `root`,
 * skipping default + caller-supplied directories.
 */
function collectFiles(root: string, current: string, exclude: Set<string>): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const abs = join(current, entry.name);
    const rel = relative(root, abs).split(/[\\/]/).join(posix.sep);

    if (entry.isDirectory()) {
      if (DEFAULT_SKIP_DIRS.has(entry.name)) continue;
      if (exclude.has(rel)) continue;
      out.push(...collectFiles(root, abs, exclude));
      continue;
    }

    if (!entry.isFile()) continue;
    if (DEFAULT_SKIP_FILES.has(entry.name)) continue;
    if (exclude.has(rel)) continue;
    out.push(rel);
  }
  return out;
}
