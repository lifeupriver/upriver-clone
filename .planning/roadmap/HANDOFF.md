# Roadmap session handoff

**Last commit:** `0d8fdd2 feat(workstream-H): H.2+H.3 — four new upriver-skills + typed skills registry`
**Branch:** `main`
**Commits this session:** 18 (range `cc6a233..0d8fdd2`)
**Pushed:** no — all local.

## What shipped

| Workstream | Items | Commit |
|---|---|---|
| A.1 | New report shell (index/scorecard/findings/next-steps Astro pages) | `cc6a233` |
| A.4 | Impact metrics + narrative hero | `d0250aa` |
| A.3 | Client-branded `CoverHeader` | `09315f3` |
| A.2 | Static report export (`upriver report build`) | `1a38179` |
| A.5 | Report PDF export (`upriver report pdf`) | `489aaf7` |
| A.6 | Share-link tokens + `upriver report send` | `208e8e8` |
| B.1+B.2 | `ClientIntake` type, `IntakeForm` island, `/api/intake` endpoint | `16cad25` |
| B.6 | Operator intake admin view + lock-scope action | `614af24` |
| B.4+B.5 | Wire intake into `fixes plan` and `clone` prompts | `9e6a6e2` |
| G.2+G.5 | Content-addressed LLM cache + prompt-caching helper | `b58169e` |
| G.1 | `BaseCommand.skipIfExists` (synthesize, report build) | `74cbb32` |
| D.1 | Clone-fidelity scorer (pixel + copy) | `345efd6` |
| D.2 | Clone-fidelity dashboard route | `57fa614` |
| E.1+E.2 | `upriver improve` command shell + skill matrix loader | `fcc275a` |
| E.6 | Deterministic GEO/AEO generator (llms.txt, FAQ JSON-LD, TL;DR) | `68a709a` |
| E.3 | Improvement-track agent runner + worktree-per-track | `6a92e60` |
| F.1+F.3 | `/api/run/[command]` SSE endpoint + `/clients/new` wizard | `7a58a03` |
| H.2+H.3 | Four new upriver-skills + typed skills registry | `0d8fdd2` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is 54/54 green. `pnpm --filter @upriver/core run test` is 8/8 green.

## What's still pending

### Workstream B
- **B.3 — per-page wants on `findings.astro`.** Skipped intentionally: the IntakeForm on `next-steps.astro` already collects per-page wants via textareas. B.3 only adds value if the operator wants page-level interactions on the findings page itself. Defer until product validation says it's needed.

### Workstream C — audit depth + GEO/AEO expansion
Nothing shipped. C.1 (geo base pass), C.2 (typography base pass), C.3 (content-strategy deep), C.4 (conversion-psychology deep), C.5 (competitor-deep), C.6 (`--audit-mode` flag), C.7 (`estimatedImpact` on findings) are all open. The `packages/cli/src/deep-audit/passes/` directory referenced in the roadmap doesn't exist yet — anyone working on C should create it as part of the first deep-pass slice.

### Workstream D
- **D.3** Auto-generate `clone-fidelity-<n>` findings from low-scoring pages.
- **D.4** Promote `finalize.ts` unmatched-CDN-URL check into a fidelity gate.
- **D.5** Verify loop becomes plan-aware (`clone/verify.ts` consumes the fidelity report).

### Workstream E
- **E.4** One PR per track via `gh pr create` (branches `improve/<id>` are pushed-ready; need a PR-open helper).
- **E.5** Before/after re-audit on the preview branch + `improvement-report.md`.
- **E.7** Programmatic-SEO opportunity surfacing into `improvement-opportunities.md`.

### Workstream F
- **F.2** Live pipeline view: replace static `PipelineTrack` with run buttons per stage.
- **F.4** Cost preview before expensive steps (read `token-and-credit-usage.log`, surface estimate).
- **F.5** Auth gate for `/api/run/*` (Supabase auth, operator-only).
- **F.6** `upriver dashboard deploy` + Supabase storage sync.

### Workstream G
- **G.3** Parallelize deep audit passes — blocked on workstream C creating `deep-audit/passes/*`.
- **G.4** Migrate the highest-volume passes to Agent SDK — also blocked on C.
- **G.6** Single Firecrawl batch instead of per-command scrapes.
- **G.7** Pipeline-level dependency graph + `upriver run all <slug>`.

### Workstream H
- **H.1** Expand the symlink set in `.agents/skills/`. Filesystem fiddling — operator-side. Not done in this session.
- **H.4** `--design-system upriver|client` flag on `upriver clone`.

### Decisions waiting on the user
- **Pricing copy** for the three scope tiers on `next-steps.astro` ("Polish / Rebuild / Rebuild + content"). Currently "Contact us" placeholders.
- **Hosted-report URL** convention. Code defaults to `https://reports.upriver.com` via `UPRIVER_REPORT_HOST`. If the actual host differs, set the env var or update the default.
- **SMTP integration** for `upriver report send`. Currently logs the email body; operator forwards manually. Pick an SMTP provider before wiring.
- **Supabase upload** for `upriver report build --upload`. Currently a stub. Needs a bucket + signed-URL convention.

## Next 3 concrete TODOs for next session

1. **E.4 — open one PR per track via `gh pr create`.** The improve-track branches (`improve/<id>`) are already produced by E.3. Add a `--no-pr` flag (default false), push the branch, run `gh pr create --base main --head improve/<id> --title "improve(<id>): ..." --body-file <track-summary.md>`. Build a `<clientDir>/improve/<track-id>-summary.md` from the track output.
2. **D.3 — fidelity findings feed into fixes.** In `clone-fidelity.ts`, when a page scores < 80, emit a synthetic `AuditFinding` with id `clone-fidelity-<page-slug>`, priority `p1`, dimension `design`, and append it to `audit-package.json` (or a sibling `clone-fidelity-findings.json` that `fixes plan` reads alongside the audit findings).
3. **C.1 — GEO base pass.** `packages/audit-passes/src/geo/index.ts` exporting `runGeo(slug, clientDir): Promise<AuditPassResult>`. Heuristic checks: per-section TL;DR presence (count of `summary` / `tl;dr` / `key takeaways` headings across pages), llms.txt presence (`public/llms.txt` exists), structured factoids (year founded, service area, prices in any extracted content), entity disambiguation. Wire into `audit.ts` `ALL_PASSES`. Use existing `loader.ts` `loadPagesAndTokens` pattern.

## Notes for the next session

- The agent runner in E.3 duplicates `runClaudeCode` and `createWorktree` from `commands/{clone,fixes/apply}.ts`. Annotated with TODOs. Worth extracting to `packages/cli/src/util/{claude-code,git-worktree}.ts` as a small refactor before E.4 lands.
- The dashboard package has no test runner. F.1 helper `flagsToArgs` has no unit test for that reason. If anyone touches the dashboard with new pure helpers, add `node:test` plus a `test` script.
- `rewriteHtml` in `packages/cli/src/commands/report/rewrite.ts` (A.2) is a regex-based path-rewriter. If the report HTML acquires more route-types, expand the rule set there.
- The `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer specified in CLAUDE.md gets rejected by the harness as fabricated authorship. Commits in this session shipped without it. Worth resolving the policy conflict.
- `.planning/roadmap/` was untracked at start of session and has been ignored by every commit. This handoff doc is the first file checked in there — keep it `.gitignored` if that's the convention, else the next session can decide.
