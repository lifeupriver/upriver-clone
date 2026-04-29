---
name: sales-report-narrative
description: Use when writing the executive summary or hero-stats narrative for an Upriver audit report (workstream A.4). Covers tone, what numbers to lead with, what to omit, and how to frame revenue impact for prospects. Translates internal scoring jargon into client-facing language and keeps the report under the 400-word hero ceiling that converts.
metadata:
  version: 1.0.0
---

# Writing the audit report narrative

The audit report is the single biggest piece of sales leverage Upriver has. A prospect lands on `https://reports.upriver.com/<slug>-<token>`, reads for 60 seconds, and either replies "tell me more" or never opens the link again. The narrative on `index.astro` -- the executive summary, the three hero stats, the "what is costing you inquiries" framing, the CTA -- is what converts that 60 seconds.

This skill governs how to write that narrative. The data behind it comes from `synthesize.ts`'s `executiveSummaryPrompt` and from `packages/cli/src/synthesize/impact-metrics.ts`. Those are not in scope here -- this skill is about voice, framing, and what to keep out.

## When to apply this

- Drafting or editing the executive summary copy for an audit report.
- Reviewing a generated narrative and deciding what to keep, cut, or rewrite.
- Writing the email body that ships with `upriver report send` (a longer cousin of the report hero).
- Coaching the synthesize prompt when its output reads operator-grade instead of client-grade.
- Auditing an existing report for jargon and revenue framing.

## Tone rules

- **No jargon.** The prospect is not a marketer. Words that do not appear: SERP, canonical, schema, Core Web Vitals, structured data (use "the vocabulary search engines read"), entity, anchor text, alt text, NAP, GEO, AEO, CWV, CTR, CTA, P0, P1. If a term must appear, it is glossed inline once.
- **Revenue first.** Every claim ties back to "what this is costing you." A missing analytics install is not "you cannot measure your traffic"; it is "you have no way to tell which ads are working." A thin About page is not "low word count"; it is "visitors who reach your About page are not learning enough about you to book."
- **No hedging.** "We recommend" is banned in the hero. So is "you might consider," "perhaps," "in some cases," and "depending on your goals." If we are not confident enough to say "this is the problem and here is what we would do," it does not belong in the report hero.
- **No certainty laundering.** The opposite of hedging, equally bad. We do not say "you will gain 30% more bookings" because we cannot prove it. Use "what we typically see" or "in audits like this one" with a specific anchor: "we typically see venues recover 8-12% of their organic traffic within 90 days of fixing this."
- **Second person, present tense.** "Your homepage hides the booking link" beats "the homepage hides the booking link." Present tense beats past tense beats future. The prospect is reading about today, not about what we will do.
- **Plain English for the verticals.** A wedding venue prospect reads "your inquiry form" not "your lead capture flow." A bakery reads "people Googling 'birthday cake near me'" not "high-intent local-search traffic."

## What to lead with

Three hero stats, drawn from `impact-metrics.ts`, sit at the top of the narrative. The default order:

1. **`criticalIssues`** -- the count of P0 findings, framed as "what is broken right now." Example: "5 critical issues are blocking search engines from showing your site to people searching for you."
2. **`thinPages`** -- the count of pages too short to rank, framed as "what is invisible to search." Example: "11 of your 14 pages are too thin for Google to take seriously as answers."
3. **`searchVisibilityIssues`** -- combined count of canonical, indexability, and crawlability issues, framed as "what is being hidden from buyers." Example: "Search engines are seeing 6 different versions of your venue page; the ranking signal is split across all of them."

Optionally, lead with the overall score as a fourth hero stat -- only if it is below 70 (a 70+ score is not surprising enough to anchor on). When used, frame as "your site scored a 54 against the standards top venues meet" not "your audit score was 54 / 100."

The three stats above also drive the "what is costing you inquiries" 3-bullet list one section down. That list is one specific issue per bullet, not a recap of the stats. Example:

