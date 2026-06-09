# Dashboard go-live runbook

Taking the dashboard from "runs locally" to "clients reach their own portal
online." This is a **deployment** runbook, not a build doc — the dashboard is
already deployment-aware (Vercel adapter, Supabase auth middleware, the
`local|supabase` data-source switch, the coverage chatbot + its trust boundary).
What's left is to **provision** the live services, **wire** the env, and run the
**go-live smoke** that proves the canonical-Supabase write path works in
production.

## Two kinds of step

- **`[OPERATOR ACTION]`** — Joshua runs it against his own paid accounts
  (Supabase, Vercel, Anthropic). These create projects, set secrets, and deploy.
  Nothing in this repo automates them.
- Everything else is copy-paste SQL or a command you run from a checkout.

Order matters: **Supabase first** (it's the canonical store and the auth
provider), **then Vercel** (it points at Supabase), **then the smoke**.

## Prerequisites

- A Supabase account and the `supabase` CLI (`pnpm dlx supabase --version`), OR
  the Supabase MCP `apply_migration` / `execute_sql` tools.
- A Vercel account with this repo connected (or the `vercel` CLI).
- An Anthropic API key (the chatbot's only LLM credential on Vercel — the
  operator's Max-plan CLI auth is unavailable in a serverless runtime).
- The env contract: see [`.env.example`](./.env.example). Every var, with the
  name the **code** actually reads.

---

## §Supabase — provision the canonical store

### 1. `[OPERATOR ACTION]` Create the project

Create a new Supabase project (any region close to your clients). Note the
**Project URL** and, from Settings → API, the **publishable (anon)** key and the
**service-role** key. These become `UPRIVER_SUPABASE_URL`,
`UPRIVER_SUPABASE_PUBLISHABLE_KEY`, and `UPRIVER_SUPABASE_SERVICE_KEY`.

### 2. `[OPERATOR ACTION]` Create the storage bucket

Create a **private** Storage bucket named **`upriver`** (Storage → New bucket;
leave "Public" off). This is the per-client artifact store; the data source
reads/writes `clients/<slug>/…` object keys inside it.

> **Data isolation (per PRD §7):** one project, one bucket, with each client
> namespaced by a `clients/<slug>/` object-key prefix — *not* a project per
> client. The per-client `supabase_project_ref` seam is deliberately deferred;
> when a client needs a hard data boundary, that ref is where you'd point them at
> their own project without touching the data-source contract. For v1, the slug
> prefix is the isolation boundary.

If you name the bucket something other than `upriver`, set
`UPRIVER_SUPABASE_BUCKET` to match (preflight and the data source both honor it).

### 3. `[OPERATOR ACTION]` Auth — operator login

The middleware gates operator surfaces (`/clients`, `/api/enqueue`,
`/api/share-tokens`, `/deliverables` index) on a Supabase Auth session whose
`app_metadata.role === 'operator'`. Clients do **not** get accounts — they reach
their portal by share-token link only (see §C of the spec; the recommended v1
model). So you only ever provision the **operator**:

1. Authentication → Providers → enable **Email** (magic-link / OTP is fine; it's
   what the login page uses).
2. Authentication → URL Configuration → add your Vercel production URL (and any
   preview URL you log in from) to **Redirect URLs**, including
   `…/auth/callback`. (The middleware has a fallback that exchanges the PKCE
   `?code=` wherever it lands, but the explicit allowlist avoids surprises.)
3. Create the operator user (Authentication → Users → Add user, your email).
4. Set the role. Either in the dashboard (Users → your user → edit
   `app_metadata`) or via the service-role API:

   ```sql
   -- run in the SQL editor; replaces app_metadata.role for the seed operator
   update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || '{"role":"operator"}'::jsonb
     where email = 'you@example.com';
   ```

   Nothing in this codebase mints operator status from a sign-in — it's set
   here, out of band, once.

### 4. Apply the migrations

All schema lives in [`supabase/migrations/`](../../supabase/migrations/) at the
repo root. Apply **all** of them, in filename order:

```bash
# from the repo root, against the new project
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push
```

…or apply each via the Supabase MCP `apply_migration` tool. The set:

| Migration | What it creates | Needed for |
| --- | --- | --- |
| `20260429000001_phase4_share_tokens.sql` | `share_tokens` table + anon-read RLS | share links **and the client portal** (§C) |
| `20260430024759_token_expiry_sweep.sql` | pg_cron daily expiry sweep | housekeeping (optional but recommended) |
| `20260430024807_dashboard_events.sql` | `dashboard_events` audit table | operator audit log (gated by `DASHBOARD_EVENTS_ENABLED`) |
| `20260605000000_rate_limit_counters.sql` | `rate_limit_counters` + `rate_limit_hit` RPC | **the shared chatbot rate limiter** |

> **Critical — the rate limiter is non-functional without its table + RPC.**
> Until `rate_limit_hit` exists, `SupabaseRateLimiter` silently degrades to a
> *per-instance* in-memory counter (its fail-safe fallback in
> `src/lib/rate-limit.ts`), so on a fanned-out Vercel deploy a client can
> multiply their effective budget by the instance count. The preflight
> (`scripts/dashboard-preflight.mjs`) checks the RPC exists for exactly this
> reason. If `db push` ever skips it, apply it verbatim:

```sql
-- supabase/migrations/20260605000000_rate_limit_counters.sql  (verbatim)
-- Distributed fixed-window rate-limit counters for the coverage chatbot's
-- profile write endpoint (POST /api/profile/<slug>).
--
-- The endpoint previously rate-limited per token in process memory, which only
-- protects the single Vercel instance serving a given request. Across a fanned-
-- out deployment that multiplies the effective budget by the instance count.
-- This table plus the rate_limit_hit() RPC make the window coherent: each
-- (token, window) bucket is one row, incremented atomically, shared by every
-- instance.
--
-- Nothing here is durable state — rows are disposable counters. The next write
-- to a bucket (or rate_limit_sweep()) reclaims expired ones. Writes come
-- exclusively from the dashboard's server-side handlers using the service-role
-- key, via rpc('rate_limit_hit', ...).
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool. Until applied, the limiter degrades to per-instance in-memory counting
-- (SupabaseRateLimiter's fail-safe fallback), so shipping the code ahead of the
-- migration does not break the endpoint.

create table if not exists public.rate_limit_counters (
  bucket_key    text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null,
  expires_at    timestamptz not null
);

-- Sweep support: find expired buckets cheaply.
create index if not exists rate_limit_counters_expires_idx
  on public.rate_limit_counters (expires_at);

-- Atomic increment-and-read for one (key, window) bucket. Inserts the row on
-- the first hit and increments it on subsequent hits, returning the
-- post-increment count so the caller can compare against its max. SECURITY
-- DEFINER so a future least-privilege key can call it without direct table
-- grants; the service-role key already bypasses RLS.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_window_start timestamptz,
  p_ttl_seconds integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.rate_limit_counters as c (bucket_key, count, window_start, expires_at)
  values (p_bucket, 1, p_window_start, now() + make_interval(secs => p_ttl_seconds))
  on conflict (bucket_key) do update
    set count = c.count + 1
  returning c.count into new_count;
  return new_count;
end;
$$;

-- Opportunistic GC of expired buckets. Safe to call from a scheduled job
-- (pg_cron / Edge Function); returns how many rows it reclaimed.
create or replace function public.rate_limit_sweep() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.rate_limit_counters where expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- RLS on, with no anon/auth policies: only the service-role key (which bypasses
-- RLS) and the SECURITY DEFINER functions above touch this table. Clients never
-- read or write rate-limit state directly.
alter table public.rate_limit_counters enable row level security;
```

> `token_expiry_sweep` and `rate_limit_counters` both use **pg_cron** /
> SECURITY DEFINER; on Supabase these apply cleanly via `db push`. If your
> project has pg_cron disabled, the expiry sweep is optional — skip that one
> migration; the rest are independent.

### 5. Verify before moving on

Fill in `packages/dashboard/.env` (copy from `.env.example`) with the URL +
keys, then run the preflight from the repo root:

```bash
node scripts/dashboard-preflight.mjs
```

It must print **PASS** — every required var set, the `upriver` bucket readable
**and** writable, and `rate_limit_hit` present. A red line here is a deploy
blocker; fix it before §Vercel.

---

## §Vercel — connect, configure, deploy

Vercel hosts the dashboard. The adapter is already wired
(`astro.config.mjs` → `@astrojs/vercel`, `output: 'server'`), so most of this is
project setup + env.

### 1. `[OPERATOR ACTION]` Import the repo

Vercel → Add New… → Project → import this Git repo. Then in the project's
**Settings → Build & Deployment**:

- **Root Directory:** `packages/dashboard`
- **Framework Preset:** Astro (auto-detected)
- **Install Command:** `pnpm install` (run at the workspace root; Vercel detects
  the pnpm workspace)
- **Build Command:** `pnpm build` — the dashboard's build script already chains
  the workspace deps it needs (`@upriver/core`, `@upriver/schemas`,
  `@upriver/worker`) before `astro build`.
- **Output:** leave default — the Vercel adapter emits `.vercel/output`.

### 2. `[OPERATOR ACTION]` Set every env var

Settings → Environment Variables. Add the **REQUIRED** block from
[`.env.example`](./.env.example) verbatim (names as the code reads them), plus
any optional ones you want:

| Var | Value | Sensitive? |
| --- | --- | --- |
| `UPRIVER_DATA_SOURCE` | `supabase` | no |
| `UPRIVER_SUPABASE_URL` | your project URL | no |
| `UPRIVER_SUPABASE_PUBLISHABLE_KEY` | anon key | no (browser-safe) |
| `UPRIVER_SUPABASE_SERVICE_KEY` | service-role key | **yes — secret** |
| `ANTHROPIC_API_KEY` | Anthropic key | **yes — secret** |
| `UPRIVER_SUPABASE_BUCKET` | `upriver` (omit to default) | no |

Set them for **Production** (and Preview if you smoke-test there). Do **not**
prefix the service key or Anthropic key as public.

### 3. `[OPERATOR ACTION]` Close the auth loop

Back in Supabase (§Supabase step 3), add the Vercel **production URL** (and any
preview URL you log in from) to Authentication → URL Configuration → Redirect
URLs, including `…/auth/callback`. Without this the operator magic-link login
can't complete.

### 4. `[OPERATOR ACTION]` Deploy + verify

Trigger a deploy (push to the production branch, or Deploy in the dashboard).
Once it's live, run the preflight one more time with the production values (fill
`packages/dashboard/.env` locally, or run it in a shell that has the prod env):

