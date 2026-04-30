# Upriver Sales Playbook

How to pitch Upriver to a prospect, what each deliverable shows, and how
to frame the audit → clone → improvement narrative.

## What we sell

Upriver isn't a website builder. It's a **diagnostic + rebuild service**
that uses AI to do in days what an agency does in weeks:

1. **Audit.** Run 12 heuristic and up to 12 deep passes against the
   prospect's current site. Output: a branded report showing exactly
   where the site is leaking bookings / leads / rankings, with priority-
   ordered findings.
2. **Clone.** Rebuild the site faithfully on Astro — pixel + copy +
   structure parity with the original. This gives the client a baseline
   they can compare against, and us a foundation for surgical changes.
3. **Improve.** Apply prioritized improvements (SEO, copy, schema,
   performance, accessibility, conversion) on top of the clone.
4. **Compare.** Re-audit the improved site and produce an
   "improvement-report.md" that shows the lift dimension by dimension.

The story compounds: every step produces a tangible artifact the
prospect can hold up at their next stakeholder meeting.

## When to pitch which deliverable

| Prospect signal | Lead with |
| --- | --- |
| "Our site feels old / off-brand" | Audit. Lead with hero finding ("X potential bookings lost / month"). |
| "We're already mid-redesign with another vendor" | Audit only — sell as a second opinion. |
| "We got a quote for $40k from an agency" | Audit + clone. Show parity in days vs. weeks. |
| "We already know what's wrong, we need it built" | Clone + improve. Skip the audit narrative. |
| "Conversions are tanking" | Audit with `--mode=all` (LLM + tooling). The conversion-psychology and trust-signals passes pull their weight here. |
| "SEO is dropping" | Audit + improve, gated on the SEO + GEO + AEO passes specifically. |

## Pricing tiers (placeholder — finalize before quoting)

> All prices are **$TBD** placeholders. Discuss with operator before
> committing.

| Tier | What's included | Price |
| --- | --- | --- |
| Audit only | Full audit (`--mode=all`), branded PDF + share link | $TBD |
| Audit + Intake | Audit + 60-min intake call + scoped fixes plan | $TBD |
| Full rebuild | Audit + clone + 3 improvement passes + launch handoff | $TBD |
| Retainer | Quarterly re-audit + monthly improvement cycle | $TBD/mo |

### Pricing principles

- **Audit anchors the relationship.** Even if the prospect never buys
  the rebuild, the audit is a deliverable they paid for — that's the
  hook.
- **Price the improvement layer per skill, not per hour.** "SEO pass"
  has a fixed price. "Schema pass" has a fixed price. Adding new skills
  (typography, conversion psychology) adds a tier.
- **Discount the clone if bundled with audit.** The clone is cheaper
  for us to produce when we already have the audit data — pass that
  efficiency to the client to push them up to the rebuild tier.

## Framing language

### The audit

> "We're going to run a 24-pass audit on your site. Some of those passes
> are heuristic — fast SEO checks, content readability, schema coverage.
> Others use Claude to read your pages the way a discerning visitor
> would, and call out where copy is hedging or trust signals are
> missing. You'll see, dimension by dimension, where the site is
> earning its money and where it's leaking."

### The clone

> "Rebuilds usually start from scratch — designer riffs on a moodboard,
> dev rebuilds the IA, six weeks later you have a maybe. We start by
> rebuilding your existing site, faithfully. Same pages, same copy,
> same structure. That gives you a baseline you can compare against
> when we start changing things, and it lets us make surgical
> improvements without rewriting everything."

### The improvement layer

> "Once we have the clone, every change is auditable. We don't say
> 'we redesigned the homepage' — we say 'we restructured the H1 chain
> to prioritize the booking CTA, raised the design score from 67 to
> 82, and added schema markup that should make the FAQ block eligible
> for AI Overview citations.' That's the deliverable."

### The re-audit

> "After we ship, we run the same 24-pass audit on the new site. You
> get an apples-to-apples diff: here's what scored 60, now scores 85.
> If it didn't move, that's our problem to fix, not yours."

## What to send when

1. **Discovery call done.** Send the prospect the public homepage of a
   recent audit deliverable as a sample (no slug needed).
2. **Audit purchased.** Operator runs `upriver init`, `upriver scrape`,
   `upriver audit --mode=all`. Within 48 hours, send the audit share
   link.
3. **Audit reviewed.** Operator schedules a 30-minute findings call. The
   client picks priority findings to fix; that converts to
   `fixes-plan-scope.md`.
4. **Rebuild contracted.** Run `upriver run all <slug>`. When the clone
   site is reviewable, send the preview URL (currently operator-hosted —
   see backlog §17 for the preview-deploy story).
5. **Launched.** Run `upriver report compare <pre> <post>` and send the
   `improvement-report.md`.

## Common objections

**"How is this different from what an agency does?"**
We use the same AI tools your agency would use, but we've productized
the workflow. Where they bill 60 hours of design work, we run 24
passes in 90 minutes and ship deliverables in days. The improvement
layer isn't AI slop — every change is graded against the audit.

**"Can we trust the audit findings?"**
Each finding cites the page, the heuristic or LLM judgment that
flagged it, and an estimated impact. You can challenge any individual
finding; we'll show our work. The audit is reproducible — we run the
same passes on every client.

**"What about ongoing changes?"**
The retainer tier covers quarterly re-audits and monthly improvement
cycles. We re-run the audit, surface what's regressed, and ship fixes.

## Internal notes

- Don't promise specific score lifts. "We expect to move conversion
  signals" is honest; "we'll get you to 90" is not.
- The improvement-report.md is the most powerful asset for renewals —
  always send it within a week of launch.
- If a prospect asks to see prior client reports, **never share another
  client's deliverables directly.** Use the placeholder demo or a
  redacted screenshot.
