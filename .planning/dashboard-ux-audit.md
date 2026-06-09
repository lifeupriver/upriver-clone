# Dashboard UX Audit — `packages/dashboard`

**Date:** 2026-06-08 · **Branch:** `ux/dashboard-redesign` · **Method:** clicked through every
operator route + the client portal for **both** `littlefriends` (intake/generation populated, no
website-audit data) and `audreys` (full website pipeline populated), at **1440×900** and a **390px**
pass. Screenshots in [`audit-shots/`](audit-shots/). Server: `UPRIVER_DATA_SOURCE=local`, port 4322.

> Goal this audit serves: the operator's first reaction to the client dashboard is **"this is
> overwhelming."** This document confirms *where* the overwhelm comes from, ranks it, and names the
> fixes. The **client overview page is the epicenter** and is fix #1.

---

## TL;DR — the overwhelm diagnosis (confirmed, with corrections)

The brief's diagnosis is **correct**. One structural correction and several additions:

**Confirmed:** the client **overview** (`/clients/<slug>/index.astro`) stacks **three overlapping,
equal-weight ways to do the same things**, so nothing answers *"what do I do now?"*:

1. A **~25-row, flat, ungrouped "Pipeline Stages" list, each with a `Run` button.**
2. A **~11-card "Workspace" artifact grid**, most reading dim *"Not generated yet."*
3. A separate **13-item per-client deliverable sub-nav** (with status dots) in the global sidebar.

**Correction to the brief:** the 25-stage Run list is **not** in the global sidebar — it lives in the
**page-body left column** (`aside.client-aside` in `index.astro`). The **global sidebar**
(`DashboardLayout.astro`) carries the *separate* 13-item deliverable sub-nav. So the three systems sit
in **two different columns**, which is part of why it reads as noise: there is no single spine.

**The empty-vs-full trap (both are bad, differently):**
- `littlefriends` (empty): the page is mostly dim *"Not generated yet"* — all capability, no status,
  one tiny NEXT-STEP banner as the only guidance. ([lf-overview-1440](audit-shots/lf-overview-1440.png))
- `audreys` (full): the opposite — NEXT-STEP CTA **+** 25 Run rows **+** 11 cards **+** 7 score tiles
  **+** a findings table, all at equal weight on one screen. ([au-overview-1440](audit-shots/au-overview-1440.png))

**The quality bar already exists in the product — twice:**
- The **coverage page** (`coverage.astro`): stat cards → labeled progress bars → grouped chip lists.
  Scannable, hierarchical, status-first. ([lf-coverage-1440](audit-shots/lf-coverage-1440.png))
- The **client-facing audit report** (`/deliverables/<slug>`): tabbed, hero score card, coverage-style
  stat cards, **one** primary CTA. ([portal-au-deliverable-1440](audit-shots/portal-au-deliverable-1440.png))

**The redesign mandate (per brief + advisor):** don't make "prettier nouns beside demoted verbs."
**Collapse all three systems into ONE phase spine** — *Intake → Audit → Build → Launch* — where each
phase shows, together: its **status**, the **artifacts it produced** (as open-links), and its **next
run-action**. Lead with a coverage-style status summary; keep the existing NEXT-STEP CTA as the hero;
push the full 25-stage runner behind progressive disclosure (`<details>` per phase).

---

## Severity legend

| Tag | Meaning |
|-----|---------|
| **P0** | Severe — drives the overwhelm, breaks a page, or fails legibility/usability outright |
| **P1** | Notable — hurts hierarchy/clarity/consistency |
| **P2** | Polish |

Each issue is also tagged **[FIX]** (in scope for this pass) or **[DOC]** (real, but out of this
frontend pass — data/env/behavior, logged for the owner).

---

## Systemic issues (cut across many pages)

- **P0 [FIX] No responsive sidebar.** The 220px sidebar is `position: sticky; height: 100vh` with no
  breakpoint. At 390px it eats **~56%** of the viewport on *every* page; main content is crushed,
  tables truncate, primary CTAs are pushed offscreen.
  ([lf-overview-390](audit-shots/lf-overview-390.png), [au-overview-390](audit-shots/au-overview-390.png),
  [clients-list-390](audit-shots/clients-list-390.png), [au-audit-390](audit-shots/au-audit-390.png))
