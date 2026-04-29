---
name: clone-fidelity-scoring
description: Use when running `upriver clone-fidelity`, interpreting per-page scores, or deciding whether the clone is shippable. Covers pixel/copy/layout/token scoring methodology and the 80-point shippable threshold, how the per-page report reads, and the common failure modes that drive false negatives (height-mismatch screenshots, dynamic content, font swaps).
metadata:
  version: 1.0.0
---

# Clone fidelity scoring

`upriver clone-fidelity` produces a quantitative score per cloned page that says, deterministically, how close the rebuilt page is to the original. Today's `clone-qa` is visual eyeballing -- a side-by-side HTML report. Fidelity scoring replaces the eyeball with numbers so the operator and the client can sign off on a defensible threshold rather than a vibe.

The scoring runs after `upriver clone` and before `upriver improve`. It writes `clients/<slug>/clone-qa/summary.json`, surfaces in the dashboard at `clients/<slug>/clone-fidelity.astro`, and seeds new findings of priority `p1` for any page that scores below the shippable threshold so they flow into `fixes plan` like any other finding.

## When to apply this

- Running `upriver clone-fidelity <slug>` after a clone pass.
- Reading `clone-qa/summary.json` and deciding which pages need another clone iteration.
- Explaining the score to a client during the rebuild signoff.
- Triaging a page that scored low and deciding whether the score is fair or the scorer hit a known false negative.
- Deciding whether the clone is shippable or needs a re-pass before `upriver improve`.

## How the score is computed

Each page gets four sub-scores plus an overall, all on a 0-100 scale. The overall is a weighted average that favours pixel and copy because those are what a client actually sees.

### Pixel score

Computed by `pixelmatch` against the live screenshot at the matched viewport (1440x900 desktop by default; 390x844 mobile when `--mobile` is set). The screenshots come from `clients/<slug>/screenshots/desktop/<slug>.png` (the captured original) and a fresh capture of the cloned page's Vercel preview. Both are normalized to the same width before diffing; height is allowed to differ within +-20% (see "Failure modes" below).

The pixel score is `100 * (1 - mismatched / total_pixels)` after the diff PNG is written to `clone-qa/diff/<slug>.png`. A page that lines up section-for-section but uses different colors usually scores 60-75 here -- that is fine, color drift is expected (see `clone-visual-fidelity`). A page that drops or reorders sections scores well below 50.

### Copy score

Token-level Jaccard similarity between the original page's extracted text (from `pages/<slug>.json`, captured during scrape) and the cloned page's rendered text (extracted by re-scraping the preview URL). Stop words and obvious chrome (nav, footer) are stripped from both sides before tokenizing. Numbers, contact info, and proper nouns are weighted 2x because their absence is more diagnostic than the absence of filler words.

A copy score above 90 means almost all of the original's substance survived the clone. 80-89 means the clone polished some weasel copy or merged some paragraphs (acceptable). Below 70 means a section was dropped or replaced wholesale -- worth investigating.

### Layout score

Structural diff: heading order, heading levels, CTA count, image count, section count, link-out count. Each dimension contributes equally; the layout score is the percentage that match within tolerance. Heading order must be exact. Section count tolerates +-1. Image count tolerates +-2 if the original had 10+ images.

A layout score below 80 almost always indicates a section was dropped or re-ordered. Read the diff before doing anything else.

### Token adherence

Probes the rendered cloned page with `getComputedStyle()` on canonical selectors -- the H1, the body paragraph, the primary CTA button -- and compares against `clients/<slug>/design-tokens.json`. Each probe contributes one point; misses log which token did not match (e.g., `radius-button` rendered as `7px` instead of `var(--radius-button)`).

Token adherence is mostly diagnostic. A low score there usually means the clone agent inlined a literal value instead of referencing the token, which is a quick fix in code review.

### Overall

```
overall = 0.6 * pixel + 0.4 * copy
```

Layout and token sub-scores are exposed in the report but do not flow into the overall. They drive findings (a low layout score generates a `clone-fidelity-layout-<n>` finding; a low token score generates `clone-fidelity-token-<n>`) but they do not gate the shippable threshold. The two that gate are the two a client can see.

## Reading the per-page report

`clone-qa/summary.json` shape per page:

