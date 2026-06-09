# Build Spec 12: dashboard deployment + client portal go-live

Component: take the dashboard from "runs locally" to "clients reach their own portal online and self-serve the questionnaire and coverage-driven chatbot." Per the capability audit, this is the deployment milestone the system needs before a client touches it directly.
Source of truth: `01-prd.md` §7 (dashboard placement, canonical-Supabase), `08-capability-audit.md` (dashboard deployment gap), `09-website-workflow-playbook.md` (client-facing surfaces). The dashboard is already deployment-aware — this provisions the live services, wires env, and adds the one missing operator flow. It is NOT a rebuild.

## What already exists (verified on main `878cde5`, do NOT rebuild)

- Vercel adapter wired (`astro.config.mjs`, `output: 'server'`, `@astrojs/vercel`; `UPRIVER_ASTRO_ADAPTER=node` for local SSR).
- Supabase auth middleware (`src/middleware.ts`): operator-role gate on `/clients`, `/api/enqueue`, `/api/share-tokens`, `/deliverables`; public login paths; the data-source `local|supabase` switch.
- The coverage-driven chatbot + its trust boundary (token validate, field whitelist, HV-reject, `source:'interview'`, shared Postgres rate limiter) — M6, on main.
- The magic-link share-token mechanism (`validateShareToken`, `interview-share.json` lineage) and the client-facing `deliverables/[slug]/intake-chat` surface.

So this spec does NOT touch auth logic, the chatbot, or the data-source abstraction. It provisions, configures, and adds the operator's portal-creation flow.

## File ownership

OWNS: a new `packages/dashboard/src/pages/clients/[slug]/portal.astro` (operator: create/view a client's portal link) + its `api/portal/[slug].ts` (mint the share token, return the URL), `packages/dashboard/.env.example` (new — documents every required var), `packages/dashboard/README-deploy.md` (new — the go-live runbook), and a `scripts/dashboard-preflight.mjs` (env + connectivity check). MAY READ but not restructure: middleware, auth lib, the chatbot route, data-source. MUST NOT touch: `packages/cli`, `packages/schemas`, `packages/core` (the dashboard consumes them; no API changes needed). The Supabase/Vercel account provisioning itself is OPERATOR action (Joshua's accounts, his money) — the spec emits those as runbook steps, never automates them.

## A. Env contract + preflight (the thing that makes deploy reproducible)

Author `packages/dashboard/.env.example` enumerating every var with a one-line purpose: `UPRIVER_DATA_SOURCE=supabase`, `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_ROLE_KEY` (server-only), `UPRIVER_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` (the chatbot's only LLM key — the dashboard runs on Vercel where the operator's Max CLI is unavailable), `RATE_LIMIT_*` if configurable, and the auth/session vars the middleware reads. Build `scripts/dashboard-preflight.mjs`: checks every required var is set, pings Supabase (can it read/write the bucket?), and confirms the `rate_limit_hit` RPC exists — prints a green/red checklist and exits non-zero on any miss. This is the "is it safe to deploy" gate.

## B. Supabase provisioning runbook (operator steps + the SQL/migrations the code needs)

`README-deploy.md` §Supabase: the ordered operator steps to stand up the canonical store — create the project, the `upriver` storage bucket, the auth setup (email magic-link or the operator-login method the middleware expects), and apply whatever schema the rate limiter + any tables need. Critical: collect the exact `rate_limit_hit` RPC / table DDL from the existing `packages/dashboard/src/lib/rate-limit.ts` Supabase path and include it verbatim as a migration to run — the shared limiter is non-functional without it. Each account-touching step is `[OPERATOR ACTION]`; the SQL is copy-paste. Note the per-client data isolation decision: one project + `clients/<slug>/` prefix (per PRD), with `supabase_project_ref` as the deferred per-client seam.

## C. The portal-creation flow (the one genuinely missing piece)

Today there's no operator UI to turn "engaged client" into "client has a working portal link." Build it:

