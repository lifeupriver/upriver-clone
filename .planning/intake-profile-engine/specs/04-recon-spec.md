# Build Spec 04: `upriver recon` (automated profile fill)

Component: M3 — zero-client-effort profile fill composing the wired Firecrawl/Playwright/GSC capabilities plus net-new adapters (socials, GBP, GEO checks, secret shopper), all writing `source: 'recon'` candidates through the same merge path every other source uses.
Built: tier-2 batch, parallel with specs 03 and 05, fresh Claude Code session.
Source of truth: `01-prd.md` §4.1, §8 M3; `@upriver/schemas` `SOURCE_EXPECTATIONS` (the recon-fillable field list is already machine-readable — recon's target is to fill it). Where this spec is more specific, it wins.

## File ownership (parallel-build boundary)

This session OWNS: `packages/cli/src/commands/recon.ts`, `packages/cli/src/recon/` (new dir, everything under it). It must NOT touch: `commands/profile/*` or `packages/cli/src/profile/` (spec 03's), `util/intake-reader.ts` / its consumers / the dashboard (spec 05's), `packages/schemas` (read-only), `generate/*` (read-only — import `profile-io`, `data-source` from there; if spec 03's default flip hasn't merged when you start, code against the resolver as-is; the flip is env-level and does not change your code).

## 1. Purpose and scope

`upriver recon <slug> [--adapters <list>] [--dry-run]`:

1. Loads `client-config.yaml` (url, platform, vertical) and the existing profile (may be empty/absent — recon often runs first).
2. Runs each enabled adapter. Every adapter has the same contract:
   ```ts
   interface ReconAdapter {
     id: 'website' | 'gbp' | 'socials' | 'geo' | 'secret-shopper' | 'serp';
     /** Gather raw evidence (scrapes, API responses) into clients/<slug>/recon/<id>/ via the data source. */
     gather(ctx: ReconContext): Promise<RawEvidence>;
     /** Extract candidates from evidence. LLM-backed adapters use claudeCliCall with --json-schema, read-only mode. */
     extract(evidence: RawEvidence, ctx: ReconContext): Promise<Candidate-with-path[]>;
   }
   ```
   Candidates carry dot-paths + `source: 'recon'` + per-adapter confidence + `evidence` (quote/URL). Extraction prompts embed the relevant profile-section zod shape as `--json-schema` so output is structurally valid before merging.
3. Merges all candidates via `mergeCandidate` through `profile-io` (recon precedence is lowest: it fills gaps, never overwrites interview/operator data; conflicts queue).
4. Reports: fields filled / skipped (higher-precedence existing) / conflicted, per adapter; coverage delta (`deliverableReadiness` before vs after); recon-fillable targets still empty (`SOURCE_EXPECTATIONS.recon` minus filled).

**Adapters this build:**

- **`website`** — Firecrawl scrape of the client URL (reuse `FirecrawlClient`; if `clients/<slug>/pages/` already exists from the audit pipeline, reuse it instead of re-scraping — flag `--fresh` forces). Extracts: identity (name, address, phone, email, hours, socials linked), offerings (names/descriptions; public pricing), positioning claims, content inventory basics (blog count/cadence via sitemap or crawl), visual brand (palette hex via dominant CSS variables if cheaply available — best-effort, low confidence).
- **`gbp`** — Google Business Profile via Firecrawl scrape of the public GBP/Maps listing (no API dependency this build). Extracts: claimed status best-effort, categories, hours, review count + rating, NAP as listed.
- **`socials`** — for each handle found by `website` (or in the profile): Firecrawl scrape of the public profile page. Extracts: handle confirmation, follower count, last-post recency, posting cadence estimate. Low confidence by design.
- **`geo`** — GEO check: queries `claudeCliCall` (read-only, no tools) with "what do you know about <business> in <area>" style prompts and records how the model describes the business (accuracy snapshot stored as evidence; fills `seo.aeo` baseline fields if present in schema, else stores under recon evidence only and reports as informational).
- **`serp`** — competitor discovery: Firecrawl search for the category + area; extracts candidate competitor names/URLs into `competitors.direct` ONLY as low-confidence candidates when that section is empty (operator curates later).
- **`secret-shopper`** — SCAFFOLD ONLY this build: `recon secret-shopper start <slug>` records the sent-inquiry timestamp + channel into `recon/secret-shopper/log.json`; `... record <slug>` records the response and computes response time into `salesProcess.firstTouch.responseTime` as a recon candidate. The actual inquiry sending stays manual (Joshua submits the form). No automation of contacting the client's business.

Out of scope: Ahrefs (no API wired in this repo — note as follow-up; Cowork-side Ahrefs MCP can hand-fill `seo` baseline meanwhile), GSC adapter (needs per-client OAuth — follow-up), screenshots (audit pipeline owns those), anything writing HV `verified: true` (recon NEVER verifies).

## 2. Layout

```
packages/cli/src/
├── commands/recon.ts            thin: flags, adapter selection, report rendering
└── recon/
    ├── types.ts                 ReconAdapter, ReconContext, RawEvidence, PathedCandidate
    ├── run.ts                   orchestration: gather → extract → merge → report (pure-ish, testable)
    ├── merge-candidates.ts      candidate batch → mergeCandidate loop → profile-io write
    ├── report.ts                per-adapter + coverage-delta rendering
    └── adapters/
        ├── website.ts  gbp.ts  socials.ts  geo.ts  serp.ts  secret-shopper.ts
```

Evidence persists under `clients/<slug>/recon/<adapter>/` via the data source. Each adapter ≤ ~300 lines; extraction prompts as exported constants for testability.

## 3. Definition of Done

- [ ] Root `pnpm build` clean; cli tests green (existing + new)
- [ ] Unit tests: merge-candidates (recon never overwrites higher precedence, conflicts queue, never sets verified); run orchestration with mock adapters (partial adapter failure doesn't abort the run — failed adapter reported, others merge); report coverage-delta math; each adapter's extract() against fixture evidence (recorded HTML/JSON fixtures, no live calls in tests)
- [ ] `--dry-run`: gathers nothing, reports which adapters would run and which `SOURCE_EXPECTATIONS.recon` targets are currently unfilled
- [ ] Live acceptance: `upriver recon littlefriends --adapters website,gbp` against the real site (FIRECRAWL_API_KEY required), committed evidence + the report transcript in the changelog; the M3 validation diff — recon-filled values vs the fixture hand-fill for overlapping fields — recorded in the changelog (agreement/disagreement table, even if small)
- [ ] No HV field is ever written with `verified: true` by any recon path (grep + test)
- [ ] Ownership boundary respected (`git diff --name-only` ⊆ owned set + planning docs)
- [ ] Changelog: deviations, live transcript, the validation diff, follow-ups (Ahrefs, GSC OAuth, GBP API)

## Changelog

- 2026-06-04: spec written (tier-2 batch with 03, 05).
