# Build Spec 19: pitch engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `.planning/sales-engine/specs/19-pitch-engine-spec.md`: the `upriver pitch` topic (run/batch/approve/revoke/status/convert), spend ceilings in code, homepage-scoped clone hardening, the token-gated portal preview with noindex + expiry, the four teaser doc specs, the prospect questionnaire + answer→profile bridge, and the compliance send path (suppression, unsubscribe).

**Architecture:** Orchestration-first. `pitch run` composes existing commands as real subprocess steps or direct module calls (decide per step at implementation; subprocess preferred where a command already owns the artifact contract): `init` → `scrape --pages / --max-pages 1` → `audit` → `synthesize` → `scaffold` → `clone --page /` → `clone-fidelity` → generate(teasers) → interview-link → share token → email draft. New code concentrates in `packages/cli/src/pitch/` (state machine, ledger, email, mapping) and one dashboard route.

**Tech stack:** oclif (space `topicSeparator`), node:test, Astro 5 dashboard (Node adapter), Supabase migrations, Resend.

**Branch:** fresh `build/19-pitch-engine` off `main` AFTER the spec/plan PR merges. Joshua merges PRs, not the worker.

**Read first:** the spec (source of truth), `packages/cli/src/commands/clone.ts`, `packages/cli/src/util/claude-code.ts`, `packages/cli/src/web-bridge/`, `packages/dashboard/src/middleware.ts`, `scripts/e2e-website-tier-c.sh`, `scripts/cli-smoke.mjs`.

