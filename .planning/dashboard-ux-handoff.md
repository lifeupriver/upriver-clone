# Handoff — Dashboard UX/UI improvement pass

Paste this into a fresh Claude Code session at the root of `upriver-clone`. Goal: **click through the dashboard and make it feel calm and obvious instead of overwhelming.** The operator's first reaction to the current dashboard is "this is overwhelming" — that is the problem to solve.

## What this is (context)

`packages/dashboard` is an Astro 5 (`output: 'server'`) app — the GUI for the whole product. It has **two surfaces**:

- **Operator dashboard** — `/clients/...` (you, the consultant). In local mode (`UPRIVER_DATA_SOURCE=local`) auth is bypassed; in Supabase mode it's operator-gated (`middleware.ts`).
- **Client portal** — `/deliverables/<slug>/...`, **magic-link/token gated** (no login). This is where the client sees the intake **chatbot** (`intake-chat`), the questionnaire **form** fallback (`interview`), and their **deliverables** (audit report, findings, scorecard).

It drives two pipelines: **intake → AI Operating System generation** (`profile`, `generate`) and **website audit → rebuild → launch** (`run all`: scrape/audit/synthesize/scaffold/clone/…). The sidebar exposes ~25 pipeline stages.

## How to run and see it

```bash
UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js dashboard --port 4321
# Astro dev server → http://localhost:4321
```
Client portal needs a token — mint one:
```bash
node packages/cli/bin/run.js interview-link <slug> --base-url http://localhost:4321
```
**Clients with real data on disk** (both local, gitignored): `littlefriends` (full 18-doc generation flow — use for the generation/intake/coverage views) and `audreys` (full website pipeline — use for audit/site/clone-fidelity/fixes views). Use **both** so you see populated states, not just empty ones.

Key URLs to start from:
- Operator: `/clients` · `/clients/littlefriends` (overview) · `/clients/littlefriends/coverage` · `/clients/audreys/audit` · `/clients/audreys/site`
- Client: `/deliverables/littlefriends/intake-chat?token=…` (the chatbot) · `/deliverables/<slug>/index`

## The diagnosis (grounded — I clicked through it)

**The client *overview* page (`/clients/<slug>/index.astro`) is the overwhelm epicenter.** It stacks **three overlapping, equal-weighted ways to do the same things**:
1. A **~25-row "Pipeline Stages" list in the left sidebar**, each with a `Run` button (DISCOVER, SCRAPE, AUDIT, MEDIA AUDIT, GAP ANALYSIS, VIDEO AUDIT, SYNTHESIZE, VOICE EXTRACT, BLOG TOPICS, SCHEMA BUILD, DESIGN BRIEF, SCAFFOLD, CLONE, FINALIZE, CLONE FIDELITY, FIXES PLAN, QA, IMPROVE, LAUNCH, PROTOTYPE, CUSTOM TOOLS, MONITOR, FOLLOWUP…). Flat, ungrouped, no sense of order or "where am I."
2. A **~13-card "Workspace" grid** in the main area (Intake, Interview, Audit Report, Clone Fidelity, Brand Voice, Design Brief, Site Preview, QA Report, Launch Checklist, Export Audit/Brief, Share Links) — almost all reading **"Not generated yet · Run →"** in dim low-contrast text.
3. A separate **deliverable nav** (OVERVIEW, INTAKE, AUDIT, …) in the sidebar header.

Net effect: everything is visible at once, everything is the same visual weight, and most of it is empty — so there's no answer to "what do I do **now**?" The small "NEXT STEP: Discover the site" banner is the one piece of guidance and it's buried.

**The `coverage` page is the opposite — and it's the quality bar to aim for.** It opens with four **stat cards** (READY / BLOCKED / CONFLICTS / GENERATED), then a clean **"Fill by section"** list of labeled progress bars, then grouped lists (Ready / Blocked / Generated-but-unapproved / Conflict queue). It's scannable, hierarchical, and tells a story. **Make the rest of the dashboard feel like the coverage page, not like the overview page.**

