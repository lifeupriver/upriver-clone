# Handoff — phases 3 and 4 code complete; operator provisioning is next

This session shipped **Phase 3 + Phase 4 of OPTION-B-MIGRATION.md
end-to-end in code**, plus two small follow-ups (`flagsToArgs` extraction,
stdoutTail rendering). 31 commits ahead of `origin/main`, working tree
clean, typecheck green, 72/72 CLI tests passing.

## What landed

### Phase 3 — pipeline execution off the dashboard

| Slice | Commit | What it does |
|---|---|---|
| 3.1 | `2dd9e18` | Scaffolded `@upriver/worker` — Inngest client, event schema, generic `runStage` |
| 3.2 | `8ac919b` | Dashboard `/api/enqueue/[command]` — sends `upriver/stage.run`, returns `{ jobId }` |
| 3.3 | `be5265d` | Dashboard `/api/jobs/[id]` — SSE polling Inngest run-status REST API at 1Hz |
| 3.4 | `e2270f6` | `PipelineStages.tsx` branches on `dataSource` prop |
| 3.5a | `ca96d91` | Worker hosts the Inngest serve handler (express + inngest/express) |
| 3.5b | `703fff6` | Multi-stage Dockerfile w/ playwright + claude/lighthouse/squirrelscan |
| 3.5c | `18677af` | `packages/worker/fly.toml` + `DEPLOY.md` |
| 3.5d | `69a38d3` | `.github/workflows/worker-image.yml` → GHCR |
| 3.5e | `5138a8e` | Real `runStage`: validate → pull → spawn → push |

### Phase 4 — Supabase Auth + share tokens

| Slice | Commit | What it does |
|---|---|---|
| 4.1 | `e9b96f2` | `supabase/migrations/…_phase4_share_tokens.sql` (committed, NOT applied) |
| 4.2 | `941b1a8` | `lib/auth.ts` + `/login` + `/auth/callback` + `/auth/signout` (magic link) |
| 4.3 | `4952233` | Middleware gates `/clients` + `/api/enqueue` on operator session |
| 4.4 | `c2d85c2` | `/deliverables/<slug>/*` validates `?t=<share-token>` against the table |
| 4.5 | `684ed34` | Drop `UPRIVER_RUN_TOKEN` everywhere |

### Follow-ups

| | Commit | What |
|---|---|---|
| | `5b134e8` | Hoisted `flagsToArgs` to `@upriver/core/util` (one source of truth for dashboard + worker) |
| | `975b2d3` | Render `stdoutTail`/`stderrTail` from Inngest `done` payload in `PipelineStages` |

## Architecture decisions locked

- **Worker platform:** Inngest Cloud
- **Registry:** GHCR (`ghcr.io/lifeupriver/upriver-worker`)
- **Back-migration:** new clients only
- **Serve handler:** option (1a) — hosted in worker container on Fly.io
- **Auth:** Supabase magic link (no GitHub OAuth)
- **Operator allowlist:** single seed (`joshua@joshuabrownphotography.com`)
- **Share tokens:** Postgres `share_tokens` table

## Current architecture

```
Vercel dashboard (upriver-platform):
  middleware
    ├─ /clients/* + /api/enqueue/*  → Supabase Auth gate (operator role)
    └─ /deliverables/<slug>/*       → operator OR ?t=<token> in share_tokens
  /login + /auth/callback + /auth/signout    (magic-link flow)
  /api/enqueue/<cmd>  → inngest.send → { jobId }
  /api/jobs/<id>      → SSE polling Inngest run-status

  ─────────────────────────────────── (Inngest Cloud) ───────

Fly.io worker (long-running container):
  /api/inngest        ← inngest/express serve handler
                        ↓ runs inside the container:
                          1. validate
                          2. pull   (Supabase Storage → /tmp)
                          3. spawn  (node /app/packages/cli/bin/run.js …)
                          4. push   (changed files → Supabase Storage)
  /healthz

Supabase project (qavbpfmhgvkhrnbqalrp):
  Storage bucket `upriver` (private)
  Postgres
    share_tokens(slug, token, expires_at, …)
  Auth (magic-link, app_metadata.role='operator' on seed)
```

## Operator provisioning checklist

The code is complete. None of it is testable end-to-end without these.

### Phase 3 prerequisites (unchanged from prior handoff)

1. **Inngest Cloud** — sign up at <https://app.inngest.com>, create env
   `production`, copy `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`.
2. **Fly.io worker** — `fly launch --no-deploy --config packages/worker/fly.toml --copy-config`,
   then `fly secrets set INNGEST_EVENT_KEY=… INNGEST_SIGNING_KEY=… INNGEST_SERVE_HOST=https://upriver-worker.fly.dev ANTHROPIC_API_KEY=… FIRECRAWL_API_KEY=… UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co UPRIVER_SUPABASE_SERVICE_ROLE_KEY=… --app upriver-worker`.
