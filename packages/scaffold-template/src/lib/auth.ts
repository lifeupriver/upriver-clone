import { betterAuth } from 'better-auth';

const baseURL =
  import.meta.env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
const secret =
  import.meta.env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me';

// Better Auth — email/password provider. Sessions & users persist in the
// Supabase tables created by supabase/migrations/001_schema.sql
// (auth_users, auth_sessions, auth_accounts, auth_verification_tokens).
//
// The database adapter is attached at runtime by src/lib/auth-adapter.ts so
// this module stays buildable without a DB connection.
export const auth = betterAuth({
  baseURL,
  secret,
  emailAndPassword: {
    enabled: true,
  },
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
