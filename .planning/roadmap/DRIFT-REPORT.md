# Roadmap-vs-reality drift report

**Generated:** end of resumed-session work, against `PRODUCT-ROADMAP.md` (364 lines, dated original).

**Method.** Walked every numbered item in workstreams A–H against (a) the actual code in this repo and (b) the commit history since `0d8fdd2`. Each item is classified:

- ✅ **shipped as specified** — intent and implementation match
- ⚠️ **partial** — intent met but narrower than spec, or via a different path
- 🔧 **drift** — intent met but implementation differs materially
- ❌ **not shipped**
- 🚫 **deferred by design** — explicitly documented, not an oversight

**Headline.** No item is missing entirely. Five items have **material drift** worth reviewing before declaring the roadmap done. Several have **narrower coverage** than the spec — defensible scoping calls, but document them so the gap is visible.

---

## Critical drifts (semantic divergence — review before closing)

### C.6 — `--audit-mode` flag naming

- **Roadmap:** `--audit-mode=sales|operator`. "Sales mode runs all base + all deep passes by default, with a higher LLM budget and full reference coverage. Operator mode keeps the cheap base passes."
- **Shipped:** `--mode=base|deep|all` on the audit command, plus `--audit-mode=base|deep|all` pass-through on `run all`.
- **Why it matters:** the spec's vocabulary (sales/operator) is sales-team-facing; mine is engineer-facing. Same functional split, different framing. Documentation/marketing copy that referenced the spec name will be wrong.
- **Fix:** trivial — rename or alias the flag. Or update any downstream copy to use `base`/`deep`/`all`.

### C.7 — `estimatedImpact` schema shape

- **Roadmap:** `estimatedImpact: { metric: 'bookings'|'pageviews'|'cwv'|'rankings'; magnitude: 'small'|'medium'|'large'; rationale: string }`. Categorical / qualitative / wired into the report hero.
- **Shipped:** `estimatedImpact: { scorePoints: number; description: string }`. Quantitative / heuristic-derived / not wired into A.4's hero.
- **Why it matters:** completely different schema. Anything reading the field expects spec-shape; mine doesn't carry `metric` (so impact metrics in the report hero from A.4 cannot use this — they were synthesized separately in `synthesize/impact-metrics.ts`).
- **Fix:** decide whether to (a) migrate to spec-shape and re-wire the report hero from C.7 instead of A.4's standalone path, or (b) update the spec to match shipped reality and explicitly say A.4 + C.7 are independent.

### F.5 — auth gate is a shared secret, not Supabase auth

- **Roadmap:** "Basic Supabase auth via the existing service-key. Operator login = full access; client view-link = read-only on their own slug. Gate the `/api/run/*` routes to operator only."
- **Shipped:** `UPRIVER_RUN_TOKEN` env var → `X-Upriver-Token` header check. No user identity, no per-slug ACL, no operator/client distinction.
- **Why it matters:** materially less secure than spec when the dashboard sits anywhere accessible. A leaked token is full access to every slug.
- **Fix:** F.5 full Supabase auth is in the "decisions waiting on user" list — this drift is the operational consequence of that block. Explicitly accepted; document on the deployed-dashboard side.

### F.6 — local zip bundle, not Supabase deploy

- **Roadmap:** `upriver dashboard deploy` publishing the dashboard to Vercel pointed at a Supabase Storage bucket; `upriver sync push <slug>` / `pull <slug>`.
- **Shipped:** `upriver report bundle <slug>` zips deliverable artifacts into a local file.
- **Why it matters:** completely different feature. F.6 light is useful (operator can email a zip), but it's not the deployed-dashboard-with-storage-sync the spec describes.
- **Fix:** acknowledged — the handoff explicitly calls F.6 full a separate next item. Bundle command is not a substitute, just unrelated value while the real F.6 waits on Supabase decisions.

### G.4 — generic SDK runner, not specific Agent SDK migrations

- **Roadmap:** "Cherry-pick the highest-volume passes (design-deep, accessibility-deep, cwv-deep) and rewrite them as Agent SDK sessions. Net effect: less prompt boilerplate, better caching of system prompts, and prompt-caching savings."
- **Shipped:** generic `createAnthropicRunner` factory wired into the deep-audit pipeline; uses the regular Messages API (with `cachedClaudeCall`) rather than the Anthropic Agent SDK.
- **Why it matters:** the named passes (design-deep, accessibility-deep, cwv-deep) **don't exist in this codebase** — the spec listed them as theoretical. The intent ("cheaper, cached LLM calls for high-volume passes") is satisfied via `cachedClaudeCall` + prompt-caching markers from G.5. The Agent SDK proper (with structured tool-use) is not in use.
- **Fix:** likely accept and update the spec — the deep passes shipped (content-strategy, conversion-psychology, competitor-deep) don't fit the "iterate over N×M references" pattern that motivated Agent SDK in the original spec.

---

## Narrower than spec (intent met, coverage smaller)

