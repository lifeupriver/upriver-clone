/**
 * Validate share-link tokens against the Postgres `share_tokens` table.
 *
 * Phase 4 replaces the per-client `share-token.json` flow with a centralized
 * registry: each row authorizes anonymous read access to one slug's
 * deliverables until `expires_at`. RLS allows anon SELECT (cheap reads
 * straight from the route handler) and blocks anon writes (minting goes
 * through server-side handlers using the service-role key).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const anonKey = process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !anonKey) {
    throw new Error(
      'share-token: UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }
  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

interface ShareTokenRow {
  slug: string;
  token: string;
  expires_at: string | null;
}

/**
 * True iff `(slug, token)` matches a row in `share_tokens` whose `expires_at`
 * is null or in the future. Returns false on any DB error or malformed input
 * — fail closed.
 */
export async function validateShareToken(slug: string, token: string): Promise<boolean> {
  if (!slug || !token) return false;
  if (token.length < 16 || token.length > 256) return false;

  let row: ShareTokenRow | null;
  try {
    const supa = getClient();
    const { data, error } = await supa
      .from('share_tokens')
      .select('slug, token, expires_at')
      .eq('slug', slug)
      .eq('token', token)
      .maybeSingle();
    if (error) return false;
    row = data;
  } catch {
    return false;
  }

  if (!row) return false;
  if (row.expires_at === null) return true;
  const expiry = Date.parse(row.expires_at);
  if (Number.isNaN(expiry)) return false;
  return expiry > Date.now();
}
