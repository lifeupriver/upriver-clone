/**
 * Cron-eligibility loading for the F06 monitor / F07 followup schedules.
 *
 * Two sources, merged:
 *   1. The `client_admins` table (migration 20260612000003), queried via
 *      PostgREST with the worker's service key — same env contract as
 *      `createSupabaseClientDataSourceFromEnv` (`UPRIVER_SUPABASE_URL` +
 *      `UPRIVER_SUPABASE_SERVICE_KEY`; the legacy `..._SERVICE_ROLE_KEY`
 *      alias is normalized at boot by serve.ts). The worker has no supabase-js
 *      client of its own (core's data source wraps storage only), so this
 *      talks to `/rest/v1/` directly with native fetch.
 *   2. The `MONITOR_SLUGS` / `FOLLOWUP_SLUGS` env lists — kept as a
 *      bootstrap/override path for machines provisioned before the migration
 *      and for one-off forcing. Env slugs carry no notify_email.
 *
 * A missing table (migration not applied yet) is not an error: warn once per
 * process, return [], and let the env lists drive.
 */

export interface EligibleClient {
  slug: string;
  /** Recipient for the report email; passed to the CLI as `--to`. */
  notifyEmail: string | null;
}

/** Parse a comma-separated env slug list ("a, b,c" → [a,b,c]). */
export function parseSlugList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * UNION env-list slugs with `client_admins` rows. Table rows win on
 * notify_email; env slugs absent from the table ride along with no
 * recipient (the CLI falls back to its own env default or prints).
 */
export function mergeEligible(envSlugs: string[], rows: EligibleClient[]): EligibleClient[] {
  const bySlug = new Map<string, EligibleClient>();
  for (const slug of envSlugs) {
    bySlug.set(slug, { slug, notifyEmail: null });
  }
  for (const row of rows) {
    const existing = bySlug.get(row.slug);
    bySlug.set(row.slug, { slug: row.slug, notifyEmail: row.notifyEmail ?? existing?.notifyEmail ?? null });
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Does this PostgREST error response mean "the table does not exist"?
 * PGRST205 = missing from the schema cache (PostgREST ≥ v12 returns 404);
 * 42P01 = undefined_table from Postgres on older proxies. A bare 404 on
 * /rest/v1/<table> is also treated as missing — the safe interpretation for
 * a schedule (skip + warn) rather than a hard failure.
 */
export function isTableMissingResponse(status: number, bodyText: string): boolean {
  if (/PGRST205|42P01|Could not find the table|does not exist/i.test(bodyText)) return true;
  return status === 404;
}

const warnedOnce = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

/** Test hook: reset the warn-once latch. */
export function resetEligibilityWarnings(): void {
  warnedOnce.clear();
}

/** How long before "now" an engagement must have ended for followup. */
export const FOLLOWUP_AFTER_DAYS = 180;

/**
 * Query `client_admins` for slugs eligible for a schedule.
 *
 * - monitor:  monitor_enabled AND NOT admin_paused
 * - followup: followup_enabled AND NOT admin_paused AND engagement_ended_at
 *             at least {@link FOLLOWUP_AFTER_DAYS} days ago (the `lte` filter
 *             excludes NULL engagement_ended_at rows by SQL semantics)
 *
 * Returns [] (with a one-time warning) when supabase env is unset or the
 * table is missing. Other failures throw so the Inngest step retries.
 */
export async function fetchClientAdminRows(opts: {
  schedule: 'monitor' | 'followup';
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: Date;
}): Promise<EligibleClient[]> {
  const env = opts.env ?? process.env;
  const url = env['UPRIVER_SUPABASE_URL'];
  const key =
    env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'] ??
    env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    warnOnce(
      'env-missing',
      '[schedules] UPRIVER_SUPABASE_URL / UPRIVER_SUPABASE_SERVICE_KEY not set — cron eligibility uses the MONITOR_SLUGS/FOLLOWUP_SLUGS env lists only',
    );
    return [];
  }

  const params = new URLSearchParams();
  params.set('select', 'slug,notify_email');
  params.set('admin_paused', 'is.false');
  if (opts.schedule === 'monitor') {
    params.set('monitor_enabled', 'is.true');
  } else {
    params.set('followup_enabled', 'is.true');
    const cutoff = new Date(
      (opts.now ?? new Date()).getTime() - FOLLOWUP_AFTER_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    params.set('engagement_ended_at', `lte.${cutoff}`);
  }

  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`${url.replace(/\/+$/, '')}/rest/v1/client_admins?${params.toString()}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (isTableMissingResponse(res.status, body)) {
      warnOnce(
        'table-missing',
        '[schedules] client_admins table not found — apply supabase/migrations/20260612000003_client_admins.sql; cron eligibility uses the env slug lists only until then',
      );
      return [];
    }
    throw new Error(`client_admins query failed (${res.status}): ${body.slice(0, 240)}`);
  }

  const rows = (await res.json()) as Array<{ slug?: unknown; notify_email?: unknown }>;
  return rows
    .filter((r): r is { slug: string; notify_email?: unknown } => typeof r.slug === 'string' && r.slug.length > 0)
    .map((r) => ({
      slug: r.slug,
      notifyEmail: typeof r.notify_email === 'string' && r.notify_email.length > 0 ? r.notify_email : null,
    }));
}
