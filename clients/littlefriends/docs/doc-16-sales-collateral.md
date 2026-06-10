# Sales collateral spec

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0

**For:** Internal sales operations. Defines the artifacts I produce for each prospect in the cold pitch model.

**Companion documents:** 18 (AI Operating System Sales Document, the big-picture sales piece this collateral supports).

**Critical principle:** Lead with value before asking. Every piece of collateral I produce for a prospect must give them something genuinely useful even if they never buy. The scorecard is useful on its own. The rebuilt homepage preview is useful on its own. The Loom walkthrough is useful on its own. Stacked, they close.

---

## Section 1: The sales flow

This is the end-to-end sequence of steps and artifacts for every cold pitch. The prospect receives value at each step before I ask for anything.

**Step 1: Prospect identification (Outscraper or manual discovery)**

The prospect fits target criteria: a small Hudson Valley business operating largely on word of mouth with a thin digital presence and no systematic AI or automation infrastructure. Added to the pipeline tracking base.

**Step 2: Sneak-peek scorecard produced (1-2 hours)**

I audit the prospect's website, Google Business Profile, and social presence. I grade across 6-8 dimensions (A-F), write up the findings, and withhold remediation recommendations. The scorecard ships as a PDF via email, paired with a Loom walkthrough.

**Step 3: Rebuilt homepage preview (1 hour with Claude Code)**

Simultaneously: I fork the standing Next.js rebuild template [NEEDS CONFIRMATION: confirm the repo is set up and the Vercel deploy process works end to end before the first live pitch] and populate it with the prospect's brand colors, logo, and real homepage content. I deploy to a Vercel preview URL.

**Step 4: Loom walkthrough (15-20 min)**

A personalized Loom recording (5-8 min) walking through the scorecard grades, the rebuilt homepage preview, and one insight specific to their business. Closes with a clear next step: a 30-minute discovery call.

**Step 5: Email with all three (30 min to draft and send)**

Subject line specific to their business. Body short, acknowledging the cold nature, offering the scorecard, preview, and Loom, and proposing the next step.

**Step 6: Discovery call (if they accept)**

45-60 min call using the discovery call deck. Identifies fit, priorities, and engagement scope.

**Step 7: Proposal (if fit is strong)**

Proposal produced within 48 hours of the discovery call. Scoped to their specific priorities from discovery.

**Step 8: Close or nurture**

Close triggers the onboarding kit (Document 14). A non-close triggers the nurture sequence (Section 7 of this document). No fit: polite decline.

**Ratio targets (from industry norms):**
- Scorecards sent to discovery calls booked: aim 15-25%
- Discovery calls to proposals sent: aim 50-70%
- Proposals to closes: aim 25-40%
- Overall cold prospect to closed client: 2-5%

---

## Section 2: Sneak-peek scorecard audit

The scorecard leads every cold pitch. It demonstrates diagnostic capability without giving away the fix.

### Format

A 4-6 page PDF. Visually designed in Upriver's color system (cream, forest, rust, stone). Fonts: Cormorant Garamond for display text, DM Sans for body.

### Page structure

**Page 1: Cover**

Prospect's business name. "Sneak-peek scorecard audit." Date. Upriver Consulting logo and my name. Tagline: "Prepared for [Business]. What's working, what's not, and what's costing you money."

**Page 2: Summary**

Overall grade (composite across all dimensions). One paragraph: what I looked at and what's notable. The framing: "The full audit with remediation recommendations is a separate deliverable. This sneak-peek shows you what I found."

**Pages 3-4: Dimensional grades**

For each dimension: grade (A-F), 2-3 sentences on what the grade reflects, and 1 specific example from their site or profile.

The 8 standard dimensions:

1. **Homepage clarity.** Can a first-time visitor understand what the business does, who it's for, and what to do next within five seconds?
2. **Voice and positioning.** Does the business sound like itself, or like every other business in its category?
3. **Technical SEO foundation.** Indexation, schema, page speed, mobile experience, and basic on-page SEO.
4. **Conversion UX.** CTA clarity, form friction, contact accessibility, and inquiry flow.
5. **Content depth and cadence.** Blog activity, pillar page presence, and content freshness.
6. **Local SEO and GBP health.** For local service businesses: GBP completeness, review response, and local pack visibility.
7. **Social presence consistency.** Posting cadence, content quality, and DM response.
8. **AI and automation readiness.** Existing automations, response time, and infrastructure.

For some prospects, one or two dimensions will not apply. Skip them and note why.

*Applied example (Little Friends Learning Loft):* The director describes the Square Online site as "old" and says she does not think anyone finds the school through it. That alone signals a probable C or D on homepage clarity and a likely F on content depth and cadence (no confirmed blog, no fresh content). Local SEO grades on GBP owner-access status, which is unconfirmed at the 290 North St, Newburgh listing. Conversion UX grades on inquiry response time, which has not yet been measured via a secret shopper test. These are the concrete, specific findings that go in the scorecard for this prospect, not generic observations.

**Page 5: The one big insight**

One standout finding, presented prominently. Usually the single largest leak: the thing that, if fixed, could meaningfully change outcomes. For a preschool operating almost entirely on word of mouth with no SEO presence, a strong candidate: "Families comparing three to five preschools typically decide within 48-72 hours of their first inquiry. If your website doesn't show up in search and your response time on email and Instagram DM is slow, you are losing families who were already interested and never came back." [NEEDS CONFIRMATION: verify actual response time via secret shopper test and actual keyword ranking status before using specific claims like this.]

**Page 6: What's next**

Clear CTA: "If you want the full audit with remediation recommendations and a quote for fixing what's found here, let's talk. 30 minutes, no pitch." Calendar link. [NEEDS CONFIRMATION: finalize calendar booking link before the first live scorecard ships.]

### Production process per prospect

1. Review their website, GBP, and social profiles: 45 min
2. Run PageSpeed Insights and Lighthouse: 10 min
3. Check Ahrefs for domain rating and ranking data: 10 min
4. Assess each dimension, assign grade, write findings: 30 min
5. Identify the one big insight: 10 min
6. Produce the PDF in the Canva template: 20 min
7. QA pass: 10 min

Total: roughly 2 hours per prospect.

### What the scorecard does not include

- Remediation recommendations. Withhold. The scorecard demonstrates what I can see. The full audit with fixes is what the client pays for.
- Specific hours or dollar amounts for any fixes.
- Competitive comparison to named competitors.
- Anything requiring client-provided internal data.

This is consulting norm, not withholding for its own sake. Giving the full audit for free destroys the sales funnel.

---

## Section 3: Rebuilt homepage preview

The second artifact: a live preview of what their site could look like, deployed and shareable the same day as the scorecard.

### Format

A live Vercel preview URL. Next.js build using Upriver's design token architecture, customized with the prospect's brand colors (extracted from their site using Dembrandt or manually), their logo, their actual homepage content, and real photography where available (Unsplash placeholders when their photo library is thin or consent-gated).

### Homepage structure (mirroring the recommended structure in Document 10)

1. Hero: text-forward headline, subhead, single primary CTA, and one environment or property photo
2. Differentiators grid: three core differentiators inferred from their current site
3. Social proof: review count and sample testimonials
4. Content preview: services or blog
5. Footer CTA

### Voice adaptation

Pull their current headline and positioning copy. Rewrite it applying Upriver's voice principles: sentence case, direct over flowery, no clichés. Reading the before/after headline aloud is the most effective single moment in the Loom walkthrough because it makes the voice difference concrete. For a prospect like Little Friends Learning Loft, the recommended positioning statement is: "Little Friends Learning Loft is the warm, small, JCC-rooted preschool in Newburgh for ages 2-5." That is a clean, specific starting point for a hero headline that is completely unlike what a Goddard franchise page would say.