| Item | Roadmap surface | Shipped surface | Gap |
|------|-----------------|-----------------|-----|
| **C.1** geo pass | TL;DR + llms.txt + factoids + entity disambiguation **+ chunk-level semantic completeness + Wikipedia/Wikidata presence + citation-friendly anchor text** | TL;DR, llms.txt, factoids (year/area/prices), entity disambiguation | Missing: semantic-chunking, KG presence, citation-anchor analysis |
| **C.2** typography pass | Hierarchy + scale + **line-length distribution (45–75ch) + pairing critique + font-weight coverage + FOUT/FOIT risk** | Hierarchy + font-count/families + scale ratio | Missing: line-length, pairing, weight coverage, FOUT/FOIT |
| **C.5** competitor-deep | Spec implies the pass **scrapes 3 named competitors via Firecrawl** from `client-config.yaml competitors:` key | Pass reads pre-existing `<clientDir>/competitors/*.json` records | Missing: scraping step. Assumes upstream populates the dir |
| **D.1** clone fidelity scorer | Pixel diff + copy/DOM diff + **layout structure diff (heading order, CTA count, image count) + token adherence (computed style vs design tokens)** | Pixel diff + copy diff | Missing: layout structure diff, token adherence |
| **E.5** improvement re-audit | "Automatically re-run `upriver audit` against the preview URL... produce `improvement-report.md` showing dimension scores before/after" | `upriver report compare <before> <after>` (manual two-arg diff) | Missing: automated chain, preview-URL integration. Acknowledged blocker |
| **F.4** cost preview | "Surface that estimate **in the GUI**" | `upriver cost <slug>` CLI command + cost-summary util | GUI integration not wired (library is reusable for it) |
| **G.3** parallelize deep passes | Default `--deep-concurrency=3` | Default 2 | Off by one. Default chosen for token-spend safety; trivial to bump |
| **G.6** single Firecrawl batch | "init does a cheap map only; scrape does the one expensive batch with all formats; nothing else hits Firecrawl until QA" | Discover de-dups against scrape's pages dir | init.ts, scrape.ts behavior unchanged. Saved one batch path; spec wanted three |

These are defensible scoping calls — every gap is a clearly stated next-step rather than missed work. Document them so the next session knows what isn't covered.

---

## Path drift (semantically equivalent, location/structure differs)

| Item | Roadmap path | Shipped path |
|------|--------------|--------------|
| **C.3** content-strategy deep | `packages/cli/src/deep-audit/passes/content-strategy-deep.ts` | `packages/cli/src/deep-audit/passes/content-strategy/run.ts` |
| **C.4** conversion-psychology | `packages/cli/src/deep-audit/passes/conversion-psychology.ts` | `packages/cli/src/deep-audit/passes/conversion-psychology/run.ts` |
| **C.5** competitor-deep | `packages/cli/src/deep-audit/passes/competitor-deep.ts` | `packages/cli/src/deep-audit/passes/competitor-deep/run.ts` |
| **G.7** pipeline graph | `packages/core/src/pipeline.ts` (declared as a graph, reused by both GUI run buttons and `run all`) | `packages/cli/src/commands/run/all.ts` (sequential list, not reused by GUI) |
| **B.3** per-page wants | `findings.astro` (per-page UI on findings page) | `next-steps.astro` (consolidated form on next-steps page) |

The deep-audit folder-per-pass shape (`<name>/run.ts`) is a small architectural improvement — gives each pass room for prompt files, fixtures, tests. Worth keeping; update the spec.

The G.7 pipeline location matters: the roadmap explicitly wanted **one** graph reused by both `run all` and the GUI. Shipped reality is a list in `commands/run/all.ts` only — the GUI's `PipelineStages.tsx` declares its own static stage list, duplicated. **Real coupling debt** — if a stage is added/removed/renamed, two places need to change.

---

## Intentional deferrals

- **B.3** — collected on `next-steps.astro` instead of per-page on `findings.astro`. Defer until product validation says findings-page-level UI is needed.
- **H.1** — operator-side symlink fiddling, not a code task.

---

## Cross-workstream wiring gaps

The roadmap's verification script at line 332 walks an end-to-end flow that assumes specific cross-references between workstreams. Two of those are not actually wired:

1. **A.4 + C.7 — impact metrics in the hero.** A.4's hero pulls "X potential bookings lost / month" etc. from `impact-metrics.ts`. The spec implies C.7's `estimatedImpact` field on findings is the source. Shipped reality: C.7 has a totally different schema, and A.4 synthesizes its own metrics from raw findings. Two parallel impact paths exist; neither references the other.
2. **D.5 + clone/verify.** The verify loop reads prior fidelity report only on iteration 1 (intentional — later iterations re-screenshot). Spec implies "knows exactly which selectors diverge instead of re-comparing the whole screenshot." Shipped reality: the prior report is a hint at iteration 1, not a selector-targeted instruction. Effective behavior is similar; structural mechanism differs.

