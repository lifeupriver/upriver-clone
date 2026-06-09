# Document Production Spec 20: Design System

## What This Spec Is

This is the production specification for the Design System document — the website tier's design half. It tells anyone (or any headless generation session) building this document exactly what goes in, what each section looks like, and how to know when it's done.

The Design System captures the client's brand as a buildable system: voice translated to visual, color palette with hex values, type scale, spacing, a component inventory, photography direction, and do/don't examples — plus a machine-readable token block the scaffold consumes. For the **platform-conversion path (A)** it documents the *current* system faithfully (the before-state record). For the **rebuild paths (B/C)** it specifies the *target* system, and it doubles as the upload manifest and brief for the operator-driven Claude Design work (the playbook's Path 2 / Path 3).

**Critical boundary — this generator never calls an external design tool.** Claude Design sessions, Pinterest reference boards, and Gemini logo concepts are *operator* actions: the document emits them as `[OPERATOR ACTION: …]` lines (exactly like a provisioning runbook), and a human performs them. The generator produces the document and the token block; it does not extract a UI kit, open Claude Design, or generate imagery. Where the inputs are silent, mark `[NEEDS CONFIRMATION: <specific question>]` inline rather than inventing brand decisions.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 20 (website tier — `--web`) |
| **Priority** | High for paths B/C; documentary for path A |
| **Total length target** | 1,500-3,500 words + a token block |
| **Delivery format** | Markdown doc loaded into the client's Claude Project; the token block is reconciled to `clients/<slug>/design-system/tokens.json` (operator step) |
| **File naming convention** | `[client-slug]-20-design-system.md` |
| **Scope gate** | `goals.engagementScope.websiteScope` (HV). Only B/C need a new/evolved system; A documents the current one. The session receives the scope value. |
| **Consumed by** | The scaffold template (`src/styles/global.css` via `renderGlobalCss`); the operator's Claude Design org (as the upload manifest + before-state) |

---

## When This Document Gets Built

**After the doc-10 scope fork is chosen and verified**, alongside the web-PRD (Document 19). Rides the `--web` scope. The session is told the verified `websiteScope` (A/B/C) and states which it is serving (§1).

**Triggers:** Documents 01, 05, 10 delivered and approved; `goals.engagementScope.websiteScope` verified.

**Blocks/feeds:** the operator's Claude Design setup (Path 2/3) and the scaffold's `tokens.json`. It does not block the platform-conversion clone (Path A reproduces the live design as-is).

---

## Required Inputs

| Input | Source | Used for |
|---|---|---|
| Voice attributes + tone spectrums | doc-01, profile `voice.attributes` / `voice.toneSpectrum` | the voice→visual translation (§1); the Remix brief |
| Visual brand assets (palette hex, logos, typography, guidelines doc) | profile `content.visualBrandAssets` | color palette (§2), typography (§3), the token block (§8) |
| Design-pass findings (current system, inconsistencies, contrast/scale issues) | doc-10 (audit) | what to keep vs. correct (paths B/C); the current-state record (path A) |
| Competitor visual differentiation | doc-05 | where the system must differ to claim the open positioning space |
| `positioning.keyDifferentiator` | profile `positioning` | the through-line the visual system must express |
| `goals.engagementScope.websiteScope` (A/B/C) | profile `goals` (HV) | whether this documents the current system or specifies a target |

The generator uses these as the design brief. It does NOT fetch references, extract from screenshots, or call Claude Design — those are operator steps (§9).

---

## Section-by-Section Template

### Header Block

```markdown
# [Business Name] Design System

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Scope path:** [A documents current / B evolve / C reimagine] (from doc-10 §9, websiteScope)
**Companion documents:** 01 (voice), 05 (competitors), 10 (audit), 19 (web-PRD).

**Critical principle:** every design decision traces to a source — a voice attribute (doc-01), a brand asset (profile), an audit finding (doc-10), or a positioning need (doc-05). External design-tool work is an operator step, not part of this document's generation.
```

---

### Section 1: Brand Foundation (voice → visual)

**Purpose:** Translate the verified voice into visual principles.

**Word count target:** 250-400 words.

Required content: the voice attributes and tone-spectrum positions (doc-01/profile) restated as visual principles (e.g. "warm, grounded, not precious" → generous whitespace, photographic warmth, restrained type). The positioning through-line (doc-05/positioning) the system must express. For path A, describe the current system's personality faithfully; for B/C, the target.

---

### Section 2: Color Palette

**Purpose:** The palette with exact hex values.

**Word count target:** 200-350 words + a table.

Required content: a table of roles → hex → usage. At minimum: `primary`, `secondary`, `accent`, `background`, `textPrimary`, `textSecondary`, plus any of `link` / `success` / `warning` / `error` the brand uses. Source hex from `content.visualBrandAssets.palette` when present; otherwise propose values grounded in the brand (and mark `[NEEDS CONFIRMATION]`). Note contrast pairings (the audit's contrast failures, if any, must be corrected for B/C). These hex values populate the token block (§8) verbatim.

---

### Section 3: Typography & Type Scale

**Purpose:** Fonts and the modular scale.

**Word count target:** 200-350 words.

Required content: heading font, body font, mono font (names); a type scale (e.g. 1.25 ratio) with rem sizes for h1-h6, body, small; line-heights and weights. Source from `content.visualBrandAssets.typography`; correct the audit's scale findings for B/C.

---

### Section 4: Spacing & Layout

**Purpose:** The spacing system and layout primitives.

**Word count target:** 150-300 words.

Required content: base unit, spacing scale, border-radius (card vs. button), container widths, breakpoints, grid. These feed the token block.

---

### Section 5: Component Inventory

**Purpose:** The components the build composes from.

**Word count target:** 300-500 words.

Required content: primary/secondary buttons, inputs, cards, nav, footer, hero, testimonial, FAQ — each with the states and tokens it uses. For path A, inventory what exists; for B/C, specify the target set (cross-reference the web-PRD's per-page needs).

---

### Section 6: Photography & Imagery Direction

**Purpose:** How images should look and what they must show.

**Word count target:** 150-300 words.

Required content: photographic style (warmth, light, framing), subject guidance, what to avoid, and the asset inventory available (profile `content`). Note rights constraints (HV) where relevant.

---

### Section 7: Do / Don't Examples

**Purpose:** Make the system unambiguous.

**Word count target:** 200-400 words.

Required content: concrete do/don't pairs for color use, type, spacing, voice-in-UI (banned phrases from doc-01 applied to microcopy), and imagery.

---

### Section 8: Design Tokens (machine-readable)

**Purpose:** The token block the scaffold consumes. This is the bridge to the build.

Required content: a single fenced ```json block in the shape `clients/<slug>/design-system/tokens.json` uses. This shape is **drop-in compatible with `clients/<slug>/design-tokens.json`**, which the scaffold's `renderGlobalCss` reads when emitting `src/styles/global.css`:

```json
{
  "colors": {
    "primary": "#1d4ed8", "secondary": "#0f172a", "accent": "#f59e0b",
    "background": "#ffffff", "textPrimary": "#0f172a", "textSecondary": "#475569",
    "link": "#1d4ed8"
  },
  "fonts": [
    { "family": "Fraunces", "role": "heading" },
    { "family": "Inter", "role": "body" }
  ],
  "components": { "buttonPrimary": { "borderRadius": "0.5rem" } },
  "typography": { "headingFont": "Fraunces", "bodyFont": "Inter" },
  "spacing": { "baseUnit": 8, "borderRadius": "0.75rem" }
}
```

**How the scaffold consumes it (the mapping — do not refactor the template):**

| tokens.json key | scaffold reads it as | global.css output |
|---|---|---|
| `colors.primary` | brand scale seed | `--color-brand-50…900` (`@theme`) |
| `colors.textPrimary` | ink scale seed | `--color-ink-50…900` |
| `colors.{secondary,accent,background,textSecondary}` + extras (`link`, `success`, …) | custom color vars | `--color-<name>` |
| `fonts[].role` ∈ {heading\|display, body\|paragraph\|primary} | heading/body family | `@import` + `--font-*` |
| `components.buttonPrimary.borderRadius` | button radius | button radius var |
| `spacing.borderRadius` | card radius | card radius var |

The block must use real hex and font names (no placeholders); fill every required color role. The session writes the block INTO this document — it does not write a separate file (see §9 for how it reaches `tokens.json`).

---

### Section 9: Operator Runbook ([OPERATOR ACTION] steps)

**Purpose:** The steps a human performs — external tools and file reconciliation. The generator emits these as lines; it never performs them.

Required content (emit verbatim, one `[OPERATOR ACTION:]` per step):

- `[OPERATOR ACTION: save the §8 Design Tokens JSON block to clients/<slug>/design-system/tokens.json]`
- For paths B/C: `[OPERATOR ACTION: in the CLIENT's Claude Design org, upload this document + the clone repo + screenshots + brand assets as the design-system source; review the extracted UI kit]`
- For paths B/C: `[OPERATOR ACTION: Remix the extracted system using doc-01 voice + doc-10 design findings as the brief (evolve, do not replace for path B; synthesize from references for path C — never reproduce one reference)]`
- For path C: `[OPERATOR ACTION: capture 3–5 reference sites with the per-site "why" (Firecrawl full-page desktop+mobile), upload as the Remix source]`
- Optional: `[OPERATOR ACTION: generate logo concepts in Gemini / collect Pinterest references for the Remix brief]`
- `[OPERATOR ACTION: after client approval, flip the Claude Design system to Published, then reconcile the approved tokens back into clients/<slug>/design-system/tokens.json and clients/<slug>/design-tokens.json so the scaffold's global.css picks them up]`

These are the only `[OPERATOR ACTION]` lines the document carries; the engine surfaces them in its report like a provisioning runbook.

---

## How to Build This Document

Generated by the Upriver engine under `--web`, from the profile slice (the §"Required Inputs" fields) plus the F1 digests of doc-01/05/10. The session:

1. Reads the verified `websiteScope`; states the path (§1). The HV gate blocks generation if it is unverified.
2. Translates voice → visual (§1), then specifies palette/type/spacing/components/photography/do-don'ts (§§2-7) from the brand assets and audit findings. Path A documents the current system; B/C specify the target.
3. Emits the machine-readable token block (§8) in the scaffold-compatible shape, with real hex/fonts.
4. Emits the operator runbook (§9) as `[OPERATOR ACTION:]` lines — it NEVER calls Claude Design / Pinterest / Gemini itself.
5. Marks every gap as `[NEEDS CONFIRMATION: <question>]`.

---

## Definition of Done

- [ ] All 9 sections present; scope path stated and matches the verified `websiteScope`
- [ ] Palette table has every required color role with real hex
- [ ] Type scale, spacing, and component inventory specified
- [ ] §8 token block present, valid JSON, in the scaffold-compatible shape (real hex + fonts, every color role filled)
- [ ] The tokens.json ↔ global.css mapping table present
- [ ] §9 operator runbook present; external-tool work is `[OPERATOR ACTION:]` only
- [ ] No external design tool is called by the generator (grep: no Claude Design / Pinterest / Gemini API calls)
- [ ] Every design decision traces to a source (voice / brand asset / audit finding / positioning)
- [ ] Gaps marked `[NEEDS CONFIRMATION]` rather than invented

---

## Common Failure Modes

**Failure 1: The generator calls an external design tool.** It opens Claude Design or generates imagery. Fix: those are `[OPERATOR ACTION:]` lines; the generator only writes the document + token block.

**Failure 2: Token block incompatible with the scaffold.** Missing color roles, placeholder hex, or a shape `renderGlobalCss` can't read. Fix: follow §8's shape exactly; fill every role with real hex.

**Failure 3: Reproducing a reference (path C).** The system clones one admired site (especially a competitor). Fix: synthesize from 3+ references + the client's own brand anchors; name the shared qualities, never copy one.

**Failure 4: Inventing brand decisions.** Proposing a palette with no basis. Fix: source from `content.visualBrandAssets`; where silent, propose grounded in the brand and mark `[NEEDS CONFIRMATION]`.

**Failure 5: Path confusion.** Specifying a full redesign when `websiteScope` is A. Fix: A documents the current system (before-state record); B evolves; C reimagines.
