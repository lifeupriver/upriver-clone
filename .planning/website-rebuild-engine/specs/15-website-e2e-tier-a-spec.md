# Build Spec 15: Website-pipeline e2e (Tier A) + CLI smoke matrix + CI

Status: approved (design session 2026-06-10). Companion to `.planning/website-rebuild-e2e-scope.md` (the scoping doc this spec executes Tier A of) and to the generation e2e (`scripts/e2e-littlefriends.sh`).

## Goal

Give the website-rebuild half of the product its first regression net — entirely offline, $0, keyless — and stop relying on "someone runs the tests locally":

1. **Tier A website e2e** — prove the deterministic repo-generation slice (`scaffold → finalize → fixes-plan`) against a committed fixture, with mechanical assertions including a real Astro build.
2. **CLI smoke matrix** — subprocess-level `--help` + curated dry-run checks across every oclif command. This is the test class that catches process-boundary bugs invisible to unit tests (Build Spec 14 found exactly one: `bin/run.js` swallowed oclif exit codes — 421 unit tests green, contract dead at the shell).
3. **CI** — a GitHub Actions workflow running unit suites + smoke matrix + Tier A + the existing deploy dry-run on every PR. There is currently **no test CI at all** (only `automigrations.yml` / `worker-image.yml`).
4. **Tier B record** — the live clone-spine decisions, captured here so Build Spec 16 can start from answers, not questions. Tier B is **not** in this spec's build scope.

## Why (grounding)

- The website pipeline (`run all`: discover → scrape → audit → synthesize → scaffold → clone → finalize → clone-fidelity → fixes → improve) has **zero e2e coverage and zero command-level unit tests** (scope doc, 2026-06-08). It is the original product and the more fragile pipeline.
- The pipeline splits cleanly at the LLM/Firecrawl boundary: everything from `scaffold` on is deterministic and keyless — testable for free.
- Build Spec 14's hardest-won lesson: unit tests cannot see oclif wiring. Only real subprocesses observe exit codes, stack-trace leaks, and flag-parse failures.

## File ownership

| File | Change |
|---|---|
| `clients/wb-fixture/` | NEW — committed (force-added) sanitized fixture tree |
| `scripts/e2e-website-tier-a.sh` | NEW — Tier A harness |
| `scripts/cli-smoke.mjs` | NEW — command smoke matrix |
| `.github/workflows/test.yml` | NEW — CI workflow |
| `.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md` | this spec; DoD + changelog at the end |

No production `packages/*` source changes are expected. If a harness assertion exposes a real pipeline bug, fixing it is in scope only if surgical; otherwise file it as a finding in the changelog (the e2e exists to surface these).

## 1. Committed fixture — `clients/wb-fixture/`

**Provenance:** sanitized by hand from the local `clients/audreys/` run (a real, gitignored pipeline run), then force-added past `.gitignore` exactly like `clients/littlefriends/`.

**Contents (minimum viable for scaffold/finalize/fixes-plan):**
- `audit-package.json` — trimmed to 2–3 pages in `siteStructure.pages`; `meta`, `findings` intact
- `pages/*.json` — the same 2–3 pages
- `design-tokens.json`, `asset-manifest.json`, `client-config.yaml`
- `audit/` — only the files `scaffold` and `fixes-plan` actually read (verify by reading both commands at implementation time; do not commit the full audit dir blindly)

**Sanitization checklist (apply to every committed file):**
- [ ] Business name → "Wildflour Bakery" (fictional); slug references → `wb-fixture`
- [ ] Phone numbers → `(555) 010-xxxx`; emails → `hello@wildflour.example`
- [ ] Street addresses → a fictional address; GBP/maps URLs → removed or `example.com` forms
- [ ] Person names in testimonials/copy → fictional first names
- [ ] Live domain → `wildflour.example` everywhere (this also makes the finalize link-rewrite assertion unambiguous: zero `wildflour.example` hrefs may remain)
- [ ] Asset CDN URLs may stay structurally real but point at `cdn.wildflour.example` paths (finalize must rewrite them; no real downloads occur offline)

The sanitization is a one-time manual step performed during implementation, not a script to maintain.

## 2. Tier A harness — `scripts/e2e-website-tier-a.sh`

Mirrors `e2e-littlefriends.sh` mechanics: `PHASES=(fixture scaffold finalize fixes verify)`, `phase_ge` resume (`bash scripts/e2e-website-tier-a.sh <phase>`), all output tee'd to `clients/wb-fixture/e2e/run.log`, `UPRIVER_DATA_SOURCE=local`.

Named `tier-a` deliberately: Tier B (Build Spec 16) prepends live phases (`init scrape audit synthesize clone fidelity`) in its own harness or extends this one — the scope doc's phase list is the contract.

**Phases and assertions (all mechanical, all on artifacts):**

| Phase | Runs | Asserts |
|---|---|---|
| `fixture` | resets working copies of `clients/wb-fixture/` outputs (removes `repo/`, `fixes-plan.md`, `e2e/`) — committed inputs are never touched | inputs present and parse as JSON/YAML |
| `scaffold` | `upriver scaffold wb-fixture` | `repo/src/pages/index.astro` exists; `repo/CLAUDE.md` exists; `repo/.agents/product-marketing-context.md` exists |
| `scaffold` (build) | `pnpm install && pnpm build` inside `repo/` | exit 0 — the only honest "imports resolve / valid Astro" check |
| `finalize` | `upriver finalize wb-fixture` | zero `wildflour.example` hrefs in `repo/src/**`; zero `cdn.wildflour.example` URLs in `repo/src/**` |
| `fixes` | `upriver fixes plan wb-fixture` (verify exact command form at implementation time) | `fixes-plan.md` exists with ≥1 `^#+ .*Phase` section |
| `verify` | — | prints summary; exit 0 |

