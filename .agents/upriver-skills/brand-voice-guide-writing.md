---
name: brand-voice-guide-writing
description: Use when writing or revising the brand voice guide for a client, which is produced automatically by `upriver synthesize` and lives at `clients/<slug>/docs/brand-voice-guide.md`. Triggers: "write the voice guide", "update the voice guide", "the voice guide is too generic", "polish the brand voice section", or when reviewing a draft guide before the client interview. Covers: what inputs drive a good voice guide, what each section must contain, how to avoid generic adjectives, and how the guide feeds downstream skills (copywriting, copy-editing, clone).
metadata:
  version: 1.0.0
---

# Writing the brand voice guide

The brand voice guide is the single source of truth for how copy should sound on the rebuilt site. Every downstream skill (copywriting, copy-editing, clone) reads `.agents/product-marketing-context.md`, which is derived from this guide. If the guide is vague, the rewritten site sounds generic.

## When to apply this

- Drafting or revising `clients/<slug>/docs/brand-voice-guide.md`.
- Reviewing the Claude-generated draft from `upriver synthesize` before client handoff.
- Updating the guide after the client interview (`upriver process-interview`).
- Debugging why the clone pass produced copy that "doesn't sound like the client."

## Inputs to read before writing

1. `clients/<slug>/audit-package.json` — has `brandVoiceDraft` from synthesize, plus `contentInventory.testimonials` (best signal of customer language).
2. `clients/<slug>/pages/*.json` — scraped headings and markdown. The existing site usually has _some_ authentic voice buried in it.
3. `clients/<slug>/docs/interview-transcript.md` — if the client interview has happened, this is the richest signal.
4. `clients/<slug>/design-tokens.json` — `personality` array from Firecrawl branding extraction.

**Prioritize sources in this order:** interview transcript → testimonials → site headings → synthesized draft. The synthesized draft is a starting point, not the final answer.

## What a good voice guide contains

Every guide must have these six sections. Anything missing = the guide is incomplete.

### 1. Who we talk to

2-3 sentences describing the audience in language _they_ would recognize. Not "small business owners" — "a couple who got engaged six months ago and is overwhelmed by venue websites that all sound the same."

If the client serves more than one audience, list the primary one first and note the secondary one separately. Do not blend.

### 2. Tone

One sentence. Specific adjectives only — never "professional yet approachable." Examples:

- Good: "Warm, specific, and confident — a close friend who happens to run a farm."
- Bad: "Professional, approachable, and engaging."

The tone sentence is what the copywriting skill uses as its north star. If a candidate headline doesn't fit the tone, it gets rewritten.

### 3. What we say (keywords and phrases)

8-12 words or short phrases this brand actually uses. Pull from testimonials and interview transcripts, not from a SEO keyword tool. These are _voice_ keywords, not ranking keywords.

Examples from a real farmhouse wedding venue:
- "family-run", "Catskill", "the big barn", "Sunday morning", "your people", "a long table".

### 4. What we never say (banned words)

6-10 words or clichés the brand explicitly avoids. These must be concrete enough that a copy editor can grep for them. Not "corporate language" — list the actual words.

Default bans for every client (start here, add specifics):
- "stunning", "magical", "seamlessly", "transform", "elevate", "unlock", "premier", "world-class", "game-changer", "robust", "innovative", "cutting-edge", "best-in-class", "top-tier", "leading", "award-winning" (unless backed by a specific award and year).

### 5. Sample headlines (in voice)

10 headlines across a mix of pages (home, about, contact, key service). These are the canonical examples the copywriting skill references when generating new copy. Each headline must:
- Be under 10 words.
- Use at least one of the "what we say" keywords.
- Avoid every "what we never say" word.
- Advance exactly one idea.

### 6. Sample body copy (in voice)

3 short paragraphs (40-80 words each) across different tones: informational, emotional, and call-to-action. These anchor the copy-editing skill's "does this sound like the brand" judgment.

## Voice guide writing rules

- **Specificity beats completeness.** A three-sentence tone section that includes "sounds like Helen, the owner, when she's talking to a regular on a Sunday morning" is more useful than a page of abstract adjectives.
- **Quote the source.** Lift real phrases from testimonials or interview transcripts with attribution: _"Honest, no-nonsense, and kind" — from the Johnson family testimonial, March 2024._
- **No competitor mentions.** The voice guide describes how _this_ brand sounds, not how it's different from competitors. Comparative language belongs in the design brief.
- **Keep it under 800 words.** If it's longer, it's not being used. The operator reading this before writing a headline will skim it.
- **Version it.** Add a `Last updated: YYYY-MM-DD — reason` line at the bottom every time it's edited.

## Output location

The guide lives at `clients/<slug>/docs/brand-voice-guide.md` and is mirrored into the scaffolded repo at `<client-repo>/.agents/product-marketing-context.md` by `upriver scaffold`. Keep them in sync — when you edit the guide, re-run the last scaffold step or copy the content manually.

## Handoff signal

The voice guide is done when a new person can read it in 3 minutes and confidently write a headline for the homepage without asking questions. If the copywriting skill has to keep asking for context while rewriting pages, the guide has gaps.
