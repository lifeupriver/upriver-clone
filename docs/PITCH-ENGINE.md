# The pitch engine (`upriver pitch`)

The prospect-facing sales tool (Build Spec 19): point it at a prospect's website and it clones **just their homepage**, generates a four-doc teaser bundle, mints a token-gated preview link and a short questionnaire link, and drafts (never sends) an outreach email. Everything lands in `clients/<slug>/` at `stage: prospect`, in draft state, until you explicitly approve the send.

The autonomy level is deliberately **L1**: batch generation is automated, but a human approves every send. There is no auto-send flag anywhere in the codebase — that's a future decision gate, not a config option.

---

## The lifecycle at a glance

```
pitch run <url>          → draft bundle on disk (preview, teasers, questionnaire link, email draft)
pitch batch <file>       → the same over a prospect list, with per-prospect + batch spend ceilings
pitch approve <slug>     → THE ONLY PATH THAT SENDS: renders email + links, checks suppression, sends via Resend
   (prospect opens the preview → viewedAt recorded; answers the questionnaire → interview-responses.json)
pitch status             → funnel view: status, spend (est + actuals), sent, viewed, answered, expiry
pitch convert <slug>     → flips stage: prospect → client, maps questionnaire answers into the profile
pitch revoke <slug>      → 10-second takedown: kills the share + interview tokens, unstages the preview
```

State machine: `draft | fidelity-fail | over-budget | approved | sent | revoked`, tracked in schema-versioned `clients/<slug>/pitch/state.json` (v1), updated after every step.

## `pitch run <url>`

1. Derives the slug from the registrable domain (`wildflourbakery.com` → `wildflourbakery`), validated by `assertSafeSlug`. **Refuses to run against an existing client directory** (`stage: client` or missing stage) unless `--force-prospect` — a pitch must never clobber a paying client's data.
2. Scrapes the homepage only (politeness: single page, rate-limited), seeds a minimal recon-sourced profile, runs the audit at homepage scope into a standard `audit-package.json`.
3. Scaffolds and clones the homepage via headless Claude Code (`runAgent` only — no Bash tool, env allowlist, 20-minute timeout), with the hardening trio: prompt-size preflight, one fresh retry on the no-file failure class, and **fidelity-assert-before-persist** — a homepage scoring below `PITCH_FIDELITY_MIN` (70) is never staged to the portal (state `fidelity-fail`, exit 22, worktree preserved for inspection).
4. Builds the clone to static HTML under `clients/<slug>/pitch/preview/`, generates the four teasers, writes the short prospect interview guide, mints the share token (default expiry 14 days, `--expires-days` capped at 30), and writes `pitch/email-draft.md`.

Flags: `--slug`, `--name`, `--vertical`, `--max-spend-usd` (default 5), `--expires-days`, `--base-url`, `--force-prospect`, `--from=<step-id>` (resume), `--dry-run`.

`--dry-run` is keyless and offline: it prints the step plan and the cost-estimate table against the ceiling and exits 0 — it's a pinned row in the CLI smoke matrix.

### Spend ceiling (enforced in code)

A ledger in `pitch/state.json` tracks Firecrawl credits, agent seconds, and estimated USD. The ceiling is checked **before** each costed step: if the next step's estimate would exceed `--max-spend-usd`, the run aborts cleanly with exit **21**, preserves partial artifacts, and sets state `over-budget`. Enforcement is estimate-based by design (actuals only exist after spend); `pitch status` reconciles actuals from `token-and-credit-usage.log` into its display afterwards.

## `pitch batch <file>`

Newline-delimited URLs (`#` comments allowed), run **sequentially** for politeness and budget legibility. Per-prospect failures (fidelity, budget, scrape error) are isolated — log, continue, summarize — and the command exits non-zero if any prospect failed, with a per-prospect outcome table. Two ceilings: `--max-spend-usd` per prospect and `--max-batch-spend-usd` (default 50) over the summed ledgers, checked before each prospect. **Batch never sends** — it produces drafts; `approve` stays per-prospect.

## The teaser bundle (four docs, no pricing)

Generated with Spec 14 `[UNCONFIRMED]` hedging mandatory — a wrong assertion in a sales teaser is brand damage. Portal order:

1. **Homepage before/after** — their current homepage vs the rebuilt preview, side by side. The centerpiece.
2. **Top-3 quick wins** — prioritized findings from the homepage audit, framed as immediate value.
3. **Mini brand-voice sample** — a rewritten hero/about block constrained to rewriting *their* scraped copy only (no invented facts); flagged in the approve gate as requiring explicit operator eyeballs.
4. **Vertical-aware opportunity snapshot** — "businesses like yours" framing from the matching vertical pack (generic fallback when no pack matches).

**No pricing anywhere** — no tiers, no numbers, no package names. Pricing waits for the conversation.

## The preview portal

Dashboard route `/pitch/<slug>?token=…`, gated by a file-backed share token (`pitch/share.json` — sha256-hashed, `expiresAt`, `revoked` flag). Every response carries `X-Robots-Tag: noindex, nofollow` plus the meta tag; missing/expired/revoked tokens → 4xx. The preview is a rebuild of the prospect's *own* content: never published as ours, never indexable, never linked from client-facing views, and it dies with the token or on `pitch revoke`.

