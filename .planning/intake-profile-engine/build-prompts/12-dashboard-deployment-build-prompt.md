# Build prompt 12 — dashboard deployment + client portal

Paste into a fresh Claude Code session at the root of `upriver-clone`, clean working copy. `git checkout main && git pull` first. PRECONDITIONS (verify, STOP if any fails): `pnpm build` clean; `packages/dashboard/src/middleware.ts`, `src/lib/auth.ts`, `src/lib/rate-limit.ts`, the chatbot route `src/pages/api/profile/[slug].ts`, and `src/pages/deliverables/[slug]/intake-chat.astro` all exist (this build extends a deployment-aware dashboard, it does not create one). If the dashboard looks unbuilt, STOP and report.

**Auth decision (confirmed by Joshua): share-token-only.** Clients reach their portal via a magic-link share token, NO client Supabase account. Build §C on that basis.

---

You are building one component: the dashboard's go-live deployment support and the operator's client-portal creation flow, per `.planning/intake-profile-engine/specs/12-dashboard-deployment-spec.md`. Read it first and in full — it is your spec and file-ownership boundary. Also read the existing pieces you extend (do not restructure them): the middleware's path gating, the share-token mechanism (`validateShareToken` and the `/api/share-tokens` route), the rate-limiter's Supabase path, and the chatbot route's trust boundary.

This build has TWO kinds of work — keep them separate:
- **CODE you build** (this session): the env contract + preflight script, the portal-creation page + route, the deploy runbook doc, and any route tests. All of this is testable locally without real Supabase/Vercel.
- **OPERATOR ACTIONS you only DOCUMENT** (Joshua runs, against his own paid accounts): creating the Supabase project + bucket + auth, applying migrations, connecting Vercel, setting env vars, the live smoke. The session writes these as a runbook; it NEVER provisions accounts, sets real secrets, or deploys. If you find yourself wanting an API key to test something live, that's the boundary — mock it and document the operator step instead.

Build in order, compile + test after each (per spec §A–D):
1. **§A env + preflight:** author `packages/dashboard/.env.example` (every var, one-line purpose); build `scripts/dashboard-preflight.mjs` (checks all required vars set, pings Supabase bucket read/write, confirms the `rate_limit_hit` RPC exists; green/red checklist, non-zero on any miss). Test it fails loudly with a deliberately-missing var.
2. **§B Supabase runbook:** in `packages/dashboard/README-deploy.md`, write the ordered operator steps, and — critically — extract the exact rate-limiter table/RPC DDL from `src/lib/rate-limit.ts`'s Supabase path and include it verbatim as a migration to run (the shared limiter is non-functional without it; find it, don't guess).
3. **§C portal flow (the only real new feature):** `clients/[slug]/portal.astro` (operator-gated; shows portal status + create/regenerate-link button + copyable link + a suggested hand-off message, sends nothing) and `api/portal/[slug].ts` (operator-gated POST; mints a share token via the EXISTING share-token mechanism — no second token system; persists via the data source; returns the client URL; regeneration rotates + invalidates the old link). Route tests: token round-trips through the data source, operator-gate returns 401 for a non-operator session, client URL shape correct.
4. **§D Vercel runbook + live smoke checklist:** the connect/build/env/deploy steps, then the operator-run smoke (login → create portal link → open in a private window → chatbot loads, accepts a whitelisted write, rejects an HV/verified write, rate-limiter trips). This smoke is the go-live gate, run by Joshua against real services — document it, do not run it.

Hard rules: no changes to `packages/cli`, `packages/schemas`, `packages/core`; no changes to auth logic, the chatbot route, or the data-source abstraction (you consume them); the portal sends no client communication (human-gate); reuse the existing share-token mechanism (grep-prove no second token system).

DoD: the spec's Definition of Done, verbatim. Branch `build/12-dashboard-deployment`, ownership check before finishing, changelog (what was provisioned-as-runbook vs built-as-code; confirm no cli/schemas/core changes). Open a PR, do NOT merge — Cowork reviews, then Joshua runs the operator runbook to actually go live.