```json
{
  "slug": "venues-the-barn",
  "scores": {
    "pixel": 87,
    "copy": 92,
    "layout": 100,
    "token": 80,
    "overall": 89
  },
  "diff_png": "clone-qa/diff/venues-the-barn.png",
  "missing_assets": ["https://cdn.example.com/old/hero.jpg"],
  "findings": [
    { "id": "clone-fidelity-token-3", "priority": "p2", ... }
  ]
}
```

The dashboard renders this as a row per page with score chip, click-through to the diff PNG, and an inline list of findings. When an operator is reviewing, the order of operations is: (1) sort by overall ascending, (2) read the lowest page's diff, (3) decide re-clone or accept, (4) repeat.

`missing_assets` is the unmatched-CDN list promoted from `finalize.ts`. It is its own finding stream, not folded into the score, because asset gaps are typically a one-button fix via `--download-missing`.

## Threshold guidance

The thresholds below are the scorer's defaults; they live in `packages/cli/src/clone-qa/thresholds.ts` and are tunable per client when needed.

- **Overall >= 90: ship-ready.** No action required. The page renders close enough to the original that a client signoff is a formality.
- **Overall 80-89: polish.** Ships if the operator reads the diff and the deviation is intentional (a copy improvement, a deliberate token change, a deferred image). Otherwise, re-clone with the diff as the prompt.
- **Overall 70-79: fix before showing the client.** A section is wrong, a hero collapsed, or copy is missing. Do not include this page in a client preview link until it is at 80+.
- **Overall < 70: re-clone the page.** The clone agent missed something structural. Rerun `upriver clone --pages <slug>` with the diff PNG inlined into the prompt. If a second pass also lands below 70, escalate to a manual port.

The site-level threshold is "every page in scope >= 80." Do not average across pages and call it shippable -- a single below-threshold page is a single broken page, and clients notice.

## Common failure modes

### Height-mismatch screenshots

Firecrawl's screenshot pass occasionally captures the live site at a longer scroll than the cloned preview, especially when the original has lazy-loaded content below the fold that does not fire in headless capture. The pixel diff then compares a 4000px-tall image to a 2800px-tall image and the score collapses to 30. The fix is to re-capture both at a fixed `--full-page=false` viewport and re-score; the scorer accepts a `--viewport-only` flag for exactly this case.

### Dynamic content

Pages with embedded dynamic widgets (Instagram feed, live availability calendar, third-party booking iframe) render different content on every capture. The pixel score swings randomly. Mark these regions as `data-fidelity-ignore` in the cloned source; the scorer respects the attribute and excludes those rectangles from the pixel diff.

### Font swaps

If the operator deliberately swapped the font family during the clone (an intentional brand upgrade), the pixel score will be lower across every page that has heading or body text -- typically a 5-10 point hit per page. This is correct behaviour from the scorer but a false signal for shippability. When a font swap is intentional, set `clone_fidelity.font_swap_baseline: <pixel-points>` in `client-config.yaml`; the scorer subtracts that baseline from the pixel score before reporting.

### A re-render produced different image crops

Astro's image pipeline crops differently than the original CMS's, especially for art-directed responsive images. The pixel diff catches the crop change; the layout diff says "image count matches"; the token score is fine. Result: a 70-something pixel score on a page that is structurally correct. Read the diff PNG -- if every mismatch is inside a single image, the page is fine and the operator can override with a one-line note in the PR.

### Copy was deliberately polished

The clone pass fixes weasel words and banned marketing language. The copy score will dip 3-7 points per polished sentence. This is expected and not a failure -- the clone-qa report writes `polished_copy_count` next to the copy score precisely so the operator can subtract that in their head. Do not chase a 100 copy score; it would mean nothing was improved.

### A section was deliberately replaced

If the audit flagged the original's structure as broken (no hero, no CTA, see `clone-visual-fidelity` "the original site is bad"), the clone pass replaces the structure with a standard pattern. The layout diff will report a section-count mismatch and the layout score will drop below 80. Acknowledge in the PR -- the clone-fidelity finding flowing into `fixes plan` should be marked resolved with a reference to the audit finding that justified the change.

## What this skill does NOT cover

- **How to interpret the qualitative `clone-visual-fidelity` checklist.** That skill remains the source of truth for the 10-point human-eyeball merge gate. Fidelity scoring is the quantitative complement, not the replacement.
- **How to score the improvement-layer output.** That is "did we make it better than the original," not "did we match the original." Different question, different methodology -- see `improvement-layer`.
- **How to re-run a single sub-score.** The scorer always computes all four. If you only care about pixel, read `summary.json` and ignore the others.
