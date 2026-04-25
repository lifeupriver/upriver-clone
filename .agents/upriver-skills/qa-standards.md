---
name: qa-standards
description: Use when running `upriver qa` against a preview URL or production, judging whether a rebuild is launch-ready, or triaging the qa-report.md. Triggers: "is this ready to launch?", "review the QA report", "define the pass bar for dimension X", "what counts as a regression?", or "the client wants to launch but QA has open items." Covers: the pass/fail bar for each of the 10 audit dimensions, how to interpret the three QA buckets (fixed, still open, new issues), when a preview is ready to cut DNS, and when to push back on the launch date.
metadata:
  version: 1.0.0
---

# QA standards for the Upriver launch gate

The QA pass is the last defense before DNS cutover. Its job is to answer one question: _did the rebuild actually improve the site against the issues we scoped?_ Not "is the site perfect" — it never is — but "are the commitments made in the fixes plan real on the preview, and did we break anything new?"

## When to apply this

- After `upriver qa <slug> --preview-url <vercel-url>` completes and writes `qa-report.md`.
- During a go/no-go call with the client.
- When a PR from `upriver fixes apply` is up for merge review.
- When pushing back on a launch date — this skill is the vocabulary for why.

## The three QA buckets

Every QA report sorts findings into three buckets. Treat them differently.

### Bucket 1: In-scope fixed

These are the findings in the signed-off scope that no longer appear on the preview. This is the _reason for the engagement_. If this bucket is small, the rebuild didn't do its job.

Pass bar: **at least 80% of in-scope P0s are in this bucket** before DNS cutover. P1s can trail (merge to main post-launch via incremental PRs).

### Bucket 2: In-scope still open

In the scope, still showing up on the preview. Every item here is a missed commitment.

Triage:

- If it's a P0: blocking. Do not cut DNS. Either re-run `upriver fixes apply <slug> --finding <id>` or escalate to a human fix.
- If it's a P1: conditional. Launch is ok if the client explicitly accepts the deferral in writing (email thread, saved in `clients/<slug>/docs/`). Every deferral gets a named owner and a due date.
- If it's a P2: launch is fine. These roll into post-launch cleanup.

### Bucket 3: New issues introduced

Regressions. Something we did during fixes created a new problem. These are the scariest bucket because they weren't there when the scope was signed.

Triage:

- Any P0 new issue: blocking, full stop. The rebuild cannot be in worse shape on a critical dimension than the current site.
- P1 new issues: case-by-case. If the new P1 is a worthwhile trade-off (e.g. we removed a thin-content page and now `links-002` flags a new orphan), document the trade. Otherwise fix before launch.
- P2 new issues: launch is fine, but add them to the post-launch backlog.

## Pass bars by dimension

The generic score threshold is 80/100 per dimension for a launch-ready preview. But some dimensions have absolute gates that override the score:

### seo (gate)

- **Blocking:** any P0. No launch with noindex traps, HTTPS issues, missing analytics on production, or no H1 on money pages.
- **Target score:** 85+.
- **Acceptable trade-offs:** duplicate meta descriptions on secondary pages (P1), thin-content pages already slated for post-launch build-out.

### content (gate)

- **Blocking:** banned marketing words in the hero of any money page. "Stunning," "magical," "transform" above the fold on the homepage = rework the hero.
- **Target score:** 75+. Content is the dimension that compounds over months; a 75 at launch climbing to 90 by month 3 is the expected trajectory.
- **Acceptable trade-offs:** weasel-word findings on legacy blog content (deferred to a content refresh phase).

### design (gate)

- **Blocking:** hardcoded hex colors in `src/` outside of `global.css`. Color contrast failures on any CTA or body text (WCAG AA minimum).
- **Target score:** 85+.
- **Acceptable trade-offs:** minor spacing inconsistencies on deep pages.

### sales (gate)

- **Blocking:** no working contact form, no visible phone CTA, no visible email CTA. Any money page without a primary CTA above the fold.
- **Target score:** 80+.
- **Acceptable trade-offs:** missing pricing page on a services business (not every business lists prices publicly).

### links (gate)

- **Blocking:** any broken internal link. Nav items pointing to 404.
- **Target score:** 85+.
- **Acceptable trade-offs:** orphan pages that are legitimately reachable via search only (e.g. a thank-you page).

### schema

- **Target score:** 75+.
- **Acceptable trade-offs:** partial schema is fine if the essentials are there (LocalBusiness on the home, FAQ on the FAQ page). Full coverage is a post-launch win.

### aeo

- **Target score:** 70+.
- **Acceptable trade-offs:** most findings here compound slowly; a 70 at launch is the normal starting point.

### local

- **Target score:** 80+.
- **Acceptable trade-offs:** Google Business Profile work happens in parallel to the site and is often outside the engagement scope.

### backlinks

- **Target score:** no specific bar. This dimension reports on observables from the crawl (outbound linking quality). It is informational at launch, not gating.

### competitors

- **Target score:** no specific bar. Informational.

## Score delta interpretation

The QA report shows original score → new score. Read it this way:

- **+15 or more:** the rebuild hit. Merge-worthy.
- **+5 to +14:** typical. Real improvement but leaves room for the post-launch phase.
- **+1 to +4:** suspicious. Either the scope was too narrow, or the fixes didn't land. Dig into `stillOpenInScope`.
- **0 or negative:** do not launch. Something is wrong with the rebuild or the QA pass itself. Re-scrape the preview and confirm the comparison is valid before raising the alarm.

## When to push back on the launch date

Push back hard when any of the following is true:

- Any in-scope P0 is in Bucket 2 (still open).
- Any new P0 is in Bucket 3 (regression).
- Score delta is 0 or negative.
- Contact form fails the smoke test (submits but does not persist or notify).
- Core Web Vitals are red on the homepage at the time of QA.

Push back _softly_ (flag + recommend but accept) when:

- P1 still-open findings outnumber P1 fixed findings in-scope.
- Client has not delivered promised assets (photos, updated copy) — launching with placeholders is ok, but the client should acknowledge it.
- Score is above threshold but the voice guide feels generic in the final copy.

## Post-launch QA (T+7 days)

Re-run `upriver qa <slug> --preview-url <production-url>` seven days after cutover. Compare against the launch-day QA report. Changes are expected — Google crawls the new pages, you gain backlinks, you may notice fresh content gaps. Log the delta in `clients/<slug>/docs/post-launch-qa-<date>.md` and triage new findings into the next engagement phase.

## What "QA passed" actually means

It does not mean the site is perfect. It means:

- Every scoped P0 commitment is fulfilled (or consciously deferred with client signoff).
- No P0 regressions were introduced.
- The site is in measurably better shape than the original on the dimensions we scoped.
- The launch checklist can be started without waiting on the engineering team.

If any of those four is not true, QA is not passed — regardless of what the numbers say.
