# Document Production Spec 03: Sales Process Map

## What This Spec Is

This is the production specification for Document 3 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The Sales Process Map is the operational anatomy of how the business turns inquiries into customers. Every automation Zach builds, every email sequence Joshua writes, every chatbot deployed, every CRM configured references this document. It's also the document that exposes the gap between what the owner thinks happens and what actually happens — which is usually where the biggest revenue leaks live.

When this document is wrong or thin, the AI auto-responder routes leads to the wrong person, the follow-up sequence fires at the wrong moment, the CRM tracks the wrong stages, and the monthly report can't explain why conversion dropped. This is also the document most likely to surface uncomfortable truths in the discovery process — many owners discover they have no real follow-up cadence, no idea what their conversion rate is, and a 36-hour response time when they thought it was 4.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 03 of 12 |
| **Priority** | High |
| **Total length target** | 1,500-3,000 words |
| **Total time to produce** | 2-3 hours |
| **Joshua's time** | 1.5 hours |
| **Claude's time** | 30 minutes |
| **Client's time** | 30-45 minutes (questionnaire + walk-through call) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-03-sales-process.md` |
| **Foundation for** | Documents 7 (Email Templates), 10 (Automation Spec Package), 12 (Measurement Framework), and feeds the Sales Funnel Audit deliverable |

---

## When This Document Gets Built

**Phase 2 of engagement, Week 2.** Built after the Brand Voice Guide (01), Business Facts Reference (02), and FAQ Bank (07) are at least in draft form, because those documents establish the language and facts that get used throughout the sales process.

**Triggers:** Onboarding questionnaire submitted, secret shopper test completed, CRM access granted (if applicable), discovery meeting deep-dive done.

**Blocks:** Automation Spec Package (Document 10) — every automation references the sales process map.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required.

### Header Block

```markdown
# [Business Name] Sales Process Map

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last process audit:** [Month Year, by whom]

**For:** Inquiry response automation, follow-up sequences, lead scoring, CRM configuration, sales funnel audits, conversion improvement work.

**Companion documents:**
- Document 02: Business Facts Reference (the facts referenced at each stage)
- Document 07: FAQ and Common Questions Bank (the answers used at each stage)
- Document 08: Email and Communication Templates (the actual language used at each stage)
- Document 10: Automation Spec Package (where this map gets operationalized)
- Document 12: Measurement and KPI Framework (where this map's metrics get tracked)

**Critical principle:** This document describes what actually happens, not what the owner wishes happened. The "ideal" process belongs in the Automation Spec Package as the future state. This document is the current state, including the gaps.
```

**Word count:** 100-150 words.

---

### Section 1: Lead Sources and Channel Mix

**Purpose:** Where inquiries actually come from, in what proportions, and at what quality. This is the top of the funnel.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 1. Lead Sources and Channel Mix

### Active inbound lead sources
For each channel currently producing inquiries:

