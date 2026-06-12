/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // PUBLIC_ vars are exposed to client-side code by Astro; everything else
  // is server-only.
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
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
    user: import('@supabase/supabase-js').User | null;
  }
}
