import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser-safe Supabase client. Astro only exposes `PUBLIC_`-prefixed env
// vars to client-side code, so this module must never read service-role
// keys — server-only clients live in src/lib/supabase-server.ts.
const url = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

// Public (anon) client — safe for the browser. Writes are only possible
// through the security-definer RPCs granted to `anon` in
// supabase/migrations/001_schema.sql.
export const supabase: SupabaseClient = createClient(url || 'http://localhost', anonKey || 'anon');
