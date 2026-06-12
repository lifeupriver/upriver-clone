// Suppression-list lookup (Spec 19 §8). The list lives in Supabase only
// (prospect PII never sits in the repo); reads use the service-role key.
// Callers FAIL CLOSED: a lookup error refuses the send rather than risking
// mail to someone who opted out.

export type SuppressionLookup = (email: string) => Promise<boolean>;

/**
 * Real lookup against `outreach_suppression`. Throws when Supabase env is
 * missing or the query fails — `pitch approve` treats any throw as a refusal.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) {
    throw new Error(
      'suppression check requires UPRIVER_SUPABASE_URL + UPRIVER_SUPABASE_SERVICE_KEY — refusing to send without it',
    );
  }
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('outreach_suppression')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1);
  if (error) {
    throw new Error(`suppression lookup failed (${error.message}) — refusing to send`);
  }
  return (data?.length ?? 0) > 0;
}
