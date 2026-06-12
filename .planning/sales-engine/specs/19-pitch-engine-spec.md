# Build Spec 19: the sales tool (`upriver pitch`)

Status: approved (brainstorm with Joshua, 2026-06-12 — the seven open decisions from `.planning/roadmap/2026-06-12-spec-19-sales-tool-handoff.md` were asked one at a time and are recorded in §Decisions). Supersedes §Workstream E of the 2026-06-10 handoff.

## Goal

One prospect-facing sales feature, mostly orchestration of existing primitives:

1. **`upriver pitch run <url>`** — point at a prospect's website → clone JUST their homepage → generate a short teaser bundle → mint a questionnaire link → draft (never send) an outreach email. Everything lands in `clients/<slug>/` at `stage: prospect`, draft state.
2. **`upriver pitch batch <file>`** — the same over a prospect list, with per-prospect AND per-batch spend ceilings enforced in code.
3. **`upriver pitch approve <slug>`** — the only path that sends. Shows the operator the exact email + every link, checks the suppression list, then sends via Resend.
4. **`upriver pitch convert <slug>`** — the killer bridge, made explicit: flips `stage: prospect → client` AND maps the questionnaire answers from `interview-responses.json` into `identity.*`/profile candidate fields (source-tagged like recon candidates, never overwriting verified data). An engaged prospect has ALREADY started onboarding. NOTE (verified 2026-06-12): nothing in the codebase currently extracts interview answers into the profile — this mapping step is NEW, small, and load-bearing.

v1 sits at autonomy level **L1** (batch generation, human approves every send). L2/L3 are out of scope; the approve gate is the future L2 insertion point.

## Decisions (brainstorm 2026-06-12, in handoff order)

| # | Decision | Choice |
|---|---|---|
| 1 | Outreach channel | Resend email via the existing sender path; human approves every send; compliance (real sender, unsubscribe, suppression) built into v1 |
| 2 | Preview hosting | Dashboard portal: static-built homepage served on a share-token-gated route; sha256-hashed token, `expires_at` ≈ 14 days, `noindex` headers; takedown = revoke token |
| 3 | Questionnaire vehicle | Existing web-bridge intake: short prospect-flavored `interview-guide.md` + `interview-link` magic link; answers → `interview-responses.json` |
| 4 | Prospect data model | `clients/<slug>/` with `stage: prospect` in `client-config.yaml`; promoted to `stage: client` on conversion; no separate `prospects/` root, no registry file |
| 5 | Teaser docs | All four: homepage before/after, top-3 quick wins, mini brand-voice sample, vertical-aware opportunity snapshot (the last two carry extra review safeguards — §6) |
| 6 | Pricing in materials | None in v1 — no tiers, no numbers; pricing waits for the conversation |
| 7 | Autonomy + approve | L1: single + batch generate to draft state; explicit `pitch approve <slug>` CLI gate renders email + links before confirm; spend ceiling in code, surfaced in `--dry-run` |

## Why (grounding)

- Every building block exists: `clone --page /` (homepage-only), `discover`/`scrape` scope flags + `--max-pages`, the generate engine with Spec 14 `[UNCONFIRMED]` hedging, `interview-link` + web-bridge intake, `sendViaResend` (`packages/cli/src/report-helpers/resend.ts`, arbitrary recipients already supported), `mintShareToken`/`validateShareToken` with `expires_at` (`packages/dashboard/src/lib/share-token.ts`), vertical packs (`packages/audit-passes/src/shared/vertical-pack.ts`), `urlToSlug`, `assertSafeSlug`.
- What does NOT exist (verified 2026-06-12): suppression list, preview-expiry default, prospect-shaped (short) interview guide, teaser doc specs, a portal view for a cloned homepage, any `pitch` command.
- Spec 17 leftovers that pitch needs are folded in here at homepage scope (§4): per-page prompt-size preflight, one fresh no-cache retry on the no-file failure class, fidelity-assert-before-persist, per-run spend ceiling. They are small at single-page scope; blocking on a full Spec 17 is not justified.

## File ownership

