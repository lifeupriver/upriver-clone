# Upriver Backlog — everything left to build or do

Comprehensive list of pending work as of `2026-04-30`. Pulled from
`HANDOFF.md`, `DRIFT-REPORT.md`, `OPTION-B-MIGRATION.md`,
`PRODUCT-ROADMAP.md`, plus this session's open threads.

> **2026-04-29 autopilot pass.** Items marked ✅ landed in the
> backlog-burndown session — see `HANDOFF.md` for the full summary.

Items are ordered by priority within each section; effort estimates assume
focused work, not calendar time.

Legend:
- 🔴 **P0** — blocks calling the system "complete" or has live-traffic impact
- 🟡 **P1** — high value, unblocked, can ship today
- 🟢 **P2** — operational or strategic, needs a decision or external action
- 🔵 **P3** — nice-to-haves; ship if a related thing is open
- 🌱 **Future** — product directions to consider when the current build stabilizes

---

## 🔴 P0 — Blocking

### 1. Phase 3 worker provisioning

**What.** Inngest Cloud signup, Fly.io worker deploy, GHCR image push, secrets,
Inngest app sync, Vercel env. Six steps in `packages/worker/DEPLOY.md`.

**Why.** Until this is done, the **hosted dashboard's Run buttons all fail**
with 502 from `/api/enqueue` (no `INNGEST_EVENT_KEY` set, no worker to
consume the event). The dashboard is read-only-effectively until provisioned.

**Effort.** 30–60 min of operator dashboard clicking, ~$0–10/mo recurring (Fly
free-tier covers idle; Inngest free covers expected volume).

**Blocker.** Operator has to do it (signups, secrets, billing). Code side is
complete and verified.

**Pointers.** `packages/worker/DEPLOY.md`, `packages/worker/fly.toml`,
`.github/workflows/worker-image.yml`.

---

### 2. Verify `UPRIVER_SUPABASE_SERVICE_KEY` on Vercel

**What.** Confirm the service-role key is set on Vercel Production (and
Development) env. The new `/api/share-tokens` endpoint requires it for
minting; if missing, mint will throw "service-role key required".

**Why.** Token-minting UI shipped this session. Without the key, the UI loads
but minting fails the moment you click the button.

**Effort.** 2 min — `vercel env ls production | grep SUPABASE`. If missing,
`vercel env add UPRIVER_SUPABASE_SERVICE_KEY production`.

**Pointers.** `packages/dashboard/src/lib/share-token.ts:getAdminClient`.

---

## 🟡 P1 — High-value, unblocked code-side

### 3. ~~Hoist pipeline-stage list out of `run all`~~ ✅ already shipped (verified 2026-04-29; `run/all.ts:6` imports `PIPELINE_STAGES` and filters from it)

**What.** `packages/cli/src/commands/run/all.ts` declares the canonical
sequence imperatively. `packages/dashboard/src/components/react/PipelineStages.tsx`
already imports `PIPELINE_STAGES` from `@upriver/core/pipeline`, but
`run/all.ts` does NOT — duplicates the list. Drift target documented as G.7
in `DRIFT-REPORT.md`.

**Why.** Adding/renaming/removing a stage requires editing two files today.
A single source of truth prevents accidental divergence.

**Effort.** ~30 min. The constant exists; just refactor `run/all.ts` to read
from it.

**Pointers.** `packages/core/src/pipeline/stages.ts`,
`packages/cli/src/commands/run/all.ts`.

---

### 4. ~~Roadmap drift C.6 — `--audit-mode` flag rename or alias~~ ✅ `0d057d3` (PRODUCT-ROADMAP.md updated to match shipped `--mode=base|deep|all`)

**What.** Roadmap spec'd `--audit-mode=sales|operator`. Shipped as
`--mode=base|deep|all` on `audit`, plus `--audit-mode=base|deep|all` on
`run all`. Decide and propagate.

**Why.** Sales-facing copy referenced the spec name; operators see the
shipped name. Either rename or update docs/copy.

**Effort.** 30 min if we keep current names + update docs. ~1 hour if we
add `sales|operator` aliases that map to `all|base` semantics.

