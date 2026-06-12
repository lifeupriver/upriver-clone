/**
 * Validate share-link tokens against the Postgres `share_tokens` table.
 *
 * Phase 4 replaces the per-client `share-token.json` flow with a centralized
 * registry: each row authorizes anonymous read access to one slug's
 * deliverables until `expires_at`.
 *
 * Tokens are hashed at rest (sha256 hex — see the
 * 20260612000000_share_tokens_hash_at_rest migration). The plaintext exists
 * exactly once, in `mintShareToken`'s return value; every lookup hashes the
 * presented token first. RLS has no anon policies, so all reads and writes go
 * through the service-role client (which bypasses RLS) from server-side
 * handlers only.
 */
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) {
    throw new Error(
      'share-token: requires UPRIVER_SUPABASE_URL + UPRIVER_SUPABASE_SERVICE_KEY ' +
        '(or UPRIVER_SUPABASE_SERVICE_ROLE_KEY) on the server.',
    );
  }
  cachedAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdminClient;
}

/**
 * sha256 hex of a share token — the only form persisted to Postgres. Must
 * match the in-place migration (`encode(digest(token, 'sha256'), 'hex')`) so
 * tokens minted before hashing keep validating.
 */
export function hashShareToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

interface ShareTokenRow {
  slug: string;
  token: string;
  expires_at: string | null;
}

/**
 * True iff `(slug, sha256(token))` matches a row in `share_tokens` whose
 * `expires_at` is null or in the future. `token` is the plaintext from the
 * share URL. Returns false on any DB error or malformed input — fail closed.
 */
export async function validateShareToken(slug: string, token: string): Promise<boolean> {
  if (!slug || !token) return false;
  if (token.length < 16 || token.length > 256) return false;

  let row: ShareTokenRow | null;
  try {
    const supa = getAdminClient();
    const { data, error } = await supa
      .from('share_tokens')
      .select('slug, token, expires_at')
      .eq('slug', slug)
      .eq('token', hashShareToken(token))
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
  /**
   * From `mintShareToken`: the PLAINTEXT token — the only time it exists
   * outside the recipient's hands, so build/show the share URL immediately.
   * From `listShareTokens`: the sha256 hex stored at rest — comparable
   * against `hashShareToken(plaintext)`, useless for reconstructing a URL.
   */
  token: string;
  createdAt: string;
  expiresAt: string | null;
  label: string | null;
}

/**
 * List every share token for a slug, newest first. Service-role read (RLS has
 * no anon policies). Rows carry the stored token HASH, never plaintext — a
 * listed token cannot be turned back into a working link; that's the point.
 * Returns [] on any error, matching the old fail-quiet behavior.
 */
export async function listShareTokens(slug: string): Promise<ShareTokenRecord[]> {
  try {
    const supa = getAdminClient();
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
  } catch {
    return [];
  }
}

export interface MintShareTokenOptions {
  slug: string;
  expiresInDays?: number | null;
  label?: string | null;
  createdBy?: string | null;
}

/**
 * Mint a fresh share token for `slug`. Uses the service-role key so RLS is
 * bypassed (anon writes are blocked). Persists only `sha256(token)`; the
 * returned record carries the PLAINTEXT token — this is the caller's single
 * chance to build the share URL, it cannot be recovered later.
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
    token: hashShareToken(token),
  };
  if (expiresAt !== null) insertRow['expires_at'] = expiresAt;
  if (opts.label) insertRow['label'] = opts.label;
  if (opts.createdBy) insertRow['created_by'] = opts.createdBy;
  const { data, error } = await supa
    .from('share_tokens')
    .insert(insertRow)
    .select('id, slug, created_at, expires_at, label')
    .single();
  if (error || !data) {
    throw new Error(`mint share token failed: ${error?.message ?? 'no row returned'}`);
  }
  return {
    id: String(data.id),
    slug: String(data.slug),
    token,
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