| File | Change |
|---|---|
| `packages/cli/src/commands/pitch/{run,batch,approve,revoke,status,convert}.ts` | NEW — oclif topic (space separator: `upriver pitch run …`) |
| `packages/cli/src/pitch/` | NEW — orchestration helpers: state machine, spend ledger, email assembly, prospect interview-guide template, teaser doc specs |
| `packages/cli/src/commands/clone.ts` + clone internals | homepage-scoped hardening: prompt-size preflight, no-cache retry, fidelity-assert-before-persist |
| `packages/dashboard/src/pages/pitch/[slug]/*` | NEW — token-gated preview + teaser portal route, noindex |
| `packages/dashboard/src/pages/api/unsubscribe.ts` (or equivalent route) | NEW — one-click suppression endpoint |
| `supabase/` migration | NEW — `outreach_suppression` table |
| `scripts/cli-smoke.mjs` | new rows: `pitch * --help` + pinned offline `pitch run … --dry-run` |
| `scripts/e2e-pitch.sh` + `.github/workflows/e2e-pitch.yml` | NEW — gated live e2e (exit-code range 51–58) |
| this spec | DoD + changelog |

`test.yml` stays keyless; no production secrets anywhere near it.

## 1. `pitch run <url>` — the per-prospect pipeline

1. **Slug + dir:** derive slug from the registrable domain (e.g. `wildflourbakery.com` → `wildflourbakery`), validate with `assertSafeSlug`. Create `clients/<slug>/client-config.yaml` with `url`, `stage: prospect`, and pipeline defaults. **Refuse** to run against an existing dir whose `stage` is `client` (or missing, i.e. a real client) unless `--force-prospect` — a pitch must never clobber a paying client's data.
2. **`--dry-run` (keyless, offline):** print the step plan, the cost-estimate table (Firecrawl credits, agent minutes, est. USD) against the ceiling, and the artifacts that would be produced. Exit 0 with no keys and no network. This is the smoke-matrix row.
3. **Scrape (politeness):** homepage + public assets only — the existing scope flags pinned to a single page; rate-limited; `--max-pages` discipline inherited.
4. **Recon + homepage audit:** run the audit pass at homepage scope, emitting a standard `audit-package.json` (findings feed the quick-wins teaser AND make every pitch run a Spec 18 site-diversity data point — standard formats, no bespoke artifact shapes).
5. **Scaffold + clone homepage:** `scaffold` then `clone --page /`, through `runAgent` only (no Bash tool, `buildAgentEnv` allowlist, 20-min timeout) — never around it. Hardening per §4 applies.
6. **Fidelity gate:** run the clone-fidelity scorer on the homepage; below threshold → do NOT stage to the portal; state `fidelity-fail`, worktree preserved for inspection.
7. **Static build + stage:** build the cloned homepage to static HTML; stage under `clients/<slug>/pitch/preview/` where the dashboard portal route serves it (§5).
8. **Teasers:** generate the four teaser docs (§6) via the generate engine with `[UNCONFIRMED]` hedging mandatory.
9. **Questionnaire:** write the short prospect `interview-guide.md` (§7) and mint the magic link via the existing `interview-link` flow.
10. **Share token:** mint via `mintShareToken` with `expires_at = now + 14 days` (configurable `--expires-days`, capped at 30).
11. **Email draft:** assemble the outreach email (§8) to `clients/<slug>/pitch/email-draft.md` — an artifact on disk, never sent from `run`.
12. **State:** `clients/<slug>/pitch/state.json` (schema-versioned, `v: 1`) updated after every step: `status` (`draft | fidelity-fail | over-budget | approved | sent | revoked`), per-step timestamps, the spend ledger (§3), token references (never plaintext tokens — those are printed once at mint, per the share-token invariant).

Every CLI invocation honors `UPRIVER_DATA_SOURCE=local`; e2e drives the real subprocess (`node packages/cli/bin/run.js pitch …`).

## 2. `pitch batch <file>` / `pitch status` / `pitch revoke` / `pitch convert`

- **`batch`**: newline-delimited URLs (`#` comments allowed). Sequential (politeness + budget legibility). Per-prospect ceiling AND a batch ceiling (`--max-batch-spend-usd`); a prospect failure (fidelity, budget, scrape error) is isolated — log, continue, summarize. Exit non-zero if any prospect failed, with a per-prospect outcome table. Batch NEVER sends — it produces drafts; `approve` remains per-prospect.
- **`status [<slug>]`**: funnel view from `pitch/state.json` across `stage: prospect` clients — status, spend, sent-at, token expiry, questionnaire-answered (presence of `interview-responses.json`).
- **`revoke <slug>`**: takedown-on-request, in code: revoke the share token (and interview token), set state `revoked`, unstage the portal preview. One command, because the guardrail says takedown on request — that has to be a 10-second operation.
- **`convert <slug>`**: the upsell bridge — flips `stage: prospect → client` in `client-config.yaml` and applies the answer→profile mapping (§7). Idempotent; refuses if no `interview-responses.json` unless `--no-answers`.