```bash
node scripts/dashboard-preflight.mjs   # must print PASS
```

A green preflight + a clean build means the plumbing is right. The **smoke
below** is what actually proves it end-to-end.

---

## §Live smoke — the go-live gate `[OPERATOR ACTION]`

Run by Joshua against the **real Vercel + Supabase**, by hand. This is the
deployment's Definition of Done — it proves the canonical-Supabase write path
(the same one the CLI shares) works in production. **Not run in CI.**

> **Pick the test slug carefully.** The "whitelisted write" step posts to
> `/api/profile/<slug>`, which **404s if the slug has no `profile.json`** and
> only *accepts* a write when there's an open chatbot-fillable gap. So the smoke
> slug must be a client that's **already been through intake** — it has a
> `profile.json` with gaps in the bucket (e.g. a fully-synced client like
> `littlefriends`), **not** a bare slug that only has `client-config.yaml` (e.g.
> a fresh `e2e-deploy`). A bare slug will load the chat and then 404 the write,
> which looks like a failure but is just a missing fixture. If unsure, run intake
> for the slug first, or `upriver sync pull` to confirm `profile.json` is present.

- [ ] **Operator login.** Visit the production URL, sign in with the magic link,
      land on `/clients`. (A redirect back to `/login` means the auth env or the
      Supabase redirect allowlist is wrong.)
