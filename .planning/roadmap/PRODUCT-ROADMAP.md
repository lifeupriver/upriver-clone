# Upriver: workflow, CLI, and product improvements

> **Status as of 2026-04-29 (post-implementation, post-merge).** Most items are shipped. See `DRIFT-REPORT.md` for the gap analysis between this spec and what actually landed. Per-section status banners below mark each item ✅ shipped / ⚠️ partial / 🔧 drift / ❌ not done / 🚫 deferred. Where shipped reality diverges from this spec materially, the divergence is summarized inline; the original spec text is preserved unchanged for archeology.
>
> **Beyond-roadmap addition (`ff2fd67`):** a parallel branch landed 9 tooling-driven deep passes — `design-deep`, `web-quality` (Lighthouse), `audit-website` (squirrelscan), `accessibility-deep`, `cwv-deep`, `analytics-tracking`, `trust-signals`, `cross-browser`, plus `runPreflight` — under a separate `--deep` boolean flag. Distinct from the C.3–C.5 LLM-driven `--mode=deep|all` track. Both coexist; details in `DRIFT-REPORT.md` addendum.

## Context

Upriver is a 14-step CLI pipeline that turns a client URL into a rebuilt Astro site. It works, but it was built as an internal ops tool — every step is a terminal command, the deliverables are markdown files, and the dashboard at `packages/dashboard` is a thin file-system viewer for the operator. The user wants to flip the framing: **use this tool to sell new websites**. The audit isn't internal anymore — it's the lead magnet. The clone and improvement layer aren't internal anymore — they're the deliverable that closes the deal.

That reframing surfaces five gaps:

1. **The audit deliverable is operator-grade, not client-grade.** It's a print-styled Astro page or a markdown file. There's no shareable URL, no narrative, no client-branded chrome, no interactive "what would you change?" capture.
2. **There's no client-facing intake** between audit and rebuild. The interview happens over Zoom; preferences live in a transcript. Nothing systematically captures _which findings the client wants fixed_ or _what they'd change about the site_.
3. **Clone fidelity is single-pass.** `upriver clone` runs Claude Code per page with a verify loop, but there's no structured measure of pixel/layout/copy fidelity, no diff report the client can sign off on.
4. **There's no second-round "improvement layer."** Skills exist (ai-seo, copywriting, schema-markup, page-cro, programmatic-seo, content-strategy, marketing-psychology, etc.) but they only run during `fixes apply` against P0/P1 findings. There's no command that says "the clone is done — now make it _better_ than the original across SEO, GEO, copy, typography, and design."
5. **Efficiency is leaky.** Each step is a separate process, no shared cache, no resume across the whole pipeline, deep audit passes call Claude N×M times (refs × pages) sequentially.

This plan is structured as eight workstreams. Each is independently shippable and ordered by sales leverage — the things that make the tool _sellable_ first, then depth and efficiency.

## Workstream map

```
                       ┌──────────────────────────────────┐
                       │  A. Branded client audit report  │  ← sales leverage
                       │     (shareable URL + PDF)        │
                       └─────────────┬────────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
        ┌─────────▼─────────┐               ┌───────────▼──────────┐
        │ B. Client intake  │               │ C. Audit depth +     │
        │    portal         │               │    GEO/AEO expansion │
        │ (signoff + wants) │               │                      │
        └─────────┬─────────┘               └───────────┬──────────┘
                  │                                     │
                  └──────────────┬──────────────────────┘
                                 │
                       ┌─────────▼──────────┐
                       │ D. Clone fidelity  │
                       │    diff + scoring  │
                       └─────────┬──────────┘
                                 │
                       ┌─────────▼──────────────────────┐
                       │ E. Improvement layer           │
                       │    (second pass: SEO/GEO/copy/ │
                       │     typography/design)         │
                       └─────────┬──────────────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
        ┌─────────▼──────────┐        ┌─────────▼──────────┐
        │ F. Operator GUI    │        │ G. Efficiency:     │
        │    (run pipeline   │        │    cache, resume,  │
        │     from browser)  │        │    parallel, SDK   │
        └────────────────────┘        └────────────────────┘
                  │
        ┌─────────▼──────────┐
        │ H. Skill catalog & │
        │    methodology     │
        │    upgrades        │
        └────────────────────┘
```

The dependency arrows are real but loose: A and B can ship before C; D unlocks E; F and G are infrastructure that compound across all of them.

---

## A. Branded client audit report (the lead magnet)

> **Status: complete.** A.1 ✅ A.2 ✅ A.3 ✅ A.4 ✅ A.5 ✅ A.6 ✅. Note: A.4's hero metrics are produced by a standalone `synthesize/impact-metrics.ts` rather than reading C.7's `estimatedImpact` field — see DRIFT-REPORT.md.

**Problem.** The current "deliverable" is `packages/dashboard/src/pages/deliverables/[slug]/audit-report.astro` (211 lines). It renders against an internal stylesheet meant for the operator dashboard, the cover is generic Upriver branding, and there's no way to send a client a single URL — the dashboard requires `upriver dashboard` running locally.

**Vision.** A static, signed, brandable report at `https://reports.upriver.com/<slug>-<token>` that you can send a prospect cold. It opens to a one-page narrative ("Here's what's costing you bookings"), then drills into evidence, then ends with a single CTA: "Tell us what to fix." Zero terminal context, zero Upriver-internals leaking through.