These are fine but worth documenting so future readers don't assume the wiring exists.

---

## Recommended actions before declaring the roadmap done

1. **Decide on the C.6 flag name.** `--audit-mode` (sales|operator) vs `--mode` (base|deep|all). Pick one and propagate to docs.
2. **Decide on the C.7 schema.** If the spec's `metric/magnitude/rationale` shape is needed (for sales-facing reports that frame impact in business terms), migrate. If not, delete the spec language and keep the score-points heuristic.
3. **G.7 pipeline-graph dedup.** Move the pipeline declaration to `packages/core/src/pipeline.ts` and have both `run/all.ts` and `PipelineStages.tsx` import from it. Removes the two-place coupling debt. ~30 minutes of work.
4. **Update PRODUCT-ROADMAP.md to reflect shipped reality.** Mark items with their actual scope (e.g., G.4 ships generic-SDK-runner, not Agent-SDK-design-deep migrations). Otherwise future sessions will read the roadmap as the spec and re-build things that already shipped under different names.
5. **Document the F.5 / F.6 / E.5 partial state.** All three are blocked on user decisions. They're called out in HANDOFF.md but not in the roadmap itself.

The work is solid; the gaps are mostly naming/coverage/wiring, not missing functionality. Spending an hour on items 1–5 above gets the spec and reality in sync.

---

## Addendum (post-merge of `ff2fd67`)

After the original audit was written, a parallel branch landed via `ff2fd67`
("Add web-audit & accessibility skills and deep-audit CLI"). The merge had
unresolved `<<<<<<<` markers in `audit.ts`; resolved in `7fd13a7` by keeping
both deep-pass tracks — they describe non-overlapping systems.

**New work delivered by the merge.**

- 9 tooling-driven deep passes under `packages/cli/src/deep-audit/passes/`:
  `design-deep`, `web-quality` (Lighthouse), `audit-website` (squirrelscan),
  `accessibility-deep`, `cwv-deep`, `analytics-tracking`, `trust-signals`,
  `cross-browser`, plus `runPreflight` for binary/skill availability checks.
- Shared infrastructure: `parse-findings.ts`, `skill-loader.ts`, `sample.ts`,
  and a generic `skill-pass.ts` runner.
- 7 new `AuditDimension` values: `web-quality`, `core-web-vitals`,
  `accessibility`, `audit-website`, `analytics`, `cross-browser`,
  `trust-signals`.
- Legacy `--deep` boolean flag on `audit.ts`, distinct from `--mode=deep|all`.
- `audit-passes/src/index.ts` now re-exports `loadPages`, `loadDesignTokens`,
  `loadRawHtml` so deep passes can consume the shared loader.

**How this changes the prior drift findings.**

- **C.2 typography pass — narrower-than-spec gap partly closed.** The
  spec wanted FOUT/FOIT risk and pairing critique; the new
  `accessibility-deep` covers font-related a11y, and `web-quality`
  (Lighthouse) covers FOUT-adjacent performance signals. The gap is now
  smaller but not zero — explicit pairing critique still missing.
- **D.1 clone fidelity — spec's token-adherence check now adjacent.**
  `web-quality` runs Lighthouse against the cloned site; computed-style
  checks against design tokens could land as a small extension of that
  pass rather than a fresh implementation.
- **G.4 SDK runner — no longer the only deep-pass runner.** The merged
  passes call Anthropic directly via injected `Anthropic` clients
  (preflight gates on `ANTHROPIC_API_KEY`). Two patterns coexist now:
  the C.3-C.5 `AgentRunner` factory + the per-pass direct-Anthropic
  pattern. Worth deciding whether to consolidate.

**New drifts the merge introduced.**

- **Two competing deep-pass systems.** `--mode=deep|all` runs the
  C.3-C.5 LLM passes via `DEEP_PASSES` + `runAgent`. `--deep` runs the
  9 tooling-driven passes via per-pass invocation. Both populate the
  same `passed[]`; the operator has to know which flag triggers which
  set. Minor UX friction, not a correctness bug.
- **`audit.ts` description line is stale.** Header still says "Run all
  10 audit passes concurrently" — actual count is 12 base + up to 12
  deep (3 LLM + 9 tooling).
- **`run all` orchestrator doesn't expose `--deep`.** Only
  `--audit-mode` is plumbed through. Operators wanting tooling-driven
  deep passes via the orchestrator have no way today.

**No items missing** — the merge added new functionality on top of the
existing roadmap surface; it didn't break or remove anything once the
conflict resolved.

**Updated recommendations:**

1. Decide whether `--deep` and `--mode=deep|all` should remain
   separate or merge into one flag (e.g., `--mode=deep|tooling|all`).
2. Plumb the chosen flag(s) through `run all`.
3. Update the audit command's description and the docstrings that
   still say "10 passes".
4. Decide whether the new tooling-driven passes need explicit roadmap
   entries (they're not in the original C section) or whether they're
   considered Workstream-out-of-scope.