1. `clients/[slug]/portal.astro` (operator-gated): a page showing the client's portal status — does a share token exist, what URL, when it expires — with a "Create / regenerate portal link" button and a "Copy link" affordance. The link points at the client-facing intake-chat surface for that slug+token.
2. `api/portal/[slug].ts` (operator-gated POST): mint a share token via the existing share-token mechanism (reuse `share-tokens` plumbing — do not invent a second token system), persist it (`interview-share.json` lineage through the data source), return the full client URL. Idempotent: regenerating rotates the token and invalidates the old link (note this to the operator — old link dies).
3. The client URL is the only thing the operator hands over. Sending it is the operator's act (email/text) — the page surfaces a copyable link and a suggested message; it does NOT send anything (per the human-gate rule on client comms).

No new client-facing surface is built — the chatbot/questionnaire pages exist (M6). This is purely the operator's create-and-hand-off control.

## D. Vercel deploy runbook + smoke

`README-deploy.md` §Vercel: connect the repo, set the build (the dashboard's build already chains `@upriver/core`/`schemas`/`worker`), set every env var from §A in the Vercel project, deploy. Then the live smoke (operator-run, documented as a checklist): operator can log in and reach `/clients`; create a portal link for a test slug; open that link in a private window (no operator session) and confirm the chatbot loads, accepts a whitelisted field write to Supabase, rejects an HV/verified write, and the rate limiter trips after the configured burst. This smoke is the deployment's Definition of Done — it proves the canonical-Supabase write path the CLI shares actually works end to end in production.

## Definition of Done

- [ ] `pnpm build` clean; dashboard test suite green (existing + any new portal-route tests)
- [ ] `.env.example` enumerates every required var with purpose; `dashboard-preflight.mjs` passes against a configured env and fails loudly on a missing var or unreachable Supabase (tested with a deliberately-missing var)
- [ ] `README-deploy.md`: Supabase runbook with the verbatim rate-limiter migration SQL; Vercel runbook; the live smoke checklist
- [ ] `portal.astro` + `api/portal/[slug].ts`: operator can mint and view a portal link; regeneration rotates + invalidates; route is operator-gated (a non-operator session gets 401 — tested); reuses the existing share-token mechanism (no second token system — grep-proven)
- [ ] The portal page surfaces a copyable link + suggested message but sends nothing (human-gate on client comms preserved)
- [ ] Unit/route tests: portal token mint round-trips through the data source; operator-gate enforced; client URL shape correct
- [ ] Changelog: what was provisioned vs built; confirm no cli/schemas/core changes; the live smoke is recorded as the operator's go-live gate (run by Joshua against the real Vercel+Supabase, not in CI)

## Open decision for Joshua (surface, don't assume)

Auth method for clients: the middleware today expects a Supabase-auth operator session for `/clients`, and a share-token (no login) for `/deliverables`. Confirm clients reach their portal via the **share-token-only** path (no client account — simplest, matches the magic-link design) rather than being given Supabase logins. The spec assumes share-token-only; if you want client accounts, §C changes materially. Recommended: share-token-only for v1.

## Changelog

- 2026-06-08: spec written. Deployment milestone — provisions the canonical Supabase store + Vercel, adds the operator portal-creation flow. Scoped against the already-deployment-aware dashboard on main `878cde5`.
- 2026-06-09: built on branch `build/12-dashboard-deployment`. Branch base is current `main` (`a0255b9`), which since the spec was written advanced to include the build/10 website-bridge merge (PR #42); build/12 is isolated from it (different files).

  **Built as code (this session, all locally testable):**
  - `packages/dashboard/.env.example` — every var the **code** reads, one-line purpose each. Names derived by grepping `process.env[` across the dashboard + core, **not** the spec prose: the Supabase keys are `UPRIVER_SUPABASE_PUBLISHABLE_KEY` (anon) and `UPRIVER_SUPABASE_SERVICE_KEY` (service-role, with `_SERVICE_ROLE_KEY` as a share-token-only fallback) — the spec's `ANON_KEY`/`SERVICE_ROLE_KEY` would have made preflight a false gate. Also documents that the rate limit is hardcoded (no `RATE_LIMIT_*` env today).
  - `scripts/dashboard-preflight.mjs` — checks every required var, pings the storage bucket read **and** write, confirms the `rate_limit_hit` RPC exists; green/red checklist, exits non-zero on any miss. Resolves `@supabase/supabase-js` from the dashboard package via `createRequire`. **Verified locally:** red on a deliberately-missing var (exit 1) and red on unreachable Supabase (exit 1). The all-green path is the operator's run (needs real Supabase).
  - `packages/dashboard/src/pages/api/portal/[slug].ts` (route + operator-auth wiring) and `_portal-handler.ts` (the testable handler) + `clients/[slug]/portal.astro` (operator UI). `test/route-portal.test.ts` — 7 tests, all green (61 total suite green): operator-gate → 401 (mints nothing), token round-trips through the data source, exact client-URL shape, regeneration rotates + invalidates, only portal-labelled tokens rotate, 400/404 guards.
  - `packages/dashboard/README-deploy.md` — Supabase runbook (with the `rate_limit_counters` migration **verbatim**, byte-identical to source — diff-checked), Vercel runbook, and the operator-run live smoke.

  **Provisioned as runbook only (operator actions — NOT run here; Joshua, real paid accounts):** Supabase project + `upriver` bucket + operator auth + migrations; Vercel connect/env/deploy; the live smoke. The session never created an account, set a real secret, or deployed.

  **Token architecture (the load-bearing decision).** The portal link points at the intake-chat surface, which sits behind **two** pre-existing gates: the middleware `?t=` gate (`validateShareToken`, Postgres `share_tokens`) and the page `?token=` gate (`validateInterviewToken`, `interview-share.json`). A single-token link is impossible (each single reading fails one gate), so the flow reuses **both existing mechanisms with one token value** — `mintShareToken` issues the value, the same value is written to `interview-share.json` through the data source, and the URL carries it as `?t=X&token=X`. **No second/third token system is invented** (grep-proven: portal files mint no tokens of their own; the only randomness source is `share-token.ts`). Regeneration revokes the prior portal `share_tokens` row and overwrites `interview-share.json`, killing the old link on both gates.

  **Deviations / notes for review:**
  - **401 vs 403:** the portal route returns **401** for a non-operator per the DoD's literal wording; the existing `api/share-tokens.ts` uses 403. Divergence is intentional (DoD-driven), not an oversight.
  - **Open decision (surfaced, assumed):** clients reach their portal **share-token-only, no client accounts** — the spec's recommended v1 model. Built exactly that. Confirm before go-live; client accounts would change §C materially.
  - **Follow-up (out of scope):** the intake-chat page's no-JS fallback link (`…/interview?token=`) carries only `?token=`, not `?t=`, so the middleware would gate it for an anonymous client in supabase mode. Pre-existing, MAY-READ-only page concern — noted in README-deploy.md, not fixed here.
  - **Hosted-mode feature (by design, not a bug):** the portal is a `supabase`-mode feature. On a local laptop (`UPRIVER_DATA_SOURCE=local`, no `UPRIVER_SUPABASE_*`) the **page** renders (it swallows the `listShareTokens` throw) but the **Create/Regenerate button** 500s, because `getSessionUser` → `readAuthEnv()` requires the Supabase env and minting needs Postgres regardless. No local-mode guard was added — minting has no local equivalent, and the smoke runs in supabase mode where the env is set. Flagged so it isn't misread as a defect.

  **Boundary confirmation:** no changes to `packages/cli`, `packages/schemas`, `packages/core`; no changes to auth logic, the chatbot route, or the data-source abstraction (all consumed, not modified). The live smoke is the operator's go-live gate, run by Joshua against real Vercel + Supabase, not in CI.