## 3. Spend ceiling — enforced in code, not convention

- Ledger in `pitch/state.json`: `firecrawlCredits`, `agentSeconds`, `estUsd` (rate table as named constants in one module; honest estimates, not precision theater).
- Checked **before** each costed step (scrape, agent run, generate): if the next step's estimate would exceed `--max-spend-usd` (default 5), abort cleanly with a distinct exit code, preserve partial artifacts, state `over-budget`.
- Batch adds `--max-batch-spend-usd` (default 50) over the summed ledgers.
- `--dry-run` surfaces the full estimate table; this satisfies the per-RUN spend ceiling left over from Spec 17 at pitch scope.

## 4. Clone hardening fold-in (homepage scope)

From the un-landed Spec 17 remainder, required by DoD only at single-page scope (land them in the clone path generally where surgical):

1. **Prompt-size preflight** — before launching the agent, measure the assembled prompt for the page; over limit → fail fast with a clean message (counts as a costed-step ceiling check, §3).
2. **One fresh no-cache retry** — on the known no-file-produced failure class, retry exactly once with caches bypassed; second failure is final.
3. **Fidelity-assert-before-persist** — score before staging to the portal (§1 step 6). A wrong-looking homepage in front of a prospect is brand damage; nothing below threshold ships.
4. **Per-run spend ceiling** — §3.

## 5. Preview portal (dashboard)

- Route `…/pitch/<slug>?token=…`: validates via `validateShareToken` (expiry enforced by the existing `expires_at` check), serves the static-built homepage preview from `clients/<slug>/pitch/preview/` plus rendered teaser views.
- **Every** response on the route carries `X-Robots-Tag: noindex, nofollow` AND `<meta name="robots" content="noindex, nofollow">`. Tier-C-style HTTP assertions cover: noindex header present, missing token → 4xx, expired token → 4xx, revoked → 4xx.
- We are showing a prospect a rebuild of THEIR OWN content: the preview is never published as ours, never indexable, never linked from any client-facing view, and dies with the token (~14 days) or on `pitch revoke`.

## 6. The teaser bundle (four docs, no pricing)

All built almost entirely from recon — Spec 14 `[UNCONFIRMED]` hedging is load-bearing; a wrong assertion in a sales teaser is brand damage. Order in the portal:

1. **Homepage before/after** — their current homepage (screenshot from scrape) vs the rebuilt preview, side by side. The centerpiece; nearly free since the clone exists.
2. **Top-3 quick wins** — three prioritized findings from the homepage audit, framed as immediate value (reciprocity even if they never buy).
3. **Mini brand-voice sample** — a rewritten hero/about block, constrained to rewriting THEIR scraped copy only (no invented facts); flagged in the approve gate as requiring explicit operator eyeballs (highest off-key risk).
4. **Vertical-aware opportunity snapshot** — half a page of "businesses like yours" framing from the matching vertical pack; falls back to a generic snapshot if no pack matches.

**No pricing anywhere** — no tiers, no numbers, no package names (decision 6). The approve gate (§8) renders/links all four so what the operator approves is exactly what the prospect sees.

## 7. Questionnaire (web-bridge intake)

- A NEW short prospect interview-guide template (~6–8 questions), distinct from the full client interview: confirm identity (name, role, email, phone), reaction to the preview, biggest business goal, current-site pain, timeline/interest, "anything we got wrong?" (the last one doubles as a hedging-error report channel).
- Served by the existing dashboard interview route via the existing magic-link flow (`validateInterviewToken` + `parseInterviewGuide`); answers persist to `interview-responses.json` keyed by `FormItem.id`.
- **Answer→profile mapping (NEW):** a small module maps prospect question ids onto `identity.*`/profile candidate fields, applied by `pitch convert` via the existing profile-candidate merge semantics (source-tagged, verified data never overwritten). Question ids in the prospect guide template are stable and chosen to make this mapping table trivial. The responses file itself survives the `stage` flip unchanged.
- Questionnaire form gets the same noindex treatment as §5.

## 8. Outreach compliance (non-negotiable, in the send path)

