import {
  LocalFsClientDataSource,
  createSupabaseClientDataSourceFromEnv,
  type ClientDataSource,
} from '@upriver/core/data';

export type DataSource = 'local' | 'supabase';

/**
 * Which data source the CLI uses. Mirrors the dashboard resolver
 * (`packages/dashboard/src/lib/data-source.ts`): env `UPRIVER_DATA_SOURCE`.
 *
 * Canonical store is Supabase (spec 01 §2, confirmed). Build Spec 03 flipped the
 * default to `supabase`; set `UPRIVER_DATA_SOURCE=local` to use the local
 * filesystem (offline operator work, fixtures, the littlefriends acceptance).
 */
export function getDataSource(): DataSource {
  return process.env['UPRIVER_DATA_SOURCE'] === 'local' ? 'local' : 'supabase';
}

let cached: ClientDataSource | null = null;

/**
 * Resolve and memoize the `ClientDataSource` for the current env. When supabase
 * (the default) is selected but its credentials are absent, fail with a clear
 * message naming the env vars and the local escape hatch — this is the single
 * choke point, so every command (`generate`, `profile *`, `import`) inherits it.
 */
export function resolveClientDataSource(): ClientDataSource {
  if (cached) return cached;
  if (getDataSource() === 'local') {
    cached = new LocalFsClientDataSource();
    return cached;
  }
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const key =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ?? process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    throw new Error(
      'Supabase is the default data source but its environment is not configured.\n' +
        'Set UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_SERVICE_KEY (or UPRIVER_SUPABASE_PUBLISHABLE_KEY),\n' +
        'or set UPRIVER_DATA_SOURCE=local to use the local filesystem.',
    );
  }
  cached = createSupabaseClientDataSourceFromEnv();
  return cached;
}

/**
 * Resolve the data source, routing the missing-config error to `fail` (e.g.
 * oclif's `this.error`) for a clean exit instead of an uncaught throw. Keeps this
 * module free of any oclif dependency while giving every command one clean path.
 */
export function resolveClientDataSourceOrFail(
  fail: (message: string) => never,
): ClientDataSource {
  try {
    return resolveClientDataSource();
  } catch (err) {
    fail((err as Error).message);
  }
}

/** Test/dev helper: drop the cached instance so the next resolve re-reads env. */
export function resetClientDataSource(): void {
  cached = null;
}