**Pointers.** `packages/cli/src/commands/audit.ts`,
`packages/cli/src/commands/run/all.ts`, `DRIFT-REPORT.md` § C.6.

---

### 5. Roadmap drift C.7 — `estimatedImpact` schema decision

**What.** Roadmap spec'd `estimatedImpact: { metric, magnitude, rationale }`
(qualitative, business-framed). Shipped as `{ scorePoints, description }`
(quantitative, score-derived). Decide which schema is "right" and migrate.

**Why.** A.4's report hero ("X potential bookings lost / month") synthesizes
its own metrics in `synthesize/impact-metrics.ts` because the shipped
`estimatedImpact` doesn't carry `metric`. Two parallel impact paths exist;
neither references the other.

**Effort.** 2–4 hours. Most cost is in updating every audit pass to emit the
new shape and re-running on existing clients.

**Pointers.** `packages/core/src/types/audit.ts:Finding.estimatedImpact`,
`packages/cli/src/synthesize/impact-metrics.ts`, `DRIFT-REPORT.md` § C.7.

---

### 6. Roadmap drift D.1 — layout-structure diff in clone-fidelity

**What.** Spec'd four-axis fidelity score: pixel + copy + **layout
structure (heading order, CTA count, image count)** + **token adherence
(computed style vs design tokens)**. Shipped pixel + copy only.

**Why.** A more legible "what changed" report for client signoff. The
existing two-axis score is a single overall number; structure + token
adherence are stronger sales artifacts.

**Effort.** 4–8 hours. Layout-structure is straightforward DOM walk +
counts. Token-adherence requires reading design tokens and comparing
against computed styles via Playwright — adjacent to what `web-quality`
already does.

**Pointers.** `packages/cli/src/clone-fidelity/`,
`packages/cli/src/deep-audit/passes/web-quality/`, `DRIFT-REPORT.md` § D.1.

---

### 7. Roadmap drift E.5 — auto re-audit chain

**What.** Spec'd `improve` to auto-run `upriver audit` against the preview
URL and emit `improvement-report.md`. Shipped as
`upriver report compare <before> <after>` — manual two-arg diff.

**Why.** Closes the "show the lift" sales loop. Operator currently has to
run audit twice manually.

**Effort.** 4–6 hours, but **blocked on preview-deploy infrastructure**.
The auto-chain needs a URL to audit; we don't yet deploy the cloned site
anywhere automatically.

**Blocker.** Decide preview-deploy story (see P2 §17).

**Pointers.** `packages/cli/src/commands/improve/`, `DRIFT-REPORT.md` § E.5.

---

### 8. ~~Tooling-pass `--deep` vs `--mode=deep|all` consolidation~~ ✅ `087f5df` (`--mode=base|deep|tooling|all`; `--deep` deprecated alias)

**What.** Two flags on `audit` trigger different pass sets:
- `--mode=deep|all` → C.3–C.5 LLM passes via `DEEP_PASSES` + `runAgent`.
- `--deep` (boolean) → 9 tooling-driven passes (Lighthouse, squirrelscan,
  etc.).

Operator has to know which flag invokes which set.

**Why.** Minor UX friction; small risk an operator runs the wrong set.

**Effort.** 1–2 hours. Pick a single flag (e.g. `--mode=deep|tooling|all`)
and route both pass arrays through it. Plumb through `run all`.

**Pointers.** `packages/cli/src/commands/audit.ts`, `DRIFT-REPORT.md`
addendum.

---

### 9. ~~Update stale audit-command description~~ ✅ `e6ce0fa`

**What.** `audit.ts` header says "Run all 10 audit passes concurrently".
Actual count is 12 base + up to 12 deep (3 LLM + 9 tooling).

**Why.** Doc rot. New operators reading `--help` get a wrong number.

**Effort.** 5 min.

**Pointers.** `packages/cli/src/commands/audit.ts`.

---

### 10. `automigrations` GitHub Actions workflow

**What.** A workflow that runs `pnpm dlx supabase db push --linked` on tag
push, so DB migrations ship with deploys instead of manual `apply_migration`
or `db push` invocations.

**Why.** Phase 4 needed manual migration application this session. Future
schema changes would forget without automation.

**Effort.** 1 hour. Need `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` +
`SUPABASE_DB_PASSWORD` in repo secrets.

