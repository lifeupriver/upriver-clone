# Upriver — Architecture

System map for engineers working on the codebase. For *using* the product see [`USER-GUIDE.md`](USER-GUIDE.md); for build history and direction see `.planning/roadmap/`.

---

## The big picture

Upriver is a pnpm workspace with a four-layer architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│  Surfaces                                                        │
│  @upriver/cli (oclif, ~65 commands)   @upriver/dashboard (Astro) │
│                  @upriver/worker (Inngest)                       │
├─────────────────────────────────────────────────────────────────┤
│  Domain                                                          │
│  @upriver/audit-passes (15 dimensions)   @upriver/schemas (Zod   │
│                                          Client Profile contract)│
├─────────────────────────────────────────────────────────────────┤
│  Foundation                                                      │
│  @upriver/core — shared types, Firecrawl/GSC clients, pipeline   │
│  stage list, data-source abstraction, usage logging, skills      │
│  registry                                                        │
├─────────────────────────────────────────────────────────────────┤
│  Templates (copied per client, not imported)                     │
│  scaffold-template (Astro site)   admin-template (F05)           │
│  app-prototype-template (Expo)                                   │
└─────────────────────────────────────────────────────────────────┘
```

Everything operates on a single unit of state: the **client directory** (`clients/<slug>/`). Commands are stateless — they read artifacts from the client directory, do work (Firecrawl, LLM calls, Playwright, headless Claude Code), and write artifacts back. That makes every stage independently re-runnable and the whole pipeline resumable.

## Packages

### `@upriver/core`

Foundation library consumed by everything else. Key modules:

- `pipeline/stages.ts` — **the canonical pipeline stage list** (init → … → admin-deploy, with `optional` flags and default args). Single source of truth for both `upriver run all` and the dashboard's Run buttons. Add a stage here and both surfaces pick it up.
- `types/` — client config, Firecrawl, audit/finding, audit-package, intake, voice, extraction shapes.
- `firecrawl/` — Firecrawl client wrapper + platform detector.
- `gsc/` — Google Search Console fetch.
- `data/` — the **data-source abstraction**: `LocalFsClientDataSource` vs `SupabaseClientDataSource`. This is how the same code serves an operator laptop and the Vercel deployment.
- `usage/` — per-command credit/token logging (feeds `upriver cost` and the Supabase usage log).
- `skills/` — registry of the marketing + operational skills agent prompts reference.

### `@upriver/audit-passes`

The audit dimension implementations — one module per pass (seo, content, design, sales, links, schema, aeo, geo, typography, local, backlinks, competitors, media, gaps, video) plus shared finding/scoring utilities. Each pass takes the scraped client dir and emits structured P0/P1/P2 findings with score impact. Deep (LLM) and tooling passes live in the CLI's `deep-audit/` runner and reuse the same finding shape.

### `@upriver/cli`

The oclif CLI (`upriver`). Commands live in `src/commands/` (one file or topic directory per command — see [`COMMAND-REFERENCE.md`](COMMAND-REFERENCE.md)). Beyond commands:

- `src/generate/` — the gated generation engine for the intake & profile engine (DAG batching, Continue gates, token-ceiling preflight, provisioning readiness).
- `src/deep-audit/` — orchestration + preflight for the LLM and tooling audit passes.
- `src/profile/` — profile engine services (merge, conflicts, coverage).
- `src/pitch/` — the pitch engine's orchestration helpers: state machine (`state.ts`), spend ledger (`ledger.ts` — also the generic estimate/ceiling API the rest of the CLI reuses), email assembly, teaser specs, prospect interview guide, answer→profile mapping, suppression check.
- `src/spend/` — full-pipeline spend control (Spec 17b): per-stage estimates, the pure over-ceiling decision, `run-ledger.json` read/write, and estimate↔actual reconciliation against `token-and-credit-usage.log` / `usage_events`. Ceilings are always checked *before* the costed step; actuals are reporting-time only.
- `src/clone/hardening.ts` — prompt-size preflight, the single fresh no-file retry, the fail-closed `fidelityGate`, and `evaluateFidelityPolicy` (per-page bar, `CLONE_FIDELITY_BAR` = 70).
- `src/diversity/` + `src/harvest/` — the site-registry loader (single source of registry semantics; the matrix shell driver calls into it) and the `upriver harvest` corpus builder + report/calibration renderer.
- Agent prompts are inline in the command files; agent-driven commands (`clone`, `fixes apply`, `improve`, `generate`, `admin-process`, …) spawn headless Claude Code (`CLAUDE_BIN`, default `claude`) and use **git worktrees** for safe concurrency.
- `src/util/b2.ts` — Backblaze B2 (S3-compatible) client for `archive`/`restore`.

By default the spawned `claude` env has `ANTHROPIC_API_KEY` stripped so the operator's Claude subscription powers agent work; `UPRIVER_USE_API_KEY=1` keeps the key.

### `@upriver/schemas`

The Zod contract for the Client Profile — what the intake & profile engine captures, validates, and merges. Sections (identity, people, offerings, pricing, customers, positioning, voice, salesProcess, content, competitors, seo, toolsAndAccess, operationsAutomation, governance, goals, auditDecisions) plus industry modules (preschool, venue, contractor, restaurant). Also home to:

- `coverage.ts` / `coverage-map.ts` — which fields are filled, and which deliverable needs which fields.
- `merge.ts` — multi-source conflict-resolution rules (verified values and open conflicts are never clobbered).
- `hv.ts` — the human-verify-required field registry.
- `show-model.ts` — the coverage-report shape shared by `profile show` and the dashboard.

No JSON Schema duplication — Zod is the single source of truth. See [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md).

### `@upriver/dashboard`

Astro + React (islands) + Tailwind web app with two audiences:

- **Operator** (`/clients/<slug>/*`, auth-gated): audit scorecard, design brief, fixes, QA, profile coverage, clone fidelity, pipeline Run buttons, share-token minting.
- **Client** (`/deliverables/<slug>/*`, share-token-gated): read-only deliverable views.
- **Prospect** (`/pitch/<slug>?token=…`, file-backed share-token-gated, outside the operator middleware block): the pitch engine's homepage preview + teaser portal. Every response carries noindex headers + meta; the first valid view writes the dashboard-owned, write-once `pitch/views.json`. `/api/unsubscribe` is the HMAC-verified one-click suppression endpoint (writes to `outreach_suppression`).

Key lib modules: `data-source.ts` (local-vs-supabase switch; defaults to `local`), `auth.ts` (Supabase Auth + operator role check), `run-cli.ts` (spawns the CLI as a subprocess — local mode only; Phase 3 replaces this with a worker enqueue), `share-token.ts`, `rate-limit.ts` (Supabase RPC token bucket guarding the intake-chat profile writes), `dashboard-events.ts` (operator action audit log). Middleware handles PKCE auth callbacks, the operator gate, and share-token validation.

Run locally: `upriver dashboard` or `pnpm --filter @upriver/dashboard run dev`.

### `@upriver/worker`

Inngest functions that take pipeline execution off the dashboard's request path:

- `run-stage.ts` — consumes `upriver/stage.run` events, validates the command against an **allowlist** (`allowed-commands.ts`), spawns the CLI, syncs artifacts to the bucket.
- `schedules/monitor.ts` — F06 weekly delta-report cron (`MONITOR_DEFAULT_CADENCE`, fan-out over `MONITOR_SLUGS`).
- `schedules/followup.ts` — F07 six-month re-audit cron.
- `serve.ts` — Express server for container deployment; in the current phase the Inngest handler is also embedded at the dashboard's `/api/inngest` route.

The container image builds to `ghcr.io/lifeupriver/upriver-worker` via `.github/workflows/worker-image.yml`. Hosted Run buttons stay non-functional until the worker + Inngest Cloud are provisioned (see [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md)).

### Templates

- `@upriver/scaffold-template` — the Astro hybrid site (Tailwind, Vercel adapter, Supabase client, Supabase Auth-gated admin) copied to `clients/<slug>/repo/` by `upriver scaffold` and customized with the client's tokens/content.
- `@upriver/admin-template` — F05 natural-language admin: GitHub issue templates, label manifest, optional Vercel change-request form, and the reference webhook handler.
- `@upriver/app-prototype-template` — F04 Expo React Native prototype scaffold.

Templates are copied, never imported, and are not built in CI.

## Data flow

```
URL ──init──▶ client-config.yaml, site-map.json
      ──scrape──▶ pages/, rawhtml/, design-tokens.json, branding-profile.json
      ──audit──▶ audit/*.json ──synthesize──▶ audit-package.json   ◀── THE HUB
                                          │
        ┌─────────────────────────────────┼──────────────────────────┐
        ▼                                 ▼                          ▼
  deliverables                      design-brief                 scaffold ─▶ repo/
  (voice/, schema/,                                                  │
   blog-topics/, …)                                              clone ─▶ finalize
                                                                     │
                                                  clone-qa / fidelity / links / embeds
                                                                     │
                                                       fixes plan ─▶ fixes apply ─▶ qa
```

In parallel, the intake & profile engine maintains `profile.json` (filled by `recon`, transcript extraction, and operator edits) and `generate` produces the AI Operating System docs under `docs/` + `deliverables/` with a `manifest.json` tracking approval state.

## Two data sources

| | `local` | `supabase` |
|---|---|---|
| Storage | `clients/<slug>/` on disk (`UPRIVER_CLIENTS_DIR`) | Storage bucket (`UPRIVER_SUPABASE_BUCKET`, default `upriver`) |
| Who defaults to it | the dashboard, e2e harnesses, fixtures | the profile/generate engine (canonical store) |
| Pipeline execution | CLI directly, or dashboard subprocess spawn | worker enqueue (Phase 3) |
| Multi-machine | `upriver sync push` / `pull` bridges the two | — |

`UPRIVER_DATA_SOURCE` flips the switch. Code paths that haven't been ported off the filesystem guard themselves with `assertLocalDataSource()` and fail with a clear hint.

## Supabase data model

Migrations in `supabase/migrations/` (auto-applied on merge to main by `.github/workflows/automigrations.yml`):

- `share_tokens` — anonymous client access to `/deliverables/<slug>/*`; minted/revoked by operators, validated by dashboard middleware.
- `dashboard_events` — audit log of operator actions (token mints, stage runs).
- `rate_limit_counters` + `rate_limit_hit()` / `rate_limit_sweep()` RPCs — distributed fixed-window rate limiting for the intake chat's profile-write endpoint.
- `outreach_suppression` — pitch-engine unsubscribe list (email, slug, timestamp). Checked by `pitch approve` before any send; written by the dashboard's `/api/unsubscribe`. Suppression PII lives only here, never in the repo.
- Token expiry sweep — GC for expired share tokens.

Auth: Supabase Auth with magic links (PKCE). Operators are users with `app_metadata.role = 'operator'`, set out-of-band — nothing in the codebase mints the role.

## CI

Three workflows in `.github/workflows/`:

| Workflow | Trigger | Does |
|---|---|---|
| `test.yml` | PR, push to main | build → unit suites → CLI smoke matrix → website Tier A e2e → Tier C runtime e2e → deploy dry-run e2e. **Keyless by construction** — no API secrets allowed. Uploads e2e logs as artifacts on failure. |
| `e2e-website-tier-b.yml` / `e2e-website-matrix.yml` / `e2e-pitch.yml` | `workflow_dispatch` only | Live, costed e2e with repo secrets: Tier B against the hosted fixture; the site-diversity matrix over `config/site-registry.json`; the pitch-engine live run. Never referenced by `test.yml`. |
| `automigrations.yml` | main push touching `supabase/migrations/`, manual | Pushes migrations via the Supabase CLI (serialized, never cancelled). |
| `worker-image.yml` | main push touching worker/cli/core/audit-passes, `v*` tags, manual | Builds + pushes the worker container to GHCR. |

The testing strategy (why subprocess-level smoke tests exist, what Tier A asserts, the wb-fixture) is documented in [`TESTING.md`](TESTING.md).

## Design system

`upriver-design-system/` is Upriver's own brand kit (voice rules, warm-dark palette, typography, CSS tokens, UI kits) — used for Upriver-branded surfaces like reports and the dashboard, and available to agents via its `SKILL.md`. Client sites get the *client's* design tokens (or house tokens via `clone --design-system=upriver`), not this.

## Where decisions live

- `.planning/roadmap/PRODUCT-ROADMAP.md` — the original A–H workstreams (shipped; see `DRIFT-REPORT.md` for spec-vs-reality divergences).
- `.planning/intake-profile-engine/`, `.planning/website-rebuild-engine/`, and `.planning/sales-engine/` — build specs 1–19 with plans, DoD verification, and honest changelogs (deviations + findings recorded per spec).
- Specs 16–19 (Tier B live e2e, clone hardening + spend ceilings, site-diversity matrix + harvest, pitch engine) are shipped; their remaining DoD items are operator-gated live workflow dispatches.
