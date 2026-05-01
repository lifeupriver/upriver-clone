import { existsSync, statSync, readdirSync, unlinkSync, renameSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import sharp from 'sharp';

import { BaseCommand } from '../base-command.js';

const PNG_EXT = new Set(['.png']);
const JPG_EXT = new Set(['.jpg', '.jpeg']);

interface ImageResult {
  path: string;
  beforeBytes: number;
  afterBytes: number;
  outPath: string;
}

export default class CompressImages extends BaseCommand {
  static override description =
    'Recompress PNG/JPG screenshots in clients/<slug>/ to AVIF (or WebP) at lower size. Idempotent — skips files already compressed.';

  static override examples = [
    '<%= config.bin %> compress-images audreys',
    '<%= config.bin %> compress-images audreys --format webp --quality 75',
    '<%= config.bin %> compress-images audreys --replace',
    '<%= config.bin %> compress-images audreys --dry-run',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    format: Flags.string({
      description:
        'Output format. avif is smaller (~70% reduction) but slower to encode; webp is faster and ~50% smaller.',
      options: ['avif', 'webp'],
      default: 'avif',
    }),
    quality: Flags.integer({
      description: 'Encoder quality 1-100. AVIF default 50, WebP default 75.',
    }),
    replace: Flags.boolean({
      description: 'Delete the original PNG/JPG after a successful conversion.',
      default: false,
    }),
    'min-bytes': Flags.integer({
      description: 'Skip files smaller than this many bytes (no point compressing tiny files).',
      default: 50_000,
    }),
    'dry-run': Flags.boolean({
      description: 'Walk and report what would be converted; do not write.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompressImages);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const root = clientDir(slug, base);
    if (!existsSync(root)) this.error(`Client directory not found at ${root}.`);

    const format = (flags.format ?? 'avif') as 'avif' | 'webp';
    const quality = flags.quality ?? (format === 'avif' ? 50 : 75);
    const minBytes = flags['min-bytes'] ?? 50_000;

    const candidates = collectImages(root, root, minBytes);
    if (candidates.length === 0) {
      this.log(`No PNG/JPG files >= ${minBytes} bytes under clients/${slug}/.`);
      return;
    }

    this.log(`\ncompress-images ${slug} → ${format} q${quality} (${candidates.length} candidates)`);
    if (flags['dry-run']) {
      let totalBefore = 0;
      for (const c of candidates) {
        const stat = statSync(c);
        totalBefore += stat.size;
        this.log(`  ~ ${relative(root, c)}  (${(stat.size / 1024).toFixed(1)} KB)`);
      }
      this.log(`\n(dry-run; ${candidates.length} files, ${(totalBefore / 1024 / 1024).toFixed(1)} MB total)`);
      return;
    }

    const results: ImageResult[] = [];
    let skipped = 0;
    let failed = 0;
    for (const path of candidates) {
      const ext = extname(path).toLowerCase();
      const outPath = path.replace(/\.(png|jpg|jpeg)$/i, `.${format}`);
      // Skip if output already exists and is newer than input — already converted.
      if (existsSync(outPath)) {
        const inStat = statSync(path);
        const outStat = statSync(outPath);
        if (outStat.mtimeMs >= inStat.mtimeMs) {
          skipped += 1;
          continue;
        }
      }
      try {
        const before = statSync(path).size;
        await encode(path, outPath, format, quality);
        const after = statSync(outPath).size;
        results.push({ path, outPath, beforeBytes: before, afterBytes: after });
        this.log(
          `  ✓ ${relative(root, path)}  ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB  (-${pct(before, after)}%)`,
        );
        if (flags.replace && PNG_EXT.has(ext) || (flags.replace && JPG_EXT.has(ext))) {
          // Only replace if output is meaningfully smaller (>10% reduction).
          if (after < before * 0.9) {
            unlinkSync(path);
          } else {
            // Output bigger or barely smaller — discard the new file, keep original.
            unlinkSync(outPath);
          }
        }
      } catch (err) {
        failed += 1;
        this.warn(`  ✗ ${relative(root, path)} — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const totalBefore = results.reduce((s, r) => s + r.beforeBytes, 0);
    const totalAfter = results.reduce((s, r) => s + r.afterBytes, 0);
    this.log(
      `\nDone. ${results.length} converted, ${skipped} already-converted skipped, ${failed} failed. ` +
        `Saved ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)} MB ` +
        `(${pct(totalBefore, totalAfter)}% reduction).`,
    );
  }
}

async function encode(
  inPath: string,
  outPath: string,
  format: 'avif' | 'webp',
  quality: number,
): Promise<void> {
  const pipeline = sharp(inPath, { failOn: 'none' });
  if (format === 'avif') {
    await pipeline.avif({ quality, effort: 4 }).toFile(outPath);
  } else {
    await pipeline.webp({ quality, effort: 4 }).toFile(outPath);
  }
}

function pct(before: number, after: number): string {
  if (before === 0) return '0';
  return (((before - after) / before) * 100).toFixed(0);
}

function collectImages(root: string, dir: string, minBytes: number): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules' || entry.name === 'repo' || entry.name === 'clone-compare')
      continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectImages(root, full, minBytes));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (!PNG_EXT.has(ext) && !JPG_EXT.has(ext)) continue;
      const stat = statSync(full);
      if (stat.size < minBytes) continue;
      out.push(full);
    }
  }
  return out;
}

// renameSync is imported but unused after refactor; keep for future --replace mode improvements.
void renameSync;