### Production process per prospect

1. Fork the template Next.js repo (5 min)
2. Extract brand colors and logo (10 min)
3. Pull current content: headline, about blurb, and differentiators (15 min)
4. Rewrite headline and opening copy applying voice principles (20 min)
5. Adapt template sections with their content and photos (20 min)
6. Deploy to Vercel with preview URL (5 min)

Total: roughly 1 to 1.5 hours per prospect.

### What to be clear about in the pitch

This is a preview, not a finished site. Dozens of details are still placeholders. The prospect can take this as their starting point if they engage, or they can take the directional insight and go elsewhere. The point is to show what direction feels right, not to hand them a production site.

### When to skip the rebuilt preview

If the prospect's current site is actually strong, a rebuild reads as arrogant. Skip the preview and lead with the scorecard and Loom only. Under-delivering collateral is better than manufacturing disruption against a site that is working.

### Vercel preview domain pattern

`[prospect-slug]-preview.upriverhv.com` or the default Vercel subdomain. The custom subdomain adds polish but adds DNS setup time. The default Vercel URL is acceptable when moving fast. [NEEDS CONFIRMATION: confirm `upriverhv.com` domain DNS is pointed to Vercel before first use of the custom pattern.]

---

## Section 4: Loom walkthrough script

The personal video that ties the two artifacts together.

### Format

A 5-8 minute Loom recording. Face-and-screen split. Unlisted but shareable. Recorded per prospect. Not a reusable generic video.

### Script structure

**0:00-0:30: Opening**

"Hi [first name]. Joshua from Upriver Consulting. This is going to be short, about six minutes. I looked at [business name]'s website, your Google Business Profile, and [one specific thing from their profile, by name], and I pulled together a scorecard and a sneak-peek of what your homepage could look like. Want to walk you through both. If something makes sense, the next step is a 30-minute call. If not, you still have the scorecard."

For Little Friends Learning Loft, the "one specific thing" might be: "a few of your Instagram posts and the JCC program page." That line immediately signals that this is not a form Loom.

**0:30-3:00: Scorecard walkthrough**

Share screen on the scorecard PDF. Walk through:
- Overall grade, quickly
- 2-3 of the dimensional grades that matter most for this specific business
- The one big insight (spend the most time here)

Tone: conversational, specific, never condescending. Phrase findings as observations, not verdicts. "Your website doesn't appear to rank for 'Montessori preschool Newburgh' based on what I could see in Ahrefs" is better than "Your SEO is terrible." One finding should be verifiable and specific enough that the prospect cannot dismiss it as generic.

For Little Friends Learning Loft: the clearest opener is the website grade. Rebecca herself described the Square Online site as something she does not think anyone finds. I am not telling her anything she does not know. What I am doing is naming it with data and offering a path forward.

**3:00-5:30: Rebuilt homepage preview**

Switch to the Vercel preview URL. Walk through:
- What changed in the hero section and why
- Voice changes: read the before/after headline aloud
- One structural change (a differentiators section moved up, a testimonial placed earlier, a single CTA replacing three competing ones)
- What is placeholder and what is representative of the direction

For Little Friends Learning Loft: reading the Renata Kero testimonial ("We had heard how wonderful Little Friends Learning Loft was, but seeing it in action blew us away...") placed prominently on the preview page is more powerful than explaining social proof in the abstract.

**5:30-7:00: Why this matters (specific to their business)**

One business-specific consequence, grounded in their actual numbers. For a preschool at 52 of 58 licensed spots: "You're nearly full right now, which is great. But your fall enrollment window depends on families finding you before they tour the other options. If your site doesn't show up in search and your inquiry response is slow, you're losing families who were already interested. You never know they came and went. That's the leak this is designed to close." [NEEDS CONFIRMATION: confirm enrollment cycle timing and search ranking status before using specific claims like this in a live Loom.]

