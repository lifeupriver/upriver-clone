import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { create as tarCreate } from 'tar';

import { BaseCommand } from '../base-command.js';
import { makeB2Client, readB2ConfigFromEnv } from '../util/b2.js';

export default class Archive extends BaseCommand {
  static override description =
    'Tar+gzip clients/<slug>/ and upload to Backblaze B2. Optionally purge from Supabase Storage to free that tier. Run after a client engagement is delivered.';

  static override examples = [
    '<%= config.bin %> archive audreys',
    '<%= config.bin %> archive audreys --purge-supabase',
    '<%= config.bin %> archive audreys --include repo',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'include-repo': Flags.boolean({
      description: 'Include the cloned site repo (large). Default excluded.',
      default: false,
    }),
    'include-clone-compare': Flags.boolean({
      description: 'Include clone-compare/ artifacts (large, intermediate). Default excluded.',
      default: false,
    }),
    'purge-supabase': Flags.boolean({
      description:
        "After a successful B2 upload, delete the client's objects from the Supabase Storage bucket. The hosted dashboard will 404 for this slug until you `upriver restore`.",
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Build the tarball locally and print where it would upload; do not call B2 or Supabase.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Archive);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const root = clientDir(slug, base);
    if (!existsSync(root)) this.error(`Client directory not found at ${root}.`);

    const exclude: string[] = [];
    if (!flags['include-repo']) exclude.push('repo');
    if (!flags['include-clone-compare']) exclude.push('clone-compare');

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const tarballName = `${slug}-${ts}.tar.gz`;
    const tarballPath = join(tmpdir(), tarballName);

    this.log(`\narchive ${slug}`);
    this.log(`  source:    ${root}`);
    this.log(`  excludes:  ${exclude.length > 0 ? exclude.join(', ') : '(none)'}`);
    this.log(`  tarball:   ${tarballPath}`);

    await tarCreate(
      {
        gzip: { level: 6 },
        file: tarballPath,
        cwd: root,
        filter: (p) => {
          for (const ex of exclude) {
            if (p === ex || p.startsWith(`${ex}/`) || p.startsWith(`./${ex}/`) || p === `./${ex}`) {
              return false;
            }
          }
          return true;
        },
      },
      ['.'],
    );

    const tarStat = statSync(tarballPath);
    this.log(`  built:     ${(tarStat.size / 1024 / 1024).toFixed(1)} MB`);

    if (flags['dry-run']) {
      this.log('\n(dry-run; tarball kept at the path above; no B2 upload, no Supabase purge)');
      return;
    }

    // Upload to B2.
    const cfg = readB2ConfigFromEnv();
    const b2 = makeB2Client(cfg);
    const objectKey = `clients/${slug}/${tarballName}`;
    this.log(`\n  → uploading to b2://${cfg.bucket}/${objectKey}`);
    await b2.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: objectKey,
        Body: createReadStream(tarballPath),
        ContentType: 'application/gzip',
        ContentLength: tarStat.size,
      }),
    );
    this.log(`  ✓ uploaded`);

    // Record archive manifest locally so future operators can find it.
    const manifestDir = join(root, '.archive');
    mkdirSync(manifestDir, { recursive: true });
    const manifestPath = join(manifestDir, 'manifest.json');
    const manifest = {
      slug,
      archivedAt: new Date().toISOString(),
      bucket: cfg.bucket,
      endpoint: cfg.endpoint,
      objectKey,
      sizeBytes: tarStat.size,
      excluded: exclude,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    this.log(`  manifest:  ${manifestPath}`);

    if (flags['purge-supabase']) {
      this.log(`\n  → purging clients/${slug}/ from Supabase Storage`);
      const purged = await purgeSupabase(slug);
      this.log(`  ✓ purged ${purged} object(s)`);
    } else {
      this.log(`\n  Supabase artifacts left in place. Pass --purge-supabase to remove them.`);
    }

    this.log(`\nDone. Restore with: upriver restore ${slug}`);
  }
}

async function purgeSupabase(slug: string): Promise<number> {
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const key =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  const bucket = process.env['UPRIVER_SUPABASE_BUCKET'] ?? 'upriver';
  if (!url || !key) {
    throw new Error(
      'Supabase env not set (UPRIVER_SUPABASE_URL + UPRIVER_SUPABASE_SERVICE_KEY required for --purge-supabase).',
    );
  }
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const prefix = `clients/${slug}`;
  const all: string[] = [];
  // Recursively list everything under the prefix. supabase-js list() is non-recursive
  // by default so we walk subdirs.
  const walk = async (dir: string): Promise<void> => {
    const { data, error } = await sb.storage.from(bucket).list(dir, { limit: 1000 });
    if (error) throw new Error(`supabase list ${dir}: ${error.message}`);
    for (const entry of data ?? []) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      // Folders have null id in v2 of the API. Empty metadata also implies folder.
      if (entry.id === null || (entry.metadata == null && entry.name && !entry.name.includes('.'))) {
        await walk(path);
      } else {
        all.push(path);
      }
    }
  };
  await walk(prefix);
  if (all.length === 0) return 0;
  // remove() takes up to 1000 paths per call.
  let removed = 0;
  for (let i = 0; i < all.length; i += 900) {
    const chunk = all.slice(i, i + 900);
    const { error } = await sb.storage.from(bucket).remove(chunk);
    if (error) throw new Error(`supabase remove: ${error.message}`);
    removed += chunk.length;
  }
  return removed;
}