- **P0 [FIX] Low-contrast meaningful text on dark.** Worst offender is `ArtifactCard.astro:56`
  `.artifact-empty { opacity: 0.7 }` compounding on already-muted `--text-muted` — *"Not generated
  yet"* drops below AA. Same dim-on-dark pattern in audit finding rows, coverage section labels, and
  the long prose pages. Fix = drop the opacity trick, use `--text-body` for meaningful content, verify
  the *computed* (post-opacity) ratio ≥ 4.5:1.
- **P1 [FIX] Two mental models collide, both labeled `Run`.** "Pipeline stages" (verbs) vs
  "deliverables/artifacts" (nouns) are presented as peers. Pick one spine (phases) and demote the other.
- **P1 [FIX] Bare / off-theme empty states.** 6+ operator pages (interview, voice, clone-fidelity,
  fixes, qa, launch-checklist) render an identical **developer-facing CLI-command box** (e.g. "Run
  `upriver synthesize littlefriends`"), several on a **cream/off-white background that clashes** with
  the dark theme. No "what is this / when does it matter" context, no next-action button.
- **P1 [DOC] Deliverable pages are raw-markdown dumps.** voice, design-brief, qa, launch-checklist,
  fixes render long unstyled prose — no section hierarchy, no status chips, no actions. (Restyling the
  rendered markdown is a follow-up; flagged, not in this pass.)
- **P2 [FIX] `@import` order warning.** `upriver-design-system/colors_and_type.css:17` puts the
  Google-Fonts `@import url(...)` **after** the `@font-face` block → Vite/PostCSS "@import must precede
  all statements." (Only `global.css` consumes this file — safe one-line move.)

---

## Operator pages — per route

### `/clients/<slug>` — Client overview ★ EPICENTER ★
- **P0 [FIX]** Three overlapping action/nav systems at equal weight; no single spine; no clear "now."
- **P0 [FIX]** 25-stage Run list is flat/ungrouped — no phases, no sense of order or "where am I."
- **P1 [FIX]** 11 artifact cards mostly dim "Not generated yet" (empty client) — capability noise.
- **P1 [FIX]** Audit Report card shows "**score undefined**" when `summary.overall` is missing (data-display bug, `index.astro` `auditSummary`).
- **P1 [FIX]** The one good thing (NEXT-STEP CTA) is small and immediately drowned.
- Shots: [lf-overview-1440](audit-shots/lf-overview-1440.png) · [au-overview-1440](audit-shots/au-overview-1440.png) · [lf-overview-390](audit-shots/lf-overview-390.png)

### `/clients/<slug>/coverage` — ★ REFERENCE (good) ★
- **P1 [FIX]** Stat-tile borders nearly invisible; section labels a touch dim.
- **P0 [DOC]** At 390px the progress bars collapse to bare fractions (knock-on of the sidebar P0 + grid).
- Shots: [lf-coverage-1440](audit-shots/lf-coverage-1440.png) · [au-coverage-1440](audit-shots/au-coverage-1440.png) · [lf-coverage-390](audit-shots/lf-coverage-390.png)

### `/clients/<slug>/intake` — empty state (good)
- **P2 [FIX]** Has clear CTAs ("OPEN INTAKE FORM" / "COPY LINK") — best empty state in the app; use as the empty-state template. Shot: [lf-intake-1440](audit-shots/lf-intake-1440.png)

### `/clients/<slug>/interview` — operator view (empty)
- **P1 [FIX]** Bare CLI-instruction box on a cream bg that clashes with the dark theme; no guidance/next action. Shots: [lf-interview-1440](audit-shots/lf-interview-1440.png) · [au-interview-1440](audit-shots/au-interview-1440.png)

### `/clients/<slug>/audit` — audit report (operator)
- **P0 [FIX]** Finding rows are tiny dim text on near-black — legibility failure (scores tiles are fine).
- **P1 [FIX]** Header score grid + filter bar push the actual findings far down; no "what needs attention" summary.
- **P0 [DOC]** `/clients/littlefriends/audit` (no audit data) **silently redirects to overview** — no explanation. (Behavior; flagged.)
- **P0 [DOC]** At 390px score tiles stack into a ~9000px page; finding columns overflow. Shots: [au-audit-1440](audit-shots/au-audit-1440.png) · [au-audit-390](audit-shots/au-audit-390.png) · [lf-audit](audit-shots/lf-audit-1440.png)

### `/clients/<slug>/clone-fidelity`, `/voice`, `/design-brief`, `/fixes`, `/qa`, `/launch-checklist`
- **P1 [FIX]** (empty, littlefriends) identical bare CLI empty-state box; no differentiation, no context.
- **P1 [DOC]** (populated, audreys) raw-markdown dumps; no hierarchy, no actions; `design-brief` has an "EXPORT FOR CLIENT" button even when empty.
- Shots: au-[voice](audit-shots/au-voice-1440.png)/[design-brief](audit-shots/au-design-brief-1440.png)/[fixes](audit-shots/au-fixes-1440.png)/[qa](audit-shots/au-qa-1440.png)/[launch](audit-shots/au-launch-1440.png); lf-[clone-fidelity](audit-shots/lf-clone-fidelity-1440.png)/[voice](audit-shots/lf-voice-1440.png)/[fixes](audit-shots/lf-fixes-1440.png)/[qa](audit-shots/lf-qa-1440.png)/[launch](audit-shots/lf-launch-1440.png)

### `/clients/<slug>/site` — site preview
- **P0 [DOC]** audreys preview iframe loads `localhost:4322/` (the **dashboard itself**), not the cloned site; "LIVE" badge is misleading (preview URL misconfigured / repo not served).
- **P1 [FIX]** Empty state (littlefriends) mixes a filesystem path and a CLI command in one sentence; "OFFLINE" badge easy to miss. Shots: [au-site-1440](audit-shots/au-site-1440.png) · [lf-site-1440](audit-shots/lf-site-1440.png)

### `/clients/<slug>/share` — share links
- **P0 [DOC]** **Hard crash** on both clients in local mode: full Astro stack trace
  *"UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_PUBLISHABLE_KEY must be set."* Should degrade to a branded
  "share links need hosted mode" notice. (Restyling the *error output* is in spirit; logged for decision.)
  Shots: [lf-share-1440](audit-shots/lf-share-1440.png) · [au-share-1440](audit-shots/au-share-1440.png)

### `/clients` — client list
- **P1 [FIX]** Score column shows "—" for unaudited clients with no distinction from a real low score.
- **P0 [DOC]** 390px: sidebar uncollapsed, table cropped to the CLIENT column, no horizontal-scroll affordance. Shots: [clients-list-1440](audit-shots/clients-list-1440.png) · [clients-list-390](audit-shots/clients-list-390.png)

### `/clients/new` — new client form
- **P2 [FIX]** Pre-fills look like leftover `audreys` placeholder data — reads as stale state. Shot: [clients-new-1440](audit-shots/clients-new-1440.png)

---

## Client portal — per route (token-gated `/deliverables`)

### `/deliverables/<slug>/intake-chat` — chatbot (client)
- **OK.** Light, calm, friendly (cream bg, green Send). Deliberately a different, gentler visual
  language from the operator dark theme — appropriate. No changes needed. Shot: [portal-lf-intake-chat-1440](audit-shots/portal-lf-intake-chat-1440.png)

### `/deliverables/<slug>` — client audit report ★ REFERENCE (good) ★
- **OK / minor.** Tabbed, hero score card, coverage-style stat cards, single CTA. **P2 [FIX]** hero
  client name is a bit dim on the gradient. Use as a pattern source. Shot: [portal-au-deliverable-1440](audit-shots/portal-au-deliverable-1440.png)

### `/deliverables/<slug>/interview` — form fallback (client)
- **P1 [FIX] (bonus target)** When no FormSpec exists (littlefriends) it returns a **bare `text/plain`
  503**: *"Interview guide is not yet available for this client."* — unbranded, jarring. The 401 token
  gate is likewise bare text. Make these friendly branded HTML (keep the gate and non-200 status).
  Shot: [portal-lf-interview-503-1440](audit-shots/portal-lf-interview-503-1440.png)

---

## Phase 2 — Prioritized backlog (impact on overwhelm × effort)

| # | Work | Impact | Effort | Scope |
|---|------|--------|--------|-------|
| 1 | **Redesign client overview into one phase spine** (status summary + hero CTA + `Intake→Audit→Build→Launch` sections, each = status + artifacts + next action; 25-stage runner behind `<details>`) | ★★★ | M–L | **FIX** |
| 2 | **Contrast pass** to AA — kill `.artifact-empty` opacity, use `--text-body` for meaningful text, verify computed ratios | ★★★ | S | **FIX** |
| 3 | **Fix `@import` warning** in `colors_and_type.css` | ★ | XS | **FIX** |
| 4 | **Propagate patterns** — coverage-style stat cards + consistent branded empty state to artifact pages; de-dup sidebar sub-nav against the phase spine | ★★ | M | **FIX** |
| 5 | **Branded 503/401** for the client interview form (bonus) | ★ | S | **FIX** |
| 6 | **Responsive sidebar** (collapse/stack below a breakpoint) — kills the mobile P0 everywhere | ★★ | M | **FIX (budget permitting)** |
| 7 | `/share` graceful degradation (catch → branded notice instead of stack trace) | ★ | S | **FIX (if low-risk)** |
| 8 | `score undefined` card bug; `/clients` "—" score ambiguity; `clients/new` stale prefill | ★ | S | **FIX (opportunistic)** |
| — | au/site iframe self-embed; lf/audit silent redirect; raw-markdown deliverable styling | ★★ | — | **DOC** (data/behavior — out of this frontend pass) |

**Build order:** #1 (the deliverable) → #2 + #3 (cheap, global) → #4 → #5 → #6 → opportunistic #7/#8.
Re-screenshot littlefriends **and** audreys (both state extremes) before/after each major step.

---

## Outcome — this pass (commit `9c260fe` on `ux/dashboard-redesign`)

**Resolved (verified, build green):**
- **Client overview redesign** — one phase spine (Intake→Audit→Build→Launch): status-summary
  stat cards → single next-step hero CTA → phase sections (each = status chip + its deliverables as
  compact rows) → the 25-stage runner behind a `<details>` (phase-grouped). The flat 25-row Run list
  and the 13 equal-weight cards are gone. Verified on both extremes — littlefriends (empty →
  "Audit / Up next") and audreys (populated → scores/findings demoted below). Before/after:
  [lf](audit-shots/lf-overview-1440.png)→[lf](audit-shots/after-lf-overview-1440.png),
  [au](audit-shots/au-overview-1440.png)→[au](audit-shots/after-au-overview-v2-1440.png).
- **Contrast (AA) on every redesigned surface** — dropped `ArtifactCard`'s `opacity:0.7`; meaningful
  text uses `--text-body`/`--text-heading`, secondary uses `--text-muted` (computed **5.1:1** on
  `--bg-surface`, ≥ AA).
- **Responsive sidebar** (the mobile P0) — fixed globally; sidebar collapses to a top strip < 860px,
  content gets full width. `/clients` table now scrolls horizontally instead of clipping.
  [before 390](audit-shots/lf-overview-390.png) → [after 390](audit-shots/after-lf-overview-390.png),
  [list 390](audit-shots/after-clients-list-390.png).
- **De-dup nav** — sidebar sub-nav + runner both phase-grouped, mirroring the spine.
- **`@import` warning** — gone (font import moved above `@font-face`; build clean).
- **Branded 503/401/404** for the client interview form (was bare `text/plain`).
  [after](audit-shots/after-portal-interview-503.png)
- **Data-display bugs** — "score undefined" / "undefined P0" fixed (counts from findings; overall
  read from `audit-package.json`, same source as the client report → overview now shows 72 for audreys).

**Documented fast-follows (NOT changed this pass — out of the overview-first scope):**
- `/share` hard-crash (Supabase env) — needs graceful degradation in local mode.
- `au/site` preview iframe self-embeds the dashboard; misleading "LIVE" badge (preview-URL/data).
- `audit.astro` dense findings list — small dim rows (its own page; not the overview's `FindingsTable`).
- Raw-markdown-dump deliverable pages (voice / design-brief / qa / launch / fixes).
- The 6 standalone empty states still use bare CLI-command boxes.
- `lf/audit` silent redirect to overview; `clients/new` stale prefill.

> "Contrast meets AA / patterns propagated" is accurate **for the redesigned surfaces** (overview,
> shared shell, interview gate). The pages above are logged here for a follow-up pass.
