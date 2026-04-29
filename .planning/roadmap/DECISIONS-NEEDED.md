# Decisions needed

Everything an operator/owner has to decide before the codebase can move
further. Grouped by what unblocks. Each item has: what's at stake, the
options, a recommendation where I have one, and exactly what answer I
need from you.

If you can answer 5 minutes' worth, items 1–2 + 4–9 alone unblock most
of what's left.

**Updates since first draft:** Item 3 (push the branch) is now moot —
`main` is synced with `origin/main` after your merge of `ff2fd67`.
Items 14 and 15 are new, prompted by the merged work.

---

## Tier 1 — codebase consistency (no infra needed)

### 1. C.6 — flag name on `upriver audit`

**What's at stake.** The audit command's mode flag has two names floating
around. Pick one and any docs referencing the other get reconciled.

**Options:**
- **`--mode=base|deep|all`** (currently shipped). Engineer-facing
  vocabulary. Three explicit values. Matches what's in the code today.
- **`--audit-mode=sales|operator`** (original spec). Sales-team-facing
  vocabulary. Two values; "sales" = base + deep, "operator" = base only.

**Recommendation:** keep `--mode=base|deep|all`. It's clearer and `all`
is genuinely useful. The spec name reads marketingy without much gain.
If you agree, I'll update `PRODUCT-ROADMAP.md` to remove the
sales/operator framing.

**What I need from you:** "keep `--mode`" or "rename to `--audit-mode`".

---

### 2. C.7 — `estimatedImpact` schema on findings

**What's at stake.** Every audit finding carries an `estimatedImpact`
field. Two competing schemas:

- **Shipped:** `{ scorePoints: number; description: string }` —
  quantitative, heuristic-derived from priority × effort. Used by
  `fixes plan` to render an "Est. impact" column.
- **Spec:** `{ metric: 'bookings'|'pageviews'|'cwv'|'rankings';
  magnitude: 'small'|'medium'|'large'; rationale: string }` —
  business-vocabulary, qualitative.

**Why it's a real call, not just naming.** A.4 (the report hero) shows
"X bookings lost / month" stats. The spec wanted those to come from
C.7's `metric` field. Shipped reality has them coming from a separate
`synthesize/impact-metrics.ts` path. Two parallel impact systems exist.

**Options:**
- **(a) Keep current.** Update spec to reflect that A.4 and C.7 are
  independent. Simplest.
- **(b) Migrate to spec.** Re-shape every audit pass to populate
  `metric`/`magnitude`/`rationale`. Re-wire A.4 hero to read from
  findings instead of `impact-metrics.ts`. ~half-day refactor across
  audit-passes/.
- **(c) Keep both.** Add a `businessImpact` field next to
  `estimatedImpact`. More fields, both paths intact, more confusing.

**Recommendation:** (a). The shipped score-points version is genuinely
useful for the technical "fixes plan" view; the report hero already
gets the business-framed numbers it needs from the standalone path. No
real win from migration.

**What I need from you:** "keep current", "migrate to spec", or "keep both".

---

### 3. ~~Push the 52-commit branch?~~ — RESOLVED

**Status.** Moot. After this doc was first drafted, you pulled / merged
`ff2fd67` from a parallel branch and `main` is now synced with
`origin/main`. No remaining divergence to push. Future work follows
whatever PR-vs-direct-push convention this repo uses.

---

## Tier 2 — sales operations (small env-var changes)

### 4. `UPRIVER_REPORT_HOST` value

**What's at stake.** `upriver report send` builds share URLs as
`<UPRIVER_REPORT_HOST>/<slug>-<token>`. Defaults to
`https://reports.upriver.com`. If your hosted-report URL is something
different, set it.

**What I need from you:** the host (e.g.
`https://reports.upriver.com`, `https://upriver.com/r`, etc.) — or
"use the default".

---

### 5. SMTP / email provider for `upriver report send`