**Pointers.** `.github/workflows/`.

---

### 11. Sentry / error tracking on the dashboard

**What.** No production error capture. Astro errors silently 500. Failed
auth flows leave breadcrumbs only in Vercel runtime logs (which expire).

**Why.** This session debugged an auth flow that "just bounced" — Sentry
would have surfaced the actual error path immediately.

**Effort.** 2 hours. Sentry SDK + `@sentry/astro` integration + DSN env var.

**Pointers.** `packages/dashboard/astro.config.mjs`.

---

### 12. ~~Token-expiry sweep cron~~ ✅ `6eb4881` — migration committed; **operator must apply** via `pnpm dlx supabase db push` or `apply_migration`

**What.** Daily Postgres job that deletes `share_tokens` rows where
`expires_at < now() - interval '7 days'` (keep a brief audit window after
expiry).

**Why.** Currently expired tokens accumulate forever. Operationally fine for
small volumes; cleanup keeps the table light and the operator UI focused.

**Effort.** 30 min — single migration with `pg_cron` schedule. Or: a Vercel
Cron Job hitting `/api/cron/sweep-tokens`.

**Pointers.** `supabase/migrations/`, `packages/dashboard/src/pages/api/`.

---

### 13. ~~Audit log of dashboard actions~~ ✅ `b8e87bf` — migration + writer stub committed; writer inert until `DASHBOARD_EVENTS_ENABLED=true` AND migration applied

**What.** Append to a `dashboard_events` table: who minted/revoked which
share token, who triggered which pipeline run, when. Operator-only history
view.

**Why.** Defense + accountability if multiple operators ever join. Currently
no record of "who shared this with that client on what date" beyond
`share_tokens.created_at + created_by`.

**Effort.** 2–4 hours. Migration + writing helpers + a `/clients/<slug>/log`
view.

**Pointers.** `supabase/migrations/`, `packages/dashboard/src/lib/`.

---

### 14. ~~Better error pages~~ ✅ `3c786de` (`/auth/expired`, `/deliverables/expired`, branded `/clients/<slug>` 404)

**What.** First-class pages for:
- `/login` callback failure (currently a plain text 400).
- `/deliverables/<slug>?t=<expired>` — currently 302 to login (confusing
  for clients).
- 404 on unknown slug.
- 503 when bucket misconfigured.

**Why.** Sales-facing surface. A client clicking an expired share link
deserves a clear "this link has expired — ask your contact for a fresh
one" page, not a redirect to operator login.

**Effort.** 2–3 hours. New Astro pages + middleware adjustments.

**Pointers.** `packages/dashboard/src/middleware.ts`,
`packages/dashboard/src/pages/auth/callback.ts`.

---

### 15. ~~`/api/health` endpoint on the dashboard~~ ✅ `b4302ee`

**What.** Return `{ ok: true, dataSource, supabaseReachable, version }`
for uptime monitoring.

**Why.** Trivial monitoring hook. Zero today.

**Effort.** 15 min.

**Pointers.** `packages/dashboard/src/pages/api/`.

---

## 🟢 P2 — Operational / strategic

### 16. Back-migrate existing local clients to bucket

**What.** For each existing slug in operators' local `clients/` dirs that
should be visible on the hosted dashboard:
```bash
upriver sync push <slug>
```

**Why.** Hosted dashboard currently shows zero clients (per the original
handoff). Sales surface is empty.

**Effort.** 5 min per slug. Operator decides which clients are share-able vs
internal-only.

**Decision needed.** Migrate everything? Just current/recent? Per-slug
opt-in?

**Pointers.** `packages/cli/src/commands/sync/push.ts`.

---

### 17. Preview-deploy story for cloned sites

**What.** After `upriver clone` + `finalize`, there's a working Astro site
in `clients/<slug>/site/`. Currently no automated way to host it for client
review. Options:

(a) **Vercel preview deploys** keyed on a token. Most polished;
    needs Vercel team org + auto-link logic.
(b) **Manual `pnpm dev` in operator session.** Current state. Operator
    sends ngrok / localtunnel URL.
(c) **Per-slug Cloudflare Pages / Netlify.** Free, but per-client
    configuration overhead.
