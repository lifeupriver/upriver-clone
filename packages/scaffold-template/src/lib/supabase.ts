import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const anonKey = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const serviceRoleKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Public (anon) client — safe for the browser and for the ContactForm insert.
export const supabase: SupabaseClient = createClient(url || 'http://localhost', anonKey || 'anon');

// Server-only client — use for privileged reads/writes in SSR admin routes.
export const supabaseAdmin: SupabaseClient = createClient(
  url || 'http://localhost',
  serviceRoleKey || anonKey || 'anon',
  { auth: { persistSession: false, autoRefreshToken: false } },
);