**7:00-7:30: Close**

"If any of this resonates, my calendar link is below. 30 minutes, no hard pitch. I'll walk you through how the full audit works and whether it's a fit. If not, you have the scorecard to keep. Either way, thanks for your time."

### Recording conditions

- Clean audio (USB microphone minimum)
- Quiet background
- Professional but not stiff: voice natural, not scripted-sounding
- Eye contact with the camera at opens and closes
- Re-record if verbal fillers stack up

Per-prospect recording time: 20-30 min including re-records.

---

## Section 5: Discovery call deck

The structure for the 45-60 min call with prospects who respond.

### Format

A 12-18 slide deck. Shared on screen during the call. Voice consistent with Upriver's brand.

### Slide structure

**Slides 1-2: Opening**

Slide 1: title slide with the prospect's business name. Slide 2: "How this call goes" (45 minutes, three parts: understand your business, show you what the framework looks like, decide together if there is fit).

**Slides 3-5: Discovery questions**

Do not show these slides upfront. Reveal only as each question is asked. Key questions:

- Walk me through how a customer finds you today and becomes a paying client.
- Where in that process do you think you are losing the most?
- What have you tried to fix it, and what has or hasn't worked?
- If nothing changed about your business in 12 months, what would concern you most?

These questions are designed to surface the leaks the prospect already feels but has not fully named. For a school like Little Friends Learning Loft, the first question will likely surface the word-of-mouth and JCC dependency as the primary discovery path. The second will likely surface the website and response time. Those two answers are enough to walk into the framework slides with credibility.

**Slides 6-10: The AI operating system framework**

- Slide 6: the problem. AI tools fail when they do not have the right inputs.
- Slide 7: the solution. Twelve foundation documents that give AI the right inputs.
- Slide 8: what gets built in the four-week foundation engagement.
- Slide 9: what happens in the retainer phase.
- Slide 10: what results look like at 30, 60, 90, and 180 days.

**Slides 11-13: Specific to their business**

Based on the discovery answers, walk through which parts of the framework directly address their stated leaks. These slides get customized per prospect after the discovery questions, not before. Customizing all 18 slides in advance wastes time when many prospects will not move to this part of the call.

**Slides 14-15: Pricing and scope**

- Slide 14: foundation engagement scope and investment. [NEEDS CONFIRMATION: insert confirmed pricing before any live use.]
- Slide 15: retainer tier options and monthly rates. [NEEDS CONFIRMATION: insert confirmed tiers and pricing.]

**Slides 16-17: Next steps**

- Slide 16: what happens if we proceed (timeline, kickoff, first milestones).
- Slide 17: what happens if this is not the right fit today (stay in touch, quarterly check-in, door open).

### Deck maintenance

One template. Per-prospect customization is slides 1 and 11-13 only. Per-prospect deck prep time: 30-45 min.

---

## Section 6: Proposal template

The artifact produced within 48 hours of a discovery call where fit is strong.

### Format

PDF produced via HoneyBook or Canva. 6-10 pages. Visually aligned with Upriver's brand system.

### Page structure

**Page 1: Cover**

Prospect's business name. "Engagement proposal." Date and my contact information.

**Page 2: Understanding**

"Based on our conversation on [date], here is what I understood about where you are and where you want to go."

Brief recap of the prospect's stated situation in their own language where possible. This demonstrates that I was actually listening and gives them a chance to correct any misunderstanding before reading the rest.

**Page 3: What I'm proposing**

The specific engagement:
- Foundation engagement (Weeks 1-4)
- Retainer tier (if continuing)
- Any scope adjustments from the default, named explicitly (for example: "includes GBP owner-access recovery and initial profile build in Week 1" if that came up in discovery)

**Pages 4-5: What gets delivered**

Bulleted deliverables:
- 12 source documents loaded into a Claude Project
- Specific automation(s) live
- Specific website changes complete
- Baseline measurement and 30-day review
- Any custom deliverables from discovery

