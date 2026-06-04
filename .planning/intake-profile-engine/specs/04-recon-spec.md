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

- [x] Root `pnpm build` clean; cli tests green (existing + new) — 321 cli tests pass
- [x] Unit tests: merge-candidates (recon never overwrites higher precedence, conflicts queue, never sets verified); run orchestration with mock adapters (partial adapter failure doesn't abort the run — failed adapter reported, others merge); report coverage-delta math; each adapter's extract() against fixture evidence (recorded HTML/JSON fixtures, no live calls in tests) — 55 recon tests
- [x] `--dry-run`: gathers nothing, reports which adapters would run and which `SOURCE_EXPECTATIONS.recon` targets are currently unfilled
- [x] Live acceptance: `upriver recon littlefriends --adapters website,gbp` against the real site (FIRECRAWL_API_KEY required), committed evidence + the report transcript in the changelog; the M3 validation diff — recon-filled values vs the fixture hand-fill for overlapping fields — recorded in the changelog (agreement/disagreement table) — see `04-recon-evidence/`
- [x] No HV field is ever written with `verified: true` by any recon path (grep + test)
- [x] Ownership boundary respected (`git diff --name-only` ⊆ owned set + planning docs)
- [x] Changelog: deviations, live transcript, the validation diff, follow-ups (Ahrefs, GSC OAuth, GBP API)

## Changelog

- 2026-06-04: spec written (tier-2 batch with 03, 05).
- 2026-06-04: **built** (branch `build/04-recon`). Layout per §2: `commands/recon.ts` (thin) + `commands/recon/secret-shopper/{start,record}.ts`; `recon/{types,run,merge-candidates,report,extraction,build-context,firecrawl-search}.ts` + `recon/adapters/{website,gbp,socials,geo,serp,secret-shopper,index}.ts`. Built test-first (55 recon unit tests, all offline; 321 cli tests green; root `pnpm build` clean). Adapters are dependency-injected (`scrape`/`search`/`llm`/`ds` on `ReconContext`) so `gather`/`extract` run against recorded fixtures with zero network under test.

  **Live acceptance** — `upriver recon littlefriends --adapters website,gbp` against the real site (`littlefriendslearningloft.com`, a live Square Online site; FIRECRAWL_API_KEY + logged-in `claude` CLI). Result: **14 filled, 1 skipped, 3 conflicted**; recon coverage 4→8 of 12 targets (+4); deliverables doc-06 and doc-16 advanced. Evidence + full transcript committed under `04-recon-evidence/` (gather output `website/homepage.json`, `website/source.json`, `gbp/listing.json`; `report-transcript.txt`; `merged-profile.json`; `profile-conflicts.json`). The live run used an isolated `UPRIVER_CLIENTS_DIR` so it did **not** mutate the shared M1 worked-example `clients/littlefriends/profile.json`.

  **M3 validation diff — recon vs. hand-fill (overlapping fields).** Recon discovered the real business is a **Montessori** preschool at **290 North St, Newburgh, NY** (the hand-fill carried synthetic placeholders — Kingston / `(518) 555-0142`). Baseline = the M1 hand-fill; `clients/littlefriends/profile.json` is value-identical to the named fixture `packages/schemas/src/fixtures/littlefriends.profile.json` for every compared field (`offerings.core` differs only in a cosmetic sub-field — same `name` + `transcript` source → same conflict verdict), so this diff equals the fixture diff.

  | Field | Hand-fill (source) | Recon | Outcome | Assessment |
  |---|---|---|---|---|
  | identity.publicName | "Little Friends Learning Loft" (recon) | same | filled | **agree** |
  | identity.category | "Preschool & child care" (recon) | "Montessori preschool" | filled (same-source update) | recon more specific/accurate |
  | identity.phone | "(518) 555-0142" placeholder (recon) | "(732) 343-0005" | filled (same-source update) | recon = real GBP number |
  | identity.hours | "Mon–Fri 7:30am–5:30pm" (recon) | "Thursday 9 AM–5 PM…" | filled (same-source update) | **recon weaker** — Maps *search* page shows only today's hours (→ GBP API follow-up) |
  | identity.primaryAddress | (empty) | "290 North St, Newburgh, NY 12550" | filled (gap) | gap-fill, real |
  | identity.serviceArea / socialHandles / gbp | (empty) | Newburgh+Hudson Valley / @littlefriendslearningloft / claimed | filled (gap) | gap-fill |
  | content.reviewPlatforms / testimonials / visualBrandAssets | (empty) | Google 5★ / quotes / hex palette | filled (gap) | gap-fill |
  | seo.local, positioning.outcomeDelivered | (empty) | filled | filled (gap) | gap-fill |
  | **offerings.core** | "Full-day preschool program…" (**transcript**) | "Montessori School Program…" | **conflict → queued** | recon never overwrote transcript |
  | **positioning.keyDifferentiator** | "Low ratios, loft-based…" (**transcript**) | "Montessori multi-age…" | **conflict → queued** | recon never overwrote transcript |
  | **pricing.shareable** | "Registration $75" (**recon, verified:true**) | "skateboarding lesson $30" | **conflict → queued** | recon never overwrote a **verified** field |

  Headline: recon filled 9 empty targets, corrected 3 same-source placeholders, and **queued 3 conflicts rather than overwriting** higher-precedence (transcript ×2) or verified (×1) data — the "fills gaps, never overwrites" guarantee, demonstrated live. **No `verified:true` written by recon:** the only verified leaf (`pricing.shareable`) is byte-identical before/after (same `updatedAt`); grep of `recon/` finds no `verified: true` literal (only a test name); unit test `recon fills an HV field unverified` + `recon never flips a verified field` lock it.

  **Deviations:**
  1. **`--json-schema` not passed to the CLI.** With `--json-schema`, the CLI returns the structured payload in `envelope.structured_output` while `result` becomes prose/empty — and the shared `util/claude-cli.ts` (read-only, **outside this build's ownership boundary**) returns only `result`. So `recon/build-context.ts` embeds the candidate JSON-Schema **in the prompt** (`embedSchemaInPrompt`) and parses JSON from `result`; the **precise** structural-validity guarantee is the post-hoc zod gate `structurallyValid` (parses every candidate value against `@upriver/schemas` before merge, dropping/reporting failures). Adapters still declare their `candidateListSchema` (path-enum embeds the section shape, per §1.2). This was the bug the live run caught: with `--json-schema`, extraction returned empty. Note this embedding-in-prompt approach **is** the actual `synthesize` pattern PRD §4.1 names ("the same pattern `synthesize` uses today") — `synthesize` embeds the JSON shape in the prompt and parses `result`; it does **not** pass `--json-schema`. So recon realizes the spec's stated intent rather than departing from it.
  2. **Secret-shopper subcommands** live at `commands/recon/secret-shopper/{start,record}.ts` (the §2 layout listed only `commands/recon.ts`; §1.6 requires the two subcommands, which necessarily nest under `commands/recon/`). oclif command+topic coexistence (`recon` + `recon secret-shopper …`) verified. All logic is in the unit-tested `recon/adapters/secret-shopper.ts`; the commands are thin.
  3. **Unit fixtures are inlined recorded payloads** (markdown/JSON consts in `*.test.ts`) — zero live network in tests, per DoD.
  4. **geo is evidence-only** — a GEO description snapshot doesn't map to `seo.aeo` (questionKeywords/schemaStatus), so `extract` returns no candidates and the snapshot is persisted as evidence (§1 sanctioned).
  5. **socials** writes only `identity.socialHandles` (follower count / recency / cadence have no schema home → recorded in `evidence`); it reads handles already on the profile, so run `website` first.
  6. Website scrape uses `onlyMainContent: true` and the prompt strips image/link URLs (`cleanPageText`) + leads with page metadata — without this, Square/Wix social-feed homepages drown the signal in CDN image URLs (the live run's first pass extracted nothing).
  7. `clients/littlefriends/client-config.yaml` was created for the live run (absent before; `clients/` is gitignored so it is not committed). Evidence lives under `04-recon-evidence/` because `clients/` is gitignored.

  **Follow-ups:**
  - **Ahrefs** — no API wired in this repo; `seo.baseline` (DR/traffic/keywords/backlinks) is left empty by recon. Cowork-side Ahrefs MCP can hand-fill `seo` baseline meanwhile.
  - **GBP API** — the no-API Maps *search-page* scrape captures only "today's" hours and a coarse listing; categories/attributes/full hours need the Google Business Profile API (per-client OAuth). This is the main quality gap the live diff exposed.
  - **GSC adapter** — needs per-client OAuth; deferred.
  - **Multi-page website crawl + sitemap** — this build scrapes the homepage only; blog count/cadence (`content.written`) and deeper NAP (often footer/contact pages, stripped by `onlyMainContent`) want a small crawl + sitemap pass.
  - **serp / socials / geo** were not exercised live (DoD scoped the live run to `website,gbp`); they are fixture-tested and wired into the default adapter set.