- **Only `pitch approve <slug>` sends.** It renders the exact email body, the portal URL, the questionnaire URL, and the teaser list; requires interactive confirm (or explicit `--yes` for scripted local use). No auto-send flag exists in v1 at all — that is an L2/L3 decision gate, not a config option.
- **Real sender identity:** from-address via flag → `UPRIVER_PITCH_FROM` → the existing report-from default; physical-address footer line from config (CAN-SPAM).
- **Unsubscribe:** every email footer carries a working one-click unsubscribe link → dashboard endpoint → inserts into a new Supabase `outreach_suppression` table (email, slug, timestamp). `approve` checks suppression before send and refuses; `batch`/`status` surface suppressed prospects. Suppression is never stored in the repo (PII lives in Supabase only).
- **No deception:** the email says plainly that we built a preview rebuild of their homepage and links them to it; nothing implies they requested it or that the preview is live.
- `approve` also refuses when: state ≠ `draft`/`approved`, token already expired, or fidelity gate failed.

## 9. Prospect PII posture

`clients/<slug>/` prospect dirs inherit the existing posture automatically (gitignored, Supabase-synced per data-source config). Tests use a sanitized committed fixture only (a `wb-fixture`-style prospect tree — reuse/extend `wb-fixture` where possible rather than inventing a second fixture business). The suppression table and any email addresses never appear in committed files.

## 10. Tests & CI