**Page 6: Timeline**

Week-by-week overview (from Document 13). Calendar dates shown.

**Page 7: Investment**

- Foundation: $[amount]. Paid as 50% deposit at signing, 50% on completion (or client's preferred split). [NEEDS CONFIRMATION: insert confirmed foundation engagement price.]
- Retainer (if applicable): $[amount]/month, 6-month minimum. [NEEDS CONFIRMATION: insert confirmed tier rates.]
- Separate production add-ons, if any: itemized.

**Page 8: What's not included**

An explicit list of scope exclusions. Prevents scope creep after signing.

**Page 9: Next steps**

- Sign and return the proposal.
- Deposit payable via [method]. [NEEDS CONFIRMATION: confirm accepted payment methods and platform before first use.]
- Onboarding email within 2 hours of signing.
- Kickoff call within 5 business days.

**Page 10: About Upriver (optional)**

One-page background on me and Upriver Consulting. For prospects who want context before signing. Include only when the prospect has asked or when the discovery call suggested a credibility gap.

Per-prospect proposal time: 45-90 min using the template with customization. The first template build takes longer; production use is faster.

---

## Section 7: Nurture sequence

Prospects who receive the scorecard but do not book a discovery call, or who take the discovery call but do not sign.

### Scorecard non-responders (did not book a call)

- Day 7: short email. "Did the scorecard make sense? Any questions?" No pressure.
- Day 21: resource email. A useful piece of content tangentially relevant to their business. No ask.
- Day 60: check-in email. Brief, acknowledges the time gap, offers to revisit.
- Day 180+: annual touch. Relevant industry news or a specific observation.

### Discovery call non-closers

- Day 3: recap email with proposal (if a proposal was promised on the call).
- Day 10: follow-up. "Any questions on the proposal?"
- Day 30: soft close. "Closing the file for now. The door's open if anything changes."
- Day 180: annual touch.

### Relevant content for nurture

Pull from Upriver's own content: blog posts, case studies, observations. Never send content that reads as self-promotion. The only content worth sending is something the prospect would find useful on its own.

### Re-engagement triggers

- The prospect's website shows a noticeable change. Reach out with a specific observation about what changed.
- Industry news relevant to their business or category. Share it with a brief comment.
- The prospect posts something on Instagram or LinkedIn. Engage genuinely, not transactionally.

### When to stop nurturing

If there has been no engagement across any touchpoint after 12 months, mark as cold and move to annual-touch only.

---

## Section 8: Sales operations infrastructure

Tools and tracking for the sales motion.

### Pipeline tracking

A Supabase table (or Airtable base if Supabase setup is not yet complete) tracking every prospect:
- Business name and contact information
- Lead source (Outscraper, referral, inbound, manual discovery)
- Stage (scorecard sent, discovery scheduled, proposal sent, closed, lost)
- Scorecard overall grade
- Notes from the discovery call
- Next action and due date

[NEEDS CONFIRMATION: decide whether Supabase or Airtable is the right starting point before the first prospect enters the pipeline. Supabase is the right long-term home. Airtable is faster to stand up if the database infrastructure is not yet ready.]

### Metrics to track

- Scorecards sent per week and per month
- Discovery calls booked per scorecard sent (target: 15-25%)
- Proposals sent per discovery call (target: 50-70%)
- Closes per proposal (target: 25-40%)
- Average cycle time from scorecard sent to close

### Reporting cadence

- Weekly: 15-minute pipeline review (internal).
- Monthly: conversion metrics review. Adjust approach if targets are consistently missed.

### Production calendar

Target: 3-5 scorecards per week as a sustainable solo rate. With Outscraper and Apify enrichment running, the pipeline can stay full at that cadence. The bottleneck in this model is closing, not scorecard volume. Producing 10 scorecards a week when discovery call capacity is four per week creates waste, not pipeline.

