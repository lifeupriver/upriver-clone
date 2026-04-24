---
name: clone-visual-fidelity
description: Use when running `upriver clone` or reviewing output from the clone pass — specifically when judging whether a ported Astro page is "close enough" to the original screenshot. Triggers: "does this page match?", "review the clone output", "visual fidelity check", "the clone looks off", or when a clone PR is up for review. Covers: the fidelity bar (what to match, what to deliberately change), the 10-point comparison checklist, how to use screenshots side-by-side, what's ok to diverge from, and how to handle the tension between pixel-accuracy and brand tokens.
metadata:
  version: 1.0.0
---

# Visual fidelity standards for the clone pass

The clone pass ports an existing page into Astro at roughly the original's visual structure. It is _not_ a pixel-for-pixel replica — we are deliberately replacing the rendered CSS with the design-token system, which changes small details (border radius, font metrics, spacing increments). The goal is **structural and hierarchical fidelity**, not pixel fidelity.

## When to apply this

- Reviewing a PR opened by `upriver clone`.
- Judging whether a page is ready to merge or needs another pass.
- Deciding whether a perceived mismatch is a bug in the clone or an intentional improvement.
- Calibrating the clone agent's prompt (if the first pass keeps missing a section).

## The fidelity bar: what we match, what we change

### Match

- **Information architecture.** Same sections in the same order. Hero → proof → body → CTA doesn't become hero → body → CTA → proof.
- **Content hierarchy.** H1 on the original is H1 on the clone. A stat call-out on the original is a stat call-out on the clone, not absorbed into paragraph text.
- **Copy intent.** The _point_ of each section is preserved. "We've hosted 200 weddings since 2014" doesn't become "Experienced wedding venue."
- **CTA placement.** Same CTAs in the same positions, same primary/secondary distinction.
- **Image placement.** Hero image in the hero, testimonial portraits in the testimonials, gallery where the gallery was. The _specific_ images may change; the slots don't.
- **Page length.** Within ±20%. If the original is 2000 words and the clone is 800, a section was dropped — find which one.

### Change (deliberately)

- **Color palette.** The clone uses the extracted design tokens, which may be subtly different from the original's rendered colors (browser anti-aliasing, non-token inline styles, etc.). This is expected.
- **Typography rendering.** Same font family (if available), but rendered through Tailwind typography classes — slight differences in line-height and tracking are normal.
- **Border radius, shadows, spacing.** Normalized to the token scale (`radius-card`, `radius-button`, standard spacing increments). Don't reproduce the original's idiosyncratic `border-radius: 7px`.
- **Image optimization.** Clone uses Astro `<Image>` with format/srcset — file sizes drop, but visual quality stays.
- **Responsive breakpoints.** The original might have a bespoke mobile layout; the clone uses the standard Tailwind breakpoints. Acceptable.
- **Copy polish.** Weasel words, banned marketing language, and passive voice are fixed during the clone pass via the copy-editing skill. The "point" of the section survives, but the specific sentences improve.

### Never change

- **Page URL / slug.** `/about` stays `/about`. `/venues/the-barn` stays `/venues/the-barn`. Redirect work is a separate concern handled in the launch checklist.
- **The name of the thing.** If the business calls its ceremony space "the Meadow," the clone calls it the Meadow. Not "the meadow" or "our meadow space."
- **Contact info.** Phone numbers, email addresses, and physical addresses are copied verbatim.
- **Testimonials.** Exact quote, exact attribution. Never rewrite a customer's words.

## The 10-point comparison checklist

Open the Firecrawl screenshot (`clients/<slug>/screenshots/desktop/<page>.png`) and the Vercel preview side-by-side. Score each point as pass (1) or fail (0).

1. **Section count matches.** Same number of top-level sections, same order.
2. **Hero matches.** Same H1 intent, same primary CTA, same supporting copy, same image slot.
3. **Above-the-fold density matches.** Not too busy, not too sparse — matches the original's visual weight in the first viewport.
4. **Copy sections preserved.** Every meaningful block of copy from the original appears (possibly rewritten) in the clone.
5. **Testimonials preserved.** Every testimonial from the original is in the clone, with attribution.
6. **CTAs at the same moments.** If the original had a CTA after section 3 and another in the footer, the clone does too.
7. **Image slots preserved.** Every image in the original has a slot in the clone (even if the image itself is a placeholder pending client delivery).
8. **Nav and footer present.** Matches the site-wide nav and footer components.
9. **Mobile passes the squint test.** On a mobile viewport, the hierarchy still reads correctly — no buried CTAs, no image-on-image collisions.
10. **Build is clean.** `pnpm build` succeeds with no warnings related to this page.

**Merge threshold: 9/10.** Fail on any two points = another clone pass. Fail on #1, #4, #5, or #10 = blocking regardless of the other scores.

## Copy-edit comment convention

The clone pass leaves inline markers where it chose not to fix a weak copy pattern (see the clone agent prompt). These are first-class artifacts — don't strip them before review. They look like:

```astro
{/* copy-edit: weak-cta — "Contact us" is vague; consider "Check dates" */}
```

Valid categories: `passive`, `buried-value`, `weak-cta`, `hedging`, `vague`, `unproven`.

During review:

- Resolve the comment (apply the suggestion and delete the marker) _or_
- Acknowledge the trade-off (keep the copy, delete the marker with a note in the PR description) _or_
- Keep the marker if the decision is pending a client question.

Never merge a page with unaddressed markers unless they're deliberately pinned for the client interview.

## Handling edge cases

### The original site is bad

If the current site is structurally broken (no hero, no CTA, nothing above the fold), do not clone the broken structure. The P0 finding from the audit has already told you it's broken. Replace the structure with the closest reasonable pattern (standard hero + sections) and note it in the PR: _"Deviated from source: original had no hero or CTA; applied standard landing pattern. Reference: finding `sales-002`."_

### The original uses a pattern the template doesn't have

If the source page has a bespoke component (e.g. an interactive map, a pricing calculator) and `src/components/astro/` doesn't have an equivalent, stub it with a static placeholder and open a follow-up issue. Do not block the clone.

### The screenshot is wrong

Firecrawl screenshots occasionally truncate long pages or capture at odd breakpoints. If the screenshot looks wrong, open the live URL directly in a browser with the same viewport (`--window-size=1440,900`) and compare against that.

### The client objects to a deviation

Their word wins — but surface the tension. "We kept X from the original on purpose; here's why; here are the two alternatives; which do you want?" Don't silently revert; document the choice in `CHANGELOG.md`.

## What "done" looks like

A clone PR is ready to merge when:

- 10/10 on the checklist (or 9/10 with a documented exception in the PR).
- All copy-edit markers are resolved or intentionally pinned.
- The CHANGELOG has an entry referencing this page.
- The production preview renders without layout shift, missing images, or console errors.
- A human has opened the page in a mobile viewport and not cringed.
