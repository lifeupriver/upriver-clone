import {
  LocalFsClientDataSource,
  createSupabaseClientDataSourceFromEnv,
  type ClientDataSource,
} from '@upriver/core/data';

export type DataSource = 'local' | 'supabase';

/**
 * Which data source the CLI uses. Mirrors the dashboard resolver
 * (`packages/dashboard/src/lib/data-source.ts`): env `UPRIVER_DATA_SOURCE`,
 * default `local` for now.
 *
 * Canonical store is Supabase (spec §2, confirmed), but flipping the documented
 * default to `supabase` ships with Build Spec 03's `profile pull`/`push`. The
 * seam exists here so that flip is a one-line change.
 */
export function getDataSource(): DataSource {
  return process.env['UPRIVER_DATA_SOURCE'] === 'supabase' ? 'supabase' : 'local';
}

let cached: ClientDataSource | null = null;

/** Resolve and memoize the `ClientDataSource` for the current env. */
export function resolveClientDataSource(): ClientDataSource {
  if (cached) return cached;
  cached =
    getDataSource() === 'supabase'
      ? createSupabaseClientDataSourceFromEnv()
      : new LocalFsClientDataSource();
  return cached;
}

/** Test/dev helper: drop the cached instance so the next resolve re-reads env. */
export function resetClientDataSource(): void {
  cached = null;
}
