/**
 * Audit log writer for operator-initiated dashboard actions.
 *
 * Backed by the `dashboard_events` table (migration
 * `20260429000003_dashboard_events.sql`). Stays inert until that migration
 * is applied AND `DASHBOARD_EVENTS_ENABLED=true` is set on the server.
 * Until both are true, `record()` is a no-op so callsites can be wired
 * defensively without waiting on the schema rollout.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function isEnabled(): boolean {
  return process.env['DASHBOARD_EVENTS_ENABLED'] === 'true';
}

function getAdminClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) return null;
  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export interface DashboardEvent {
  /** auth.users.id of the operator triggering the action, when known. */
  actorUserId?: string | null;
  /** Verb, e.g. "share_token.mint", "share_token.revoke", "pipeline.enqueue". */
  action: string;
  /** Target client slug, when the action binds to one. */
  slug?: string | null;
  /** Arbitrary structured details. Schema is per-action. */
  payload?: Record<string, unknown>;
}

/**
 * Append a row to `dashboard_events`. Best-effort: never throws to the
 * caller — audit logging must not break user-facing flows. Returns true if
 * the write succeeded, false otherwise (including the inert no-op case).
 */
export async function record(evt: DashboardEvent): Promise<boolean> {
  if (!isEnabled()) return false;
  const client = getAdminClient();
  if (!client) return false;
  try {
    const { error } = await client.from('dashboard_events').insert({
      actor_user_id: evt.actorUserId ?? null,
      action: evt.action,
      slug: evt.slug ?? null,
      payload: evt.payload ?? {},
    });
    if (error) {
      console.warn('[dashboard-events] insert failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      '[dashboard-events] insert threw:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
