---
name: client-brief-writing
description: Use when writing or revising the Claude Design handoff brief produced by `upriver design-brief`. Triggers: "write the design brief", "update the brief", "the brief is too vague", "prepare the design handoff", or when a designer says the brief doesn't give them enough to work with. Covers: what the brief must contain to be actionable, how to translate audit findings into design constraints, how to distinguish design decisions from copywriting decisions, and how the brief interacts with the interview.
metadata:
  version: 1.0.0
---

# Writing the client design brief

The design brief is a handoff document. Its audience is either Claude Design (headless agent) or a human designer. Its job is to make _someone else_ able to produce a pixel-accurate, brand-appropriate first pass without talking to Upriver. If the brief requires a follow-up call to understand, it failed.

## When to apply this

- Running `upriver design-brief <slug>` and reviewing the generated markdown before handoff.
- Rewriting the brief when the first design pass doesn't match the client's site.
- Preparing for the client interview (the brief is the artifact the interview validates against).

## Inputs the brief compiles from

The CLI builds the brief from `clients/<slug>/audit-package.json`. Specifically:

- `meta` — client name, site URL, overall score.
- `designSystem` — colors, typography, spacing, border radius.
- `brandingProfile` — raw Firecrawl extraction (personality traits, components).
- `siteStructure.pages` — the canonical page list with titles, CTAs, and headings.
- `brandVoiceDraft` — tone, keywords, banned words, sample headlines.
- `implementationPlan.requiresAssets` and `requiresNewContent` — what the designer needs to ask for.
- Top P0 findings — what NOT to reproduce from the existing site.

## Brief structure (non-negotiable)

Every brief has these sections, in this order. Anything missing = the brief is incomplete.

### 1. Client snapshot (2-3 sentences)

Who is the client, what do they do, who do they serve, what is the overall audit score. One paragraph.

### 2. Why we're rebuilding

The top 3 P0 findings translated into "this is why the current site underperforms." Not "pages missing H1 tags" — "the current site is nearly invisible to Google because the primary search signal is missing on every page."

### 3. Design system anchors

- **Colors:** list the 6 canonical tokens (primary, secondary, accent, background, textPrimary, textSecondary) with hex values. Also list any custom tokens extracted (e.g. `--color-gold`, `--color-forest`).
- **Typography:** heading font family, body font family, display scale.
- **Spacing:** base unit, border radius for cards vs. buttons.
- **Logo:** path to extracted logo in `clients/<slug>/assets/images/` (or note if missing).

Include a line: _"All design tokens are already wired into `<repo>/src/styles/global.css` by `upriver scaffold`. Do not introduce hardcoded hex values."_

### 4. Voice anchors

Tone sentence + 5 sample headlines pulled directly from `brandVoiceDraft.sampleHeadlines`. Short list of banned words. The copywriter reads this before writing a single word on any new page.

### 5. Pages to build

Canonical list of pages with:
- Path (e.g. `/`, `/about`, `/venues/the-barn`)
- Page type (home, about, service, landing, contact)
- One-sentence purpose
- Primary CTA (pulled from `siteStructure.pages[].ctaButtons[0]`)
- Notable sections (hero, testimonials, FAQ, gallery, contact form)

If a page is in `siteStructure.missingPages`, flag it explicitly: _"NEW PAGE — does not exist on the current site. Must be designed from scratch."_

### 6. What the designer needs from the client

Pulled from `implementationPlan.requiresClientInput`, `requiresNewContent`, and `requiresAssets`. Be specific: not "photos" but "8-12 high-res photos of the barn interior and 4 of the grounds, ideally golden hour."

### 7. Out of scope

Explicit list of things the design pass should NOT touch:
- Any page in `siteStructure.pages` not listed in section 5.
- Admin / customer portal pages (if any).
- Email templates, social assets, printed collateral.
- Any animation beyond basic hover states (decide this deliberately — can upgrade later).

Being explicit about out-of-scope is how the brief stays tight and the first pass ships.

## Writing rules

- **Lead with constraints, not aspirations.** "Body copy max 60 characters per line on desktop" is useful. "The site should feel warm and inviting" is not — that lives in the voice guide.
- **Cite sources.** When referencing a P0 finding, link to the finding ID: _"(see finding `content-003`)."_ The designer can look it up in `audit-package.json`.
- **Resist the urge to redesign everything.** The brief is scoped to the pages in section 5. New components can come later — the first pass reuses what exists in `src/components/astro/`.
- **Include a "do not clone" list.** If the current site has patterns that are actively harmful (auto-playing video, pop-up modal on first scroll, forced full-screen hero), list them so the designer doesn't copy them out of fidelity.
- **Target length: 800-1200 words.** Longer than that and the designer will skim.

## Tension between brief and voice guide

The brief is about _structure_ (what pages, what components, what hierarchy). The voice guide is about _language_ (tone, keywords, banned words). When in doubt:

- Questions about _what a headline says_ → voice guide.
- Questions about _where the headline sits and how big it is_ → design brief.

They cross-reference but don't duplicate.

## Output location

`clients/<slug>/claude-design-brief.md`. Do not rename — downstream commands look for it at this path.

## Handoff signal

The brief is done when a designer can read it in 5 minutes and start working on the homepage without asking a single clarifying question. If they have to ask _"what CTA should the hero use?"_ — the brief missed section 5.