**Specific changes:**

1. **New report shell with three layers.** Replace the single audit-report Astro page with a structured report at `packages/dashboard/src/pages/deliverables/[slug]/`:
   - `index.astro` — hero + executive summary + "what it's costing you" narrative (revenue framing, not technical findings).
   - `scorecard.astro` — score radar, dimension cards, before/after screenshots from `clients/<slug>/screenshots/desktop/`.
   - `findings.astro` — interactive findings browser, but client-facing copy (no `p0/p1/p2` jargon — use "Critical / Important / Polish" with their existing pill styles in `components/astro/FindingCard.astro:10-14`).
   - `next-steps.astro` — pricing/scope tiers + the intake CTA from workstream B.

2. **Static export pipeline.** Add `upriver report build <slug>` that runs `astro build` against the deliverables routes only (using a separate `astro.config` or build flag), outputs to `clients/<slug>/report-static/`, and uploads to a signed bucket. Use Vercel/Netlify or a Supabase Storage bucket — the existing `UPRIVER_SUPABASE_*` env vars (see `.env.example`) already give us storage. New file: `packages/cli/src/commands/report/build.ts`. The output is a self-contained static site with all screenshots inlined or copied to `report-static/screenshots/`.

3. **Client branding overlay.** Today the report cover uses Upriver's logo (`audit-report.astro:47-50`). For sales, the prospect should see _their_ logo and brand colors at the top, with a discreet "Audit by Upriver" footer. Pull from `auditPackage.brandingProfile` (already extracted by Firecrawl during scrape) — `colors.primary`, `logo`, `fonts`. Add a `CoverHeader.astro` component that takes the brand profile and renders accordingly, with Upriver's brand only as the audit attribution at the bottom.

4. **Narrative executive summary, not bullet findings.** The current exec summary is generated in `packages/cli/src/commands/synthesize.ts:473-507` (`executiveSummaryPrompt`). It already targets revenue framing but is rendered as plain markdown. Promote it to the hero of `index.astro` with three big stats pulled from findings: "X potential bookings lost / month", "Y seconds slower than competitors", "Z critical issues blocking search visibility". To produce these stats, extend `synthesize.ts` to compute estimated impact metrics from the existing finding data (e.g., missing analytics → "no visibility into traffic"; thin content count → "N pages too short to rank"; CWV findings → seconds estimate). New file: `packages/cli/src/synthesize/impact-metrics.ts`.

5. **Print + PDF.** Keep `@media print` styles (already in `audit-report.astro:207-210`) but add `print.css` rules per route. Add `upriver report pdf <slug>` that uses Playwright (already a dep — `clone-qa.ts:73` imports it) to print each route to PDF, then `pdfkit` or `pdf-lib` to merge into one. New file: `packages/cli/src/commands/report/pdf.ts`.

6. **Share-link auth.** A signed URL or short token gates access; bake the token into a "View report" email template under `packages/cli/src/templates/report-email.md` and add `upriver report send <slug> --to email@client.com` (initially logs the link + email body for the operator to send manually; later, SMTP integration).

---

## B. Client intake portal (capture wants between audit and rebuild)

> **Status: complete (B.3 deferred).** B.1 ✅ B.2 ✅ B.3 🚫 B.4 ✅ B.5 ✅ B.6 ✅. B.3 (per-page wants on `findings.astro`) is deliberately collected on `next-steps.astro` instead — the IntakeForm there already captures `pageWants`. Defer the findings-page-level UI until product validation says it's needed.

**Problem.** Today the audit hands off to `interview-prep.ts` → 90-minute Zoom call → manual transcript → `process-interview.ts`. There's no asynchronous capture of "which findings do you care about?" and "what do you _want_ changed about the site?" That info currently lives in the operator's head and the transcript.

**Vision.** Embed an intake form _inside_ the audit report so the prospect, while reading their score, can:
- Mark each finding "Fix this / Don't bother / Discuss".
- Free-text answer "What do you wish your current site did better?" per page.
- Upload reference sites they like.
- Choose a scope tier (Polish / Rebuild / Rebuild + content).

**Specific changes:**

1. **Intake schema.** New file `packages/core/src/types/intake.ts` defining `ClientIntake` with `findingDecisions: Record<findingId, 'fix'|'skip'|'discuss'>`, `pageWants: Record<pageSlug, string>`, `referenceSites: string[]`, `scopeTier`, `submittedAt`. Persist to `clients/<slug>/intake.json`.

2. **Intake form embedded in the report.** In the `next-steps.astro` route (workstream A), embed a React island `<IntakeForm>` at `packages/dashboard/src/components/react/IntakeForm.tsx`. It posts to a Supabase function or to a local Astro endpoint (`packages/dashboard/src/pages/api/intake/[slug].ts`) which writes `clients/<slug>/intake.json`.

3. **"What would you change?" per-page UX.** On `findings.astro`, each page card from `pkg.siteStructure.pages` gets a thumbnail (existing `screenshots/desktop/<slug>.png`), the top 2 findings affecting that page, and a textarea: "What do you wish this page did better?" Saved into `intake.pageWants`.