- **Channel:** [Name — e.g., "Google organic search," "The Knot," "Instagram DM," "Referral from past customer"]
- **Volume:** [Approximate inquiries per month or year]
- **Percentage of total inbound:** [%]
- **Quality assessment:** [High / Medium / Low — based on conversion rate from this source if known, otherwise based on owner's perception with explanation]
- **Cost:** [Free / Listing fee / Per-lead cost / Ad spend]
- **Where the inquiry lands:** [Email inbox / website form notification / phone / DM / SMS]
- **Who sees it first:** [Person or automated system]

### Inactive lead sources (currently dormant but possible)
[Channels the business has used in the past or could use but isn't currently. Useful context for expansion conversations.]

### Lead sources NOT being used (and why)
[Channels the business has consciously chosen not to use, with reasoning. Prevents future "should we try X" conversations from rehashing.]

### Lead source observations
[2-3 sentences on what's notable about the channel mix. Examples: "60% of leads come from Instagram but conversion from Instagram is half of website conversion." Or: "Referrals make up 30% of leads and 50% of bookings — referrals are the highest-quality channel by a wide margin."]
```

**How to source the data:**
- **Onboarding questionnaire Q11** (where do inquiries come from with percentages)
- **CRM data** if available — actual source attribution
- **Google Analytics / Search Console** for organic and paid traffic
- **Owner's recall** — flag any percentages that are owner-recall vs. data-confirmed

**Industry adaptation:**
- **Wedding venue:** The Knot, WeddingWire, Zola, Junebug, planner referrals are the canonical channels. Instagram is increasingly important for top-of-funnel awareness even if not the inquiry-generating channel.
- **Contractor:** Google Local Pack, Google Search, Angi/HomeAdvisor, Houzz, referrals, repeat customers, neighborhood signs/yard signs, drive-by.
- **Preschool:** Google Search ("preschool near me"), Google Maps, parent referrals, partnerships with neighborhood real estate agents and pediatricians, social media.
- **Restaurant:** Google Maps/GBP, Yelp, OpenTable, Resy, Instagram, walk-in/drive-by traffic, press, tourism.
- **Professional services:** LinkedIn, referrals, content marketing, paid ads, podcast appearances, speaking engagements, repeat clients.

---

### Section 2: First Touch — What Happens When an Inquiry Arrives

**Purpose:** The first 48 hours after an inquiry comes in. This is the highest-leverage section because response speed and first-touch quality are the biggest predictors of conversion.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 2. First Touch — What Happens When an Inquiry Arrives

### The actual current process

Walk step-by-step through what happens when a new inquiry arrives. Be specific. Use real timing.

1. [Inquiry arrives via channel X]
2. [Notification goes to person Y / lands in inbox Z]
3. [Person Y sees it at time T (within X hours, end of day, next morning, etc.)]
4. [Person Y does action A]
5. [Customer receives response at time T+X]
6. [Etc.]

### Average response time

- **By channel:** [Different channels often have different response times]
- **By time of day:** [If inquiry arrives at 9am vs. 9pm vs. weekend]
- **By season:** [If response time slows during peak]

### Who responds and what they say

- **Primary responder:** [Name]
- **Backup responder:** [Name, if applicable]
- **What they say (current first-touch message):** [Paste the actual current template if one exists, or describe what they typically write]
- **What they ask (typical questions in the first reply):** [List]
- **What they include (pricing, brochure, calendar link, etc.):** [List]

### What's working in the first touch

[2-3 sentences identifying what the business does well at this stage.]

### What's broken or weak

[Be honest. This is internal documentation. Common issues: response time too long, generic template, doesn't include enough info to move the conversation forward, doesn't include a clear next-step CTA, misses on personalization, doesn't qualify the lead.]

### Drop-off rate at first touch

- **Inquiries that go cold after first response (no reply from prospect):** [%, if known]
- **Common reasons identified for cold drop-off:** [Best guesses or stated reasons]
```

**How to source the data:**
- **Secret shopper test** is the single most reliable source. Joshua submits a fake inquiry and times the actual response.
- **Onboarding questionnaire Q13** (response time)
- **CRM data** for actual response times
- **Owner's stated process** — flag where stated process differs from secret shopper findings

**Industry adaptation:**
- **Wedding venue:** Couples typically inquire to 4-6 venues at once. Response time matters enormously. Industry data: venues that respond within 1 hour are 7x more likely to book than those that respond after 24 hours.
- **Contractor:** Often the worst at response time because they're on job sites. The first contractor to respond often wins the project regardless of price.
- **Preschool:** Parents often touring 3-5 schools. Tour scheduling speed and warmth of first response are key.
- **Restaurant:** Reservation requests need same-day response or they're gone. Private event inquiries can tolerate slower (24-48 hour) but only if substantive.
- **Professional services:** Slower acceptable (24-48 hour) but only if response is substantive and demonstrates expertise. A fast generic response can hurt.

---

### Section 3: Qualification and Nurture

**Purpose:** What happens between first response and the next step (tour, meeting, proposal, estimate). This is where most leads are lost.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 3. Qualification and Nurture

### Lead qualification criteria

What makes a lead qualified vs. unqualified for this business?

- **Qualified lead criteria:**
  - [Criterion 1 — e.g., date is in available range]
  - [Criterion 2 — e.g., guest count fits capacity]
  - [Criterion 3 — e.g., budget aligns with pricing]
  - [Criterion 4 — e.g., scope matches what we offer]

- **Disqualified lead criteria (we know this isn't a fit):**
  - [Criterion 1]
  - [Criterion 2]

- **How disqualified leads are handled:** [Polite decline / referral to better-fit business / silence]

### Information gathered before the next step

What does the responder need to know before scheduling the tour/meeting/estimate?

- [Required info 1]
- [Required info 2]
- [Required info 3]

### Tools used in this stage

- [CRM if any]
- [Email or messaging platform]
- [Scheduling tool if any]

### Common reasons leads stall here

[Honest list. Examples: "We send pricing and never hear back." "We ask too many qualifying questions and the prospect gets fatigued." "The prospect needs to talk to a partner/spouse and we don't follow up." "Our scheduling link is hard to use."]

### Average time from first response to next step

[How long does it typically take to get from "we replied" to "tour scheduled" or "meeting on the calendar"?]
```

---

### Section 4: The Conversion Event (Tour, Meeting, Estimate, Proposal)

**Purpose:** The mid-funnel event that's typically the make-or-break moment for the sale.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 4. The Conversion Event

This is the [tour / consultation / estimate visit / discovery meeting / proposal presentation] — the event where the prospect becomes a serious buyer.

### What this event is called publicly

[Tour / Consultation / Estimate / Site Visit / Discovery Call / Strategy Session / etc.]

### Format and length

- **Format:** [In-person / video / phone]
- **Length:** [Typical duration]
- **Location:** [Where it happens]

### Who runs it

- **Primary:** [Name and role]
- **Backup:** [Name and role if applicable]

### Scheduling process

- **How it gets scheduled:** [Manual back-and-forth / Cal.com / Calendly / phone]
- **Typical lead time before the event:** [Days/weeks]
- **Confirmation cadence:** [Confirmation email at booking, reminder at 48 hours, day-of, etc.]
- **Show-up rate:** [%, if tracked]
- **No-show handling:** [Reschedule offer, follow-up cadence]

### Prep done before the event

- **By the responder:** [What they review / prepare]
- **Materials sent to the prospect beforehand:** [If any]
- **Information collected from the prospect beforehand:** [If any]

### Standard agenda / structure of the event

1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5]

### What the prospect typically leaves with

- [Specifics — pricing sheet, proposal draft, contract, follow-up timeline]

### What the responder leaves with

- [Specifics — qualification level, next-step commitment, identified objections, partner/spouse needs to be looped in, etc.]

### Conversion rate from this event

- **Event-to-customer conversion rate:** [%, if tracked]
- **Common reasons prospects don't convert after this event:**
  - [Reason 1]
  - [Reason 2]
  - [Reason 3]
```

**Industry adaptation:**
- **Wedding venue:** Tour. 60-90 minutes. Walk the property. Sit-down with pricing. Industry standard: 60-70% of tours convert to bookings if the date is held.
- **Contractor:** Site visit and estimate. 1-2 hours on-site, 3-7 days to produce a written estimate. Industry standard: 30-50% close rate on estimates.
- **Preschool:** Tour. 45-60 minutes. Often with the director. Sometimes with a current parent guide. Industry standard: high tour-to-enrollment if the school is a fit, low if it isn't.
- **Restaurant:** For private events, a venue walk-through. For reservations, no event — direct booking.
- **Professional services:** Discovery call or strategy session. 30-60 minutes. Often produces a proposal. Industry standard: 25-40% close rate on proposals.

---

### Section 5: The Close — From "Yes" to Signed Customer

**Purpose:** The mechanics of what happens between a verbal "yes" and a signed contract or deposit.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 5. The Close

### What "close" means for this business

[Define the moment a prospect officially becomes a customer. Signed contract? Deposit paid? Date held? First invoice issued?]

### Steps from verbal commitment to closed customer

1. [Step 1 — e.g., "Send formal proposal/contract within 48 hours"]
2. [Step 2 — e.g., "Hold date for 7 days while contract is reviewed"]
3. [Step 3 — e.g., "Customer signs contract via [tool]"]
4. [Step 4 — e.g., "Deposit paid via [method]"]
5. [Step 5 — e.g., "Welcome packet sent"]

### Tools used in the close

- **Proposal tool:** [Tool name]
- **Contract tool / e-signature:** [Tool name]
- **Payment processor:** [Tool name]
- **CRM update:** [How status changes]

### Average time from "yes" to signed

[Days/weeks]

### Drop-off between verbal yes and signed

- **% of verbal yeses that don't convert:** [If tracked]
- **Common reasons:** [Cold feet, partner pushback, found something else, contract concerns, etc.]
- **What's done to reduce this drop-off:** [Hold periods, soft-touch follow-ups, etc.]

### What's included with the close

[What does the customer receive at this stage — welcome packet, planning timeline, kickoff call invite, etc.]
```

---

### Section 6: Follow-Up Cadence for Stalled Leads

**Purpose:** What happens when a prospect goes cold at any stage. This is where automated nurture and AI-assisted follow-ups have the highest ROI.

**Word count target:** 250-450 words.

**Required structure:**

```markdown
## 6. Follow-Up Cadence for Stalled Leads

### Current follow-up cadence (if any)

Be honest. Many businesses have no documented follow-up cadence — they follow up when they remember to.

- **After first response with no reply:**
  - Follow-up 1: [Day X, what's said]
  - Follow-up 2: [Day Y, what's said]
  - Stop point: [When does the business give up?]

- **After tour/meeting with no booking:**
  - Follow-up 1: [Day X, what's said]
  - Follow-up 2: [Day Y, what's said]
  - Stop point: [When does the business give up?]

- **After verbal yes with no signed contract:**
  - Follow-up 1: [Day X, what's said]
  - Follow-up 2: [Day Y, what's said]
  - Stop point: [When does the business give up?]

### Channels used for follow-up

- [Email / phone / SMS / DM / mailed letter]
- [Any restrictions — e.g., "Only email; phone calls feel pushy for our customer base"]

### Lost-deal handling

- **What's done when a deal is officially lost:** [Polite acknowledgment / archive / add to nurture list]
- **Long-tail nurture (months later):** [Newsletter, holiday touches, anniversary reminders, none]

### Re-engagement of past customers

For businesses where past customers can buy again or refer:
- **Repeat customer cadence:** [Annual touches, referral asks, etc.]
- **Referral request timing:** [When and how the business asks for referrals]

### Gaps in current follow-up

[Honest assessment. The most common gap: there is no follow-up. Second most common: there's a single follow-up, then silence. Document this directly so the gap becomes visible and addressable.]
```

---

### Section 7: Conversion Metrics by Stage

**Purpose:** The numbers that describe the funnel. If the business doesn't track these, the documentation itself surfaces that as a gap.

**Word count target:** 200-300 words.

**Required structure:**

```markdown
## 7. Conversion Metrics by Stage

### The funnel

| Stage | Volume | Conversion to next stage | Notes |
|---|---|---|---|
| Inquiries received | [#/month or year] | — | |
| First response sent | [#/month or year, if different from inquiries] | [%] | If different from inquiries, response gap is itself a finding |
| Qualified leads | [#] | [%] | |
| Conversion event scheduled (tour/meeting/estimate) | [#] | [%] | |
| Conversion event completed (show-up) | [#] | [%] | |
| Verbal commitment | [#] | [%] | |
| Signed customer | [#] | [%] | |

### Overall inquiry-to-customer conversion rate

[Single number: of all inquiries that came in, what percent became paying customers?]

### Conversion rate by channel

[If tracked, break out conversion by lead source. This often reveals that high-volume channels are actually low-value.]

### Average revenue per closed customer

[For valuing each conversion]

### Notes on data quality

[Honest assessment of where these numbers come from. CRM data? Owner's recall? Estimate? Flag what's confident vs. what's a guess so the Measurement Framework (Document 12) can prioritize getting better data.]
```

**Industry-typical benchmarks (reference points, not targets):**
- **Wedding venue:** Inquiry-to-tour: 25-40%. Tour-to-booking: 50-70%. Overall inquiry-to-booking: 12-25%.
- **Contractor:** Inquiry-to-estimate: 50-70%. Estimate-to-job: 30-50%. Overall: 15-35%.
- **Preschool:** Inquiry-to-tour: 60-80%. Tour-to-enrollment: 40-70%. Overall: 25-55%.
- **Restaurant (private events):** Inquiry-to-walkthrough: 30-50%. Walkthrough-to-booking: 50-70%. Overall: 15-35%.
- **Professional services:** Inquiry-to-discovery call: 40-60%. Discovery-to-proposal: 60-80%. Proposal-to-close: 25-40%. Overall: 6-19%.

---

### Section 8: Seasonality and Capacity

**Purpose:** How the sales process changes by season, and where capacity constraints affect the funnel.

**Word count target:** 150-300 words.

**Required structure:**

```markdown
## 8. Seasonality and Capacity

### Inquiry volume by season

- **Peak inquiry months:** [Which months produce the most inquiries]
- **Low inquiry months:** [Which months are dead]
- **Booking lag from peak inquiry months:** [If inquiries peak in January but bookings happen in May, document the lag]

### Booking volume by season

- **Peak delivery months:** [When does the actual work/event happen]
- **Off-season:** [When is the business slow]

### Capacity constraints

- **What sells out first:** [Saturdays in October / weekday morning estimates / etc.]
- **What's chronically under-booked:** [Sundays / off-season / specific service types]
- **How the business handles the imbalance:** [Premium pricing for in-demand slots, discounts for under-booked slots, no action]

### Effect on response time

- **Response time during peak:** [How does it change?]
- **Response time during slow season:** [How does it change?]
- **Capacity issues during peak:** [Does the team get behind on follow-ups?]
```

---

### Section 9: Identified Bottlenecks and Opportunities

**Purpose:** Joshua's professional assessment of where the funnel leaks and what to fix first. This section is opinionated.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 9. Identified Bottlenecks and Opportunities

### Top 3 bottlenecks

For each:
- **The bottleneck:** [What's broken]
- **The evidence:** [How we know — secret shopper, CRM data, owner statement, observed pattern]
- **The cost:** [Estimated revenue impact — leads lost, deals not closed, time wasted]
- **The fix:** [Recommended remediation, which often becomes a line item in the Automation Spec Package]

### Quick wins (low effort, high impact)

[3-5 specific things that could be improved in the first 30 days of the engagement.]

### Structural changes (longer-term, higher impact)

[2-3 changes that require more time or investment but would meaningfully change the funnel.]

### Gaps the business doesn't know it has

[The findings the owner didn't expect. Often comes from secret shopper. Examples: "Owner thinks response time is 4 hours; secret shopper showed 36 hours weekday and 72 hours weekend." Or: "Owner thinks Instagram converts well; CRM shows 0% of Instagram inquiries booked in the last 6 months."]

### Things that are working that should be protected

[Things the business does well that shouldn't be changed in the name of optimization. Often: a particular team member's personal touch, a specific opening line in inquiry responses, a low-tech tool that works.]
```

---

## How to Build This Document

The full process, in order. Total time: 2-3 hours including client time.

### Step 1: Pre-Build Prep (15 minutes, Joshua)

Before doing any building:

1. Review the onboarding questionnaire (Q11–Q19 specifically — sales process questions)
2. Review the Brand Voice Guide (Document 01) and Business Facts Reference (Document 02) — they should already be in draft
3. Have the Sales Funnel Audit findings handy if one was done
4. Pull CRM access if granted

### Step 2: Run a Secret Shopper Test (30 minutes, Joshua)

This is the single most important data-gathering step. Before the discovery deep-dive call, submit a fake inquiry through the business's primary channel. Track:

1. What channel did you submit through?
2. What time of day?
3. When did you receive the first response?
4. What did the first response say?
5. Did it answer your stated question?
6. Did it ask qualifying questions?
7. Did it propose a clear next step?
8. Did it personalize at all or feel templated?
9. If you didn't reply, did you get a follow-up? When?
10. Was the experience consistent with the brand voice?

Keep a screenshot of the inquiry form, the response, and the timestamps.

### Step 3: Discovery Deep-Dive (15-20 minutes during the discovery call, or separate call)

Ask the owner to walk you through the most recent successful booking from first contact to signed contract. Note:

- Channel and date of inquiry
- Response time on first touch
- What was said and what was asked
- Number of touches before the next step
- What the next step was
- How the close happened
- How long total from inquiry to signed

Then ask: "Walk me through one that almost closed but didn't. What happened? Where did it fall apart?"

### Step 4: CRM/Inbox Review (30 minutes if access granted)

If granted CRM or inbox access, pull data on:
- Last 30 inquiries and their outcomes
- Average response times by day of week and time of day
- Conversion rates by channel
- Where in the funnel deals get stuck

If no CRM access, flag throughout the document where data is owner-recall vs. data-confirmed.

### Step 5: Draft Generation (30 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate a Sales Process Map for [Business Name] using Document Production Spec 03 as the structure. Industry: [industry].

Source materials:

[Paste: completed onboarding questionnaire]

[Paste: discovery call notes, particularly the recent-booking walkthrough]

[Paste: secret shopper test results with timing and screenshots referenced]

[Paste: CRM data summary if available]

[Paste: any sales materials the client provided — brochures, proposal templates, current email templates]

Build all 9 sections following the spec. Be honest about gaps — if the owner couldn't tell us a number or a process, write [NOT TRACKED] or [INCONSISTENT — see notes] instead of inventing.

Section 9 (Bottlenecks and Opportunities) is your assessment. Write it as Joshua would — direct, specific, prioritized by revenue impact.
```

### Step 6: Joshua Review (30-45 minutes)

Read the full draft. For each section, check:

- Section 2 (First Touch): Does this match what the secret shopper actually experienced?
- Section 7 (Metrics): Are the numbers real, owner-recall, or invented? Flag clearly.
- Section 9 (Bottlenecks): Are these the right top 3 bottlenecks? Are the recommended fixes specific enough to become Automation Spec Package line items?
- Throughout: Does anything in the document conflict with the Business Facts Reference? Resolve before delivery.

Edit directly.

### Step 7: Internal Use vs. Client Review Decision

Unlike Documents 01 and 02, this document is sometimes delivered to the client and sometimes used internally only. Decide:

- **Deliver to client** if: client is engaged in the diagnostic, wants visibility into the assessment, is paying for an audit-style engagement.
- **Internal only** if: this document is being used purely as input for the Automation Spec Package and Email Templates, and the findings will be communicated through other deliverables (like the Sales Funnel Audit report).

Default: deliver to client. Transparency builds trust and gives the client visibility into the work.

### Step 8: If Delivering, Client Review (30 minutes client time)

Send to client with this email:

```
Subject: Sales Process Map — your funnel as it exists today

Attached: the Sales Process Map for [Business Name].

This is the most direct document I'll send you. It describes how your sales process actually works today, including where it leaks. Some of this won't surprise you. Some of it will.

Read Section 9 (Bottlenecks and Opportunities) first. That's where the dollars are.

If anything is wrong, mark it. If anything is right but uncomfortable, that's the point — we can't fix what we can't see.

This document becomes the reference for the automations and email templates we build next.
```

### Step 9: Final Edits and Delivery (15 minutes)

- Apply client edits
- Save with naming convention `[client-slug]-03-sales-process-v1.0.md`
- Upload to client's Claude Project as knowledge

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 9 sections are complete
- [ ] Lead Sources section has volume estimates and quality assessment for each active channel
- [ ] First Touch section is informed by an actual secret shopper test, not just owner-stated process
- [ ] Conversion Event section includes show-up rate and event-to-customer conversion rate (or flags as not tracked)
- [ ] Follow-Up Cadence section honestly documents the current cadence even if the answer is "there is no cadence"
- [ ] Conversion Metrics section distinguishes data-confirmed numbers from owner-recall numbers
- [ ] Bottlenecks section names a specific top 3 with evidence, cost estimate, and recommended fix
- [ ] Quick wins are specific enough to become action items
- [ ] Cross-reference pass against Business Facts Reference is complete (no factual conflicts)
- [ ] Client has reviewed and approved (if delivering)
- [ ] File is saved with correct naming convention and uploaded to client's Claude Project

---

## Common Failure Modes

When this document is wrong, it's usually because of one of these:

**Failure 1: Owner-stated process is documented as fact.** The owner says they respond in 2 hours; the secret shopper proves it's 36. Documenting the owner's version creates downstream problems. Fix: always run a secret shopper before delivering.

**Failure 2: Conversion metrics are invented.** The owner doesn't know their conversion rate, so a number gets estimated to fill the field. That number then becomes the baseline for measurement. Fix: write [NOT TRACKED] explicitly. Establishing the baseline is itself a deliverable.

**Failure 3: "Quick wins" are vague.** "Improve response time" is not a fix. "Deploy AI auto-responder triggered by HoneyBook inquiry webhook with 60-second response time" is a fix. Fix: every quick win must be specific enough to become a project.

**Failure 4: Section 9 is too gentle.** The document needs to surface uncomfortable findings. If the bottlenecks section reads like a polite suggestion, it won't drive change. Fix: write Section 9 as Joshua would say it directly — specific, evidenced, prioritized by dollars.

**Failure 5: Channel mix doesn't match reality.** Owner says 30% comes from referrals; CRM data shows 60%. The percentages get used downstream for budget allocation. Fix: cross-check owner-stated channel mix against any available data and flag discrepancies.

**Failure 6: No bottlenecks identified.** Every business has bottlenecks. If the document concludes "everything is working well," the diagnostic was too shallow. Fix: keep digging until at least 2-3 real bottlenecks surface.

**Failure 7: The document describes ideal process instead of current process.** "When an inquiry comes in, our team immediately reviews and responds with personalized information" — this is aspirational, not factual. Fix: every line in Sections 2-6 must describe what actually happens today.

---

## Worked Example: Audrey's Farmhouse Sales Process Map

The following is a complete sample of what a finished Sales Process Map looks like. Use this as a pattern reference when building one for a new client.

---

# Audrey's Farmhouse Sales Process Map

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last process audit:** April 2026, Joshua + secret shopper test

**For:** Inquiry response automation, follow-up sequences, lead scoring, CRM configuration, sales funnel audits, conversion improvement work.

**Companion documents:**
- Document 02: Business Facts Reference (the facts referenced at each stage)
- Document 07: FAQ and Common Questions Bank (the answers used at each stage)
- Document 08: Email and Communication Templates (the actual language used at each stage)
- Document 10: Automation Spec Package (where this map gets operationalized)
- Document 12: Measurement and KPI Framework (where this map's metrics get tracked)

**Critical principle:** This document describes what actually happens, not what the owner wishes happened.

---

## 1. Lead Sources and Channel Mix

### Active inbound lead sources

**Website contact form (audreysfarmhouse.com)**
- Volume: ~25-35 inquiries per month
- Percentage of total inbound: ~45%
- Quality assessment: High. Highest converting channel.
- Cost: Free (organic + some Google Ads driving traffic to the site)
- Where the inquiry lands: HoneyBook + email notification to booking@audreysfarmhouse.com
- Who sees it first: Booking coordinator

**The Knot inquiry form**
- Volume: ~15-25 per month (peaks in Jan-Feb during engagement season)
- Percentage of total inbound: ~25%
- Quality assessment: Medium. Lower conversion than website (couples are inquiring to many venues at once).
- Cost: $695/month listing fee + lead-gen package
- Where the inquiry lands: The Knot dashboard + email forward to booking@audreysfarmhouse.com
- Who sees it first: Booking coordinator

**Instagram DM**
- Volume: ~10-15 per month
- Percentage of total inbound: ~15%
- Quality assessment: Mixed. Quality varies wildly. Some are serious inquirers using DM as an easy contact channel; many are early-stage browsers.
- Cost: Free
- Where the inquiry lands: Instagram inbox; checked 2-3 times per day
- Who sees it first: [Owner] checks DMs personally

**Planner/Vendor referrals**
- Volume: ~5-10 per month
- Percentage of total inbound: ~10%
- Quality assessment: Highest. Conversion rate is roughly 2x other channels.
- Cost: Relationship maintenance, occasional vendor dinners
- Where the inquiry lands: Direct email to booking coordinator or referral via planner-introduced phone call
- Who sees it first: Booking coordinator

**Past-couple referrals**
- Volume: ~3-5 per month
- Percentage of total inbound: ~5%
- Quality assessment: Highest. Almost always books if the date is available.
- Cost: Free
- Where the inquiry lands: Various — usually email with a referral mention
- Who sees it first: Booking coordinator

### Inactive lead sources

- WeddingWire listing — paused in 2024 due to overlap with The Knot ownership and weak ROI
- Zola — never used; could be added

### Lead sources NOT being used

- Junebug Weddings — vendor application has been filed; awaiting approval
- TikTok — owner has chosen not to invest in TikTok content
- Paid Instagram ads — tested in 2024, low conversion, paused

### Lead source observations

Referrals (planner + past couples) are 15% of leads but a much higher percentage of bookings — likely 30-35%. The Knot brings volume but the lowest quality. Website is the workhorse. Instagram DM is undermanaged because the owner handles it personally and inconsistently.

---

## 2. First Touch — What Happens When an Inquiry Arrives

### The actual current process

1. Inquiry arrives via website form or The Knot
2. HoneyBook automatically sends a generic auto-confirmation: "Thanks for reaching out, we'll be in touch within 48 hours."
3. Booking coordinator sees the notification in HoneyBook within 1-4 hours during business hours (M-F 9am-5pm ET)
4. Coordinator checks the requested date against the calendar
5. Coordinator writes a personalized response with: availability for the date, season-appropriate pricing, an invite to schedule a tour
6. Customer receives the personalized response within 4-12 business hours of the inquiry

### Average response time

- **By channel:**
  - Website + HoneyBook: 4-12 business hours
  - The Knot: Same (forwarded to same inbox)
  - Instagram DM: 12-48 hours, highly variable (depends on owner's day)
- **By time of day:**
  - Inquiries arriving Mon-Thu morning: ~4 hours
  - Inquiries arriving Friday after 2pm: Not addressed until Monday
  - Weekend inquiries: Not addressed until Monday morning
- **By season:**
  - Peak (May-June, Sept-Oct): Response time stretches to 12-24 business hours
  - Slow (Dec-Feb): Response time tightens to under 2 hours

### Who responds and what they say

- **Primary responder:** Booking coordinator
- **Backup responder:** Owner (rarely steps in, only when coordinator is on vacation)

**What they say (current first-touch message):**
The current template is reasonably warm and includes:
- Availability for the requested date
- Pricing for the relevant season/day type
- Invitation to schedule a tour with two specific upcoming Saturdays offered
- Note about the in-house catering and on-site lodging

**What they ask:**
- Guest count estimate
- Any flexibility on dates
- Whether they're already working with a planner

**What they include:**
- Pricing for the requested date type (Saturday/Friday/Sunday/weekday)
- A link to the website's gallery
- A note about the next two open tour dates

### What's working in the first touch

The personalized response itself is good. The booking coordinator writes well, the pricing is shared upfront, and there's a clear next step (scheduling a tour). The brand voice is consistent.

### What's broken or weak

**Response time is the single biggest issue.** Industry data shows venues that respond within 1 hour book 7x more often than those responding after 24 hours. Audrey's currently averages 4-12 business hours on weekdays and 36-72 hours on weekend inquiries. Couples have typically inquired to 5+ venues at the same time; by the time Audrey's responds, they've already had tours scheduled with 2-3 competitors.

**The HoneyBook auto-confirmation is generic** and provides no value. It just confirms receipt. A 60-second AI-generated personalized response would be a step-change improvement.

**Instagram DM is undermanaged.** The owner handles it personally and inconsistently. This is the channel with the highest opportunity for improvement.

### Drop-off rate at first touch

- **Inquiries that go cold after first response (no reply from prospect):** ~40% (estimated; not formally tracked)
- **Common reasons identified for cold drop-off:**
  - Already had tours booked with competitors who responded faster
  - Pricing was higher than expected
  - Date was already booked and no alternative date worked

---

## 3. Qualification and Nurture

### Lead qualification criteria

**Qualified lead criteria:**
- Date is in the available booking window (under 18 months out)
- Guest count is in the 60-200 range
- Couple is willing to consider a Hudson Valley location (some leads are confused by venue search algorithms and end up inquiring from Long Island, NJ, or Connecticut without intent to travel)
- Couple is open to in-house catering (some have a specific outside caterer they want to use, which is a hard no)

**Disqualified lead criteria:**
- Guest count under 30 (suggest weekday microwedding instead) or over 200 (refer out)
- Date inside 60 days (rare exceptions, but generally cannot accommodate)
- Demanding outside catering
- Booking timeline more than 18 months out (calendar isn't open)

**How disqualified leads are handled:**
- Polite decline with reason
- Referral to an alternative venue when possible (the booking coordinator keeps a short list of venues that handle 200+ or sub-30 well)
- For "too far out" leads, a note to follow up when the calendar opens

### Information gathered before the next step

- Estimated guest count
- Date(s) of interest with flexibility
- Whether they have a planner
- General sense of vision/style (helps with the tour)

### Tools used in this stage

- HoneyBook (CRM, inquiry intake, contracts, payments)
- Google Calendar (booking calendar)
- Cal.com (tour scheduling — recently added, partial adoption)

### Common reasons leads stall here

- The pricing comes back, the prospect goes silent, and there's no follow-up cadence to bring them back
- The tour scheduling is partly manual (back-and-forth on times) which adds friction
- Couples want to talk to their partner before scheduling and there's no nurture mechanism for the gap

### Average time from first response to next step

- Tour scheduled within 1 week of first response: ~50% of qualified leads
- Tour scheduled within 2-3 weeks: ~20%
- Never scheduled (lead goes cold): ~30%

---

## 4. The Conversion Event

The conversion event is the **property tour**.

### Format and length

- **Format:** In-person, on-site at the property
- **Length:** 75-90 minutes
- **Location:** Audrey's Farmhouse property, Wallkill NY

### Who runs it

- **Primary:** Booking coordinator
- **Backup:** Owner (when coordinator is unavailable)

### Scheduling process

- **How it gets scheduled:** Mostly manual back-and-forth via email; partially through Cal.com
- **Typical lead time before the event:** 1-3 weeks
- **Confirmation cadence:** Confirmation email at booking, reminder email 48 hours before, no day-of confirmation
- **Show-up rate:** ~85% (couples who travel from NYC are highly committed; local browsers are lower)
- **No-show handling:** Single follow-up email offering to reschedule. No further pursuit if no response.

### Prep done before the event

- **By the responder:** Reviews the inquiry notes, checks calendar for date availability, prepares pricing scenario for the couple's specific guest count and date type
- **Materials sent to the prospect beforehand:** Confirmation email with directions and parking note. No pricing sheet, brochure, or planning timeline sent in advance.
- **Information collected from the prospect beforehand:** Guest count, date, planner status

### Standard agenda / structure of the tour

1. Welcome and walk to the ceremony lawn (10 min)
2. Walk through the barn (reception space) (15 min)
3. Walk through the farmhouse and kitchen (15 min)
4. Tour the cottage and carriage house lodging (15 min)
5. Sit-down at the farmhouse great room with pricing and detailed Q&A (20-25 min)
6. Walkout and informal continued conversation (5-10 min)

### What the prospect typically leaves with

- Verbal pricing for their specific date and guest count
- A printed pricing sheet (custom-printed for their inquiry)
- An offer to hold the date for 7 days while they think it over
- A clear next step (sign contract or follow-up call within 7 days)

### What the responder leaves with

- Updated qualification level (highly likely / lukewarm / unlikely)
- Identified objections (budget, partner not at tour, comparison venues, scope concerns)
- Note on whether the date should be soft-held

### Conversion rate from this event

- **Tour-to-booking conversion rate:** ~62% (estimated from HoneyBook; not formally tracked but coordinator's recall)
- **Common reasons prospects don't convert after tour:**
  - Pricing higher than expected (~35% of non-converts)
  - Wanted to compare with other venues already toured (~30%)
  - Partner/family had concerns after tour (~20%)
  - Date no longer worked due to vendor or guest constraints (~15%)

---

## 5. The Close

### What "close" means for this business

A booking is closed when the contract is signed AND the 25% deposit is received.

### Steps from verbal commitment to closed customer

1. Coordinator sends contract via HoneyBook within 48 hours of verbal yes
2. Date is soft-held for 7 days while contract is reviewed
3. Couple reviews contract (often with parents or planner)
4. Couple signs via HoneyBook e-signature
5. 25% deposit paid via HoneyBook (ACH or credit card with 3% surcharge)
6. Welcome email sent with planning timeline and next-step calendar invites
7. Date moves from "held" to "booked" in the calendar

### Tools used in the close

- **Proposal/contract tool:** HoneyBook
- **E-signature:** HoneyBook
- **Payment processor:** HoneyBook (ACH or credit card)
- **CRM update:** HoneyBook automatically updates stage

### Average time from "yes" to signed

- 5-10 days for most couples
- 14-21 days when contract requires legal review (rare, usually high-net-worth couples or attorneys-as-clients)

### Drop-off between verbal yes and signed

- **% of verbal yeses that don't convert:** ~10% (couples cool off, find a different venue, partner pulls back)
- **Common reasons:** Cold feet, partner wasn't on board, found a venue that responded faster after the tour
- **What's done to reduce this drop-off:** Soft-touch follow-up email at day 5 if contract isn't signed. No further follow-up after day 10.

### What's included with the close

- Welcome packet (PDF) with planning timeline
- Calendar invite for menu tasting at 4 months out
- Calendar invite for final walkthrough at 30 days out
- Contact info for Megan (day-of coordinator)

---

## 6. Follow-Up Cadence for Stalled Leads

### Current follow-up cadence

**After first response with no reply:**
- Follow-up 1: Day 7, brief email — "Just checking in on the date below. Want me to hold it while you decide?"
- Follow-up 2: None typically sent
- Stop point: After Follow-up 1 if no reply, lead is moved to archive

**After tour with no booking:**
- Follow-up 1: Day 3 — "Great meeting you Saturday. Wanted to follow up on the date. Holding it for another 4 days if you want it."
- Follow-up 2: Day 10 if still no reply — short email releasing the hold but offering to revisit
- Stop point: After Follow-up 2

**After verbal yes with no signed contract:**
- Follow-up 1: Day 5 — "Hey, just wanted to make sure the contract didn't get lost. Anything you want to talk through before signing?"
- Follow-up 2: Day 10 if still no signed contract — releases the hold
- Stop point: After Follow-up 2

### Channels used for follow-up

- Email only. Phone calls feel pushy for the customer base. SMS is not used.

### Lost-deal handling

- **What's done when a deal is officially lost:** Polite acknowledgment email; archive in HoneyBook
- **Long-tail nurture:** None currently. No newsletter. No annual touches. Lost deals are not re-engaged.

### Re-engagement of past customers

- Anniversary touches: None
- Referral asks: None systematically; relies on couples referring organically
- Vow renewal or anniversary booking opportunities: Not currently pursued

### Gaps in current follow-up

**The biggest gap is between first response and tour.** ~30% of qualified inquiries never schedule a tour, and there is no follow-up beyond the single 7-day check-in. A 3-touch nurture sequence (day 7, day 14, day 30) would likely recover 8-12% of those leads — meaningful at the volume Audrey's runs.

**The second biggest gap is the no follow-up cadence for past couples and lost deals.** Past couples are the highest-quality referral source and there's no system for staying in front of them. Lost deals are completely abandoned even though couples sometimes change their minds, have engagement parties or vow renewals later, or refer friends.

---

## 7. Conversion Metrics by Stage

### The funnel

| Stage | Volume | Conversion to next stage | Notes |
|---|---|---|---|
| Inquiries received | ~75/month average | — | Estimate; varies by season |
| First response sent | ~75/month | 100% | All inquiries get a response |
| Qualified leads | ~50/month | 67% | Excludes too-small, too-large, wrong region |
| Tour scheduled | ~30/month | 60% | Of qualified leads |
| Tour completed (show-up) | ~25/month | 85% | Of scheduled |
| Verbal yes | ~16/month | 62% | Tour-to-verbal conversion |
| Signed customer | ~14/month | 87% | ~10% drop-off between verbal and signed |

### Overall inquiry-to-customer conversion rate

~19% (14 booked / 75 inquired) — slightly above wedding venue industry average of 12-25%.

### Conversion rate by channel

Not formally tracked. Coordinator's recall:
- Website: ~25% inquiry-to-book
- The Knot: ~10-12% inquiry-to-book
- Instagram DM: ~8-10%
- Planner referral: ~50%+
- Past-couple referral: ~70%+

### Average revenue per closed customer

~$32,000 all-in (venue + catering + bar + lodging average)

### Notes on data quality

Most metrics in this section are coordinator recall and estimate from HoneyBook data, not formal tracking. Establishing real funnel-stage tracking is a Phase 1 deliverable for Document 12 (Measurement Framework).

---

## 8. Seasonality and Capacity

### Inquiry volume by season

- **Peak inquiry months:** January–February (engagement season post-holidays), September (couples planning for next October)
- **Low inquiry months:** July–August, December
- **Booking lag from peak inquiry months:** January inquiries typically book for the following October (10-month lag); September inquiries typically book for the following October (13-month lag)

### Booking volume by season

- **Peak delivery months:** Late May, June, September, October
- **Off-season:** December–March (limited bookings, mostly elopements)

### Capacity constraints

- **What sells out first:** Saturdays in late September and October. By March of the prior year, peak Saturdays are 70%+ booked.
- **What's chronically under-booked:** Weekday microweddings (capacity is fine; demand is low). Friday weddings in shoulder season.
- **How the business handles the imbalance:** Premium pricing on peak Saturdays; discount on Friday/Sunday and weekday formats. Has not yet pursued targeted marketing for under-booked slots.

### Effect on response time

- **Response time during peak:** Stretches from 4-12 hours to 12-24 hours
- **Response time during slow season:** Tightens to under 2 hours
- **Capacity issues during peak:** Coordinator is at capacity for tours and follow-ups; some tour requests get delayed by 2-3 weeks

---

## 9. Identified Bottlenecks and Opportunities

### Top 3 bottlenecks

**Bottleneck 1: First-touch response time.**
- The bottleneck: 4-12 business hour response time on weekday inquiries; 36-72 hour response on weekends. Industry best is sub-1-hour automated personalized response.
- The evidence: Secret shopper test on April 8, 2026 — Saturday inquiry, response received Tuesday morning at 11am (~67 hours later).
- The cost: Conservative estimate — losing 4-6 qualified leads per month to faster competitors. At ~$32K average revenue and ~14% close rate on qualified leads, that's $18-27K in lost revenue per month, or $216-324K per year.
- The fix: Deploy AI-powered auto-responder triggered by HoneyBook inquiry webhook. Personalized response within 60 seconds including availability, pricing, and tour scheduling link. (Spec'd in Document 10.)

**Bottleneck 2: No follow-up nurture between first response and tour.**
- The bottleneck: ~30% of qualified leads never schedule a tour, and there's only a single 7-day check-in.
- The evidence: HoneyBook data shows ~50% of qualified leads schedule within a week, ~20% within 2-3 weeks (typically after a single follow-up), and ~30% never schedule. The 30% is the recoverable group.
- The cost: Recovering even 1/3 of the 30% lost group at current close rates is ~3 additional bookings per month — roughly $96K/year in revenue.
- The fix: Build a 3-touch nurture sequence — day 7, day 14, day 30 — with progressively softer asks. (Spec'd in Document 10.)

**Bottleneck 3: No long-tail nurture for past couples or lost deals.**
- The bottleneck: After a wedding ends or a lead is lost, there is zero ongoing communication.
- The evidence: No newsletter, no anniversary touches, no referral asks, no re-engagement of lost deals.
- The cost: Past couples are the highest-quality referral source. Generating 3-5 additional referrals per year at 70% close rate is $70-115K of revenue. Re-engagement of lost deals (vow renewals, anniversary parties, referrals to friends) is harder to size but materially nonzero.
- The fix: Quarterly newsletter, annual anniversary touch with referral ask, lost-deal reactivation sequence at 6 and 12 months. (Spec'd in Document 10.)

### Quick wins (low effort, high impact)

1. Replace the generic HoneyBook auto-confirmation with a personalized AI-generated response within the first 60 minutes of an inquiry. (1 week to build, immediate impact)
2. Add a Cal.com link to every first-touch response so couples can self-schedule tours without back-and-forth. (1 day to build)
3. Move Instagram DM management out of the owner's phone and into a shared system the booking coordinator can also access. (1 week of process change)
4. Add a confirmation reminder email 24 hours before each scheduled tour. (HoneyBook automation, 1 hour to build)
5. Build the day-3-after-tour follow-up as a HoneyBook automation rather than relying on coordinator memory. (2 hours to build)

### Structural changes (longer-term, higher impact)

1. Build the AI auto-responder + 3-touch nurture sequence as a unified system (Bottleneck 1 + 2). 4-6 weeks. ROI estimate: $300K+/year.
2. Build a measurement system (HoneyBook + analytics) so conversion by channel and conversion by funnel stage are formally tracked. 2-3 weeks. Enables every other optimization.
3. Add a long-tail nurture system for past couples and lost deals (Bottleneck 3). 4 weeks. ROI estimate: $100K+/year.

### Gaps the business doesn't know it has

- The owner believes weekday response time is 2-4 hours. Secret shopper proved 4-12 hours.
- The owner believes The Knot conversion is "decent." Actual conversion is ~10-12% — among the lowest of any channel.
- The owner believes Instagram DM is well-managed. In practice, response times are 12-48 hours and inconsistent.
- The owner did not know that ~30% of qualified leads never schedule a tour.

### Things that are working that should be protected

- The booking coordinator writes excellent personalized responses. The personalization should not be lost when the AI auto-responder is deployed — the AI should match her voice, not replace it.
- The tour itself is high-converting at ~62%. Don't change the tour structure or who runs it.
- Pricing is shared upfront in the first response. Don't move to a "schedule a call to discuss pricing" model — couples appreciate the directness.
- The owner's personal touch on planner relationships. Don't automate planner relationship maintenance.

---

## End of Worked Example

The example above is a complete reference Sales Process Map. Use this as the quality bar for any new client. The most important thing this document does is surface uncomfortable truths the owner doesn't already know — if the document doesn't include any "the owner didn't know this" findings, the diagnostic was too shallow.
