/**
 * Runtime data-source switch for the Option B migration.
 *
 * `local` keeps the operator-laptop behavior: read `clients/<slug>/` from
 * the working directory and shell out to the local `upriver` CLI bin.
 *
 * `supabase` (used on Vercel) reads/writes via the Supabase Storage bucket
 * configured by `UPRIVER_SUPABASE_*` env vars.
 *
 * `assertLocalDataSource()` still exists to gate code paths that haven't
 * been ported off the local filesystem yet — primarily `run-cli.ts`, which
 * spawns the CLI as a child process. Phase 3 replaces that with a
 * worker-platform enqueue.
 */
import {
  LocalFsClientDataSource,
  SupabaseClientDataSource,
  createSupabaseClientDataSourceFromEnv,
  type ClientDataSource,
} from '@upriver/core/data';

export type DataSource = 'local' | 'supabase';

export function getDataSource(): DataSource {
  const raw = process.env['UPRIVER_DATA_SOURCE'];
  if (raw === 'supabase') return 'supabase';
  return 'local';
}

export class DataSourceUnavailableError extends Error {
  readonly code = 'DATA_SOURCE_UNAVAILABLE';
  readonly source: DataSource;
  constructor(source: DataSource, hint: string) {
    super(
      `Data source "${source}" is not implemented yet. ${hint}`,
    );
    this.name = 'DataSourceUnavailableError';
    this.source = source;
  }
}

/**
 * Throw `DataSourceUnavailableError` if the current source isn't `local`.
 * Used by code paths (CLI subprocess spawning) that have no Supabase
 * equivalent yet — Phase 3 will replace those with a worker-platform
 * enqueue.
 */
export function assertLocalDataSource(): void {
  const source = getDataSource();
  if (source !== 'local') {
    throw new DataSourceUnavailableError(
      source,
      'This code path requires the local CLI subprocess. Phase 3 of ' +
        'OPTION-B-MIGRATION.md will replace it with a worker-platform enqueue.',
    );
  }
}

let cached: ClientDataSource | null = null;

/**
 * Resolve and memoize a `ClientDataSource` for the current data source.
 * Cached for the lifetime of the module — both implementations are stateless
 * apart from the underlying client instance.
 */
export function resolveClientDataSource(): ClientDataSource {
  if (cached) return cached;
  const source = getDataSource();
  cached = source === 'supabase'
    ? createSupabaseClientDataSourceFromEnv()
    : new LocalFsClientDataSource();
  return cached;
}

/** Test/dev helper: drop the cached instance so the next resolve re-reads env. */
export function resetClientDataSource(): void {
  cached = null;
}

export { SupabaseClientDataSource, LocalFsClientDataSource };
export type { ClientDataSource };