4. **Wire intake into `fixes plan`.** Modify `packages/cli/src/commands/fixes/plan.ts:115-162` to read `intake.json` and:
   - Use `intake.findingDecisions` as the in-scope filter (replacing or augmenting `fixes-plan-scope.md` at line 130-143).
   - Append a "Client priorities" section to the rendered plan listing every `pageWants` entry verbatim, so the fix agent and the human reviewer both see them.

5. **Wire intake into `clone`.** Modify `packages/cli/src/commands/clone.ts` `buildAgentPrompt` (around line 129) to inject the matching `pageWants[page.slug]` into the per-page Claude Code prompt — that way the visual port also picks up the client's intent ("we want this hero to feel less corporate").

6. **Intake admin view in the operator dashboard.** Add `packages/dashboard/src/pages/clients/[slug]/intake.astro` that renders the intake submission for the operator before they run the rebuild, and exposes a "Lock scope" button that converts `intake.json` decisions into `fixes-plan-scope.md` automatically.

---

## C. Audit depth + GEO/AEO expansion

> **Status: shipped.** C.1 ⚠️ C.2 ⚠️ C.3 ✅ C.4 ✅ C.5 ⚠️ C.6 ✅ C.7 ✅. Surface widened by `ff2fd67` — see beyond-roadmap note in document banner.
>
> - **C.1 geo:** narrower than spec — TL;DR/llms.txt/factoids/disambiguation present; chunk-level semantic completeness, Wikipedia/Wikidata presence, citation-friendly anchor text not implemented.
> - **C.2 typography:** narrower than spec on its own (hierarchy/font-count/scale-ratio only), but the spec's font/web-quality/FOUT-adjacent gaps are partially closed by the merged `accessibility-deep` and `web-quality` passes. Explicit pairing critique still missing.
> - **C.5 competitor-deep:** assumes `<clientDir>/competitors/*.json` is already populated; spec wanted the pass to scrape competitors itself via Firecrawl.
> - **C.6 flag canonicalized as `--mode=base|deep|all`.** The `sales|operator` framing in the spec text below is superseded — `base` ≈ operator, `deep` adds LLM passes, `all` adds tooling-driven passes too. `--mode=all` consolidated with the merged `--deep` boolean: `--mode=all` runs both tracks; `--deep` alone runs the tooling track only.
> - **C.7 schema canonicalized as `{ scorePoints: number; description: string }`.** The `{metric, magnitude, rationale}` shape in the spec text below is superseded. A.4's report hero produces business-framed metrics independently via `synthesize/impact-metrics.ts`; C.7's per-finding impact is a quantitative score-points heuristic rendered in `fixes plan`. Two paths by design — different consumers, different semantics.

**Problem.** The 10 base passes (`packages/audit-passes/src/{seo,content,design,sales,links,schema,aeo,local,backlinks,competitors}/index.ts`) are heuristic and quick. The 8 deep passes (`packages/cli/src/deep-audit/passes/`) are LLM-driven and gated behind `--deep`. Coverage is good but missing categories the user named: **GEO** (generative engine optimization, distinct from AEO), **typography depth**, **content strategy / keyword opportunity**, **conversion psychology**, and **competitor side-by-side**.

**Specific changes:**

1. **New base pass: `geo`.** Distinct from `aeo/`. AEO = "Are you cited in answer engines?" GEO = "Is your page structured for generative retrieval?" Checks: chunk-level semantic completeness, per-section TL;DR presence, llms.txt, presence of structured factoids (year founded, service area, prices), entity disambiguation, presence in Wikipedia/Wikidata, citation-friendly anchor text. New file: `packages/audit-passes/src/geo/index.ts`. Wire into `ALL_PASSES` in `packages/cli/src/commands/audit.ts:34-45`.

2. **New base pass: `typography`.** Today design pass covers tokens at a high level. Add a typography pass: heading hierarchy stability across pages, modular scale ratio detection, line-length distribution (45–75ch target), pairing critique (heading × body × mono), font weight/style coverage gaps, web-safe fallback presence, FOUT/FOIT risk. New file: `packages/audit-passes/src/typography/index.ts`. The data is already loaded via `loadPages` and `loadDesignTokens` from `packages/audit-passes/src/shared/loader.ts`.

3. **New base pass: `content-strategy`.** Maps existing pages to a keyword/intent matrix: detect topic clusters from headings, find missing intent stages (top/middle/bottom of funnel), flag pages targeting the same keyword, suggest pillar/cluster opportunities. The `marketingskills-main/skills/content-strategy/` and `programmatic-seo/` skills already encode the methodology — wrap them in a new deep pass at `packages/cli/src/deep-audit/passes/content-strategy-deep.ts` following the pattern of `design-deep.ts:46-80`.

4. **New deep pass: `conversion-psychology`.** Use `marketingskills-main/skills/marketing-psychology/` and `page-cro/`. Per-page LLM critique: trust signal density, friction in the primary CTA path, scarcity/social-proof imbalance, cognitive load. New file: `packages/cli/src/deep-audit/passes/conversion-psychology.ts`.

5. **New deep pass: `competitor-side-by-side`.** Today `competitors/index.ts` is a single 171-line heuristic pass. Upgrade with a deep variant that scrapes 3 named competitors via Firecrawl (operator passes them in `client-config.yaml` under a new `competitors:` key), runs the same audit harness against each, and produces a comparative scorecard. New file: `packages/cli/src/deep-audit/passes/competitor-deep.ts`.

