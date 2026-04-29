/**
 * Runtime data-source switch for Phase 1 of the Option B migration.
 *
 * `local` (default) keeps the operator-laptop behavior: the dashboard reads
 * `clients/<slug>/` from the working directory and shells out to the local
 * `upriver` CLI bin.
 *
 * `supabase` is the Phase 2 path. Until that lands, every filesystem-touching
 * code path calls `assertLocalDataSource()` which throws
 * `DataSourceUnavailableError`. The Astro middleware translates that error
 * into a 503 with a clear placeholder so a Vercel deploy doesn't surface
 * confusing ENOENT stack traces.
 */
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

export function assertLocalDataSource(): void {
  const source = getDataSource();
  if (source !== 'local') {
    throw new DataSourceUnavailableError(
      source,
      'Phase 2 of OPTION-B-MIGRATION.md will implement the Supabase data source. ' +
        'Until then, set UPRIVER_DATA_SOURCE=local (or unset).',
    );
  }
}