**Exit codes:** 0 = pass; a distinct code per failing step — fixture=11, scaffold=12, scaffold-build=13, finalize=14, fixes=15 — so CI logs identify the failure without reading the log. Each failure names the exact assertion that failed.

All command invocations go through `node packages/cli/bin/run.js` as real subprocesses (never imported functions) — the harness must observe what the shell observes.

## 3. CLI smoke matrix — `scripts/cli-smoke.mjs`

**Enumeration:** walk `packages/cli/dist/commands/**/*.js` (excluding `*.test.js`), map path → oclif command id (`profile/set.js` → `profile:set`). No dependency on oclif internals or a manifest file.

**Pass 1 — help matrix:** for every command id, spawn `node packages/cli/bin/run.js <id> --help` and assert exit 0 and non-empty stdout. Catches: broken imports, flag-definition crashes, exit-code swallowing, oclif wiring drift. ~70 commands × <1s each.

**Pass 2 — curated dry-run matrix** (table in the script, easy to extend):

| Invocation | Expected exit |
|---|---|
| `generate littlefriends --all --dry-run` (`UPRIVER_DATA_SOURCE=local`) | 0 |
| `generate littlefriends --all --dry-run --strict-provisioning` | 0 or 3 (assert ∈ {0,3}; both are valid states of the fixture — assert NOT 1/2, no stack trace on stderr) |
| `generate littlefriends --all --strict-provisioning` (misuse: no --dry-run) | 2, clean one-line error, no stack trace |
| `run all wb-fixture --dry-run` | 0 |
| `doctor` | 0 |

**Stack-trace tripwire:** every spawned command additionally asserts stderr does not match `/at .*\.js:\d+/` (the raw-ExitError leak signature from the Spec 14 bug class).

The existing `scripts/e2e-deploy-dryrun.sh` is NOT absorbed into this script — CI runs it as its own step (it already works and is keyless).

## 4. CI — `.github/workflows/test.yml`

Triggers: `pull_request` + `push` to `main`.

Single job (sequential steps; total expected wall-clock well under 10 min):
1. checkout; pnpm via `corepack`/`pnpm/action-setup`; **Node 22** (`actions/setup-node`) — the package `node --test 'dist/**/*.test.js'` globs need ≥21; pinning 22 makes `pnpm test` work without the local-machine workarounds; pnpm store cache
2. `pnpm install --frozen-lockfile && pnpm build`
3. `pnpm test` (all workspace unit suites: schemas, cli, core)
4. `node scripts/cli-smoke.mjs`
5. `bash scripts/e2e-website-tier-a.sh`
6. `bash scripts/e2e-deploy-dryrun.sh wb-fixture` — verify at implementation time that the deploy dry-run's input expectations are satisfiable from the wb-fixture tree (it needs scaffold inputs, which Tier A's scaffold phase has just produced); if its `SOURCE` contract doesn't fit, run it from the wb-fixture inputs directly or leave it out of CI with a note in the changelog

Everything keyless by construction: no `FIRECRAWL_API_KEY`, no `ANTHROPIC_API_KEY`, no Supabase secrets in this workflow, ever. A step that starts requiring a key is a spec violation, not a configuration task.

## 5. Tier B record (decisions made 2026-06-10 — build scope of Build Spec 16)

1. **Target site:** host a tiny owned static fixture site (3–6 pages, pinned content — e.g. the Wildflour Bakery fixture content published to Vercel/Pages). Never a live client. Setup is a Spec 16 prerequisite task.
2. **Fidelity pass bar:** calibrate from the audreys run's clone-qa artifacts — set the gate slightly below its worst acceptable page. Note: `clients/audreys/clone-qa/` currently holds screenshots/`index.html` but no `summary.json` was found; locate or regenerate the scored summary (`clone-fidelity`) during Spec 16 scoping and record the number there.
3. **Scope:** clone stage limited to a few pages; stop after `clone-fidelity` (deploy stays dry-run; live deploy e2e is its own future decision).
4. Checkpoint list, key/cost table, and report shape: as specced in `.planning/website-rebuild-e2e-scope.md` Tier B.

## Out of scope

- Tier B build (Spec 16), live deploy e2e, Supabase-backed smokes (`sync`, `dashboard`, `admin-*`)
- The intake-e2e content assertions (post-docs artifact greps, P3 applied-not-candidate checks, gap-fill loop) — separate spec candidate
- Any refactor of pipeline commands; findings get filed, not fixed, unless surgical

## Definition of Done

- [ ] `clients/wb-fixture/` committed (force-added), passes the sanitization checklist (grep-verified: no real business name/phone/email/domain anywhere in the tree)
- [ ] `scripts/e2e-website-tier-a.sh` passes locally end-to-end (exit 0) and each phase resumes via `phase_ge`
- [ ] The scaffolded `repo/` genuinely builds (`pnpm build` exit 0) as part of the harness
- [ ] Finalize assertions prove zero fixture-domain hrefs and zero fixture-CDN URLs post-rewrite
- [ ] `scripts/cli-smoke.mjs` passes: all commands' `--help` exit 0, curated dry-run table green, zero stack-trace tripwire hits
- [ ] Deliberate-bug check: reverting the Spec 14 `bin/run.js` fix locally makes the smoke matrix FAIL (proves the matrix guards the bug class), then restore
- [ ] `.github/workflows/test.yml` green on the PR itself (the PR is its own proof)
- [ ] Tier B record section reviewed; Spec 16 can start from it without re-deciding
- [ ] Changelog appended: findings surfaced by the harness, deviations, CI wall-clock observed

## Changelog

(appended at implementation time)