- **Unit:** slug derivation from URLs (incl. `assertSafeSlug` rejection paths), state-machine transitions, spend-ledger math + ceiling aborts, suppression check, email assembly (pure templating, zero network), `stage: client` clobber refusal.
- **Smoke (`scripts/cli-smoke.mjs`):** every `pitch` subcommand `--help` exits 0, no stack trace; pinned row `pitch run https://wildflour.example --dry-run` (offline, keyless, exit 0).
- **Tier-C-style portal assertions** (keyless, in `test.yml` via the dashboard dev-server harness pattern): noindex header, token-gate 4xx matrix per §5.
- **Live e2e:** `scripts/e2e-pitch.sh` + `workflow_dispatch`-gated `e2e-pitch.yml`, exit-code range **51–58**, targeting the OWNED hosted fixture site (Spec 16's published Wildflour fixture) — never a real prospect in CI; send step targets a test inbox.
- TDD failing-test-first per process invariants.

## 11. Spec 18 harvesting contract

Pitch runs emit only standard artifact shapes: `audit-package.json`, `clone-qa/summary.json`, plus versioned `pitch/state.json`. A future harvest sweep over `clients/*/pitch/` therefore needs no per-run adapters. Do not invent bespoke findings formats.

## Out of scope

- L2 (agent-drafted outreach) and L3 (autonomous sends), the dashboard approve queue, any auto-send config flag
- Pricing/packaging in any prospect-facing material
- Full-site clone for prospects (homepage only), external form vendors, CRM integration
- The non-homepage remainder of Spec 17; the full prospect-analytics funnel (open/click tracking)

## Definition of Done

- [ ] `pitch run <url>` produces the full draft bundle (preview staged, four teasers, questionnaire link, email draft, state.json) on the fixture — *artifact assertions implemented in the gated harness; first live run pending (see changelog)*; `--dry-run` keyless/offline exit 0 ✔ (verified live + pinned in cli-smoke)
- [x] `pitch batch` isolates per-prospect failures and enforces both ceilings (ledger math + summation unit-tested; per-prospect over-budget abort verified live; batch wiring exercised by the gated harness)
- [x] Spend ceiling aborts cleanly BEFORE the costed step, distinct exit code (21), state `over-budget` (deliberate-bug check run: `--max-spend-usd 0` aborted before init with zero subprocesses spawned)
- [ ] Fidelity-assert-before-persist: gate logic fail-closed unit-tested (below-min, no-summary, unscored all refuse); the in-run branch (state `fidelity-fail`, exit 22, nothing staged) requires a real clone — verified by the gated workflow, not locally
- [x] Portal route: token required, expiry enforced, revoke works, noindex header + meta on every response (8 dashboard unit tests over the real handlers; HTTP re-assertion in the gated harness)
- [x] `pitch approve` renders email + all links and refuses on suppression/expiry/non-draft/missing-recipient/secret/postal (refusal matrix unit-tested; Resend send + live unsubscribe write are the gated harness's optional real-send leg)
- [x] Questionnaire round-trip: guide template parses to the pinned ids; `pitch convert` flips `stage` and seeds `identity.*`/profile candidates with source `interview` through the mergeCandidate arbiter (verified values never overwritten — unit-tested); HTTP round trip asserted in the gated harness
- [x] Clone hardening: prompt-size preflight + single fresh retry + fidelity gate covered by unit tests at homepage scope
- [x] `cli-smoke.mjs` rows green (incl. pinned `pitch run --dry-run` and a teaser `generate --dry-run`); `test.yml` untouched and keyless; live e2e workflow exists, `workflow_dispatch`-gated, exit codes 51–58
- [x] No prospect PII or plaintext token in any committed file (diff grep: all emails fictional, the two secret-pattern hits are test fixtures)
- [x] Changelog appended: deviations honest, findings filed

## Changelog

### 2026-06-12 — built (Tasks 1–8, branch `build/19-pitch-engine`)

**Resolved open items (plan §Open items):**

1. **Portal token system:** file-backed `pitch/share.json` (the interview magic-link pattern, in-handler validation through ClientDataSource) extended with `expiresAt` (default 14d, cap 30) and a `revoked` flag — NOT the Supabase `share_tokens` table. Rationale: it is the existing prospect-facing-token precedent, works identically under local/Supabase data sources, and made the full token-gate matrix unit-testable keyless. Consequence: the portal route lives at `/pitch/<slug>` outside the operator-gated `/deliverables` middleware block, with its own validation + a middleware noindex belt for the whole prefix.
2. **`PITCH_FIDELITY_MIN` = 70** (0–100 `overall` scale). Provenance: conservative pick — no scored corpus existed (the audreys `clone-qa/` has no `summary.json`, per the Spec 15 finding). Tune from real pitch runs.
3. **"No-cache" retry:** investigation found no local cache in the clone path (runAgent spawns a fresh headless session each call; caching is server-side). The retry therefore launches a brand-new session — recorded here as satisfying the spec's intent.
4. **Unsubscribe token: HMAC-signed, storage-free** (`UPRIVER_UNSUBSCRIBE_SECRET` shared by CLI approve + dashboard endpoint), minted at SEND time — drafts stay keyless with a placeholder footer that `approve` finalizes.
5. **1-page audit/synthesize:** not yet live-verified (no Firecrawl key in the build environment); the gated harness's `run` phase is the verification vehicle. If audit assumes multi-page anywhere, it will surface there.

**Findings:**

- The pre-existing "agent made no changes" detection in `clone.ts` was masked on first runs: the changelog fragment was written BEFORE the clean check, so the working tree was never clean. The no-file class also counted as page SUCCESS. Both fixed: tree checked before bookkeeping writes, no-file (after one fresh retry) is now an honest page failure.
- The four teaser generate steps initially each charged the whole teaser-tier estimate against the ledger, which would have tripped the $5 ceiling mid-run — ledger now prices `teasers` per-doc with a ×4 pipeline count in the estimate table.
- `interview` already existed as a profile Source with precedence recon < interview < transcript < operator — the answer bridge needed no schema changes, just a mapper through the existing `mergeCandidate` arbiter.

**Deviations from the plan:**

- Teaser prompts are production-spec markdown under `specs-reference/sales-engine/` (the real engine pattern), not `generate/prompts/doc-XX.ts` modules (the plan's recon had hallucinated that pattern); teaser context (audit findings, homepage copy, vertical pack) is injected as an extra user-prompt section because generation sessions run in an empty staging dir.
- The plan's `scripts/e2e-pitch-portal.sh` (keyless dashboard-boot harness in test.yml) was replaced by 8 dashboard unit tests over the exported route handlers via the existing TempClients harness — same assertion matrix, zero new CI infrastructure, runs in the existing keyless `pnpm test` step. The HTTP-level re-assertion lives in the gated live harness instead.
- `pitch run` seeds a MINIMAL recon-sourced profile (publicName/website/category, all `[UNCONFIRMED]`-rendered) instead of running the full `recon` command — full recon at pitch scale would dominate the budget; it remains an operator opt-in. The spec's "recon + homepage audit" is satisfied at homepage scope.
- Ledger records per-step ESTIMATES as spend (no clean per-run actuals plumbing exists yet); the ceiling therefore enforces against honest estimates. Wiring `usage_events` actuals in is a follow-up.
- The optional real-send leg of the gated harness requires RESEND_API_KEY + PITCH_TEST_INBOX + UPRIVER_UNSUBSCRIBE_SECRET + UPRIVER_OUTREACH_POSTAL; without them it stops at `approve --dry-run`.

**Not done / follow-ups:** first dispatch of `e2e-pitch.yml` (needs repo secrets + the wallet decision); `outreach_suppression` migration not yet applied to the hosted project; fidelity-gate in-run branch verification (gated workflow); actuals-based ledger.