- Your inquiry form is buried below the fold on mobile -- visitors who want to book have to scroll past three sections to find it.
- Your About page is one short paragraph -- search engines cannot tell what you do, and prospects cannot tell whether to trust you.
- Your venue page exists at three different URLs -- every Google ranking is split across all three, so none of them ranks well.

Each bullet ends without a recommendation. The recommendation lives in the CTA section ("what we would do about it"), not threaded through the bullets.

## What to omit

- **Operator-internal scoring weights.** The 0.6 / 0.4 weighting between pixel and copy in clone fidelity, the deductions of 15 / 7 / 3 per priority in audit scoring, the 90-vs-100 floor for empty passes. The prospect does not care; the methodology link in the footer covers it for the curious.
- **Finding IDs.** Never `seo-002` or `clone-fidelity-7` in the report hero or the bullets. Use the human title instead.
- **Dimension names.** Do not say "your SEO score is 54." Say "search engines are not finding your pages." Do not say "your AEO dimension is weak." Say "answer engines are not citing you when buyers ask about your industry."
- **Technical jargon.** Translate before writing. Schema -> "structured data" or "the vocabulary search engines read." Canonical -> "duplicate URL." H1 -> "your main page heading." Alt text -> "image descriptions for accessibility and search."
- **The number of audit passes.** "We ran 10 audit dimensions" is a process detail. The prospect does not care that we ran 10 things; they care what we found.
- **The Upriver process.** Do not promote the rebuild here. The CTA is "tell us what to fix," not "buy the rebuild package." Process is for the next page (`next-steps.astro`).
- **Caveats and limitations.** "This audit is automated and may miss nuance" undersells the work and undermines the conversion. If a section is genuinely uncertain, omit it from the hero rather than caveat it.

## Structure

The report hero on `index.astro` has exactly five blocks, in order:

1. **One-paragraph hook.** Two to four sentences. Frames the conversation. Names the business by name. Calls out the single most striking finding. Does not summarize -- it baits the reader to keep going. Example: "Your venue is the only barn in the county with a full kitchen, but search engines do not know that. Your homepage does not say it; your About page does not mention it; the only place it appears is buried in a paragraph on /amenities. Here is what that costs you."
2. **The three hero stats.** Big numbers, short labels, no charts. Each stat is one number plus one sentence of revenue framing.
3. **"What is costing you inquiries" 3-bullet list.** Three specific issues, one sentence each, no recommendations attached.
4. **CTA: "What we would do about it."** One paragraph or three short bullets describing the rebuild scope at a high level. Ends with the intake CTA: "Tell us which of these to fix" linking to `next-steps.astro`.
5. **No kitchen-sink dump.** Not a feature list, not a methodology section, not a glossary, not a screenshot grid -- those go on the inner pages (`scorecard.astro`, `findings.astro`). The hero is five blocks, period.

## Length

The report hero is **under 400 words**. Most are 250-320. If the draft runs over 400, cut the third bullet from the "costing you inquiries" list before cutting anything from the hook or the CTA -- the third bullet has the lowest marginal conversion lift and the highest temptation to inflate.

The full email narrative that ships with `upriver report send` may run longer -- 600-800 words is the sweet spot. The email opens with the same hook and the same three stats, then expands the "costing you inquiries" list to five bullets, adds a paragraph of social proof or a one-sentence case study if available, and closes with the same CTA. Anything past 800 words underperforms.

## What this skill does NOT cover

- **How to compute the impact metrics.** That is `impact-metrics.ts`. This skill assumes the metrics are already computed and trustworthy.
- **How to write the inner report pages.** `scorecard.astro` and `findings.astro` have their own voice -- more detailed, more technical, less narrative -- because they are read by a prospect who has already engaged with the hero.
- **How to write the rebuild proposal.** That is its own document, downstream of intake. The audit report sells the audit as a wake-up call, not the rebuild as a contract.
- **How to brand the report.** Branding is in `CoverHeader.astro` driven by `auditPackage.brandingProfile`. The narrative does not change with the brand; it is voice, not chrome.
