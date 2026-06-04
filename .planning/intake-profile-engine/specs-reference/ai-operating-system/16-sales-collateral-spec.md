# Document Production Spec 16: Sales Collateral Spec

## What This Spec Is

This spec defines the production of the sales artifacts used in the cold pitch model: the sneak-peek scorecard audit, the discovery call deck, the Loom walkthrough script, the proposal template, and the rebuilt-homepage demo structure. These are the tools that turn cold outreach into closed engagements.

Without this spec, sales collateral gets built ad-hoc for each prospect — slow, inconsistent, and hard to scale. With this spec, every prospect gets a consistent sales experience and Joshua (or any future salesperson) can produce the collateral in 2-3 hours per prospect instead of 6-8.

The cold pitch model has been established: lead with value before asking — sneak-peek scorecard audit graded A-F without revealing fixes, live rebuilt homepage on a Vercel preview URL, and a Loom walkthrough. This spec operationalizes that model.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 16 of 18 |
| **Priority** | High — required for repeatable sales process |
| **Total length target** | 2,500-4,000 words |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 2-3 hours |
| **Claude's time** | 45 min |
| **Per-prospect collateral time (using this spec):** 2-3 hours |
| **Delivery format** | Markdown spec; individual artifact templates in `/sales-collateral/` folder |
| **File naming convention** | `16-sales-collateral-spec.md` |

---

## When This Document Gets Built

**Once, at business setup.** Updated when the sales motion evolves or when outreach channels shift.

**Triggers:** Business is ready to go into outbound sales with a standardized pitch.

---

## Section-by-Section Template

### Header Block

```markdown
# Sales Collateral Spec

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0

**For:** Internal sales operations. Defines the artifacts produced for each prospect in the cold pitch model.

**Companion documents:** 18 (AI Operating System Sales Document — the big-picture sales piece this collateral supports).

**Critical principle:** Lead with value before asking. Every piece of collateral produced for a prospect must give them something genuinely useful even if they never buy. The scorecard is useful on its own. The rebuilt homepage preview is useful on its own. The Loom walkthrough is useful on its own. Stacked, they close.
```

---

### Section 1: The Sales Flow

**Purpose:** How the artifacts sequence in a cold pitch.

**Word count target:** 200-400 words.

Required content:

**Step 1: Prospect identification (Outscraper / manual discovery)**

Prospect fits target criteria — boutique wedding venue, small business in Hudson Valley, etc. Added to tracking pipeline.

**Step 2: Sneak-peek scorecard produced (1-2 hours Joshua)**

Scorecard graded A-F across 6-8 dimensions. Findings included; fixes withheld. Delivered as PDF via email with a Loom walkthrough.

**Step 3: Rebuilt homepage preview (1 hour Joshua + Claude Code)**

Simultaneously with scorecard: Claude Code builds a rebuilt version of their homepage based on Upriver's design system and their brand colors/content. Deployed to Vercel preview URL.

**Step 4: Loom walkthrough (15-20 min Joshua)**

Personalized Loom recording (5-8 min) walking the prospect through:
- Their scorecard grades
- The rebuilt homepage preview
- One specific insight tailored to their business
- A clear next step (30-min discovery call)

**Step 5: Email with all three (1 email, 30 min to draft and send)**

Subject: specific to their business. Body: short, acknowledges the cold nature, offers the scorecard + preview + Loom, proposes next step.

**Step 6: Discovery call (if they accept)**

45-60 min call using the discovery call deck. Identifies fit, priorities, engagement scope.

**Step 7: Proposal (if fit is strong)**

Proposal produced within 48 hours of discovery call. Scoped to their specific priorities from discovery.

**Step 8: Close or nurture**

If close: onboarding kit (Document 14) triggers.
If not: nurture sequence.
If no fit: polite decline.

**Ratio targets (from industry norms):**
- Scorecards sent to discovery calls: aim 15-25%
- Discovery calls to proposals: aim 50-70%
- Proposals to closes: aim 25-40%
- Overall cold prospect to closed client: 2-5%

---

### Section 2: Sneak-Peek Scorecard Audit