- [ ] **Create the portal link.** Go to `/clients/<test-slug>/portal`, click
      **Create portal link**, and **Copy link**. The status pill flips to
      "Portal link is live".
- [ ] **Open as the client.** Paste the link into a **private/incognito window**
      (no operator session). The intake **chatbot loads** — not a login redirect,
      not the expired-link page. (This exercises both gates: the `?t=`
      share-token through the middleware and the `?token=` interview token on the
      page.)
- [ ] **Whitelisted write accepted.** Answer a chatbot-fillable question (a brand
      voice / people field). You see **"Saved: <path>"**, and the value lands in
      Supabase as `source: 'interview'` (never `verified`).
- [ ] **HV / verified write rejected.** Steer the bot toward a
      human-verify-required field (credentials, money) or a `verified` segment.
      It **refuses** — "Couldn't save … human-verify-required / not
      client-writable". The trust boundary holds for an anonymous client.
- [ ] **Rate limiter trips.** Send writes rapidly past the burst (the limit is
      20 writes / 60s per token). The endpoint returns **429** ("rate limit
      exceeded"). A 429 here — not after a fresh window per instance — confirms
      the **shared** `rate_limit_hit` counter is live across Vercel instances.
- [ ] **Regeneration kills the old link.** Back on the operator portal page,
      click **Regenerate link**. Reload the client's private-window tab: the old
      link is now **dead** (expired/blocked on both gates). The new link works.

If every box is checked, the dashboard is live and a client can be handed their
link. If any fails, it is a go-live blocker — fix it before sending a real client
a link.

### Known follow-up (out of scope here)

The intake-chat page's built-in no-JS fallback link
(`/deliverables/<slug>/interview?token=…`) carries only `?token=`, not `?t=`, so
in supabase mode the middleware would gate it for an anonymous client. The portal
flow links the JS chat surface (which the smoke covers); the static fallback is a
pre-existing page concern outside this spec's ownership — note it for a future
pass.