**What's at stake.** Today `upriver report send` logs the email body
and link to stdout for the operator to forward by hand. Real delivery
needs an SMTP credential.

**Options:**
- **(a) Resend** — modern API-based, ~10 lines of code to wire.
- **(b) Postmark** — transactional-email-focused, similar shape.
- **(c) SendGrid** — older, fine.
- **(d) Plain SMTP via `nodemailer`** — works against any provider
  including Gmail App Passwords or Mailgun.
- **(e) Skip** — keep the manual-forward workflow.

**Recommendation:** (a) Resend. Clean API, Vercel-native, I can wire
it in ~30 minutes once you provide a `RESEND_API_KEY`.

**What I need from you:** which provider (or "skip"), and the API
key/credential I should expect at which env var name.

---

### 6. Pricing copy for `next-steps.astro`

**What's at stake.** The audit report's `next-steps.astro` page has
three scope tiers (Polish / Rebuild / Rebuild + content) with "Contact
us" placeholders. Real prospects see these placeholders today.

**What I need from you:** for each tier, either a price ("$2,500",
"starting at $8,000", "from $12k") or "contact us" if you want the
placeholder kept. Plus a one-line description per tier if you want to
override the current copy.

Shape:
```
Polish:  $___  — "<one-line description>"
Rebuild: $___  — "<one-line description>"
Rebuild + content: $___  — "<one-line description>"
```

---

### 7. Firecrawl USD/credit conversion rate

**What's at stake.** `upriver cost <slug>` displays a dollar estimate
based on `DEFAULT_USD_PER_CREDIT = 0.001` ($0.001/credit). If the
real Firecrawl rate on your plan is different, the displayed cost is
proportionally wrong.

**What I need from you:** the actual USD-per-credit on your Firecrawl
plan (look at last invoice ÷ credits used), or "use the default".

---

### 8. `UPRIVER_RUN_TOKEN` for deployed dashboards

**What's at stake.** When the dashboard runs anywhere accessible
beyond localhost, the F.5 token gate should be enabled by setting
`UPRIVER_RUN_TOKEN`. Until you set it, `/api/run/*` is open to any
same-origin caller.

**What I need from you:** confirmation you'll set this before any
deploy + a value (any random string ≥ 24 chars works; I'd suggest
generating with `openssl rand -hex 24`). If you're staying local-only
forever, say so and we leave it unset by design.

---

### 9. `Co-Authored-By: Claude` trailer policy

**What's at stake.** `CLAUDE.md` says commits should end with a
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
trailer. The harness rejects this as fabricated authorship and every
commit in the resumed sessions has shipped without it.

**Options:**
- **(a) Remove the trailer requirement from `CLAUDE.md`** — current
  reality. Cleanest.
- **(b) Keep the requirement, add the trailer manually** — I'd need
  you to bypass the harness check; not great.
- **(c) Use a different trailer** — e.g. `Generated-By: claude-code`
  which the harness won't flag as fabricated authorship.

**Recommendation:** (a) or (c). I'll do whichever you prefer.

**What I need from you:** which option (a/b/c).

---

## Tier 3 — infrastructure (real architectural calls)

These each need ~one product/eng meeting to resolve. They unblock
specific roadmap items.

### 10. Preview-deploy infrastructure (unblocks E.5 full)

**What's at stake.** E.5 full = automated re-audit chain after
`upriver improve` runs: deploy preview → re-scrape preview URL →
re-audit → diff → emit `improvement-report.md`. Needs a preview
deploy convention.

**Options:**
- **(a) One Vercel project, branch-per-client, branch URL = preview.**
  Cheap. Each client's improve PRs land on `improve/<slug>-<track>`,
  Vercel auto-deploys, scrape that URL.
- **(b) One Vercel project per client.** More overhead but cleaner
  separation. Per-client domains possible.
