/**
 * Storage abstraction for per-client artifacts.
 *
 * Phase 2 of the Option B migration introduces this interface so the dashboard
 * can read client data from either the operator's local filesystem (the
 * historical model) or a Supabase Storage bucket (hosted on Vercel).
 *
 * Paths in this API are always POSIX-style with `/` separators. They identify
 * file locations under `clients/<slug>/`. Implementations are responsible for
 * mapping these to whatever the underlying store needs (filesystem path with
 * platform separators, bucket object key, etc.).
 *
 * All methods are async — even the local-fs implementation — so call sites
 * have a single shape regardless of source.
 */
export interface ClientDataSource {
  /** Identifier for the implementation, e.g. `'local'` or `'supabase'`. */
  readonly kind: string;

  /**
   * List slugs of all clients that have at least a `client-config.yaml` in
   * this data source. Order is not guaranteed.
   */
  listClientSlugs(): Promise<string[]>;

  /** Whether `clients/<slug>/<path>` exists. */
  fileExists(slug: string, path: string): Promise<boolean>;

  /** Read the file as raw bytes; returns `null` if missing. */
  readClientFile(slug: string, path: string): Promise<Uint8Array | null>;

  /** Read the file decoded as UTF-8 text; returns `null` if missing. */
  readClientFileText(slug: string, path: string): Promise<string | null>;

  /**
   * Write bytes or text to `clients/<slug>/<path>`. Implementations create
   * intermediate directories as needed.
   */
  writeClientFile(
    slug: string,
    path: string,
    body: Uint8Array | string,
  ): Promise<void>;

  /**
   * List files (basenames, no path) directly under `clients/<slug>/<dir>`.
   * Non-recursive. Subdirectory entries are excluded. Returns `[]` if the
   * directory doesn't exist.
   */
  listClientFiles(slug: string, dir: string): Promise<string[]>;

  /**
   * Generate a signed URL good for `ttlSeconds` that grants read access to
   * `clients/<slug>/<path>`. Returns `null` if the implementation cannot
   * produce signed URLs (e.g. local-fs).
   */
  signClientFileUrl(
    slug: string,
    path: string,
    ttlSeconds: number,
  ): Promise<string | null>;
}
