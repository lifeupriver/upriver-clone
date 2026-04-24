---
name: audit-methodology
description: Use when running an Upriver audit, explaining what each of the 10 passes measures, scoring a site, or interpreting findings. Also use when a client asks "how did you score this?" or when triaging which findings go in the fixes scope. Covers: how to run `upriver audit`, the 10 dimensions, the P0/P1/P2 priority model, the light/medium/heavy effort model, the 0-100 score calculation, and how to read audit/summary.json.
metadata:
  version: 1.0.0
---

# Upriver audit methodology

You are running a website audit for a small-business client engagement. The audit produces a reproducible score across 10 dimensions and a list of prioritized findings that become the fixes scope.

## When to apply this

- Running `upriver audit <slug>` and interpreting the output.
- Deciding which findings go in `fixes-plan-scope.md`.
- Explaining scores to a client during the interview or handoff.
- Writing a custom audit pass (add to `packages/audit-passes/src/<dim>/`).

## The 10 dimensions

Every pass implements `run(slug, clientDir) → AuditPassResult` and reads scraped page JSON from `clients/<slug>/pages/*.json`. The dimensions in order of priority:

1. **seo** — Crawlability, on-page tags, heading structure, thin content, analytics, HTTPS, duplicate titles, noindex traps. The P0 findings here are the ones that cost the site rankings today.
2. **content** — Copy quality, banned marketing words, weasel superlatives, value prop clarity, CTAs per page. Overlaps with the copywriting skill when remediation is needed.
3. **design** — Color contrast, typography hierarchy, mobile responsiveness signals, design token consistency. Runs against the scraped rawHtml and design-tokens.json.
4. **sales** — Conversion infrastructure: contact forms, phone CTAs, email capture, social proof placement, pricing clarity. Also flags missing pages (e.g. no /contact, no /pricing).
5. **links** — Internal link graph, broken links, anchor text quality, orphan pages, link depth.
6. **schema** — Structured data markup: LocalBusiness, FAQ, Review, Event, Service. Missing or malformed JSON-LD.
7. **aeo** — Answer Engine Optimization: Q&A content, direct-answer headlines, FAQ coverage, citation-friendly copy for LLM-based search.
8. **local** — Local SEO signals: NAP consistency, Google Business Profile hints in markup, city/region keywords, hours markup.
9. **backlinks** — External link profile signals observable from crawled data (outbound-only detectable without Ahrefs).
10. **competitors** — Comparison to patterns observed on competing sites in the same vertical (when competitor data is present).

All 10 run in parallel via `Promise.allSettled`. A failing pass does not kill the run; it shows up as `[ERR]` in the summary and the other dimensions still complete.

## Priority model (P0 / P1 / P2)

- **P0 — Critical.** The issue is actively costing the client traffic, conversions, or trust. Fix before launch. Examples: missing analytics, HTTPS on HTTP, no H1, noindex on a money page, broken contact form, no CTA above the fold.
- **P1 — Important.** The issue holds the site back but isn't actively destroying it. Fix within the engagement. Examples: duplicate title tags, thin pages, missing meta descriptions, weak internal linking, no schema markup.
- **P2 — Minor.** Nice to have. Flag for the client but don't block the launch. Examples: multiple H1s on a blog page, banned marketing words in a single paragraph, non-critical alt text gaps.

When in doubt, ask: _would I tell the client this is the reason they're not getting inquiries?_ If yes, P0. If it's the reason they plateau after the basics are fixed, P1. Otherwise P2.

## Effort model (light / medium / heavy)

- **light** — A single-file change, no copywriting required, no client input needed. Minutes to an hour.
- **medium** — Multiple files or one file plus a copy edit. An hour to half a day.
- **heavy** — Requires new content (page, FAQ section, testimonial solicitation), client interview answers, or a visual pass. A day or more.

Effort drives which phase a finding lands in when `upriver fixes plan` runs. Light P0s go in Phase 1 (Quick wins); heavy findings land in Phase 4 (Content build-out).

## Score calculation

Each pass returns a 0-100 score computed by `scoreFromFindings` in `packages/audit-passes/src/shared/finding-builder.ts`:

- Start at 100.
- Deduct 15 per P0, 7 per P1, 3 per P2.
- Floor at 0.
- If the pass finds nothing, return 90 (not 100 — absence of findings means "we didn't detect any," not "perfect").

The overall site score in `audit/summary.json` is the arithmetic mean of dimension scores. Grade bands:

| Score | Grade |
|-------|-------|
| 85+   | A |
| 70-84 | B |
| 55-69 | C |
| 40-54 | D |
| <40   | F |

**A score of 70 is not good.** It means the site is broadly functional but has meaningful gaps in most dimensions. Clients often expect a 90 because "my site looks fine" — the audit's job is to surface what they can't see.

## How to interpret findings for a client

Every finding has:

- `title` — one-line description of the issue.
- `description` — what was observed (with counts: "12 pages missing canonical tags").
- `why_it_matters` — the revenue / ranking / trust translation. This is what goes in the client-facing deck.
- `recommendation` — what to do.
- `evidence` / `affected_pages` / `page` — traceability back to the scraped data.

When explaining to a client, lead with `why_it_matters`, not `title`. Clients don't care that canonical tags are missing — they care that "Google is treating duplicate versions of your venue page as separate pages, which splits the ranking signal."

## Running the audit

```bash
upriver audit <slug>                  # run all 10 passes
upriver audit <slug> --pass seo       # single pass
upriver audit <slug> --out /tmp/audit # custom output dir
```

Output:

```
clients/<slug>/audit/
├── seo.json
├── content.json
├── design.json
├── ...
└── summary.json   ← aggregate scores + counts
```

`summary.json` is the source of truth for the overall score and finding counts. When building downstream docs (`design-brief`, `fixes-plan`, client decks), read from `audit-package.json` (produced by `synthesize`), not from individual pass files.

## What this skill does NOT cover

- _How to write findings well._ See `packages/audit-passes/src/shared/finding-builder.ts` — use the `finding()` helper; fill in `why` so the finding is client-ready.
- _How to extend with a new pass._ Copy `src/seo/index.ts`, register it in `src/index.ts` and in `packages/cli/src/commands/audit.ts`'s `ALL_PASSES`.
- _How to score subjectively._ The skill is deliberately deterministic. If you want LLM-based scoring, wrap it in `synthesize`, not `audit`.