- **(c) Self-hosted preview server** — e.g. run `astro preview` on a
  port via the existing `clone/verify.ts` pattern, scrape `localhost`.
  No external infra but the scrape can't see what a real browser
  would.

**Recommendation:** (a). Cheapest, integrates with existing Vercel
flows, branch URLs are stable enough for scraping.

**What I need from you:** option choice. If (a) or (b), I need a
Vercel project handle / token to wire in. If (c), nothing — I can
build that locally.

---

### 11. Supabase storage bucket + signed-URL conventions (unblocks F.6 full + F.5 full + part of A.6)

**What's at stake.** Three separate features want Supabase storage:
- F.6 full — sync `clients/<slug>/` to a bucket so the dashboard can
  run from anywhere.
- A.6 — host the static report bundle at signed URLs.
- F.5 full — Supabase auth (separate decision; see #12).

**Decisions:**
- **Bucket name(s).** One bucket with prefixes (`clients/`, `reports/`)
  or two buckets? Recommendation: one bucket, prefixed.
- **Signed URL TTL.** Reports are shareable cold; how long should the
  link work? Recommendation: 90 days, refreshable.
- **Retention.** Keep all client data forever, or delete after N days
  of inactivity? Recommendation: keep client data; rotate report
  shares every 90 days.
- **Public vs signed.** Reports — public-but-unguessable URL or signed
  URL that expires? Recommendation: signed.

**What I need from you:** answers on all four bullets, plus the
Supabase project URL + service-role key (or confirmation that the
existing `UPRIVER_SUPABASE_*` env vars in `.env.example` are the right
project).

---

### 12. Auth provider for the dashboard (unblocks F.5 full)

**What's at stake.** F.5 full = "Operator login = full access; client
view-link = read-only on their own slug." The shipped F.5 is a single
shared token; real F.5 needs user identity.

**Options:**
- **(a) Supabase Auth** — pairs with #11; magic-link flow; per-user
  rows; can do the operator/client split via row-level security.
- **(b) Vercel Authentication** — bolted onto the deploy at the
  platform level. Operator-only; no per-client view-link option.
- **(c) Clerk** — drop-in auth, more polished UX, costs money beyond
  free tier.
- **(d) Email magic links via Resend** — DIY, simplest, no provider
  beyond email.

**Recommendation:** (a) Supabase Auth. Shares infra with #11,
supports the operator/client distinction the spec wanted.

**What I need from you:** option choice + confirmation you want
client-facing view-links at all (vs operator-only access).

---

### 13. `ANTHROPIC_API_KEY` in deploy environment

**What's at stake.** When the dashboard deploys, deep audits run there
too unless the operator only ever runs them locally. The Anthropic key
needs to be present.

**What I need from you:** confirmation you'll set `ANTHROPIC_API_KEY`
in the deploy env, plus which model tier you want as default
(Sonnet 4.6 is the current default; Opus 4.7 is overkill for most
deep passes).

---

### 14. Two deep-pass flags — consolidate or keep separate?

**What's at stake.** After the merge of `ff2fd67`, `audit.ts` has two
flags that both trigger "deep" passes:

- **`--mode=deep|all`** runs the C.3–C.5 LLM passes via the
  `DEEP_PASSES` array + injectable `AgentRunner`. Three passes today:
  `content-strategy`, `conversion-psychology`, `competitor-deep`.
- **`--deep`** boolean runs 9 tooling-driven passes (`design-deep`,
  `web-quality` Lighthouse, `audit-website` squirrelscan,
  `accessibility-deep`, `cwv-deep`, `analytics-tracking`,
  `trust-signals`, `cross-browser`).

Both populate `passed[]`. An operator who wants "everything" runs
`upriver audit <slug> --mode=all --deep`. That works but isn't
intuitive.

**Options:**
- **(a) Keep both, document.** Two flags, two systems, operator
  picks. Simplest from here. Add a note to `--help` clarifying.
- **(b) Merge into one flag with values.** e.g.
  `--mode=base|llm-deep|tooling-deep|all`. Consolidates UX; needs
  a small refactor in `audit.ts` (~30 min).
- **(c) Map `--deep` onto `--mode=tooling`.** Keep the boolean alias
  but delegate to a unified `mode` enum internally. Backwards-compat
  hatch for any existing scripts.

**Recommendation:** (b) or (c). The two-flag UX will trip operators.
(c) is the lowest-risk path — keeps existing `--deep` invocations
working while adding the unified flag.

**What I need from you:** option choice. If (b), pick the value names
(my suggestion: `base | llm-deep | tooling-deep | all`). If (c), I'll
keep the existing flag names and just consolidate the dispatch code.

---

### 15. Are the new tooling-driven passes part of the roadmap?

**What's at stake.** `ff2fd67` shipped 9 tooling-driven deep passes
(`design-deep`, `web-quality`, `audit-website`, `accessibility-deep`,
`cwv-deep`, `analytics-tracking`, `trust-signals`, `cross-browser`)
plus `runPreflight`. The original `PRODUCT-ROADMAP.md` doesn't
mention them — they live outside Workstream C's named scope.

This matters for two reasons:
- **Drift report accuracy.** Currently I treat them as
  "beyond-roadmap addition" in DRIFT-REPORT.md. If you consider them
  part of the roadmap, several "narrower-than-spec" findings (C.2
  typography, D.1 token-adherence) get reclassified as "covered by
  adjacent passes."
- **Future work.** If they're in scope, they need their own status
  tracking, test coverage, and integration with `run all`. If
  they're a one-off, they stay where they are.

**Options:**
- **(a) Add them as Workstream I.** "I. Tooling-driven deep audit"
  with each of the 9 passes as a numbered sub-item. Future drift
  audits track them alongside A–H.
- **(b) Fold into Workstream C as C.8–C.16.** They're audit depth,
  which is exactly what C is about. Makes C a much bigger workstream.
- **(c) Treat as out-of-roadmap.** They live in
  `packages/cli/src/deep-audit/` and are tracked by code review only.
  Roadmap stays focused on the original product narrative.

**Recommendation:** (a). The 9 passes are coherent enough to be their
own workstream and fit awkwardly inside C. New workstream gives a
clean home for follow-on items (G.4 consolidation, run-all
integration, the `--deep` UX decision in #14).

**What I need from you:** option choice (a/b/c). If (a), I'll draft a
Workstream I block for `PRODUCT-ROADMAP.md`.

---

## How I'd recommend you triage these

If you have **5 minutes:** answer #1, #2, #6, #7, #9, #14. All
trivial, all unblock real downstream work.

If you have **15 minutes:** add #4 (report host), #5 (SMTP provider),
#8 (run token), #15 (roadmap scope for new passes).

If you have **a meeting's worth:** add #10–#13. These are real
architecture calls, but each one is a single hour of my work once
decided.

---

## What I'd avoid deciding for you

**Not on this list, but worth flagging.** A few things I noticed
during the drift audit that aren't roadmap-spec'd but are real
choices coming up:

- **Test runner for the dashboard package.** Doesn't have one. Two
  shared utilities (the SSE consumer in `NewClientForm` /
  `PipelineStages`, the meta-tag token reader) could use tests. Not
  blocking anything yet.
- **Whether to remove the now-unused `PipelineTrack.astro`.** It's
  the static stage list that `PipelineStages.tsx` replaced. Dead
  code; removing it is one commit. I left it in case the React
  island ever needs reverting.
- **Where to host `marketingskills-main/`.** It's a separate repo
  (or directory) with 38 skills. Some are symlinked into `.agents/skills/`
  via H.2. The relationship between the two repos isn't spelled out
  anywhere. If you ever move/rename either, the `.gitignore` rules
  in the dashboard repo need updating.
