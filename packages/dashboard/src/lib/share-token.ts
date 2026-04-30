/**
 * Validate share-link tokens against the Postgres `share_tokens` table.
 *
 * Phase 4 replaces the per-client `share-token.json` flow with a centralized
 * registry: each row authorizes anonymous read access to one slug's
 * deliverables until `expires_at`. RLS allows anon SELECT (cheap reads
 * straight from the route handler) and blocks anon writes (minting goes
 * through server-side handlers using the service-role key).
 */
import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAnonClient: SupabaseClient | null = null;
let cachedAdminClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedAnonClient) return cachedAnonClient;
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const anonKey = process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !anonKey) {
    throw new Error(
      'share-token: UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }
  cachedAnonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnonClient;
}

function getAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) {
    throw new Error(
      'share-token: minting requires UPRIVER_SUPABASE_URL + UPRIVER_SUPABASE_SERVICE_KEY ' +
        '(or UPRIVER_SUPABASE_SERVICE_ROLE_KEY) on the server.',
    );
  }
  cachedAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdminClient;
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

export interface ShareTokenRecord {
  id: string;
  slug: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  label: string | null;
}

/**
 * List every share token for a slug, newest first. Uses the anon key — the
 * RLS policy permits SELECT, and the operator gate has already authorized
 * the caller upstream.
 */
export async function listShareTokens(slug: string): Promise<ShareTokenRecord[]> {
  const supa = getClient();
  const { data, error } = await supa
    .from('share_tokens')
    .select('id, slug, token, created_at, expires_at, label')
    .eq('slug', slug)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    token: String(r.token),
    createdAt: String(r.created_at),
    expiresAt: r.expires_at ? String(r.expires_at) : null,
    label: r.label ? String(r.label) : null,
  }));
}

export interface MintShareTokenOptions {
  slug: string;
  expiresInDays?: number | null;
  label?: string | null;
  createdBy?: string | null;
}

/**
 * Mint a fresh share token for `slug`. Uses the service-role key so RLS is
 * bypassed (anon writes are blocked). Returns the inserted record so the
 * caller can build a share URL.
 */
export async function mintShareToken(opts: MintShareTokenOptions): Promise<ShareTokenRecord> {
  const token = randomBytes(24).toString('base64url');
  const expiresAt =
    typeof opts.expiresInDays === 'number' && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
  const supa = getAdminClient();
  const insertRow: Record<string, unknown> = {
    slug: opts.slug,
    token,
  };
  if (expiresAt !== null) insertRow['expires_at'] = expiresAt;
  if (opts.label) insertRow['label'] = opts.label;
  if (opts.createdBy) insertRow['created_by'] = opts.createdBy;
  const { data, error } = await supa
    .from('share_tokens')
    .insert(insertRow)
    .select('id, slug, token, created_at, expires_at, label')
    .single();
  if (error || !data) {
    throw new Error(`mint share token failed: ${error?.message ?? 'no row returned'}`);
  }
  return {
    id: String(data.id),
    slug: String(data.slug),
    token: String(data.token),
    createdAt: String(data.created_at),
    expiresAt: data.expires_at ? String(data.expires_at) : null,
    label: data.label ? String(data.label) : null,
  };
}

/**
 * Revoke (delete) a share token by id. Service-role write.
 */
export async function revokeShareToken(id: string): Promise<void> {
  const supa = getAdminClient();
  const { error } = await supa.from('share_tokens').delete().eq('id', id);
  if (error) {
    throw new Error(`revoke share token failed: ${error.message}`);
  }
}
