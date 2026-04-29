# Option B migration — full Vercel hosting

You picked option B over option A. This doc plans the path from the
current operator-local architecture to a fully-hosted Vercel + Supabase
deployment. It's multi-week work; structured as four phases that each
leave the codebase shippable on its own.

## Current architecture (post-roadmap, pre-migration)

```
Operator laptop:
├── pnpm run dev (dashboard at localhost:4321)
│   ├── /clients/<slug>          ← reads clients/<slug>/ from disk
│   ├── /deliverables/<slug>/*   ← reads clients/<slug>/ from disk
│   └── /api/run/<command>       ← spawns child process: `upriver scrape <slug>`
└── upriver CLI
    ├── reads/writes clients/<slug>/ on local disk
    └── spawns Claude Code, Firecrawl, Lighthouse, etc.

Currently zero hosted infra. Everything is operator-local.
```

## Target architecture

```
Vercel (Upriver team):
├── @astrojs/vercel adapter on the dashboard
├── /clients/<slug>             ← reads from Supabase Storage bucket
├── /deliverables/<slug>/*      ← reads from Supabase Storage bucket
├── /api/enqueue/<command>      ← enqueues a job into the worker
├── Supabase Auth gates /clients/* to operator role
└── Static-rendered deliverables for clients with signed-URL share tokens

Supabase (upriver-platform project, Pro):
├── Storage bucket `upriver`
│   ├── clients/<slug>/          ← all per-client artifacts
│   └── reports/<slug>/          ← static report bundles for sharing
├── Auth (operator + per-slug client view tokens)
└── Postgres (job queue, share-token registry, usage rollup)

Worker (Inngest or equivalent):
├── Pulls jobs from queue
├── Runs CLI commands inside its own ephemeral filesystem
├── Pushes results back to Supabase Storage
└── Updates job status visible to the dashboard via SSE / Realtime
```

## Phases

### Phase 1 — adapter swap + Vercel project creation

**Goal:** dashboard builds with the Vercel adapter; Vercel project
exists and accepts a deploy artifact. The deploy will be functionally
broken (filesystem reads fail in production) but the build pipeline
works end-to-end.

**Slices:**

1. **Add `@astrojs/vercel` dep** to `packages/dashboard`. Pin to a
   version compatible with Astro 4.x.
2. **Swap the adapter** in `astro.config.mjs`:
   `node({ mode: 'standalone' })` → `vercel()`.
3. **Add runtime guards** to filesystem-touching routes. Detect
   `process.env.VERCEL === '1'` and either return a clear 503 with
   "this route requires Phase 2 storage" or render a placeholder.
   Cleaner: feature-flag via `UPRIVER_DATA_SOURCE` env var (default
   `local` — same behavior; `supabase` — Phase 2 path).
4. **Create the Vercel project** via `deploy_to_vercel` MCP, scoped to
   the Upriver team, root directory `packages/dashboard`.
5. **Set env vars** on the Vercel project: `UPRIVER_SUPABASE_URL`,
   `UPRIVER_SUPABASE_PUBLISHABLE_KEY`, `UPRIVER_RUN_TOKEN`,
   `ANTHROPIC_API_KEY`. Skip service-role until Phase 2.
6. **Don't actually deploy yet.** Verify build works in CI / locally
   via `vercel build` first.

**Done when:** `pnpm --filter @upriver/dashboard run build` produces a
Vercel-compatible `.vercel/output/` directory; the Vercel project page
shows "no deployments yet"; rollback path is `git revert` of the
adapter commit.

**Reversibility:** trivial — single commit reverts adapter back to Node.

---

### Phase 2 — storage abstraction

**Goal:** the dashboard can read client data from Supabase Storage when
configured. Operator continues writing to local filesystem; new sync
command uploads to the bucket.

**Slices:**

1. **Define `ClientDataSource` interface** in `packages/core/src/data/`:
   `listClients()`, `readClientFile(slug, path)`,
   `writeClientFile(slug, path, body)`, `signClientFileUrl(slug, path,
   ttl)`. Pure interface, no IO.
2. **Two implementations:**
   - `LocalFsClientDataSource` — current behavior, reads/writes
     `clients/<slug>/`.
   - `SupabaseClientDataSource` — uses `@supabase/supabase-js` against
     bucket `upriver`, prefix `clients/<slug>/`.
3. **Refactor `dashboard/src/lib/fs-reader.ts`** to consume the
   abstraction. Pick implementation based on
   `UPRIVER_DATA_SOURCE` env (local | supabase).
4. **New CLI command `upriver sync push <slug>`** — walks
   `clients/<slug>/` recursively, uploads to `bucket:upriver/clients/<slug>/`.
   Idempotent (skip files already at matching size+mtime).
5. **New CLI command `upriver sync pull <slug>`** — opposite direction;
   downloads from bucket to local. For operators on a different machine
   than where the original CLI runs.