3. **First image push** — push to `main` or run the `worker-image` workflow manually.
4. **First Fly deploy** — `fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest --config packages/worker/fly.toml`.
5. **Sync Inngest** — Apps → Sync new app → `https://upriver-worker.fly.dev/api/inngest`.
6. **Vercel env (sender side)** — `vercel env add INNGEST_EVENT_KEY production` + `INNGEST_EVENT_KEY development` + `INNGEST_SIGNING_KEY production`.

### Phase 4 prerequisites (new)

1. **Apply the share_tokens migration to prod.** Either:
   ```bash
   pnpm dlx supabase db push --linked
   ```
   or via the Supabase MCP `apply_migration` tool with explicit prod authorization.
   The migration is at `supabase/migrations/20260429000001_phase4_share_tokens.sql`.

2. **Configure Supabase Auth.** In the Supabase dashboard:
   - Auth → URL Configuration → Site URL = `https://upriver-platform.vercel.app`
   - Auth → URL Configuration → Redirect URLs → add `https://upriver-platform.vercel.app/auth/callback`
   - Auth → Email Templates: default magic-link template works; customize copy if desired.
   - Auth → Providers → keep only Email (magic link); leave password disabled.

3. **Seed the operator.** In SQL Editor:
   ```sql
   -- After joshua@joshuabrownphotography.com signs in once via /login, mint
   -- the operator role.
   update auth.users
     set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'), '{role}', '"operator"')
     where email = 'joshua@joshuabrownphotography.com';
   ```
   Or use the Auth admin API. The user must exist first (one magic-link sign-in creates them).

4. **Mint a share token** for any slug whose deliverables you want to share:
   ```sql
   insert into public.share_tokens (slug, token, expires_at, label)
     values ('audreys', encode(gen_random_bytes(24), 'base64'), now() + interval '90 days', 'launch review');
   select slug, token from public.share_tokens where slug = 'audreys' order by created_at desc limit 1;
   ```
   Share URL: `https://upriver-platform.vercel.app/deliverables/audreys?t=<token>`.

5. **Drop UPRIVER_RUN_TOKEN from Vercel env** (no longer read; safe to remove):
   ```bash
   vercel env rm UPRIVER_RUN_TOKEN production --yes
   vercel env rm UPRIVER_RUN_TOKEN development --yes
   ```

## Verification once provisioned

```bash
curl https://upriver-worker.fly.dev/healthz       # → ok
curl https://upriver-worker.fly.dev/api/inngest   # → JSON manifest

# Hitting the dashboard without a session redirects to /login.
curl -sS -I https://upriver-platform.vercel.app/clients | head -1
# → HTTP/2 302 ; location: /login?next=%2Fclients

# Share-link probe (replace TOKEN with one minted above):
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://upriver-platform.vercel.app/deliverables/audreys?t=TOKEN"
# → 200 (with token), 302 to /login (without)
```

After login as the seed email and click any pipeline-stage Run button:

```
[start] upriver scrape <slug>
[enqueued] jobId=01HXX...
[status] Queued
[status] Running
[status] Completed
--- stdout (tail) ---
…
[done] Scrape completed.
```

## Known gaps / known unknowns

- **Token minting UI**: no operator dashboard for minting/revoking share
  tokens yet; current path is direct SQL or service-role API. Easy
  follow-up; not on the original Phase 4 spec.
- **`auth.callback` path is fixed**: hard-coded `/auth/callback` in the OTP
  redirect. If we ever serve the dashboard from a non-root path, plumb
  through `Astro.url.origin`.
- **Share-token expiry policy**: schema supports `expires_at` (nullable);
  no global default. Operator is responsible for setting expiry per row.
- **`squirrelscan` install**: pinned to `npm install -g squirrelscan` in the
  Dockerfile — verify availability at deploy time.
- **Phase 5 (auth UX polish)** not in original migration plan but obvious
  follow-up: header bar with sign-out link in DashboardLayout; "you are
  signed in as foo@" indicator; first-time user message when role isn't
  yet `operator`.

## Repo state

- Branch: `main`, **31 commits ahead of `origin/main`**.
- Working tree: clean.
- Typecheck: 0 errors across all packages.
- Tests: cli 72/72 (re-verified this session), core not re-run.
- Production: `https://upriver-platform.vercel.app/clients` still 200
  *because* `UPRIVER_DATA_SOURCE=supabase` is set but
  `UPRIVER_SUPABASE_PUBLISHABLE_KEY` is not (auth gate currently bypasses
  on bad config — verify once Phase 4 prereqs are applied).

## Next step

Operator runs the Phase 3 + Phase 4 provisioning checklists. Code-side
work that doesn't depend on operator infra:

- Token-minting UI in the operator dashboard.
- Sign-out / current-user header in `DashboardLayout`.
- `auth.callback` redirect URL parameterization.
- `automigrations` workflow that runs `supabase db push` on tag push (so
  schema changes ship with deploys instead of manual `db push`).

If the operator wants the next session to push through any of these, all
are clean independent slices.