6. **Make `--deep` the default for audits intended as sales reports.** Add `--audit-mode=sales|operator` flag to `audit.ts:62-74`. Sales mode runs all base + all deep passes by default, with a higher LLM budget and full reference coverage. Operator mode keeps the cheap base passes for iterative work.

7. **Findings get an estimated-impact field.** Extend `AuditFinding` in `packages/core/src/types/audit.ts` with `estimatedImpact: { metric: 'bookings'|'pageviews'|'cwv'|'rankings'; magnitude: 'small'|'medium'|'large'; rationale: string }`. Populate from each audit pass; surface in the report hero (workstream A item 4).

---

## D. Clone fidelity diff + scoring

> **Status: complete.** D.1 ⚠️ D.2 ✅ D.3 ✅ D.4 ✅ D.5 ✅. D.1 ships pixel + copy diff; layout structure diff (heading-order/CTA-count/image-count) and computed-style token-adherence are not yet implemented — defensible scoping but document the gap.

**Problem.** `clone.ts:39-124` runs Claude Code per page with an optional verify loop (`clone/verify.ts`) and `clone-qa.ts` produces a side-by-side HTML report. There's no _quantitative_ fidelity score per page and no structured diff the operator (or client) can sign off on. Today's QA report is visual eyeballing.

**Specific changes:**

1. **Quantitative fidelity score per page.** Extend `clone-qa.ts:96-135` to compute, for each route:
   - **Pixel diff:** `pixelmatch` against the live screenshot at matched viewport (already captured to `clients/<slug>/screenshots/desktop/<slug>.png`). Output % matched + a diff PNG to `clone-qa/diff/<slug>.png`.
   - **DOM/copy diff:** parse the live `pages/<slug>.json` extracted text vs. the cloned page's rendered text. Output a word-level diff and a "copy completeness" %.
   - **Layout structure diff:** compare heading order, CTA count, image count.
   - **Token adherence:** check that `getComputedStyle()` on the cloned page matches `clients/<slug>/design-tokens.json` for the canonical headings, body, and primary button.
   Aggregate to a 0–100 fidelity score per page; aggregate across pages for an overall.

2. **Persist clone QA into the audit package.** Write `clients/<slug>/clone-qa/summary.json` and surface it on `packages/dashboard/src/pages/clients/[slug]/site.astro` (already exists). Add a new dashboard route `clients/[slug]/clone-fidelity.astro` that lists each page with score + thumbnails + diff toggle.

3. **Fidelity findings feed back into fixes.** Pages scoring < 80 get auto-generated `clone-fidelity-<n>` findings of priority `p1` describing the specific divergence (copy missing, image missing, hero collapsed). These flow into `fixes plan` like any other finding.

4. **Asset completeness check.** Today `finalize.ts` finds unmatched CDN URLs (lines 69-106). Promote that to a clone-QA gate: any unmatched external image URL is a fidelity finding, with a one-button "fetch missing" via the existing `--download-missing` flag.

5. **Verify loop becomes plan-aware.** The current `clone/verify.ts` does N iterations of "compare and fix." Update it to accept the new fidelity report as input, so the second iteration knows _exactly_ which selectors diverge instead of re-comparing the whole screenshot. Reduces wasted Claude tokens substantially on long pages.

---

## E. Improvement layer (the "make it better than the original" pass)

> **Status: shipped with one stub.** E.1 ✅ E.2 ✅ E.3 ✅ E.4 ✅ E.5 ⚠️ E.6 ✅ E.7 ✅. E.5 ships as `upriver report compare <before> <after>` — a manual two-arg diff. Full E.5 (automated re-audit chain against the preview branch + auto-generated `improvement-report.md`) needs preview-deploy infrastructure that isn't wired yet.

**Problem.** This is the biggest gap relative to the user's stated vision. After clone is done and verified, there's no command that says "now apply our skills library to make this site _better_ than the one we cloned." The fix pipeline (`fixes plan` / `fixes apply`) only acts on _audit findings_ from the original site — it doesn't proactively apply, e.g., the `marketing-psychology` skill or the `programmatic-seo` skill to generate new opportunities the original never had.

**Vision.** A new pipeline stage `upriver improve <slug>` that takes the cloned, verified site and runs a structured second-round critique-and-edit loop across every named skill, producing a new wave of PRs. Each PR is one skill applied across the relevant pages, with measurable before/after.

**Specific changes:**

1. **New top-level command: `upriver improve <slug>`.** New file `packages/cli/src/commands/improve.ts`. It runs after `clone` (and ideally after `qa` against the cloned preview) and orchestrates a "skill matrix" — see below.

2. **Skill matrix definition.** A YAML file `packages/cli/src/improve/skill-matrix.yaml` declaring which skills run, against which page types, and in what order. Example structure:
   ```yaml
   tracks:
     seo:
       skill: ai-seo
       targets: all-pages
       output: per-page recommendations + applied edits
     copy:
       skill: copywriting
       targets: hero, services, about
     schema:
       skill: schema-markup
       targets: all-pages
     typography:
       skill: impeccable
       references: [typography, typeset, layout]
       targets: all-pages
     content-strategy:
       skill: content-strategy
       targets: pillar-page-candidates
     conversion:
       skill: page-cro
       targets: high-intent-pages
     geo:
       skill: ai-seo
       references: [llm-discoverability]
       targets: all-pages
   ```
   Loaded by `packages/cli/src/improve/matrix-loader.ts`.

