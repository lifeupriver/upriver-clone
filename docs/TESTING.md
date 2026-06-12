# Testing & CI

How the repo is tested, how to run everything locally, and the contracts CI enforces. The harnesses were built in Build Specs 14–15 (`.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md` has the full rationale).

---

## The strategy in one paragraph

Unit tests can't see oclif wiring — Build Spec 14 proved it the hard way when `bin/run.js` swallowed exit codes while 421 unit tests stayed green. So the test pyramid here has an unusual middle layer: **subprocess-level smoke tests** that invoke the real CLI binary and assert on what the shell observes (exit codes, stdout, stack-trace leaks), plus **offline e2e harnesses** that drive whole pipeline segments against a committed fixture. Everything that runs in CI is **keyless by construction** — no Firecrawl, Anthropic, or Supabase secrets, ever.

## Quick reference

```bash
pnpm build                              # always build first — harnesses run dist/, not src/
pnpm typecheck                          # typecheck all packages
pnpm test                               # unit suites (schemas, cli, core, dashboard)

node scripts/cli-smoke.mjs              # CLI smoke matrix
bash scripts/e2e-website-tier-a.sh      # website pipeline Tier A (offline)
bash scripts/e2e-website-tier-c.sh      # website Tier C runtime e2e (boots the scaffolded site, offline)
bash scripts/e2e-deploy-dryrun.sh       # provisioning dry-run e2e
UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh   # intake engine acceptance (needs `claude`)
node scripts/dashboard-preflight.mjs    # hosted-dashboard deploy gate (needs Supabase env)
```

## Unit tests

`*.test.ts` next to sources, Node's built-in `--test` runner. Heaviest coverage sits where correctness is contractual: `@upriver/schemas` (profile validation, merge rules, coverage math), the CLI's generation engine, core utilities, and the dashboard's auth/rate-limit/data-source logic. Run one package with `pnpm --filter @upriver/schemas test`.

## CLI smoke matrix — `scripts/cli-smoke.mjs`

Two passes over the real binary (`node packages/cli/bin/run.js`), as subprocesses:

1. **Help matrix** — every command's `--help` must exit 0, print non-empty stdout, and emit **no stack trace** (a regex tripwire catches raw `ExitError`/uncaught leaks). This alone catches flag-parse failures, broken imports, and the bin-wrapper bug class.
2. **Curated dry-run table** — known invocations with pinned exit codes: `0` success, `2` oclif usage error, `3` `generate --strict-provisioning` gap. Extend the table freely; keep it keyless.

Exits 1 if any row fails, 2 if the build is missing. This is the cheapest guard for the repo's exit-code contract — if you add a command or change exit behavior, update the table in the same PR.

## Website Tier A e2e — `scripts/e2e-website-tier-a.sh`

Offline proof that the website pipeline's deterministic spine works: **scaffold → (scaffolded repo actually builds) → finalize → fixes plan**, driven against the committed fixture. No API keys, no LLM, no Firecrawl; the only network use is `pnpm install` inside the scaffolded repo.

| Phase | Runs | Asserts |
|---|---|---|
| `fixture` | resets working outputs (committed inputs never touched) | inputs present, valid JSON/YAML |
| `scaffold` | `upriver scaffold wb-fixture`, then `pnpm install && pnpm build` in `repo/` | required files exist; **the repo builds** — the only honest "imports resolve" check |
| `finalize` | `upriver finalize wb-fixture` | rewrites actually happened (counters > 0) **and** completed (zero fixture-domain URLs remain) |
| `fixes` | `upriver fixes plan wb-fixture` | `fixes-plan.md` exists with ≥1 Phase section |
| `verify` | — | idempotent re-checks; summary |

**Exit codes:** `0` pass; `2` preflight (bad phase arg, missing node/pnpm, node < 22 — the scaffolded build needs native WebSocket); `11`–`16` for fixture/scaffold/scaffold-build/finalize/fixes/verify respectively, so a CI log identifies the failing phase from the code alone. Resumable: `bash scripts/e2e-website-tier-a.sh scaffold` (resume points: fixture, scaffold, fixes, verify — *not* finalize, which would legitimately find zero rewrites on an already-finalized repo).

Tier B (`scripts/e2e-website-tier-b.sh`, shipped in Build Spec 16) prepends the live phases — `init`/`discover`/`scrape`/`audit`/`synthesize`/`scaffold`/`clone` against the hosted fixture site — in front of this same spine. It costs real money (Firecrawl credits + clone sessions), uses exit codes 21–32, and runs only via the workflow_dispatch-only `e2e-website-tier-b.yml` or by hand — never in the keyless `test.yml`. Tier C (below) closes the remaining gap: nothing in Tier A ever *boots* the scaffolded site.

### The fixture — `clients/wb-fixture/`

A sanitized, **fully fictional** client ("Wildflour Bakery", domain `wildflour.example`, CDN `cdn.wildflour-assets.example`) containing exactly the inputs the Tier A commands read: `audit-package.json`, `design-tokens.json`, `asset-manifest.json`, `pages/*.json`, `client-config.yaml`. All prose was rewritten (not token-swapped) and verified against the source corpus; phone/email/address/person names are fictional. The distinct fixture domains make the finalize assertions unambiguous: zero `wildflour.example` hrefs may remain after finalize.

If you change scaffold/finalize/fixes inputs, update the fixture in the same PR — Tier A failing on your branch is the system working.

## Website Tier C runtime e2e — `scripts/e2e-website-tier-c.sh`

