# Email Templates

Drafts for the four key client touchpoints. Copy, fill the
`{{double-braces}}` placeholders, and send. Tone: warm and direct, not
salesy or robotic.

> **Generalize before sending.** These drafts use placeholders, not
> real client names. Don't paste another client's specifics into a new
> engagement.

---

## 1. Welcome / kickoff

**Subject:** Welcome to Upriver — let's get the audit started

**Body:**

Hi {{first_name}},

Thanks for choosing Upriver to audit {{client_site_url}}. I'm setting up
your engagement now and wanted to share what to expect.

**Here's the timeline:**

- **Today:** I'll run the audit. It takes about an hour for the heuristic
  passes and a few hours for the deep AI passes.
- **In 1–2 days:** You'll get a branded audit report with prioritized
  findings — typically 30–60 items ranked by impact.
- **Within a week:** Let's hop on a 30-minute call to walk through the
  highest-impact findings together. I'll send a Calendly link separately.

**One ask before I start:**

Could you reply with —

1. Your logo as an SVG or PNG (transparent background if possible).
2. Your primary brand color (hex code is fine; if you don't know, just
   tell me where to look on the current site).
3. Confirm the URL above is the one you want audited, not a staging
   environment.

If you'd like to fill in some narrative answers about your business
asynchronously, the intake form here will save us call time later:
{{intake_url}}

Talk soon,
{{operator_name}}

---

## 2. Audit delivery

**Subject:** Your Upriver audit is ready — {{hero_metric}}

**Body:**

Hi {{first_name}},

The audit for {{client_site_url}} is in. The headline:

> **{{hero_metric}}** — based on the patterns we identified across
> {{number_of_passes}} audit dimensions.

**Read the full report here:** {{share_link}}
(This link is good through {{expiry_date}}.)

The report walks through {{p0_count}} P0 findings (do these first),
{{p1_count}} P1 findings (high impact, not blocking), and {{p2_count}}
P2 findings (longer-term work). Each finding cites the specific page
or pattern, why it matters, and the estimated impact.

**Next step:** Let's spend 30 minutes walking through the highest-
impact findings together so we can prioritize what gets fixed first.

Grab a slot here: {{calendly_link}}

— {{operator_name}}

P.S. If anything in the report doesn't make sense or seems off, tell
me. The audit is reproducible and every finding has a paper trail; if
we got it wrong I want to know.

---

## 3. Clone review

**Subject:** Preview of your rebuilt site — let's review

**Body:**

Hi {{first_name}},

The clone of {{client_site_url}} is ready for your review. The
preview URL is here:

**{{preview_url}}**

A few things to know before you click in:

- **What you're looking at** is your existing site, rebuilt on Astro,
  with the {{number_of_improvements}} improvements we agreed on in the
  fixes plan applied on top. The clone-fidelity score is
  {{fidelity_score}}/100 — we kept structure and copy faithful so the
  improvements are surgical, not a top-to-bottom redesign.
- **What to look for:** anything that feels different from your
  original site that we *didn't* discuss. The improvements should feel
  intentional; the rest should feel like home.
- **What's coming:** once you sign off, we re-audit the new site to
  produce the comparison report (the "before / after" deliverable).
  Then DNS handoff and we're live.

Could you reply with either:

(a) Sign-off — looks good, ship it.
(b) A short list of revisions you want before launch.

One revision round is included in your engagement.

— {{operator_name}}

---

## 4. Launch handoff

**Subject:** {{client_site_url}} is live — and here's the lift

**Body:**

Hi {{first_name}},

{{client_site_url}} is live as of {{launch_date}}. Here's the deliverable
that summarizes what changed:

**Improvement report:** {{improvement_report_link}}

The headlines:

- {{lift_summary_bullet_1}}
- {{lift_summary_bullet_2}}
- {{lift_summary_bullet_3}}

Most of the lift compounds over weeks (especially SEO-adjacent
improvements). I'll send a quick check-in in 30 days to see how the
real-world numbers are tracking.

**Going forward:**

If you'd like Upriver to keep eyes on the site — quarterly re-audits +
monthly improvement cycles — the retainer tier covers that. Reply if
you'd like me to send terms.

Either way, source code for the new site is here:
{{source_repo_or_archive_link}}

It was a pleasure building this with you. Let me know if anything goes
sideways — I'm here.

— {{operator_name}}

---

## Reminder snippets

### Audit-link nudge (3 days after audit-delivery, no engagement)

**Subject:** Quick nudge on the audit

Hi {{first_name}}, just making sure the audit landed and the share link
is working. The report's here: {{share_link}}. Grab a 30-min slot at
{{calendly_link}} when you're ready to walk through it. — {{operator_name}}

### Renewal nudge (60 days after launch, retainer tier)

**Subject:** Quarterly check-in for {{client_site_url}}

Hi {{first_name}}, your quarterly re-audit is coming up next month.
Anything specific you want me to look at first? Reply with priorities or
"surprise me" and I'll just run the full pass. — {{operator_name}}
