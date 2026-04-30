import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { createSupabaseClientDataSourceFromEnv } from '@upriver/core/data';

import { BaseCommand } from '../../base-command.js';

/**
 * Phase 2.5 — pull `clients/<slug>/` artifacts from the Supabase Storage
 * bucket down to the local filesystem. Inverse of `upriver sync push`.
 *
 * Useful when the operator's local checkout has gone stale because the
 * pipeline was last run from another machine, or when picking up someone
 * else's client engagement.
 */
export default class SyncPull extends BaseCommand {
  static override description =
    'Download clients/<slug>/ artifacts from the Supabase Storage bucket to the local filesystem.';

  static override examples = [
    '<%= config.bin %> sync pull audreys',
    '<%= config.bin %> sync pull audreys --dry-run',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'dry-run': Flags.boolean({
      description: 'Walk the bucket and report what would be downloaded; do not write.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SyncPull);
    const { slug } = args;

    const ds = createSupabaseClientDataSourceFromEnv();
    const remoteFiles: string[] = [];
    await collectRemoteFiles(ds, slug, '', remoteFiles);

    if (remoteFiles.length === 0) {
      this.error(
        `No files found at bucket prefix clients/${slug}/. Either the slug is wrong or the operator hasn't pushed yet.`,
      );
    }

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = clientDir(slug, base);

    this.log(`\nsync pull bucket clients/${slug}/ → ${dir}`);
    this.log(`  ${remoteFiles.length} file(s)`);

    if (flags['dry-run']) {
      for (const f of remoteFiles) {
        this.log(`  ~ ${f}`);
      }
      this.log('\n(dry-run; no files written)');
      return;
    }

    let downloaded = 0;
    let bytes = 0;
    for (const rel of remoteFiles) {
      const data = await ds.readClientFile(slug, rel);
      if (!data) {
        this.warn(`Skipping ${rel}: bucket returned null.`);
        continue;
      }
      const target = join(dir, rel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
      downloaded += 1;
      bytes += data.byteLength;
      this.log(`  ↓ ${rel}  (${(data.byteLength / 1024).toFixed(1)} KB)`);
    }

    this.log(`\nDownloaded ${downloaded} file(s), ${(bytes / 1024).toFixed(1)} KB total.`);
  }
}

/**
 * Recursively walk the bucket under `clients/<slug>/<dir>` and append POSIX
 * relative file paths to `out`. Uses `SupabaseClientDataSource.listClient
 * Entries` so directory entries are returned alongside files.
 */
async function collectRemoteFiles(
  ds: ReturnType<typeof createSupabaseClientDataSourceFromEnv>,
  slug: string,
  dir: string,
  out: string[],
): Promise<void> {
  const entries = await ds.listClientEntries(slug, dir);
  for (const entry of entries) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      await collectRemoteFiles(ds, slug, rel, out);
    } else {
      out.push(rel);
    }
  }
}