Tier A proves the scaffolded repo *builds*; Tier C proves it *runs*. It boots the scaffolded wb-fixture site with `astro dev` (`astro preview` is a no-op under the Vercel adapter) on a fixed port (default 4977, override `TIER_C_PORT`), with Supabase/GitHub env explicitly scrubbed — keyless by construction — and asserts the runtime contract over real HTTP:

| Phase | Asserts |
|---|---|
| `pages` | `/`, `/contact`, `/privacy`, `/terms` return 200 with non-empty HTML; `/robots.txt` is 200 and contains `Sitemap:`; the build emitted `sitemap-index.xml` |
| `forms` | honeypot-filled POST → silent success-shaped 303 to `?submitted=1` (bots learn nothing, nothing stored); valid-shaped POST to `/api/inquiry` and `/api/newsletter` with no Supabase env → **honest 503 JSON** — never fake success, never 404 (the regression class where forms POST to endpoints that don't exist) |
| `admin` | `GET /admin` → 3xx redirect to `/admin/login`; the login page itself renders 200 |
| `change-request` | unauthenticated POST `/api/change-request` → 401 with `{"ok":false,...}` JSON (a middleware regression to 404/500 fails here) |

Reuses Tier A's scaffolded `clients/wb-fixture/repo` when present (in CI it runs right after Tier A, so install/build are warm); otherwise it scaffolds and installs itself with the same commands Tier A uses. **Exit codes:** `0` pass; `2` preflight; `41` scaffold/install, `42` build or sitemap artifact missing, `43` server never became ready, `44` static pages, `45` form endpoints, `46` admin gate, `47` change-request contract (the 40-range is deliberately disjoint from Tier A's 11–16 and Tier B's 21–32). The dev server is killed by an EXIT trap; logs land in `clients/wb-fixture/e2e/tier-c.log` and `tier-c-server.log`.

## Deploy dry-run e2e — `scripts/e2e-deploy-dryrun.sh`

Drives `scaffold` then the three provisioning plans — `scaffold github`, `scaffold supabase`, `scaffold deploy` — in dry-run, asserting each prints a plan with the `[dry-run]` marker and **touches no real infrastructure** (no `.env.local`, no `vercel-url.txt`). Defaults to the wb-fixture in CI.

## Intake engine acceptance — `scripts/e2e-littlefriends.sh`

Synthetic full run of the intake & profile engine on the committed Little Friends corpus: reset → recon → extract → conflicts → verify → readiness → docs → provisioning → final. Requires `UPRIVER_GATE_AUTO=1` and `claude` on PATH (the docs phases make real LLM calls — this one is **not** keyless and does not run in CI). Resumable from any phase; a readiness-only stop point skips the LLM phases. See [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md).

## Other scripts

| Script | Purpose |
|---|---|
| `scripts/validate.mjs` | Full validation harness against a *real* URL — times each stage, validates artifacts, totals Firecrawl + Claude spend. Operator-run, costs money. |
| `scripts/qa-local.mjs` | QA checks against a local site build. |
| `scripts/clone-compare.mjs` | Visual fidelity comparison utility (clone vs live). |
| `scripts/capture-live.mjs` | Live-site capture utility. |
| `scripts/synthesize-manual.mjs` | Manual synthesis harness for iterating without the full pipeline. |
| `scripts/dashboard-preflight.mjs` | Deploy gate for the hosted dashboard: required env present, bucket read/write probe, `rate_limit_hit()` RPC exists. Run before any Vercel deploy with `UPRIVER_DATA_SOURCE=supabase`. |

## CI workflows

### `.github/workflows/test.yml` — on every PR and push to main

Build → unit suites → CLI smoke matrix → website Tier A e2e → website Tier C runtime e2e → deploy dry-run e2e. Concurrency cancels superseded PR runs; e2e logs upload as artifacts on failure (`clients/wb-fixture/e2e/run.log`, `clients/wb-fixture/e2e/tier-c.log`, `clients/wb-fixture/e2e/tier-c-server.log`, `clients/e2e-deploy/run.log`).

**Rule: this workflow stays keyless.** If a test needs an API key, it doesn't belong here — it belongs in an operator-run script or a future secrets-gated workflow.

### `.github/workflows/automigrations.yml`

Pushes `supabase/migrations/` to the project via the Supabase CLI on merge to main (or manual dispatch). Serialized — migration runs are never cancelled. Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

### `.github/workflows/worker-image.yml`

Builds and pushes the worker container to `ghcr.io/lifeupriver/upriver-worker` when worker-relevant packages change on main, on `v*` tags, or manually. Tags: `sha-<short>`, `latest` (main), `v<tag>`.

## The exit-code contract (repo-wide)

| Code | Where | Meaning |
|---|---|---|
| 0 | everywhere | success |
| 1 | QA gates, harness internals | findings/failures (e.g. `clone-links` broken links, `clone-embeds` missing embeds, smoke-matrix row failures) |
| 2 | all commands | oclif usage error; `generate` token-ceiling preflight; harness preflight |
| 3 | `generate --strict-provisioning` | provisioning gaps |
| 11–16 | Tier A harness | distinct code per failing phase |
| 21–32 | Tier B harness | distinct code per failing phase (live pipeline) |
| 41–47 | Tier C harness | distinct code per failing phase (runtime HTTP contract) |

Two invariants the smoke matrix enforces: exit codes must reach the shell (no bin-wrapper swallowing), and no command may leak a raw stack trace. Treat any stack trace in CLI output as a bug.