**Purpose:** The artifact that leads every cold pitch.

**Word count target:** 500-800 words.

Required content:

**Format:** 4-6 page PDF. Visually designed (cream, forest, rust, stone per Upriver's design system). Cormorant Garamond + DM Sans.

**Structure:**

**Page 1: Cover**
- Prospect's business name
- "Sneak-Peek Scorecard Audit"
- Date
- Upriver Consulting logo and Joshua's name
- Tagline: "Prepared for [Business]. What's working, what's not, and what's costing you money."

**Page 2: Summary**
- Overall grade (composite across all dimensions)
- One-paragraph summary: what we looked at, what's notable
- The pitch: "The full audit with remediation recommendations is a separate deliverable. This sneak-peek shows you what we found."

**Page 3-4: Dimensional grades**

For each dimension, show:
- Grade (A-F)
- 2-3 sentences on what that grade reflects
- 1 specific example from their site or profile

The 6-8 standard dimensions:

1. **Homepage clarity** — Can a first-time visitor understand what the business does, who it's for, and what to do next in 5 seconds?
2. **Voice and positioning** — Does the business sound like itself, or like every other business in its category?
3. **Technical SEO foundation** — Indexation, schema, page speed, mobile experience, basic on-page SEO
4. **Conversion UX** — CTA clarity, form friction, contact accessibility, inquiry flow
5. **Content depth and cadence** — Blog activity, pillar page presence, content freshness
6. **Local SEO / GBP health** — For local service businesses; GBP completeness, review response, local pack visibility
7. **Social presence consistency** — Posting cadence, content quality, DM response
8. **AI/automation readiness** — Existing automations, response time, infrastructure

For some prospects, one or two dimensions aren't relevant — skip and note why.

**Page 5: The one big insight**

One standout finding presented prominently. Usually the single biggest leak — the thing that if fixed could meaningfully change their revenue. Examples:
- "Your first-touch response time averages 48 hours. Industry data shows venues responding within 1 hour book 7x more often."
- "40% of your images have no alt text. Google can't parse what they show, which is why you don't rank for visual-intent queries."

**Page 6: What's next**

Clear CTA: "If you want the full audit with remediation recommendations and a quote for fixing what's found here, let's talk. 30 minutes, no pitch."

Calendar link.

**Production process per prospect:**

1. Open their website, GBP, social profiles (45 min)
2. Run PageSpeed Insights, Lighthouse (10 min)
3. Check Ahrefs for domain rating and ranking data (10 min)
4. Assess each dimension, assign grade, write finding (30 min)
5. Identify the one big insight (10 min)
6. Produce PDF using template (20 min via Claude with specific input)
7. QA pass (10 min)

Total: ~2 hours.

**What the scorecard does NOT include:**

- Remediation recommendations (withhold; that's the full audit, which is a paid engagement)
- Specific hours or dollar amounts for fixes
- Competitive comparison to specific competitors by name
- Anything requiring client-provided internal data

**Why no remediation:**

Giving the full audit for free destroys the sales funnel. The scorecard demonstrates diagnostic capability; the full audit with fixes is what they pay for. This is consulting norm, not withholding for withholding's sake.

---

### Section 3: Rebuilt Homepage Preview

**Purpose:** The second artifact — a live preview of what their site could look like.

**Word count target:** 300-500 words.

Required content:

**Format:** Live Vercel preview URL. Next.js build using Upriver's design system token architecture, customized with the prospect's:
- Brand colors (extracted from their current site via Dembrandt or manual)
- Logo (downloaded from their site)
- Real content (pulled from their current homepage and adapted to the new structure)
- Their actual photography (or Unsplash placeholders if not available)

**Structure of the rebuilt homepage (mirroring Document 10 Section 3's recommended structure):**

1. Hero: Text-forward headline + subhead + single primary CTA + property photo
2. Differentiators grid: 3 core differentiators (inferred from their current site)
3. Social proof: review count + sample testimonials
4. Content preview: blog or services
5. Footer CTA

**Voice adaptation:**

Pull their current headline/positioning — rewrite applying Upriver's voice principles (sentence case, first-person if appropriate, no banned phrases, direct over flowery). This demonstrates the voice difference directly.

**Production process per prospect:**

1. Fork a template Next.js repo set up for this purpose (5 min)
2. Extract their brand colors and logo (10 min)
3. Pull their current content — headline, about blurb, differentiators (15 min)
4. Rewrite headline and opening copy applying voice principles (20 min)
5. Adapt template sections with their content + photos (20 min)
6. Deploy to Vercel with preview URL (5 min)

Total: ~1-1.5 hours.

**What to be clear about in the pitch:**

- This is a preview, not a finished site. Dozens of details are still placeholders.
- The prospect can own this as their starting point if they engage, or they can take the insight and go build elsewhere.
- The point is to show what direction feels right, not to hand them a production site.

**When to skip the rebuilt preview:**

If the prospect's current site is actually strong, showing a "rebuild" feels arrogant. Skip the preview and lead with the scorecard + Loom only. Better to under-deliver collateral than to manufactured-disruption a good site.

**Vercel preview domain pattern:**

`[prospect-slug]-preview.upriverhv.com` or similar. Custom subdomain adds polish but adds setup friction. Default Vercel URL also acceptable.

---

### Section 4: Loom Walkthrough Script

**Purpose:** The personal video that ties the artifacts together.

**Word count target:** 400-600 words.

Required content:

**Format:** 5-8 minute Loom, face-and-screen split. Unlisted but shareable. Recorded per-prospect; not a reusable video.

**Script structure:**

**Minute 0:00-0:30: Opening**

"Hi [first name]. Joshua from Upriver Consulting. This is going to be short — about 6 minutes. I looked at [business name]'s website, your Google Business Profile, and a couple of your recent [real weddings / projects / tours], and I pulled together a scorecard and a sneak-peek of what your homepage could look like.

Want to walk you through both. If something makes sense, the next step is a 30-minute call. If not, you still get the scorecard to keep."

**Minute 0:30-3:00: Scorecard walkthrough**

Share screen on the scorecard PDF. Walk through:
- Overall grade, quickly
- 2-3 of the dimensional grades that matter most for their business — skip the rest
- The one big insight — spend the most time here

Tone: conversational, specific, never condescending. Phrase findings as observations, not criticisms. "Your response time is averaging about 48 hours based on what I saw from submitting an inquiry myself" — not "Your response time is terrible."

**Minute 3:00-5:30: Rebuilt homepage preview**

Switch to the Vercel preview URL. Walk through:
- Hero section — what changed and why
- Voice changes — read out loud the before/after of the headline
- One structural change — moved the differentiators up, added a pricing transparency element, etc.
- Note what's placeholder and what's representative

**Minute 5:30-7:00: Why this matters**

One specific insight tailored to their business. Example for a venue: "If you close even two more inquiries per month because response time drops, that's roughly $64,000 a year. That's what this is about — the tools and systems that close the leaks."

**Minute 7:00-7:30: Close**

"If any of this resonates, my calendar link is below. 30 minutes, no hard pitch. I'll walk you through how the full audit works and whether it's a fit. If not, you have the scorecard to keep and use however helps.

Either way, thanks for your time."

**Recording conditions:**
- Clean audio (USB mic minimum)
- Quiet background
- Professional but not stiff — voice natural
- Eye contact with camera
- No ums or filler — willing to re-record

**Per-prospect time:** 20-30 min including re-records.

---

### Section 5: Discovery Call Deck

**Purpose:** The 45-60 min discovery call structure.

**Word count target:** 400-600 words.

Required content:

**Format:** 12-18 slide deck. Shared on screen during the call. Voice-consistent with brand.

**Slide structure:**

**Slides 1-2: Opening**
- Title slide with prospect's business name
- "How this call goes" — 45 min, 3 parts: understand your business, show you what the framework looks like, decide if there's fit

**Slides 3-5: Discovery questions**
Don't show these slides upfront — only reveal as questions are asked. Key questions:
- Walk me through how a customer finds you today and becomes a customer
- Where in that process do you think you're leaking the most
- What have you tried to fix it, and what's worked / not worked
- If nothing changed about your business in 12 months, what would concern you most

**Slides 6-10: The AI Operating System framework**

Brief overview of the 12-document system:
- Slide 6: The problem — AI tools fail because they don't have the right inputs
- Slide 7: The solution — 12 foundation documents that give AI tools the right inputs
- Slide 8: What gets built in 4 weeks (foundation engagement)
- Slide 9: What happens in the retainer phase
- Slide 10: What results look like in 30/60/90/180 days

**Slides 11-13: Specific to their business**

Based on discovery questions, walk through which parts of the framework would directly address their stated leaks.

**Slides 14-15: Pricing and scope**

- Slide 14: Foundation engagement scope and investment
- Slide 15: Retainer tier options

**Slides 16-17: Next steps**

- What happens if we proceed (timeline, kickoff, first milestones)
- What happens if this isn't the right fit today (stay in touch, quarterly check-in, door open)

**Deck maintenance:**

The deck is one template. Slides 11-13 get customized per prospect after the discovery call proper; don't waste time pre-customizing all 18 slides when prospects may not move forward.

**Per-prospect deck prep time:** 30-45 min for pre-call customization of slides 1 and 11-13.

---

### Section 6: Proposal Template

**Purpose:** The post-discovery-call artifact that closes or doesn't.

**Word count target:** 300-500 words.

Required content:

**Format:** PDF produced via HoneyBook or Canva. 6-10 pages. Visually aligned with Upriver's brand system.

**Structure:**

**Page 1: Cover**
- Prospect's business name
- "Engagement Proposal"
- Date and Joshua's contact

**Page 2: Understanding**

"Based on our conversation on [date], here's what I understood about where you are and where you want to go."

Brief recap of prospect's stated situation. This serves two purposes — demonstrates listening, gives them a chance to correct misunderstandings before reading further.

**Page 3: What I'm proposing**

The specific engagement:
- Foundation engagement (Weeks 1-4)
- Retainer tier (if continuing)
- Any scope adjustments from default (e.g., "includes 2 pillar pages during foundation")

**Page 4-5: What gets delivered**

Bulleted list of deliverables:
- 12 source documents loaded into your Claude Project
- [Specific automation(s)] live
- [Specific website changes] complete
- [Baseline measurement + 30-day review]
- [Anything custom to their situation]

**Page 6: Timeline**

Week-by-week overview (from Document 13). Calendar dates shown.

**Page 7: Investment**

- Foundation: $[amount] (paid 50% deposit, 50% on completion, or client's preferred split)
- Retainer (if applicable): $[amount]/month, 6-month minimum
- Any separate production add-ons: itemized

**Page 8: What's NOT included**

Explicit list. Prevents scope creep later.

**Page 9: Next steps**

- Sign and return proposal
- Deposit payable via [method]
- Onboarding email within 2 hours of signing
- Kickoff call within 5 business days

**Page 10: About Upriver (optional)**

One-page background on Joshua and Upriver. For prospects who want the credentials/context.

**Per-prospect proposal time:**

Using the template with customization: 45-90 min. First-time building the template takes longer; production use is faster.

---

### Section 7: Nurture Sequence (Prospects Who Don't Close)

**Purpose:** Prospects who receive the scorecard but don't book a discovery call, or who take the discovery call but don't sign.

**Word count target:** 200-300 words.

Required content:

**Scorecard non-responders (didn't book a call):**

- Day 7: Brief email. "Did the scorecard make sense? Any questions?" No pressure.
- Day 21: Resource email. Share a useful blog post or piece of content tangentially relevant to their business. No ask.
- Day 60: "Checking in" email. Brief; acknowledges the time gap; offers to revisit.
- Day 180+: Annual touch. Relevant industry news or insight.

**Discovery call non-closers:**

- Day 3: Recap email with proposal (if proposal was promised)
- Day 10: Follow-up. "Any questions on the proposal?"
- Day 30: Soft close. "Closing the file; door's open if anything changes."
- Day 180: Annual touch.

**Relevant content to send in nurture:**

Pull from Upriver's own content — blog posts, case studies, industry observations. Never share content that's just "look how great we are" — always content that's useful on its own.

**Re-engagement triggers:**

- Prospect's website shows a change Joshua noticed — reach out with specific observation
- Industry news relevant to their business — share with brief comment
- Prospect shares something on LinkedIn/Instagram — engage genuinely

**When to stop nurturing:**

If no engagement after 12 months across any touchpoint, mark as cold and stop regular touches. Annual touch only.

---

### Section 8: Sales Operations Infrastructure

**Purpose:** Tools and tracking for the sales motion.

**Word count target:** 150-300 words.

Required content:

**Pipeline tracking:**

Supabase table or simple Airtable/Notion base tracking every prospect:
- Business name, contact info
- Lead source (Outscraper, referral, inbound, manual discovery)
- Stage (scorecard sent, discovery scheduled, proposal sent, closed, lost)
- Scorecard grade
- Notes from discovery call
- Next action and due date

**Metrics to track:**

- Scorecards sent per week/month
- Discovery calls booked per scorecard sent (target: 15-25%)
- Proposals sent per discovery call (target: 50-70%)
- Closes per proposal (target: 25-40%)
- Average cycle time from scorecard to close

**Reporting cadence:**

- Weekly: pipeline review (internal)
- Monthly: conversion metrics review; adjust approach if targets missing

**Sales production calendar:**

- Target: 3-5 scorecards per week (sustainable production rate for Joshua solo)
- With Outscraper/Apify enrichment running, pipeline can be kept full
- Don't over-produce scorecards; each one is 2-3 hours and the bottleneck is closing, not volume

---

## How to Build This Document

**Step 1: Map the sales flow end to end (30 min).**

**Step 2: Build the scorecard template — Canva or PDF with Upriver's design system (60 min).**

**Step 3: Build the Next.js rebuild template — forkable repo with design tokens (90 min).**

**Step 4: Draft the Loom script template (30 min).**

**Step 5: Build the discovery call deck (60 min).**

**Step 6: Build the proposal template in HoneyBook (45 min).**

**Step 7: Set up pipeline tracking (30 min).**

**Step 8: Test end-to-end on a friendly prospect or hypothetical prospect (2-3 hours).**

---

## Definition of Done

- [ ] All 8 sections complete
- [ ] Scorecard template exists and has been tested on a real prospect
- [ ] Rebuild Next.js template is forkable and deployable to Vercel in under 60 min
- [ ] Loom script is written and first real Loom has been recorded
- [ ] Discovery call deck has 12-18 slides in template form
- [ ] Proposal template exists in HoneyBook
- [ ] Nurture sequence emails drafted
- [ ] Pipeline tracking infrastructure set up
- [ ] End-to-end test complete with first real cold prospect

---

## Common Failure Modes

**Failure 1: Scorecard gives away too much.** Includes specific fixes, essentially delivering the full audit for free. Prospect takes the insights and doesn't engage. Fix: grade-and-find only, never grade-and-fix.

**Failure 2: Rebuild preview takes too long per prospect.** 4-6 hours per rebuild instead of 1-2. Sales motion becomes unsustainable. Fix: tight template; strict scope; placeholders are fine.

**Failure 3: Loom is generic.** Same Loom for every prospect with name swapped. Defeats the point. Fix: each Loom is personalized with at least one prospect-specific insight.

**Failure 4: Discovery call becomes pitch-from-minute-one.** Prospect goes quiet; call dies. Fix: first 15 min is discovery questions; pitch comes after.

**Failure 5: Proposal gets scope-creeped post-close.** Client asked for "just one more thing" between proposal and signing; Joshua accommodated; now Week 1 is overloaded. Fix: proposal scope is locked; changes trigger explicit revision.

**Failure 6: Nurture sequence goes silent.** Prospects who don't close immediately get dropped. 6 months later they're buying from someone else who did nurture. Fix: calendar-driven nurture with at least 3 touchpoints over 6 months.

**Failure 7: Pipeline tracking never gets populated.** Works for 2 weeks, then falls behind. Conversion data becomes untrustworthy. Fix: weekly 15-min pipeline update session.
