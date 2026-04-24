/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly GITHUB_TOKEN: string;
  readonly GITHUB_OWNER: string;
  readonly GITHUB_REPO: string;
  readonly CLIENT_SLUG: string;
  readonly PRODUCTION_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: Record<string, unknown> | null;
    session: Record<string, unknown> | null;
  }
}
