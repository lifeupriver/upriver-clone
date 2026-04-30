/**
 * Supabase Auth helpers for the dashboard. Phase 4 of the Option B migration
 * replaces `UPRIVER_RUN_TOKEN` (shared-secret header) with real per-user
 * sessions backed by Supabase Auth.
 *
 * The operator role is stored in `auth.users.app_metadata.role = 'operator'`.
 * It is set out-of-band (Supabase dashboard or service-role API) on the
 * single seed email; nothing in this codebase mints operator status from a
 * sign-in flow.
 */
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
};

interface AuthEnv {
  url: string;
  anonKey: string;
}

function readAuthEnv(): AuthEnv {
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const anonKey = process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !anonKey) {
    throw new Error(
      'auth: UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_PUBLISHABLE_KEY must be set ' +
        'before any Supabase Auth helper runs.',
    );
  }
  return { url, anonKey };
}

/**
 * Build a Supabase server client wired to the request's cookies. Sessions
 * round-trip through `sb-<project-ref>-auth-token` cookies that
 * `@supabase/ssr` writes after token refresh — the cookie adapter below
 * makes those writes show up in the response.
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
): SupabaseClient {
  const { url, anonKey } = readAuthEnv();
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
 * Resolve the current authenticated user from cookies. Returns `null` when no
 * session is present or the access token is invalid. Always uses
 * `auth.getUser()` (not `getSession()`) — Supabase guidance: `getSession()`
 * trusts cookie contents without re-verifying.
 */
export async function getSessionUser(
  request: Request,
  cookies: AstroCookies,
): Promise<User | null> {
  const supa = createSupabaseServerClient(request, cookies);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * True iff the user's `app_metadata.role` is `operator`. Centralized so the
 * role string lives in one place — the seed step (Supabase dashboard or
 * service-role API) writes the same string.
 */
export function isOperator(user: User | null): boolean {
  const role = user?.app_metadata?.['role'];
  return role === 'operator';
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
