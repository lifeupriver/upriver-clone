# Client Onboarding

What to send a new client once the audit is purchased, and what to
expect across each stage. This document complements `SALES-PLAYBOOK.md`
(pre-purchase) and `EMAIL-TEMPLATES.md` (drafts you can copy from).

## Engagement timeline (typical)

| Day | What happens | Client sees |
| --- | --- | --- |
| 0 | Operator runs `upriver init` and starts the audit | Welcome email + intake form link |
| 1–2 | Audit completes, operator reviews findings | "Your audit is ready" email with share link |
| 3–7 | Findings call → `fixes-plan-scope.md` finalized | Notes from call, scoped plan PDF |
| 7–14 | Clone + improvement passes ship | Preview URL email |
| 15 | Launch handoff | "Your site is live" email + comparison report |

Adjust by tier: audit-only stops at day 2; retainer extends quarterly.

## Day 0: kickoff

Send the **welcome email** (`EMAIL-TEMPLATES.md` → "Welcome / kickoff").
Confirm:

- The URL of their current site (the one we'll audit).
- Brand assets they want surfaced in deliverables (logo SVG, primary
  color hex, secondary color hex, body + heading fonts).
- The decision-maker's email + a backup contact.
- Whether the engagement is **audit-only** or includes the rebuild.

The kickoff email also links to the **intake form** (`/intake/<slug>`)
so the client can asynchronously answer the questions we'd otherwise
extract from a Zoom call. This is optional but compresses the engagement
by ~3 days for clients who fill it out.

## Day 1–2: audit delivery

The audit produces, under `clients/<slug>/`:

- `audit/summary.md` — operator-facing rollup
- `clients/<slug>/site/audit-report` — branded report at
  `/deliverables/<slug>/audit-report?t=<token>`

Send the **audit-delivery email** (template) with the share link. Include:

- The hero metric (e.g., "X potential bookings lost / month") so they
  open the email even if they're slammed.
- A screenshot of the report cover, not the full report — drives clicks.
- Calendly link to schedule the 30-min findings call.
- Token expiration date so they don't sit on it.

**Operator checklist before sending:**

- [ ] Confirm the report cover renders the client's logo + brand color,
      not Upriver's defaults (workstream A.3).
- [ ] Confirm the share link works in incognito.
- [ ] Confirm the findings table sorts by priority correctly (P0 first).

## Day 3–7: findings call + scoped plan

On the call, walk the client through the report at a measured pace.
The goal isn't to read every finding — it's to **identify the 5–10
findings the client cares about most**.

After the call, operator runs:
```bash
upriver discover <slug>     # if not done yet
upriver fixes plan <slug>   # captures the agreed-upon fixes
```

`fixes-plan-scope.md` becomes the spec for the rebuild. Send it back to
the client for written confirmation before starting on the clone.

## Day 7–14: clone + improvement

Run the orchestrated pipeline:
```bash
upriver run all <slug> --audit-mode=all
```

This produces:
- `clients/<slug>/site/` — the rebuilt Astro site
- `clients/<slug>/clone-fidelity/score.md` — pixel + copy parity score
- `clients/<slug>/improvements/` — applied improvement diffs

Send the **clone-review email** with the preview URL once the operator
has confirmed:

- Clone-fidelity score is at least 80 across pages (lower = surgical
  improvements may have masked regressions).
- The hero, services, and contact pages render correctly on mobile.
- All improvements from `fixes-plan-scope.md` are accounted for.

Field client feedback in writing. One round of revisions is included in
the rebuild tier; further rounds are scoped separately.

## Day 15: launch handoff

Once the client signs off on the preview:

1. Run `upriver report compare <pre-clone-audit> <post-improvement-audit>` to
   produce the improvement report.
2. Operator handles DNS / hosting handoff (specifics vary; not yet
   automated — see backlog §17).
3. Send the **launch handoff email** with:
   - The improvement report
   - The new site URL
   - Quarterly re-audit offer (retainer tier)
   - Calendly link for a 30-min retro call

## What we *don't* commit to

- Specific score lifts. We'll project ranges based on prior engagements
  but never guarantee a number.
- SEO ranking improvements. We ship the foundations; rankings depend on
  search-engine schedules outside our control.
- 100% pixel parity. The clone is faithful but not a screenshot — when
  the original uses a non-Astro pattern (heavy JS animations, embedded
  third-party widgets) we replicate functionality, not implementation.
- Hosting beyond launch. The retainer covers re-audits and improvements,
  not infrastructure ops.

## Common client questions

**"Can I see the rebuilt site before paying for the full tier?"**
The audit is the standalone deliverable; the rebuild is contracted
separately. We can share clone screenshots from prior engagements
(operator: redact identifying info first).

**"What if we don't like the rebuild?"**
One revision round is included. Beyond that, scope additional rounds
in writing.

**"Who owns the code?"**
The client. Source is delivered with the launch handoff. We retain the
right to anonymized findings for our internal training and benchmarks.