(d) **Single staging Astro app on Vercel that serves any slug** by reading
    `bucket:upriver/clients/<slug>/site-build/` at request time. Adds an
    SSR layer; reuses existing Vercel project.

**Why.** Unlocks E.5 (auto re-audit), unlocks "send a preview URL" sales
motion, removes the operator-laptop dependency for showing progress.

**Effort.** Option (d) feels right at ~1 day. Option (a) is more polished
but multi-day with auto-domain logic.

**Decision needed.** Which option.

---

### 18. Multi-operator support (allowlist instead of seed)

**What.** Currently `app_metadata.role === 'operator'` is set out-of-band on
exactly one email (`joshua@joshuabrownphotography.com`). To add another
operator:
1. They sign in once via magic link to create their auth.users row.
2. SQL update sets their role.

A small admin UI at `/admin/operators` would let an existing operator add
allowlisted addresses without touching SQL. Pre-mint operator role at
auth.user creation by checking allowlist on sign-up.

**Why.** Onboard collaborators without DB access.

**Effort.** 2–4 hours. New table `operator_allowlist`, hook into Supabase
Auth's `before-user-created` trigger, build the page.

**Pointers.** `packages/dashboard/src/lib/auth.ts`,
`supabase/migrations/`.

---

### 19. ~~Sales-team facing docs~~ ✅ `7897d9a` (`docs/SALES-PLAYBOOK.md`, `docs/CLIENT-ONBOARDING.md`, `docs/EMAIL-TEMPLATES.md`)

**What.** Beyond the operator-focused `docs/USER-GUIDE.md`, build:

- `docs/SALES-PLAYBOOK.md` — what to pitch, what each deliverable shows,
  how to frame the audit/clone/improvement narrative.
- `docs/CLIENT-ONBOARDING.md` — what to send a new client (intake link,
  what to expect, timelines).
- Email templates for: audit-delivery, intake-request, clone-review,
  launch-handoff.

**Why.** Closes the "sales-team can run this without you" gap. Currently
every engagement requires operator (you) hand-holding.

**Effort.** 1–2 days for the playbook + onboarding doc + 6–10 templates.

---

### 20. Drop dead `UPRIVER_RUN_TOKEN` env vars

**What.** Phase 4.5 retired the env var in code. Vercel still has it set on
Production + Development. Cleanup:
```bash
vercel env rm UPRIVER_RUN_TOKEN production --yes
vercel env rm UPRIVER_RUN_TOKEN development --yes
```

**Why.** Stale config attracts confusion. No security impact (the token is
never read), but the variable will outlive its docs.

**Effort.** 30 seconds.

---

### 21. ~~Resend SMTP wired into Supabase Auth~~ ✅ `113d29e` (documented in `docs/OPS.md`)

**Note.** Done during this session. Document in `OPS.md` so future operators
remember: Auth → SMTP Settings uses `smtp.resend.com:465` with the
`RESEND_API_KEY` as password.

---

## 🔵 P3 — Nice-to-haves

### 22. ~~`/auth/callback` redirect URL parameterization~~ ✅ `c5f88ef` (route deleted; middleware handles `?code=` everywhere)

**What.** `signInWithOtp` hard-codes `/auth/callback` derived from
`Astro.url.origin`. The middleware code-exchange now catches `?code=`
anywhere, so the callback route is mostly redundant. Either:

(a) Remove `/auth/callback` entirely (middleware handles it).
(b) Keep as a "preferred" target but don't rely on it.

**Effort.** 30 min if removing.

---

### 23. GitHub OAuth as an alternative provider

**What.** Add GitHub OAuth alongside magic link. Faster sign-in once
configured.

**Why.** UX polish. Magic links require email round-trip every time the
session expires.

**Effort.** 1 hour for config, 30 min for UI affordance.

**Pointers.** Supabase Dashboard → Auth → Providers → GitHub.

---

### 24. Dashboard `/cost` view

**What.** Surface `upriver cost` output as a dashboard page. Read
`usage_log` rows and project remaining-stages cost per slug.

**Why.** Currently CLI-only. F.4 drift in `DRIFT-REPORT.md` notes the GUI
integration was deferred.