6. **Vercel deploy uses `UPRIVER_DATA_SOURCE=supabase`.** Local dev
   continues to use `local` by default.

**Done when:** `vercel deploy` produces a working dashboard at the
Vercel URL that reads any client whose data has been `upriver sync
push`-ed to the bucket. Operator workflow: run pipeline locally → sync
push → check the hosted dashboard.

**Reversibility:** moderate. Sync commands are additive. The data-source
abstraction is a refactor of `fs-reader.ts` — revertable but touches
~10 files.

---

### Phase 3 — pipeline execution off the dashboard

**Goal:** trigger pipeline stages from the hosted dashboard without
spawning child processes inside Vercel functions.

**Worker platform decision:**

| Option | Pros | Cons |
|---|---|---|
| Inngest | Vercel-native, durable, free tier works, retries built-in | Yet another vendor |
| Trigger.dev | Similar shape, more control | Same |
| GitHub Actions `workflow_dispatch` | Free, you already use it | Slow startup, awkward to wire SSE |
| Vercel Functions w/ Fluid Compute | One vendor, longer timeouts | Still ephemeral disk; pipeline stages can run >5 min |
| Fly.io machine | Long-running container, real disk | Manual provisioning |

**Recommendation: Inngest.** Best fit for the shape (durable jobs,
streamable status, free tier covers expected volume). 1-week setup.

**Slices:**

1. **Define a job per pipeline stage** in
   `packages/worker/src/jobs/{scrape,audit,clone,...}.ts`. Each job
   pulls the slug, fetches the client dir from Supabase, runs the CLI
   command, pushes results back.
2. **Replace `/api/run/<command>`** with `/api/enqueue/<command>` —
   posts a job to Inngest, returns a job-id.
3. **Job-status endpoint** `/api/jobs/<id>` — streams status updates
   via SSE pulling from Inngest's run history.
4. **Update `PipelineStages.tsx`** to enqueue+stream instead of
   spawn+stream. Same UX, different backend.
5. **Worker container needs `claude` CLI, `lighthouse`, `squirrelscan`,
   Playwright browsers.** Build a container image with these baked in.
   Inngest can run it as a serverless step or as a webhook to a
   long-running container.

**Done when:** clicking "Run scrape" on the hosted dashboard produces
the same artifacts the local CLI would, visible in the bucket within
the expected time, with live log streaming.

**Reversibility:** complex. Worker container, secrets, queue state.
Falling back to operator-local works but loses the hosted-trigger
capability.

---

### Phase 4 — auth

**Goal:** operator login gates `/clients/*` and the enqueue endpoints.
Per-slug client view tokens gate `/deliverables/<slug>/*`.

**Slices:**

1. **Supabase Auth set up** with magic-link or OAuth (GitHub probably).
2. **Operator role** stored in Supabase `auth.users.app_metadata.role`.
   Single operator email seeded manually.
3. **Middleware on `/clients/*`** redirects to login when no session.
4. **Middleware on `/api/enqueue/*`** rejects non-operator with 403.
5. **`/deliverables/<slug>/*` validates the share token** against the
   `share_tokens` table in Postgres (slug + token must match + not
   expired). Replaces the current local `share-token.json` flow.
6. **Drop `UPRIVER_RUN_TOKEN`** — Supabase session is the auth model.

**Done when:** the hosted dashboard requires login for operator views;
client share links work without an operator session; expired tokens
return 410.

**Reversibility:** moderate. Auth code is additive; session middleware
can be feature-flagged off.

---

## Estimated effort

| Phase | Estimate | Blocker |
|---|---|---|
| 1 — adapter swap | 1–2 hours | none |
| 2 — storage abstraction | 2–3 days | Supabase service-role key (you must paste from dashboard) |
| 3 — worker for pipeline | 5–7 days | Inngest signup, container image, secrets |
| 4 — auth | 1–2 days | Supabase Auth setup, operator email decision |

Total: ~2 weeks of focused work, reversible at every phase boundary.

## What I'm doing right now

Starting **Phase 1** — adapter swap, runtime guards, Vercel project
creation. Stopping before deploying since deploy without Phase 2 just
produces 503s.

Future sessions: you direct which phase to tackle next. I won't
auto-advance past Phase 1 without your call.

## Open architectural questions you'll need to answer

- **Phase 3 worker platform** — Inngest is my recommendation; happy to
  default unless you want to consider alternatives.
- **Phase 3 container image** — host on which registry? (GitHub
  Container Registry is free; Docker Hub also works.)
- **Phase 4 operator email** — single seed for now, or magic-link with
  allowlist? Recommendation: single seed (you), allowlist comes later.
- **Migration of existing `clients/<slug>/` data** — once Phase 2
  ships, do you want to back-migrate existing local clients to the
  bucket, or leave them as local-only and only new clients go to the
  bucket?
