import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, posix } from 'node:path';

import type { ClientDataSource } from './client-data-source.js';

export interface LocalFsClientDataSourceOptions {
  /**
   * Absolute path to the directory containing `<slug>/` subdirectories.
   * Defaults to `${UPRIVER_CLIENTS_DIR ?? cwd}/clients`.
   */
  baseDir?: string;
}

/**
 * Filesystem-backed implementation. Honors `UPRIVER_CLIENTS_DIR` env var so
 * the existing operator workflow keeps working unchanged.
 */
export class LocalFsClientDataSource implements ClientDataSource {
  readonly kind = 'local';
  private readonly baseDir: string;

  constructor(opts: LocalFsClientDataSourceOptions = {}) {
    this.baseDir =
      opts.baseDir ??
      process.env['UPRIVER_CLIENTS_DIR'] ??
      join(process.cwd(), 'clients');
  }

  /** Absolute filesystem path to the configured clients base. */
  getBaseDir(): string {
    return this.baseDir;
  }

  private toFsPath(slug: string, posixPath: string): string {
    // Splitting on `/` keeps the API platform-agnostic while letting
    // `path.join` produce native separators on any OS we support.
    const segments = posixPath.split(posix.sep).filter(Boolean);
    return join(this.baseDir, slug, ...segments);
  }

  async listClientSlugs(): Promise<string[]> {
    if (!existsSync(this.baseDir)) return [];
    const entries = readdirSync(this.baseDir, { withFileTypes: true });
    const slugs: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // A "client" is a slug directory that has a client-config.yaml.
      const config = join(this.baseDir, entry.name, 'client-config.yaml');
      if (existsSync(config)) slugs.push(entry.name);
    }
    return slugs;
  }

  async fileExists(slug: string, path: string): Promise<boolean> {
    return existsSync(this.toFsPath(slug, path));
  }

  async readClientFile(slug: string, path: string): Promise<Uint8Array | null> {
    const fsPath = this.toFsPath(slug, path);
    if (!existsSync(fsPath)) return null;
    return readFileSync(fsPath);
  }

  async readClientFileText(slug: string, path: string): Promise<string | null> {
    const fsPath = this.toFsPath(slug, path);
    if (!existsSync(fsPath)) return null;
    return readFileSync(fsPath, 'utf8');
  }

  async writeClientFile(
    slug: string,
    path: string,
    body: Uint8Array | string,
  ): Promise<void> {
    const fsPath = this.toFsPath(slug, path);
    mkdirSync(dirname(fsPath), { recursive: true });
    writeFileSync(fsPath, body);
  }

  async listClientFiles(slug: string, dir: string): Promise<string[]> {
    const fsDir = this.toFsPath(slug, dir);
    if (!existsSync(fsDir)) return [];
    const entries = readdirSync(fsDir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name);
  }

  async signClientFileUrl(
    _slug: string,
    _path: string,
    _ttlSeconds: number,
  ): Promise<string | null> {
    // Local fs has no concept of signed URLs. Pages that need shareable
    // links should fall back to operator-side flows on local mode.
    return null;
  }

  /**
   * Local-only helper: file size in bytes + mtime ms, used by
   * `upriver sync push` to skip unchanged files. Not part of the
   * `ClientDataSource` interface.
   */
  statClientFile(slug: string, path: string): { size: number; mtimeMs: number } | null {
    const fsPath = this.toFsPath(slug, path);
    if (!existsSync(fsPath)) return null;
    const s = statSync(fsPath);
    return { size: s.size, mtimeMs: s.mtimeMs };
  }
}