3. **Per-track agent harness.** Each track invokes Claude Code with a prompt template that:
   - Loads the named skill from `.agents/skills/<skill>/SKILL.md` (pattern already in place — see `process-interview.ts:18`, `fixes/apply.ts:10`).
   - Loads the relevant page files in `clients/<slug>/repo/src/pages/`.
   - Loads the brand voice guide from `clients/<slug>/docs/brand-voice-guide.md` and the design tokens.
   - Loads any matching `intake.pageWants` from workstream B.
   - Returns either a structured set of findings + recommendations OR direct edits.
   New file: `packages/cli/src/improve/agent-runner.ts`. Reuses the headless Claude Code spawn pattern from `clone.ts` (`runClaudeCode` near line 148) and `fixes/apply.ts`.

4. **One PR per track.** Each track ships as one PR (`improve/<track>`), not one per finding. That's because the value is the _combined_ improvement across pages — splitting per page makes the PRs incoherent. Use git worktrees with the `--parallel` pattern already established in `clone.ts:80-114` and `fixes/apply.ts:80-114`.

5. **Before/after measurement.** After all tracks merge to the preview branch, automatically re-run `upriver audit <slug>` against the preview URL (using the existing `qa.ts` re-audit logic) and produce a `clients/<slug>/improvement-report.md` showing dimension scores before/after the improvement layer. This becomes a slide in the client deliverable: "we cloned it, then we made it +18 points better."

6. **GEO + AEO improvement track.** Specifically generate llms.txt, ai.txt, structured FAQ blocks, entity-rich JSON-LD, and per-page TL;DR sections. This is high-leverage and currently nowhere in the pipeline.

7. **Programmatic-SEO opportunity surfacing.** Use `marketingskills-main/skills/programmatic-seo/` to identify cluster opportunities (location pages, service-variant pages, comparison pages). Output as a separate `improvement-opportunities.md` for the operator/client to decide whether to invest in content build-out — don't auto-generate dozens of pages.

---

## F. Operator GUI (run the pipeline from the browser)

> **Status: shipped with drift on 5 + 6.** F.1 ✅ F.2 ✅ F.3 ✅ F.4 ⚠️ F.5 🔧 F.6 🔧.
>
> - **F.4:** shipped as `upriver cost <slug>` CLI + util, not the GUI surface the spec described. Library is reusable for the GUI; the wiring isn't there.
> - **F.5 auth drift:** shipped as `UPRIVER_RUN_TOKEN` shared-secret header check, not Supabase auth with operator/client roles. Anyone with the token has full access. Real F.5 blocked on auth-provider decision.
> - **F.6 drift:** shipped `upriver report bundle <slug>` (local zip) instead of `upriver dashboard deploy` + `sync push/pull` against Supabase Storage. Different feature; F.6 full blocked on bucket/auth conventions.

**Problem.** Today the dashboard at `packages/dashboard/` is read-only — it visualizes `clients/<slug>/` artifacts but every action is a terminal command. The `dashboard` command at `packages/cli/src/commands/dashboard/index.ts:8-77` just spawns `pnpm run dev` in the dashboard directory. To run the pipeline you need a terminal open in the repo.

**Specific changes:**

1. **Run-pipeline endpoints.** Add Astro server endpoints under `packages/dashboard/src/pages/api/run/<command>.ts` (e.g., `init.ts`, `scrape.ts`, `audit.ts`). Each endpoint spawns the existing CLI as a child process and streams output via SSE. Reuse the existing `BaseCommand` plumbing — don't fork the logic. The dashboard becomes a thin orchestration UI over the same CLI.

2. **Live pipeline view.** On `clients/[slug]/index.astro`, replace the static `PipelineTrack` (currently in `components/astro/PipelineTrack.astro`, a sticky sidebar) with an interactive version that has a "Run" button per stage. Clicking it streams logs into a panel; on completion the page re-fetches the artifacts. Status colors come from the existing `detectStage` in `lib/pipeline.ts:32-47`.

3. **New client wizard.** A `/clients/new` route with a form (URL + name + slug) that calls the `/api/run/init` endpoint, then auto-redirects to the client detail page once `client-config.yaml` exists. Replaces the need for a terminal for initial onboarding.

4. **Cost preview before expensive steps.** `init.ts:108-113` already estimates Firecrawl credits. Surface that estimate in the GUI before letting the operator run `scrape` or `audit --deep`. Pull from `clients/<slug>/token-and-credit-usage.log` to show running totals.

5. **Authentication.** When the dashboard is exposed beyond localhost (which it needs to be for client portal use in workstream A/B), add basic Supabase auth via the existing service-key. Operator login = full access; client view-link = read-only on their own slug. Gate the `/api/run/*` routes to operator only.

6. **Fast deploy of the dashboard.** Add `upriver dashboard deploy` that publishes the dashboard to Vercel pointed at a Supabase storage bucket where `clients/<slug>/` is mirrored, so the operator can run pipeline steps from anywhere. Mirror via a new sync command `upriver sync push <slug>` / `pull <slug>` using Supabase Storage (env vars already exist).