First **valid** view (200-served preview or teaser) writes `pitch/views.json` once — a dashboard-owned, write-once file (so it can't race the CLI's `state.json` writes). `pitch status` surfaces it as the VIEWED column.

## The questionnaire

A short prospect interview guide (~6–8 questions: identity confirmation, reaction to the preview, biggest goal, current-site pain, timeline, "anything we got wrong?") served by the existing magic-link interview flow. Answers persist to `interview-responses.json` keyed by stable question ids — chosen so the `convert` mapping table stays trivial.

## `pitch approve <slug>` — the only send path

Renders the exact email body, the portal URL, the questionnaire URL, and the teaser list, then requires interactive confirmation (`--yes` for scripted local use). It **refuses** when: the recipient is suppressed, the state isn't `draft`/`approved`, the share token is expired, the fidelity gate failed, or sender/postal identity is missing.

Compliance is built into the send path, not convention:

- **Real sender identity** — `--from` → `UPRIVER_PITCH_FROM` → the report-from default; CAN-SPAM postal footer from `--postal` → `UPRIVER_OUTREACH_POSTAL`.
- **One-click unsubscribe** — every email footer carries an HMAC-signed unsubscribe link (`UPRIVER_UNSUBSCRIBE_SECRET`, shared by the CLI and the dashboard's `/api/unsubscribe` endpoint), minted at send time so drafts stay keyless. Unsubscribes insert into the Supabase `outreach_suppression` table; suppression is never stored in the repo (PII lives in Supabase only).
- **No deception** — the email says plainly that we built a preview rebuild of their homepage; nothing implies they requested it or that it's live.

Sending requires `RESEND_API_KEY`.

## `pitch convert <slug>` — the bridge to a real engagement

Flips `stage: prospect → client` in `client-config.yaml` and maps the questionnaire answers into `identity.*` / profile candidate fields through the existing `mergeCandidate` arbiter — source-tagged `interview`, so verified data is never overwritten. Idempotent; refuses when there's no `interview-responses.json` unless `--no-answers`. An engaged prospect has already started onboarding — from here the normal engagement pipeline takes over.

## `pitch status [<slug>]` / `pitch revoke <slug>`

`status` is the funnel view across `stage: prospect` clients: state, spend (shown as `$3.10 (est $2.40 + act $0.70)` when `token-and-credit-usage.log` exists), sent-at, VIEWED, questionnaire-answered, token expiry. `revoke` is takedown-on-request as a single command: revokes the share and interview tokens, sets state `revoked`, unstages the portal preview.

## Harvesting: every pitch is a data point

Pitch runs emit only standard artifact shapes (`audit-package.json`, `clone-qa/summary.json`, versioned `pitch/state.json`), so `upriver harvest` sweeps them into the findings corpus with no per-run adapters — every pitch run doubles as a site-diversity matrix data point. The harvest never reads tokens, emails, or questionnaire answers; the corpus is the sanitized, committable derivative of the gitignored client dirs. See the site-diversity section of [`TESTING.md`](TESTING.md) and `upriver harvest` in [`COMMAND-REFERENCE.md`](COMMAND-REFERENCE.md).

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `UPRIVER_PITCH_FROM` | `approve` | Sender address (falls back to the report-from default). |
| `UPRIVER_OUTREACH_POSTAL` | `approve` | Physical-address footer line (CAN-SPAM). Refuses to send without one. |
| `UPRIVER_UNSUBSCRIBE_SECRET` | `approve` + dashboard `/api/unsubscribe` | HMAC secret for storage-free unsubscribe tokens. Must match across both surfaces. |
| `RESEND_API_KEY` | `approve` | The actual send. |
| `UPRIVER_DASHBOARD_BASE_URL` | `run`, `approve` | Portal/questionnaire link origin (or pass `--base-url`). |

## Exit codes

| Code | Where | Meaning |
|---|---|---|
| 21 | `pitch run` | spend ceiling would be exceeded — aborted before the costed step, state `over-budget` |
| 22 | `pitch run` | homepage fidelity below `PITCH_FIDELITY_MIN` — nothing staged, state `fidelity-fail` |
| 51–58 | `scripts/e2e-pitch.sh` | gated live e2e, distinct code per phase |

## Testing

Unit suites cover slug derivation, state transitions, ledger math and ceiling aborts, the approve refusal matrix, suppression, email assembly, and the answer→profile mapping; the dashboard portal's token-gate matrix (noindex, missing/expired/revoked → 4xx, write-once view recording) is unit-tested over the real handlers. `scripts/cli-smoke.mjs` pins every `pitch` subcommand's `--help` plus the keyless `pitch run --dry-run` row. The live end-to-end (`scripts/e2e-pitch.sh`, exit codes 51–58, dispatched via the gated `e2e-pitch.yml`) targets the **owned** hosted fixture site only — never a real prospect in CI.