Other concrete issues seen:
- **Low-contrast secondary text** ("Not generated yet", muted labels) on the dark theme — fails the squint test.
- **CSS warning** in the dev log: `global.css` has an `@import url(fonts…)` *after* other rules → Vite/PostCSS warns "@import must precede all other statements." Move it to the top (cosmetic but it's noisy and wrong).
- **Two mental models collide**: "pipeline stages" (verbs/process) vs "deliverables/artifacts" (nouns/outputs), both labeled `Run`. Pick the primary model; demote the other.
- **Client interview *form*** (`/deliverables/<slug>/interview`) returns a bare-text 503 when no FormSpec exists (e.g. littlefriends). It's graceful but ugly — make it a branded, friendly empty state. (The chatbot path works fine.)

## Design principles for this pass

1. **Progressive disclosure.** Don't show all 25 stages + 13 cards at once. Group the pipeline into phases (e.g. *Intake → Audit → Build → Launch*), collapse what isn't relevant to the current state, and surface only the next sensible actions.
2. **One obvious primary action per state.** The page should answer "what now?" in under two seconds — a single prominent CTA, everything else demoted.
3. **Hierarchy and rhythm.** Establish clear levels (page title → status summary → primary action → secondary detail). Use the coverage page's stat-cards + grouped-lists pattern as the template.
4. **Status-first, not capability-first.** Lead with where this client *is* (what's done, what's blocked, what's next), not a flat menu of everything the CLI can do.
5. **De-duplicate navigation.** Collapse the overlapping pipeline-stages list / workspace cards / deliverable nav into one coherent system.
6. **Accessibility & contrast.** Meet WCAG AA on text; don't rely on dim grays for meaningful content. Keyboard-navigable; sensible empty states.
7. **Keep it distinctive, not generic.** Preserve the considered dark aesthetic (tokens in `styles/global.css`: `--bg-primary: #1A1412`, DM Sans / JetBrains Mono) — refine it, don't flatten it into a generic admin theme. Consider invoking the `frontend-design` skill for the redesign.

## Method (do this in order)

1. **Audit first, change nothing.** Click through **every** operator route (the 13 per-client pages + `/clients`, `/clients/new`) and the client portal (chatbot + a deliverable view), for **both** `littlefriends` and `audreys`. Screenshot each (Playwright MCP; viewport 1440×900 and a 390px mobile pass). Write `.planning/dashboard-ux-audit.md`: per page, a severity-tagged issue list + one screenshot, and an overall "overwhelm" diagnosis. Confirm or correct the diagnosis above against what you actually see.
2. **Prioritize.** Rank issues by (impact on overwhelm × effort). The **overview page redesign is almost certainly #1.**
3. **Redesign the worst page first** (the client overview), then propagate the winning patterns (status summary, phase grouping, single primary CTA, coverage-style cards) to the others. Implement incrementally; re-screenshot before/after.
4. **Verify** at each step: dashboard still builds (`pnpm -C packages/dashboard build`) and the pages still render with real data (re-screenshot littlefriends + audreys). Don't regress the data wiring.

## Constraints / guardrails

- **Frontend only.** Work inside `packages/dashboard`. Do **not** touch the CLI generation engine, the profile/coverage logic, the data-source layer, or the API routes' behavior (you may restyle their output, not change what they read/write).
- **Preserve the two-surface model and gating** (operator `/clients` vs token-gated client `/deliverables`). Don't expose client pages without a token or operator pages without auth in supabase mode.
- **Keep local-mode dev** working (`UPRIVER_DATA_SOURCE=local`, the `dashboard` command, port 4321, `pnpm run dev`).
- **Don't break the build.** `pnpm -C packages/dashboard build` must stay green; fix the `@import` warning while you're in `global.css`.
- Work on a branch (`ux/dashboard-redesign`), keep commits scoped, open a PR with before/after screenshots and a short rationale. Do not merge to main without review.

## File map (where to work)

| Concern | File |
|---|---|
| Client overview (the worst page) | `packages/dashboard/src/pages/clients/[slug]/index.astro` |
| Pipeline-stages sidebar list | `components/astro/PipelineTrack.astro`, `components/react/PipelineStages.tsx` |
| Workspace "artifact" cards | `components/astro/ArtifactCard.astro` |
| Shared shell / sidebar / nav | `layouts/DashboardLayout.astro` |
| The good reference page | `pages/clients/[slug]/coverage.astro` |
| Design tokens + the `@import` bug | `styles/global.css` |
| Client portal (chatbot / form) | `pages/deliverables/[slug]/intake-chat.astro`, `interview.astro` |
| Stage definitions (for grouping into phases) | `packages/core/src/pipeline/stages.ts` (`PIPELINE_STAGES`) |

## Definition of done

- `.planning/dashboard-ux-audit.md` exists: every page screenshotted, issues severity-tagged, overwhelm diagnosis confirmed.
- The client **overview** page no longer dumps 25 stages + 13 empty cards at equal weight — it leads with status + a single clear next action, with the rest behind progressive disclosure.
- Patterns propagated; contrast meets AA; `@import` warning gone; build green; before/after screenshots in the PR.
- Bonus: the client interview-form 503 becomes a friendly branded empty state.