**Grounded command contracts (recon 2026-06-12 — re-verify only if a step errors):**
- `upriver init <url> --slug <slug> [--name --vertical]` — creates `clients/<slug>/` subdirs, writes `client-config.yaml` (`slug,name,url,created_at[,vertical]`), runs Firecrawl Map → `site-map.json`. Costs credits (Map) — first ledger entry.
- `upriver scrape <slug> --pages / --max-pages 1` — `--pages` filters site-map URLs by pathname (`/` matches homepage); `--max-pages` (default 150) is the credit ceiling (`scrape.ts:189,231`). Homepage-only scrape is therefore already expressible.
- `clone.ts` internals: per-page agent prompt assembled by `buildAgentPrompt()` (`clone.ts:339–464`), fed to `runAgent()` at `clone.ts:219`; "no file produced" detected via `commitAll()` returning `'clean'` (`clone.ts:226`); all-pages-failed exits 1 (`clone.ts:188–189`); worktrees at `../.worktrees/<branch-slug>` (`clone.ts:500`), preserved on failure. No retry and no prompt-size check exist today.
- `upriver clone-fidelity <slug>` — separate command; writes/reads `clients/<slug>/clone-qa/summary.json` (`{ pages: [{ pageSlug, overall: number, … }] }`, reader at `clone.ts:906–918`). **No numeric threshold exists anywhere** — this plan introduces one (named constant).
- Generate engine: deliverable ids in `packages/cli/src/generate/engine.ts` (`M1_DOCS` lines 42–43, `WEB_DOCS` line 55) + `packages/schemas/src/coverage-map.ts`; prompts in `packages/cli/src/generate/prompts/doc-XX.ts`; `[UNCONFIRMED]` injected via `profile-slice.ts:96` + `prompt-builder.ts` `UNCONFIRMED_INSTRUCTION`; `--all --dry-run` plans offline via `planBatch` (exit 0/3).
- Interview: guide is operator-authored markdown at `clients/<slug>/interview-guide.md`, parsed by `parseInterviewGuide` (`packages/core/src/interview/parse-guide.ts:41`) → `FormSpec{sections[{id,title,items[{id,kind:'q'|'check'|'override',prompt,…}]}]}`. `interview-link <slug> --base-url` mints a 24-byte base64url token via `loadOrCreateInterviewShare` (`packages/cli/src/interview/share.ts:30`) → `interview-share.json`; dashboard route `packages/dashboard/src/pages/deliverables/[slug]/interview.astro` validates via `validateInterviewToken` (file-backed, constant-time) and PATCHes answers into `interview-responses.json` (`answers: {[itemId]: string}`, `_meta`). **Nothing maps answers → profile today** (the spec's `pitch convert` mapping is new).
- Share tokens: `mintShareToken({slug, expiresInDays?, label?, createdBy?})` → plaintext once; `validateShareToken(slug, token)` boolean, fail-closed (`packages/dashboard/src/lib/share-token.ts:58,140`); Supabase `share_tokens` (migration `20260429000001_phase4_share_tokens.sql`: `slug`, `token` sha256-hex, `expires_at`, RLS anon-SELECT). Dashboard middleware gates `/deliverables/{slug}/*` on `?t=` (`middleware.ts:108–114`). The CLI ALSO has a file-backed `loadOrCreateShareInfo` (`report-helpers/share-token.js`) used by `report send` — **two token systems exist; Task 6 reconciles which one the pitch portal uses (expiry+revocation requirement favors Supabase; keyless CI assertion favors file-backed — see Task 6 step 1).**
- Resend: `sendViaResend`/`sendEmailIfConfigured`/`buildResendPayload` in `packages/cli/src/report-helpers/resend.ts`; `DEFAULT_FROM='reports@upriverhudsonvalley.com'`; `report send` is the reference command (flags `--to --from --base-url --dry-run --write-to-file`, writes `last-share-email.json` audit trail).
- `ClientConfig` (`packages/core/src/types/client-config.ts:46–87`): structural typing, YAML read in `packages/core/src/config/client-config.ts`; adding optional `stage?: 'prospect' | 'client'` is non-breaking. Dashboard client list (`packages/dashboard/src/pages/clients/index.astro`) enumerates ALL configs → needs stage-aware filtering. `profile sync` has no stage handling (verify it tolerates the field).
- Slug safety: `assertSafeSlug` (`packages/core/src/util/paths.ts:35`, kebab-case regex, exported from core index). `urlToSlug` (`packages/cli/src/util/url-slug.ts`) is PAGE-path → slug; **no domain→slug derivation exists** — new util.
- Vertical packs: `getVerticalPack(vertical?)` (`packages/audit-passes/src/shared/vertical-pack.ts:601–605`), falls back to generic — exactly the teaser-4 fallback the spec requires.
- Smoke: `scripts/cli-smoke.mjs` dry-run table rows `[args[], allowedExitCodes[], envOverride]` (lines 110–118).
- e2e conventions: Tier C boots the scaffolded site with `astro dev` + curl asserts, exit 0/2/41–47; gated live workflows follow `e2e-website-tier-b.yml` (`workflow_dispatch`, phase resume input, FIRECRAWL+ANTHROPIC secrets, serial concurrency lock). Pitch live e2e takes range 51–58. **test.yml does not currently boot the dashboard** — the portal HTTP assertions add the first dashboard-boot harness (keyless).
- Tests: node:test (`describe/it`, `assert/strict`), colocated `*.test.ts` under `packages/*/src/`.

**Test commands:** `pnpm test` (workspace unit suites) · `node scripts/cli-smoke.mjs` · `bash scripts/e2e-pitch-portal.sh` (new, keyless) · `bash scripts/e2e-pitch.sh` (new, gated/keyed, local-only rehearsal).

---

## File structure

| File | Responsibility |
|---|---|
| `packages/core/src/types/client-config.ts` | `stage?: 'prospect' \| 'client'` field |
| `packages/cli/src/util/domain-slug.ts` | NEW — registrable-domain → kebab slug (through `assertSafeSlug`) |
| `packages/cli/src/pitch/state.ts` | NEW — `pitch/state.json` v1 schema, status machine, transitions |
| `packages/cli/src/pitch/ledger.ts` | NEW — spend ledger, rate constants, ceiling checks (`wouldExceed(step)`) |
| `packages/cli/src/pitch/email.ts` | NEW — pure email assembly (subject/body/footer: unsubscribe + postal line + honesty line) |
| `packages/cli/src/pitch/interview-guide.ts` | NEW — prospect guide template writer (stable item ids) |
| `packages/cli/src/pitch/answer-mapping.ts` | NEW — item id → `identity.*`/profile candidate mapping |
| `packages/cli/src/pitch/suppression.ts` | NEW — suppression lookup (Supabase) used by approve/batch/status |
| `packages/cli/src/commands/pitch/{run,batch,approve,revoke,status,convert}.ts` | NEW — the topic |
| `packages/cli/src/commands/clone.ts` (+ helpers) | preflight, no-cache retry, fidelity threshold constant |
| `packages/cli/src/generate/prompts/doc-pitch-0{1..4}.ts` + engine/coverage registration | NEW — four teaser specs |
| `packages/dashboard/src/pages/pitch/[slug]/…` + `middleware.ts` | NEW — portal route, token gate, noindex headers |
| `packages/dashboard/src/pages/api/unsubscribe.ts` | NEW — suppression endpoint |
| `supabase/migrations/2026MMDDHHMMSS_spec19_outreach_suppression.sql` | NEW — `outreach_suppression` |
| `scripts/e2e-pitch-portal.sh` | NEW — keyless dashboard-boot HTTP assertions (in `test.yml`) |
| `scripts/e2e-pitch.sh` + `.github/workflows/e2e-pitch.yml` | NEW — gated live e2e, exits 51–58 |
| `scripts/cli-smoke.mjs` | `pitch * --help` + pinned `pitch run … --dry-run` row |
| spec file | DoD ticks + changelog |

Every task: failing test first, then implementation, then `pnpm test` green. Commit per task.

---

### Task 1: Foundations — `stage` field, domain slug, pitch state, spend ledger

- [ ] Tests: `domain-slug.test.ts` (`https://www.wildflourbakery.com/x?y` → `wildflourbakery`; punycode/IP/invalid → clean error via `assertSafeSlug`), `state.test.ts` (legal/illegal transitions across `draft|fidelity-fail|over-budget|approved|sent|revoked`, schema `v:1` round-trip, no plaintext tokens in serialized state), `ledger.test.ts` (accumulation, `wouldExceed` BEFORE-step semantics, batch summation), client-config test (`stage` parses; absent = client semantics).
- [ ] Implement the four modules; rate constants in ONE exported table in `ledger.ts` with a comment that they are honest estimates.
- [ ] Verify `profile sync` and dashboard client list tolerate `stage` (read paths only; the list FILTER lands in Task 6).

### Task 2: Clone hardening (homepage scope)

- [ ] Tests (extract pure helpers so they're unit-testable): prompt-size preflight (over-limit → distinct error, no agent launch), single no-cache retry on the `'clean'`/no-file class (exactly one retry, second failure final), fidelity threshold gate (`summary.json` `pages[].overall` < `PITCH_FIDELITY_MIN` → gate fails).
- [ ] Wire preflight at the `buildAgentPrompt()`→`runAgent()` seam (`clone.ts:219`); count it as a ledger pre-check when invoked from pitch.
- [ ] Implement the retry at the `commitAll()==='clean'` site (`clone.ts:226`); "no-cache" = fresh agent session + worktree (verify at implementation what cache actually exists; if none beyond session state, a clean fresh attempt satisfies the spec — record in changelog).
- [ ] Fidelity gate: `PITCH_FIDELITY_MIN` named constant; calibrate from existing `clone-qa` artifacts (Spec 15 changelog notes audreys lacks `summary.json` — regenerate or pick conservatively and record the number in the changelog).

### Task 3: Teaser deliverables (4 docs, no pricing)

- [ ] Register `doc-pitch-01-before-after`, `doc-pitch-02-quick-wins`, `doc-pitch-03-voice-sample`, `doc-pitch-04-vertical-snapshot` in coverage-map + a new `PITCH_DOCS` list in the engine; follow the existing prompt-module pattern; `UNCONFIRMED_INSTRUCTION` applies to all four.
- [ ] Constraints in prompts: voice sample rewrites scraped hero/about copy ONLY (no invented facts); vertical snapshot uses `getVerticalPack()` with generic fallback; **zero pricing tokens** — add a unit test asserting no `$`-amount and no tier-name strings can enter via the prompt templates.
- [ ] `generate <slug> --all --dry-run` keeps exiting 0/3 with pitch docs registered (smoke row already pins this); pitch docs excluded from client-tier plans (prospects only — gate on `stage`).

### Task 4: Questionnaire + answer→profile bridge

- [ ] `interview-guide.ts`: ~6–8 items, STABLE ids (e.g. `p-name`, `p-role`, `p-email`, `p-phone`, `p-reaction`, `p-goal`, `p-pain`, `p-timeline`, `p-wrong`), emitted in `parseInterviewGuide`-compatible markdown — test: template parses to the expected `FormSpec`.
- [ ] `answer-mapping.ts`: id → profile candidate field table; merge via existing profile-candidate semantics (mirror recon's source-tagging; verify the exact merge entry point in `profile` internals at implementation). Test: verified fields never overwritten; unanswered ids skipped.
- [ ] `pitch convert <slug>`: flips `stage`, applies mapping, idempotent, `--no-answers` escape hatch. Subprocess test via `bin/run.js`.

### Task 5: Email assembly, suppression, `approve`

- [ ] Supabase migration `outreach_suppression` (`id, email, slug, created_at`, unique on lower(email); RLS: no anon read — service-role writes from the dashboard endpoint, CLI reads via existing service-role data path). Follow the share_tokens migration idiom.
- [ ] Dashboard `api/unsubscribe` endpoint: one-click (token identifies slug+email without exposing either in the URL — signed or random id persisted at draft time; decide at implementation, record in changelog), inserts suppression row, renders a plain confirmation. No auth required (CAN-SPAM: unsubscribe must not require login).
- [ ] `email.ts` pure assembly + tests: links present (portal, questionnaire), unsubscribe footer, postal line from config, honesty line, NO pricing; from-chain flag → `UPRIVER_PITCH_FROM` → `DEFAULT_FROM`.
- [ ] `pitch approve <slug>`: renders full email + link list + teaser file list; refusal matrix (suppressed / state ≠ draft / token expired / fidelity-fail) each with a clean one-line error; interactive confirm or `--yes`; sends via `sendViaResend`; writes audit trail (mirror `last-share-email.json` idiom); state → `sent`. Unit-test the refusal matrix with injected fakes; subprocess-test `--dry-run`.

### Task 6: Portal route + revoke

- [ ] **Step 1 (reconcile tokens):** pick the pitch-portal token system. Requirements: expiry (~14d, cap 30), revocation, keyless local validation for CI. If `validateShareToken` is Supabase-only, EITHER extend the file-backed interview-token pattern with `expiresAt` + revocation for `stage:prospect` routes (works in `UPRIVER_DATA_SOURCE=local`), OR route through Supabase and give the keyless harness a local fake. Decide once, record in changelog; `pitch run` step 10 and `revoke` follow it.
- [ ] Portal route `pitch/[slug]/` (+ teaser subviews): serves staged static homepage from `clients/<slug>/pitch/preview/` through the data-source abstraction; token gate in middleware alongside the existing `/deliverables/` block (`middleware.ts:108–114`).
- [ ] `X-Robots-Tag: noindex, nofollow` header + meta tag on every pitch (and prospect-interview) response — set in middleware for the route prefix so a forgotten page can't leak.
- [ ] `pitch revoke <slug>`: revoke token(s), unstage preview, state → `revoked`.
- [ ] `scripts/e2e-pitch-portal.sh` (keyless): boots the dashboard (`astro dev`, local data source, fixture prospect under `clients/`), curls: valid token 200 + noindex header + meta; missing/expired/revoked token → 4xx; teaser views render. Wire into `test.yml` as a step (stays keyless). Exit codes: 0 pass, 2 preflight, then a distinct code per assertion group.

### Task 7: Orchestrator — `pitch run`, `pitch batch`, `pitch status`

- [ ] `pitch run <url>`: the §1 step sequence; clobber guard (`stage` ≠ prospect → refuse unless `--force-prospect`); ledger check before init/scrape/clone/generate; state.json updated after every step; `--dry-run` keyless+offline prints plan + estimate table (assert zero network: no Firecrawl/claude invocation on that path).
- [ ] `pitch batch <file>`: URL-per-line + `#` comments; sequential; per-prospect isolation (continue on failure); batch ceiling; outcome table; non-zero exit if any failed. Drafts only — never sends.
- [ ] `pitch status [<slug>]`: table from `state.json` + `interview-responses.json` presence + token expiry + suppression flag.
- [ ] Subprocess e2e (keyless slice): `pitch run https://wildflour.example --dry-run` exit 0; full-pipeline rehearsal is the gated workflow's job.
- [ ] Smoke rows: every `pitch` subcommand `--help` (auto-covered by the help matrix walk) + pinned dry-run row in the curated table.

### Task 8: Gated live e2e + CI + DoD

- [ ] `scripts/e2e-pitch.sh`: phases `preflight run portal questionnaire approve(-dry) convert verify`, exit range 51–58, target = the OWNED hosted Wildflour fixture site (Spec 16 prerequisite — if not yet hosted, the workflow's run phase targets the fixture-site repo served locally; record which in the changelog). Send phase uses a test inbox; never a real prospect.
- [ ] `.github/workflows/e2e-pitch.yml`: `workflow_dispatch` only, phase-resume input, serial concurrency lock, FIRECRAWL+ANTHROPIC+RESEND secrets — mirroring `e2e-website-tier-b.yml`.
- [ ] Full green sweep: `pnpm test`, smoke, Tier A/C, `e2e-pitch-portal.sh`, `test.yml` on the PR (still keyless — grep the workflow diff for key names as a tripwire).
- [ ] DoD checklist in the spec ticked ONLY as actually verified (incl. the two deliberate-bug checks: near-zero ceiling aborts pre-scrape; forced low fidelity leaves portal unstaged); changelog appended with deviations + findings; PII/token grep over the committed diff.
- [ ] Push, draft PR, watch CI. STOP — Joshua merges.

---

## Open items the builder must resolve (and log in the changelog)

1. Token system for the portal (Task 6 step 1) — the one genuine architecture fork left.
2. `PITCH_FIDELITY_MIN` calibration number and its provenance.
3. What "no-cache" concretely bypasses in the clone retry.
4. Unsubscribe-token shape (signed vs persisted id).
5. Whether `audit`/`synthesize` run clean on a 1-page `pages/` dir (recon says audit iterates audit-package pages — with only the homepage scraped this should degrade gracefully; verify, and scope findings passes if any assume multi-page).
