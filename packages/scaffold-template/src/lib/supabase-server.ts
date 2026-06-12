import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

// SERVER-ONLY Supabase clients and auth helpers. Imported by API routes,
// middleware, and SSR admin pages — never from client-side <script> code
// (this module reads the service-role key from the environment).

const url = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? '';
const anonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** True when the public URL + anon key are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

// Anon-key client for server-side RPC calls (submit_inquiry,
// subscribe_newsletter). RLS still applies — anon can only write through
// the security-definer RPCs granted in supabase/migrations/001_schema.sql.
export const supabaseAnon: SupabaseClient = createClient(
  url || 'http://localhost',
  anonKey || 'anon',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Service-role client — bypasses RLS. Use for privileged reads/writes in
// SSR admin routes only.
export const supabaseAdmin: SupabaseClient = createClient(
  url || 'http://localhost',
  serviceRoleKey || anonKey || 'anon',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// `secure: import.meta.env.PROD` keeps plain-HTTP local dev working while
// production cookies stay HTTPS-only.
const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
};

/**
 * Build a Supabase Auth server client wired to the request's cookies.
 * Sessions round-trip through `sb-<project-ref>-auth-token` cookies that
 * `@supabase/ssr` writes after sign-in / token refresh — the cookie adapter
 * below makes those writes show up in the response.
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured — set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  const cookieHeader = request.headers.get('cookie') ?? '';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            ...SESSION_COOKIE_OPTIONS,
            ...(options ?? {}),
          });
        }
      },
    },
  });
}

/**
 * Resolve the current authenticated user from cookies. Returns `null` when
 * Supabase isn't configured, no session is present, or the access token is
 * invalid. Always uses `auth.getUser()` (not `getSession()`) — Supabase
 * guidance: `getSession()` trusts cookie contents without re-verifying.
 */
export async function getSessionUser(
  request: Request,
  cookies: AstroCookies,
): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supa = createSupabaseServerClient(request, cookies);
    const { data, error } = await supa.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Parse a `Cookie` request header into the `[{name, value}, ...]` shape
 * `@supabase/ssr` expects from its `getAll` adapter.
 */
function parseCookieHeader(header: string): Array<{ name: string; value: string }> {
  if (header.length === 0) return [];
  const out: Array<{ name: string; value: string }> = [];
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq);
    const value = decodeURIComponent(trimmed.slice(eq + 1));
    out.push({ name, value });
  }
  return out;
}