**Effort.** 2–3 hours.

**Pointers.** `packages/cli/src/commands/cost.ts`,
`packages/dashboard/src/pages/clients/[slug]/`.

---

### 25. ~~Worker container — verify `squirrelscan` install path~~ ✅ `9b6a133` (verified on npm at 0.0.38; Dockerfile annotated)

**What.** Dockerfile pins `npm install -g squirrelscan` — verified to be on
npm under that name? If not, swap to the install path documented at
`https://skills.sh/squirrelscan/skills/audit-website`.

**Why.** First Phase 3 deploy will surface this immediately if wrong.
Worth fixing before that to avoid a debug cycle.

**Effort.** 10 min to verify, 30 min to swap if needed.

**Pointers.** `packages/worker/Dockerfile`.

---

### 26. ~~Render `pulled` / `pushed` byte counts in PipelineStages done log~~ ✅ `6570aaa`

**What.** The Inngest `done` payload from `runStage` includes:
```ts
{ status, pulled: { files, bytes }, pushed: { files, bytes }, stdoutTail, stderrTail }
```

We render `stdoutTail` + `stderrTail` already. The pull/push file counts
would help an operator see "scrape downloaded 124 files / pushed 18
back" at a glance.

**Effort.** 20 min.

**Pointers.** `packages/dashboard/src/components/react/PipelineStages.tsx:handleEvent`.

---

### 27. Operator dashboard — recent activity feed

**What.** Top of `/clients` shows the last 10 pipeline runs across all
clients (slug, stage, status, duration, who triggered). Driven by Inngest's
run history.

**Why.** Quick "what's in flight" awareness for multi-client operators.

**Effort.** 3–4 hours. Inngest REST → render. Depends on Phase 3 being live.

---

### 28. Per-slug operator scoping

**What.** Currently any operator sees every slug. For a multi-operator
future, `clients` table with `assigned_operator` foreign key, RLS scopes
reads.

**Why.** Don't need it today (single operator). Useful when more than one
person is using the dashboard.

**Effort.** 1 day.

---

### 29. Improvement-layer auto-chain (post-preview)

**What.** After E.5 / preview-deploy lands, wire `improve` to:
1. Apply improvements to `clients/<slug>/site/`.
2. Trigger preview deploy.
3. Run `audit` against preview URL.
4. Generate `improvement-report.md` showing dimension scores before/after.

**Effort.** 4–6 hours after preview-deploy is solved.

**Blocker.** P2 §17 (preview-deploy story).

---

### 30. Dashboard page transitions / route-loading polish

**What.** First navigation between client pages flashes the layout. Astro's
View Transitions API would smooth this.

**Why.** Pure polish.

**Effort.** 2–3 hours.

---

## 🌱 Future product directions

### 31. Billing / subscription model

If this becomes a SaaS rather than internal tooling:
- Stripe integration for per-engagement or monthly subscription.
- Usage metering (current `usage_log` rows, surfaced as "you used X tokens
  this period").
- Trial flow.

### 32. White-label / partner mode

Allow agencies to use the platform under their brand:
- Per-tenant theme overrides reading from a `tenant_config` table.
- Per-tenant deliverable email templates.
- Per-tenant share-link domain (`reports.acme.com`).

### 33. Real-time collaboration on the brief

Two operators editing `design-brief.md` at once. Yjs or Liveblocks-style
collaborative editing in the dashboard.

### 34. Client-side intake portal

Currently intake is operator-driven (interview → transcript → process).
A client-facing form at `/intake/<token>` would let clients self-serve
the answers we currently extract from a Zoom call.

### 35. Marketplace of "improvement skill packs"

Each improvement skill (SEO, copy, schema, etc.) becomes a discrete unit
operators can enable per engagement. Pricing surface, version history,
quality scores.

---

## How to keep this list current

When you complete an item:
1. Strike it through with a checkmark and a date — *or* delete the entry
   and note it in `HANDOFF.md`'s "what landed" table.
2. Update `BACKLOG.md` if the completion uncovers new work.

When you discover new work mid-session, add it here under the right
priority bucket *as you go* — don't trust the next session to remember.
The cost of a stub entry is near-zero; the cost of forgotten work is
several hours of re-discovery.
