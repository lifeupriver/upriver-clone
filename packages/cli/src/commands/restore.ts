import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { x as tarExtract } from 'tar';

import { BaseCommand } from '../base-command.js';
import { makeB2Client, readB2ConfigFromEnv } from '../util/b2.js';

export default class Restore extends BaseCommand {
  static override description =
    'Restore an archived client from Backblaze B2: download tarball, extract to clients/<slug>/, and (optionally) re-push to Supabase.';

  static override examples = [
    '<%= config.bin %> restore audreys',
    '<%= config.bin %> restore audreys --no-resync',
    '<%= config.bin %> restore audreys --object-key clients/audreys/audreys-2026-04-30T12-00-00.tar.gz',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'object-key': Flags.string({
      description:
        'Specific B2 object key to restore. Defaults to most recent in clients/<slug>/ or to the local .archive/manifest.json if it exists.',
    }),
    'no-resync': Flags.boolean({
      description: "Don't run `upriver sync push` after extracting. Default behaviour DOES re-sync to Supabase so the dashboard works again.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Restore);
    const { slug } = args;

    const cfg = readB2ConfigFromEnv();
    const b2 = makeB2Client(cfg);

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const root = clientDir(slug, base);

    let key = flags['object-key'];
    if (!key) {
      const manifestPath = join(root, '.archive', 'manifest.json');
      if (existsSync(manifestPath)) {
        const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as { objectKey?: string };
        if (m.objectKey) key = m.objectKey;
      }
    }
    if (!key) {
      this.log(`No --object-key given; listing b2://${cfg.bucket}/clients/${slug}/ for newest archive…`);
      const { Contents = [] } = await b2.send(
        new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: `clients/${slug}/` }),
      );
      const tarballs = Contents.filter((o) => o.Key?.endsWith('.tar.gz')).sort(
        (a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
      );
      if (tarballs.length === 0) this.error(`No archives found at b2://${cfg.bucket}/clients/${slug}/.`);
      key = tarballs[0]!.Key!;
    }

    this.log(`\nrestore ${slug}`);
    this.log(`  source:  b2://${cfg.bucket}/${key}`);

    const tarballPath = join(tmpdir(), key.split('/').pop()!);
    const got = await b2.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    if (!got.Body) this.error(`B2 returned empty body for ${key}.`);
    await pipeline(got.Body as Readable, createWriteStream(tarballPath));
    const sz = statSync(tarballPath).size;
    this.log(`  → downloaded ${(sz / 1024 / 1024).toFixed(1)} MB to ${tarballPath}`);

    mkdirSync(root, { recursive: true });
    await tarExtract({ file: tarballPath, cwd: root });
    this.log(`  → extracted to ${root}`);

    if (flags['no-resync']) {
      this.log(`\nDone. (--no-resync set; Supabase still empty for this slug.)`);
      this.log(`Run \`upriver sync push ${slug}\` to repopulate the hosted dashboard.`);
      return;
    }

    this.log(`\n  → re-syncing to Supabase`);
    const { spawn } = await import('node:child_process');
    const binPath = process.argv[1];
    if (!binPath) this.error('Cannot determine bin path from process.argv[1].');
    const code = await new Promise<number>((resolveP) => {
      const ch = spawn(
        process.execPath,
        [binPath, 'sync', 'push', slug, '--exclude', 'repo', '--exclude', 'clone-compare'],
        { stdio: 'inherit', env: { ...process.env } },
      );
      ch.on('exit', (c) => resolveP(typeof c === 'number' ? c : 1));
      ch.on('error', () => resolveP(1));
    });
    if (code !== 0) this.warn(`sync push exited ${code}. Local artifacts are restored; Supabase may be partial.`);
    this.log(`\nDone.`);
  }
}