---

## G. Efficiency: cache, resume, parallelism, agent SDK

> **Status: complete with two narrower-than-spec items.** G.1 ✅ G.2 ✅ G.3 ⚠️ G.4 🔧 G.5 ✅ G.6 ⚠️ G.7 ✅.
>
> - **G.3:** default `--deep-concurrency=2`, not 3. Tunable via flag.
> - **G.4 drift:** shipped a generic Anthropic SDK runner via `cachedClaudeCall`, not specific Agent-SDK migrations of `design-deep`/`accessibility-deep`/`cwv-deep` (those passes don't exist in this codebase — the spec listed them as theoretical). Caching savings are achieved; structured tool-use is not.
> - **G.6:** narrower than spec — only de-duplicates the discover→scrape Firecrawl batch. Spec wanted init+scrape+discover all collapsed into one batch. Other paths unchanged.
> - **G.7:** pipeline graph lives at `packages/core/src/pipeline/stages.ts` with subpath export `@upriver/core/pipeline`. Both `commands/run/all.ts` and the dashboard's `PipelineStages.tsx` import from there.

**Specific changes:**

1. **Unified resume.** Today `discover.ts:41-46` has a `--resume` flag, `qa.ts:96-100` has `--skip-scrape`, `clone.ts` doesn't have one. Standardize: every command checks for the artifact it would produce and skips with `[skip] already exists` unless `--force` is set. Centralize the check in `BaseCommand` as `this.skipIfExists(path)`.

2. **Shared LLM cache.** Deep audit passes (`design-deep.ts:63-79` and siblings) call Claude Opus N×M times where N = references and M = sample pages. Many runs are hitting deterministic page content. Add a content-addressed cache at `clients/<slug>/.cache/llm/<sha256(prompt+model)>.json` that stores `{request, response, usage}`. Wrap every call in `synthesize.ts`, `interview-prep.ts`, `process-interview.ts`, `deep-audit/passes/*` through a single `cachedClaudeCall()` helper at `packages/core/src/llm/cached-client.ts`.

3. **Parallelize deep passes.** `audit.ts:190-210` runs all 8 deep passes sequentially. Most are independent and IO-bound. Use the same `Promise.allSettled` pattern as the base passes (`audit.ts:101-121`), with a `--deep-concurrency` flag (default 3 to respect rate limits).

4. **Migrate from raw `@anthropic-ai/sdk` calls to the Agent SDK where it fits.** The deep audit passes that loop over references-times-pages today reimplement what the Agent SDK can do natively. Cherry-pick the highest-volume passes (design-deep, accessibility-deep, cwv-deep) and rewrite them as Agent SDK sessions. Net effect: less prompt boilerplate, better caching of system prompts, and prompt-caching savings (the skill body is identical across all calls — currently re-sent every time, ~40k tokens per pass).

5. **Prompt caching across all Claude calls.** Add `cache_control: {type: 'ephemeral'}` markers to the static parts of every prompt — skill bodies, page lists, design tokens. The `synthesize.ts:381-422` `callClaudeText` helper is the chokepoint; add caching there and propagate. Also covers `interview-prep.ts:46-58` and `process-interview.ts`.

6. **Single Firecrawl batch instead of per-command scrapes.** `init.ts`, `discover.ts`, and `scrape.ts` each independently scrape the homepage and/or batch the URLs. Consolidate: `init` does a cheap `map` only; `scrape` does the one expensive batch with all formats; nothing else hits Firecrawl until QA. Saves credits on every engagement.

7. **Pipeline-level dependency graph.** Replace the linear command sequence with an explicit dependency graph (`audit` requires `scrape`, `synthesize` requires `audit`, etc.) declared once in `packages/core/src/pipeline.ts`. Used by both the GUI run buttons and a new `upriver run all <slug>` command that walks the graph and stops at human-in-the-loop gates (interview, scope sign-off, QA review).

---

## H. Skill catalog & methodology upgrades

> **Status: complete (H.1 deferred).** H.1 🚫 H.2 ✅ H.3 ✅ H.4 ✅. H.1 (expanding the symlink set in `.agents/skills/`) is operator-side filesystem fiddling, not a code task.

**Problem.** `marketingskills-main/skills/` has 38 skills installed; only 9 are symlinked into `.agents/skills/` (see `README.md:140-150`). The rest aren't reachable by any command. The Upriver-specific skills at `.agents/upriver-skills/` only cover audit/interview/clone/QA — there's no skill for the new improvement layer or the new audit dimensions.

**Specific changes:**

1. **Expand the symlink set.** Pull `marketing-psychology`, `programmatic-seo`, `content-strategy`, `analytics-tracking`, `paid-ads` (for landing-page critique), `email-sequence`, `social-content`, `directory-submissions`, `competitor-alternatives`, `competitor-profiling` into `.agents/skills/`. Update `.gitignore` symlink rules and `marketingskills-main/validate-skills.sh` validation.

2. **New Upriver operational skills.**
   - `.agents/upriver-skills/improvement-layer.md` — methodology for the workstream E pipeline: how to apply each skill matrix track, what counts as "applied," what to leave to the operator.
   - `.agents/upriver-skills/clone-fidelity-scoring.md` — how to compute and interpret the fidelity score from workstream D, what threshold is shippable.
   - `.agents/upriver-skills/sales-report-narrative.md` — how to write the executive narrative for the audit report (workstream A item 4) so it converts; what tone, what numbers to lead with, what to omit.
   - `.agents/upriver-skills/intake-handling.md` — how to interpret client `pageWants` text into actionable instructions for the clone agent and the improvement-layer agents.

3. **Skill registry typed in core.** Today skills are referenced as string paths in agent prompts (e.g., `fixes/apply.ts:10`). Move to a typed registry at `packages/core/src/skills/registry.ts` that exports `{name, path, methodology, when}` so the CLI can validate at startup that referenced skills exist (catches the breakage from `README.md:166-168` after a `git pull` of marketingskills).

4. **`upriver-design` as a first-class skill in the clone path.** The `upriver-design-system/` skill exists with strict brand rules (see `SKILL.md:20-26`: no em dashes, no emoji, single accent color). Wire it into the clone agent prompt _by default_ when the operator wants the cloned site to match Upriver-as-vendor styling; otherwise default off so the clone matches the client's brand. Flag: `--design-system upriver|client` on `clone.ts` flags (lines 27-37).

---

## I. Tooling-driven deep audit (added post-roadmap via `ff2fd67`)

> **Status: shipped, follow-on work tracked.** I.1 ✅ I.2 ✅ I.3 ✅ I.4 ✅ I.5 ✅ I.6 ✅ I.7 ✅ I.8 ✅ I.9 ✅. Follow-on integration items below are open.

**Context.** A parallel branch landed 9 deep audit passes that lean on
external tooling (Lighthouse, squirrelscan, Playwright) and direct
Anthropic calls rather than the C.3–C.5 shared `AgentRunner` pattern.
They live under `packages/cli/src/deep-audit/` alongside the LLM
passes and are gated behind `--deep` (or implicitly `--mode=all`).

**Shipped passes:**

1. **I.1 `runDesignDeep`** — applies the `impeccable` design skill via
   Anthropic. `packages/cli/src/deep-audit/passes/design-deep.ts`.
2. **I.2 `runWebQuality`** — runs Lighthouse against the cloned site,
   produces performance / a11y / SEO findings.
   `packages/cli/src/deep-audit/passes/web-quality.ts`.
3. **I.3 `runAuditWebsite`** — wraps the `squirrelscan` CLI.
   `packages/cli/src/deep-audit/passes/audit-website.ts`.
4. **I.4 `runAccessibilityDeep`** — WCAG-focused agent pass.
   `packages/cli/src/deep-audit/passes/accessibility-deep.ts`.
5. **I.5 `runCoreWebVitalsDeep`** — CWV-focused agent pass.
   `packages/cli/src/deep-audit/passes/cwv-deep.ts`.
6. **I.6 `runAnalyticsTracking`** — Playwright-driven analytics check.
   `packages/cli/src/deep-audit/passes/analytics-tracking.ts`.
7. **I.7 `runTrustSignals`** — Anthropic-driven trust-signal critique.
   `packages/cli/src/deep-audit/passes/trust-signals.ts`.
8. **I.8 `runCrossBrowser`** — Playwright cross-browser smoke.
   `packages/cli/src/deep-audit/passes/cross-browser.ts`.
9. **I.9 `runPreflight`** — checks for `claude`, `lighthouse`,
   `squirrelscan`, Playwright browsers, and required skills before any
   pass runs. Failures degrade to a `[SKIP]` line, not a hard error.
   `packages/cli/src/deep-audit/preflight.ts`.

**Follow-on work (open):**

1. **I.10 `run all --deep` pass-through.** `commands/run/all.ts`
   threads `--audit-mode` into the audit stage but not `--deep`. Add
   pass-through so the orchestrator can invoke tooling-driven passes.
2. **I.11 Consolidate the deep-pass `AgentRunner` story.** Track 1
   (C.3–C.5 LLM passes) uses the injectable `AgentRunner` factory;
   Track 2 (these 9 passes) instantiates Anthropic per pass. Decide
   whether to migrate the new passes onto `AgentRunner` (cheaper to
   stub in tests, picks up prompt caching automatically) or leave
   them per-pass.
3. **I.12 Test coverage for the merged passes.** No tests landed in
   `ff2fd67`; the C.3–C.5 passes have a parser test in
   `runner.test.ts`. Add at least a smoke test per merged pass that
   stubs the Anthropic / Lighthouse / squirrelscan dependency.
4. **I.13 New `AuditDimension` values surface in reports.** The merge
   added `web-quality`, `core-web-vitals`, `accessibility`,
   `audit-website`, `analytics`, `cross-browser`, `trust-signals`.
   `findings.astro` renders dimension cards from a fixed list — verify
   the new dimensions appear or wire them in if they don't.

---

## Recommended ship order

> **Note (post-implementation):** the order below was the original sales-leverage prioritization. In practice the ship order followed dependency more than leverage — A then B then D then E then F then G in roughly that order, with C and H threaded throughout. All workstreams have at least one shipped item; the headline is in the document banner above.


| Order | Workstream | Why this order |
|-------|------------|----------------|
| 1 | A (audit report) + part of C (impact metrics, GEO pass) | First thing a prospect sees. The single biggest leverage on closing deals. |
| 2 | B (intake portal) | Pairs with A — converts a viewer into a signed scope. |
| 3 | G (efficiency: prompt caching, LLM cache, resume) | Cuts cost per engagement materially before volume scales. |
| 4 | D (clone fidelity) | Builds operator confidence to actually ship the rebuild. |
| 5 | E (improvement layer) | The core differentiator vs. "we cloned your site" — turns the engagement into "we made it measurably better." |
| 6 | F (operator GUI) | Makes the tool sellable to non-technical operators / lets you scale beyond yourself. |
| 7 | H (skills) | Threaded throughout but formalized last so the registry reflects everything that landed. |
| 8 | Remainder of C (typography, content-strategy, conversion-psych, competitor-deep) | Audit depth keeps compounding; ship the most ROI-positive ones first. |

## Critical files to be touched

**New files:**
- `packages/cli/src/commands/report/{build,pdf,send}.ts` (workstream A)
- `packages/cli/src/synthesize/impact-metrics.ts` (A)
- `packages/dashboard/src/pages/deliverables/[slug]/{index,scorecard,findings,next-steps}.astro` (A)
- `packages/dashboard/src/components/astro/CoverHeader.astro` (A)
- `packages/dashboard/src/components/react/IntakeForm.tsx` (B)
- `packages/dashboard/src/pages/api/intake/[slug].ts` (B)
- `packages/dashboard/src/pages/clients/[slug]/intake.astro` (B)
- `packages/core/src/types/intake.ts` (B)
- `packages/audit-passes/src/{geo,typography}/index.ts` (C)
- `packages/cli/src/deep-audit/passes/{content-strategy-deep,conversion-psychology,competitor-deep}.ts` (C)
- `packages/cli/src/commands/improve.ts` (E)
- `packages/cli/src/improve/{matrix-loader,agent-runner}.ts` + `skill-matrix.yaml` (E)
- `packages/cli/src/commands/clone-fidelity.ts` (or fold into `clone-qa.ts`) (D)
- `packages/dashboard/src/pages/clients/[slug]/clone-fidelity.astro` (D)
- `packages/dashboard/src/pages/api/run/[command].ts` (F)
- `packages/dashboard/src/pages/clients/new.astro` (F)
- `packages/core/src/llm/cached-client.ts` (G)
- `packages/core/src/pipeline.ts` (G)
- `packages/core/src/skills/registry.ts` (H)
- `.agents/upriver-skills/{improvement-layer,clone-fidelity-scoring,sales-report-narrative,intake-handling}.md` (H)

**Files to modify (most impactful):**
- `packages/cli/src/commands/audit.ts:34-45, 190-210` — add new passes, parallelize deep passes
- `packages/cli/src/commands/synthesize.ts:381-422` — route through cached LLM client, add prompt caching
- `packages/cli/src/commands/clone.ts:39-124` — accept intake.pageWants, design-system flag
- `packages/cli/src/commands/clone-qa.ts:44-156` — quantitative scoring + DOM diff
- `packages/cli/src/commands/fixes/plan.ts:115-162` — read intake.json as scope source
- `packages/dashboard/src/pages/deliverables/[slug]/audit-report.astro` — replace with new report shell
- `packages/dashboard/src/layouts/DeliverableLayout.astro` — make brand-overridable per client
- `packages/core/src/types/audit.ts` — add `estimatedImpact`
- `packages/core/src/types/audit-package.ts` — add `cloneFidelity`, `intake`, `improvementReport`

## Verification

End-to-end test of the new workflow against a fresh test slug, e.g. a small bakery site:

```bash
# 1. Fresh init through new audit
upriver init https://test-bakery.com --slug testbakery --name "Test Bakery"
upriver scrape testbakery
upriver audit testbakery --audit-mode=sales        # new flag from C.6
upriver synthesize testbakery
upriver report build testbakery                     # new from A.2
# Open http://localhost:4321/deliverables/testbakery — verify branded cover, narrative hero,
# interactive findings, intake form on next-steps.

# 2. Submit intake from the report UI, verify clients/testbakery/intake.json exists.

# 3. Continue pipeline reading from intake
upriver scaffold testbakery
upriver clone testbakery --parallel
upriver clone-fidelity testbakery                   # new from D.1, expect scores + diff PNGs
upriver fixes plan testbakery                       # should use intake decisions, not P0+P1 default
upriver fixes apply testbakery --parallel
upriver improve testbakery                          # new from E.1, opens N PRs across tracks
upriver qa testbakery --preview-url https://...

# 4. Diff the before/after audit summary written by E.5 — confirm score lift exists.
# 5. Run upriver report build testbakery again — confirm it now includes a "what we improved"
#    section sourced from the improvement-report.md.
```

Unit-level checks:
- `pnpm typecheck` passes after every workstream.
- `pnpm test` — add tests for the cache hit path in `cached-client.ts`, the matrix loader, the fidelity scorer (use a fixture screenshot pair).
- Verify prompt caching is actually firing by watching `usage.cache_creation_input_tokens` / `usage.cache_read_input_tokens` in the Supabase usage logger output (see `packages/core/src/usage/logger.ts`).
- Confirm GEO pass surfaces something meaningful by running it against a deliberately under-optimized fixture page.
