import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ClientDataSource } from './client-data-source.js';

export interface SupabaseClientDataSourceOptions {
  /** Pre-configured Supabase client. Tests inject a mock here. */
  client: SupabaseClient;
  /** Bucket name. Defaults to `upriver`. */
  bucket?: string;
  /** Prefix under which `<slug>/` directories live. Defaults to `clients`. */
  prefix?: string;
}

/**
 * Supabase Storage-backed implementation of `ClientDataSource`.
 *
 * Object keys follow the pattern `${prefix}/${slug}/${path}` — e.g.
 * `clients/audreys/audit/summary.json`. Slugs are discovered by listing the
 * top-level entries under the prefix and keeping those that contain a
 * `client-config.yaml`.
 */
export class SupabaseClientDataSource implements ClientDataSource {
  readonly kind = 'supabase';
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(opts: SupabaseClientDataSourceOptions) {
    this.client = opts.client;
    this.bucket = opts.bucket ?? 'upriver';
    this.prefix = opts.prefix ?? 'clients';
  }

  private keyFor(slug: string, path: string): string {
    const trimmed = path.replace(/^\/+/, '');
    return `${this.prefix}/${slug}/${trimmed}`;
  }

  private dirFor(slug: string, dir: string): string {
    const trimmed = dir.replace(/^\/+|\/+$/g, '');
    return trimmed
      ? `${this.prefix}/${slug}/${trimmed}`
      : `${this.prefix}/${slug}`;
  }

  async listClientSlugs(): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(this.prefix, { limit: 1000 });
    if (error) throw error;

    const slugs: string[] = [];
    for (const entry of data ?? []) {
      // Storage represents directories as entries with `id === null`.
      if (entry.id !== null) continue;
      const configKey = `${this.prefix}/${entry.name}/client-config.yaml`;
      const { data: file } = await this.client.storage
        .from(this.bucket)
        .list(`${this.prefix}/${entry.name}`, {
          limit: 1,
          search: 'client-config.yaml',
        });
      if (file?.some(f => f.name === 'client-config.yaml')) {
        slugs.push(entry.name);
      } else {
        // Fall back to a HEAD-like check via createSignedUrl when list is
        // restrictive — keeps the slug in the result if the marker exists.
        const probe = await this.client.storage
          .from(this.bucket)
          .createSignedUrl(configKey, 1);
        if (!probe.error) slugs.push(entry.name);
      }
    }
    return slugs;
  }

  async fileExists(slug: string, path: string): Promise<boolean> {
    // Cheapest reliable existence check: try to sign a 1-second URL.
    // Storage returns an error if the object is missing.
    const { error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(this.keyFor(slug, path), 1);
    return !error;
  }

  async readClientFile(slug: string, path: string): Promise<Uint8Array | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(this.keyFor(slug, path));
    if (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
    if (!data) return null;
    const buffer = await data.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async readClientFileText(slug: string, path: string): Promise<string | null> {
    const bytes = await this.readClientFile(slug, path);
    if (!bytes) return null;
    return new TextDecoder('utf-8').decode(bytes);
  }

  async writeClientFile(
    slug: string,
    path: string,
    body: Uint8Array | string,
  ): Promise<void> {
    const payload = typeof body === 'string' ? new TextEncoder().encode(body) : body;
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(this.keyFor(slug, path), payload, {
        upsert: true,
        contentType: guessContentType(path),
      });
    if (error) throw error;
  }

  async listClientFiles(slug: string, dir: string): Promise<string[]> {
    const entries = await this.listClientEntries(slug, dir);
    return entries.filter(e => !e.isDirectory).map(e => e.name);
  }

  /**
   * Storage-specific helper exposing both files and directories at a level.
   * Used by `upriver sync pull` to walk the bucket recursively. Not part of
   * the `ClientDataSource` interface — callers needing this branch on
   * `kind === 'supabase'` (or get it from a `SupabaseClientDataSource` directly).
   */
  async listClientEntries(
    slug: string,
    dir: string,
  ): Promise<Array<{ name: string; isDirectory: boolean }>> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(this.dirFor(slug, dir), { limit: 1000 });
    if (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
    return (data ?? []).map(e => ({ name: e.name, isDirectory: e.id === null }));
  }

  async signClientFileUrl(
    slug: string,
    path: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(this.keyFor(slug, path), ttlSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  }
}

/**
 * Construct a `SupabaseClientDataSource` from process env. Throws if the
 * required vars are missing — callers are expected to gate this on
 * `getDataSource() === 'supabase'`.
 */
export function createSupabaseClientDataSourceFromEnv(): SupabaseClientDataSource {
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const key =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    throw new Error(
      'createSupabaseClientDataSourceFromEnv: UPRIVER_SUPABASE_URL and ' +
        'UPRIVER_SUPABASE_SERVICE_KEY (or UPRIVER_SUPABASE_PUBLISHABLE_KEY) must be set.',
    );
  }
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return new SupabaseClientDataSource({
    client,
    bucket: process.env['UPRIVER_SUPABASE_BUCKET'] ?? 'upriver',
  });
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; statusCode?: string | number };
  if (e.statusCode === 404 || e.statusCode === '404') return true;
  return typeof e.message === 'string' && /not found|object not found/i.test(e.message);
}

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'application/json';
    case 'yaml':
    case 'yml':
      return 'application/yaml';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
