# Document Production Spec 02: Business Facts Reference

## What This Spec Is

This is the production specification for Document 2 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The Business Facts Reference is the accuracy layer of the AI Operating System. Every factual claim made by an AI tool, a chatbot, an automated email, or a piece of generated content gets verified against this document. If the Brand Voice Guide controls how things sound, this document controls whether what's being said is true.

When this document is wrong, the chatbot tells couples the venue holds 250 when it holds 180, the auto-responder quotes 2024 prices, and the AI-generated blog post invents a vendor policy that doesn't exist. Those mistakes are unrecoverable in client trust.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 02 of 12 |
| **Priority** | Critical (accuracy depends on this) |
| **Total length target** | 1,500-3,000 words (longer than the original 1,000-2,000 estimate; complete is more valuable than concise here) |
| **Total time to produce** | 2-3 hours |
| **Joshua's time** | 1 hour |
| **Claude's time** | 30 minutes |
| **Client's time** | 30-45 minutes (questionnaire + fact-check pass) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-02-business-facts.md` |
| **Foundation for** | Documents 7 (Email Templates), 8 (Social Media Playbook), 10 (Automation Spec Package — every AI prompt that needs to state a fact), and the FAQ Bank (Document 7) |

---

## When This Document Gets Built

**Phase 1 of engagement, Week 1.** Built in parallel with the Brand Voice Guide. Doesn't depend on the Brand Voice Guide being finished, but needs to be in place before any AI-generated content goes out.

**Triggers:** Onboarding questionnaire submitted, discovery call complete.

**Blocks:** Any chatbot deployment, any AI email auto-responder, any AI-generated content that includes factual claims about the business.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required. Sections marked OPTIONAL apply only to specific business categories — skip them if not relevant, don't pad them with empty fields.

### Header Block

```markdown
# [Business Name] Business Facts Reference

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last fact-check:** [Month Year, by whom]
**Next scheduled fact-check:** [Month Year — quarterly default]

**For:** Inquiry responses, chatbot accuracy, content that includes factual claims, automated email content, AI-generated blog and social posts.

**Companion documents:**
- Document 01: Brand Voice Guide (how this information is communicated)
- Document 07: FAQ and Common Questions Bank (pre-approved framings of these facts)
- Document 10: Automation Spec Package (where these facts get used in automated systems)

**Critical rule:** Anything an AI tool says about this business should be verifiable against this document. If a fact isn't here, the AI tool should say "I don't have that information" — never invent.
```

**Word count:** 100-150 words. The "critical rule" line is non-negotiable; it's what gets pasted into Claude Project instructions.

---

### Section 1: Identity and Contact

**Purpose:** The basic name, address, contact, and identity facts that appear in every customer interaction.

**Word count target:** 100-200 words. Structured fields, not prose.

**Required fields:**

```markdown
## 1. Identity and Contact

- **Legal business name:** [As registered]
- **Public-facing name:** [What customers call it — may differ from legal]
- **DBA / sub-brands / sister properties:** [If applicable]
- **Category:** [Wedding venue / contractor / preschool / restaurant / professional services / etc.]
- **Sub-category:** [More specific — e.g., "Boutique multi-venue hospitality property" or "Residential general contractor specializing in kitchen and bath remodels"]
- **Year established:** [Year]
- **Brief history:** [2-3 sentences. Just the facts of how the business came to exist.]
- **Primary address:** [Full address]
- **Mailing address (if different):** [Address]
- **Service area:** [Geographic — by city, county, mile radius, or service zone]
- **Main phone:** [Number]
- **Main email:** [Address]
- **Website:** [URL]
- **Google Business Profile:** [URL or "Not yet claimed" / "Claimed and active"]
- **Social media:** [Each handle on each platform the business uses]
- **Hours of operation:** [Days, times. If by appointment, say so.]
- **Tax ID / EIN (internal use only):** [Not for public-facing AI prompts]
```

**Industry adaptation:**
- **Wedding venue:** Hours may not apply traditionally — list "By appointment for tours, [days/hours]" instead of standard business hours.
- **Contractor:** Service area is critical. Be specific about miles or counties served. List separately if the business has different service areas for different types of work.
- **Preschool:** Hours include drop-off windows, pickup windows, after-care availability.
- **Restaurant:** Hours are critical and must distinguish lunch vs. dinner vs. brunch service. Note kitchen close times separately from venue close times.
- **Professional services:** "Hours" often becomes "Availability" — meeting hours vs. work hours vs. emergency response hours.

---

### Section 2: People

**Purpose:** Who works here, in what role, and who handles what. AI tools should never invent a contact person or guess at who handles a question.

**Word count target:** 150-300 words.

**Required fields:**

```markdown
## 2. People

### Ownership
- **Owner(s):** [Name(s), brief role description]
- **Founding story (if relevant):** [1-2 sentences if the founder story is part of the brand]

### Key team members
For each person customers might interact with:
- **Name:** [Full name]
- **Role:** [Title and one-sentence description of what they handle]
- **Direct contact (if shared publicly):** [Email or extension]
- **What they handle:** [Specific scope — e.g., "All inquiries from couples in the booking conversation; not the day-of coordinator"]

### Who customers should NOT be routed to
[Sometimes important — e.g., "Don't route inquiries to the owner; route to the booking coordinator." Or "The chef doesn't take catering inquiries — the events manager does."]

### Pronunciation guide (optional)
[For names AI voice tools might mispronounce, or for the business name itself if it's commonly mispronounced.]
```

**Industry adaptation:**
- **Wedding venue:** Often includes the on-site coordinator, the kitchen/catering lead, the property owner. Distinguish who handles inquiries vs. who runs the day.
- **Contractor:** Often includes the owner-operator, project managers, lead carpenter or foreman. Distinguish who quotes vs. who runs jobs.
- **Preschool:** Director, lead teachers by classroom, admissions person. Critical to be clear who handles tours vs. enrollment vs. tuition vs. classroom questions.
- **Restaurant:** Owner, executive chef, general manager, events manager. Distinguish who handles reservations vs. private events vs. press.
- **Professional services:** Principals/partners, associates, admin/operations contact. Distinguish who's billable vs. who handles scheduling and admin.

---

### Section 3: What the Business Sells / Does

**Purpose:** A complete, fact-based description of products and services. This is where AI tools verify claims like "we offer X" or "we do Y."

**Word count target:** 300-600 words.

**Required structure:**

```markdown
## 3. What the Business Sells / Does

### Core offerings
For each primary service or product line:
- **Name:** [What this is called publicly]
- **What it includes:** [Specific deliverables, components, or scope]
- **What it does NOT include:** [Critical for managing expectations and preventing AI from over-promising]
- **Typical use case:** [When a customer would buy this]
- **Typical price range:** [If publicly shareable — see Section 4 for full pricing]

### Secondary or add-on offerings
[Same structure, but for things that complement the core offerings.]

### Things customers commonly ask for that we DON'T do
[This is where AI tools get into trouble. If the business doesn't do destination weddings, doesn't take projects under $10K, doesn't accept walk-ins, doesn't host events on Sundays — list it here.]

### Things we used to do but no longer offer
[If relevant. AI tools trained on older website data might still reference these.]
```

**Industry adaptation:**
- **Wedding venue:** Core offerings = the venue rental tiers (full weekend, day-of, elopement, microwedding, corporate). Add-ons = catering tiers, bar packages, lodging, rehearsal dinner add-ons, day-of coordination.
- **Contractor:** Core offerings = the project types (kitchen remodel, bath remodel, addition, full renovation). Add-ons = design services, project management, warranty extensions.
- **Preschool:** Core offerings = the programs by age (infant, toddler, preschool, pre-K). Add-ons = after-care, summer programs, enrichment classes.
- **Restaurant:** Core offerings = dinner service, lunch service, brunch, private events, catering (if offered). Add-ons = wine pairings, private dining rooms, off-site events.
- **Professional services:** Core offerings = the engagement types (consulting, project work, retainer, audit, training). Add-ons = workshops, expert testimony, ongoing advisory.

---

### Section 4: Pricing

**Purpose:** The pricing facts the AI is allowed to share. This is one of the highest-stakes sections; getting this wrong creates real customer-facing problems.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 4. Pricing

### What's publicly shareable
[List pricing the AI can quote without restriction. Include base prices, package prices, ranges, and any starting-from figures the business publishes.]

For each shareable price:
- **What:** [Service/product name]
- **Price:** [Exact figure or range]
- **What's included:** [Specifics]
- **What's NOT included:** [Critical for accuracy]
- **Conditions / variables:** [What makes this price change — season, day of week, guest count, scope]

### What's NOT publicly shareable
[List anything customers ask about that the business doesn't quote without a conversation. Examples: custom project pricing, enterprise rates, anything that requires a discovery call before a number is given.]

For each non-shareable item, include:
- **What customers ask:** [The question they typically use]
- **What the AI should say instead:** [The exact deflection — e.g., "Pricing for catering varies by menu and guest count. The fastest way to get an accurate quote is to share your guest count and date, and I'll connect you with [Name]."]

### Seasonal or time-based pricing
[If pricing changes by season, day of week, time of year, or any predictable variable, document it here as a structured table.]

### Discounts, promotions, and exceptions
[Any standing discounts — preferred vendor pricing, off-season rates, multi-service discounts. Also: discounts the business does NOT offer (e.g., "We don't discount for cash payment" or "We don't price-match competitors").]

### Last pricing update
[Date the pricing was last reviewed. Quarterly minimum.]
```

**Industry adaptation:**
- **Wedding venue:** Almost always has tiered pricing by day of week and season. Almost always has a separate fee structure for catering, bar, lodging, and add-ons. The "what's included / not included" lines are critical.
- **Contractor:** Usually doesn't share pricing publicly except for ranges or starting-from figures. Be very clear about what triggers a real quote.
- **Preschool:** Tuition is typically published. Often includes registration fee, materials fee, after-care fee, and various other line items. List each.
- **Restaurant:** Menu pricing is published; private event pricing usually is not. Distinguish.
- **Professional services:** Rate cards, package pricing, retainer minimums. Often the AI's job is to qualify the lead before quoting.

---

### Section 5: Capacity, Scope, and Capabilities

**Purpose:** The size and scale facts. How big a project, how many people, how many at once.

**Word count target:** 200-400 words.

**Required structure varies more by industry than other sections.** Use the industry-specific template below.

#### Wedding venue version:

```markdown
## 5. Capacity, Scope, and Capabilities

### Event capacity
- **Ceremony capacity (seated):** [Number]
- **Reception capacity (seated):** [Number]
- **Reception capacity (standing/cocktail):** [Number]
- **Capacity by space:** [If multiple spaces — list each space and its capacity]

### Lodging (if applicable)
- **Total guest rooms on site:** [Number]
- **Breakdown by building/type:** [List]
- **Maximum overnight guests:** [Number]
- **Pet policy in lodging:** [Detail]

### Event types hosted
- **Yes:** [Wedding, corporate retreat, milestone birthday, etc.]
- **No:** [Whatever the venue doesn't do]

### Schedule and availability
- **Number of events per weekend:** [One per weekend? One Saturday + one Sunday? Multiple?]
- **Booking lead time (typical):** [How far out couples typically book]
- **Booking lead time (minimum):** [Soonest the venue will take a date]
- **Blackout dates:** [Holidays, owner's vacation, off-season]
```

#### Contractor version:

```markdown
## 5. Capacity, Scope, and Capabilities

### Project size range
- **Minimum project size:** [Dollar amount or scope description]
- **Maximum project size handled in-house:** [Dollar amount or scope]
- **Sweet-spot project size:** [Where the business is most competitive]

### Project types
- **Yes — we do:** [Specific list]
- **No — we don't:** [Specific list]
- **Sometimes — depends on:** [Conditional offerings]

### Capacity / pipeline
- **Active projects at one time:** [Typical number]
- **Lead time before a new project starts:** [How booked is the calendar]
- **Crew size and structure:** [Self-perform vs. subcontract]

### Geographic capacity
- **Standard service area:** [Miles or counties]
- **Will extend beyond standard for:** [Conditions — minimum project size, etc.]
```

#### Preschool version:

```markdown
## 5. Capacity, Scope, and Capabilities

### Enrollment capacity
- **Total licensed capacity:** [Number]
- **Capacity by classroom/age group:** [Breakdown]
- **Current enrollment:** [Number; flag as time-sensitive]
- **Waitlist status by age group:** [Open / closed / X months]

### Programs offered
- **Age groups served:** [Range]
- **Schedule options:** [Full-day, half-day, 5-day, 3-day, etc.]
- **Calendar:** [Year-round vs. school-year, breaks, holidays]

### Ratios
- **Student-to-teacher ratios by age group:** [Per state regs and per school policy]
```

#### Restaurant version:

```markdown
## 5. Capacity, Scope, and Capabilities

### Seating
- **Total seats:** [Number]
- **By area:** [Main dining, bar, patio, private dining]
- **Largest party seated together:** [Number]

### Reservations
- **Reservations accepted:** [Yes / no / for parties of X+]
- **Reservation platform:** [OpenTable, Resy, in-house, phone only]
- **Walk-ins:** [Yes / no / wait time average]

### Private events
- **Buyout capacity:** [Number]
- **Private dining room capacity:** [Number]
- **Off-site catering capability:** [If offered]
```

#### Professional services version:

```markdown
## 5. Capacity, Scope, and Capabilities

### Engagement capacity
- **Active clients at one time (typical):** [Number or range]
- **Currently accepting new clients:** [Yes / waitlist / no]
- **Lead time before a new engagement starts:** [Weeks/months]

### Engagement types
- **Yes — we take on:** [Specific list]
- **No — we don't:** [Specific list]
- **By exception only:** [Conditional]

### Geographic / industry / size restrictions
- [Any limits on who they'll work with]
```

---

### Section 6: Operations and Logistics

**Purpose:** The "how does this work" facts that come up constantly in customer questions and that AI tools need to answer accurately.

**Word count target:** 300-600 words. This section is often the longest because operational detail varies most by business.

**Required structure (universal core):**

```markdown
## 6. Operations and Logistics

### How a customer engages the business
[Step-by-step from first contact to delivered service. Should mirror Document 03 (Sales Process Map) but at the factual level — what happens, not how to optimize it.]

### Booking / payment terms
- **Deposit / retainer:** [Amount or percentage, when due]
- **Payment schedule:** [Installments, due dates, milestones]
- **Final payment:** [When due]
- **Accepted payment methods:** [Specific list]
- **Refund / cancellation policy:** [Plain language]
- **Rescheduling policy:** [Plain language]

### What's required from the customer
[What documents, decisions, deposits, signatures, access, or information the customer needs to provide and when.]

### Insurance and contracts
[Any insurance requirements, contracts signed, indemnification terms — the facts AI needs to reference, not full legal language.]

### Accessibility
[ADA accessibility, language accessibility, neurodiversity accommodations, dietary accommodations — whatever applies.]
```

**Industry-specific additions:**

#### Wedding venue:
```markdown
### Vendor policies
- **Catering:** [In-house only / preferred list / open / BYO]
- **Bar:** [In-house / BYO with corkage / required vendor]
- **Photography / videography:** [Open / preferred list / restrictions]
- **Florals:** [Open / preferred list]
- **Music / DJ / band:** [Open / preferred list / sound restrictions]
- **Officiant:** [Open / requires from list / clergy restrictions]
- **Other:** [Cake, transportation, hair/makeup, planner, rentals]

### Site rules
- **Curfew / noise ordinance:** [Specific time and source — town ordinance, neighbor agreement]
- **Setup / teardown timing:** [Specific windows]
- **Open flame:** [Sparklers, candles, fireworks — yes/no/conditions]
- **Confetti / rice / petals:** [Yes/no/biodegradable only]
- **Pets:** [Yes/no/conditions]
- **Children:** [Yes/no/policies]
- **Smoking:** [Where allowed/banned]
- **Drone use:** [Yes/no/permits required]
- **Alcohol service rules:** [Cutoff time, ID requirements]
```

#### Contractor:
```markdown
### Project process
- **Estimate process:** [Free / paid / on-site / virtual]
- **Permits:** [Who pulls them, who pays for them]
- **Material sourcing:** [Cost-plus, included, customer-supplied options]
- **Site protection:** [Standard practices]
- **Daily schedule:** [Typical work hours, days]
- **Cleanup:** [Daily / end-of-job]
- **Warranty:** [Length and what's covered]
- **Change orders:** [How handled, signed, billed]
```

#### Preschool:
```markdown
### Daily operations
- **Drop-off window:** [Times]
- **Pickup window:** [Times]
- **Late pickup policy:** [Fees, procedure]
- **Sick policy:** [When kids stay home, return-to-school criteria]
- **Medication administration:** [Policy]
- **Food / snacks:** [Provided / brought from home / restrictions]
- **Allergies:** [How handled, communication, severity protocols]
- **Naps / rest time:** [Schedule, policy]
- **Outdoor time:** [Schedule, weather policies]
- **Field trips:** [Frequency, parent involvement]
- **Behavior / discipline approach:** [Brief description]
```

#### Restaurant:
```markdown
### Service operations
- **Menu changes:** [Frequency, seasonal vs. regular]
- **Dietary accommodations:** [Vegan, gluten-free, allergy protocols]
- **Corkage:** [Allowed / fee / restrictions]
- **Children's menu:** [Yes / no]
- **Dress code:** [If any]
- **Large parties:** [How handled, minimums, gratuity]
- **Gift cards:** [Available, redeemable how]
- **Loyalty program:** [If any]
```

#### Professional services:
```markdown
### Engagement operations
- **Discovery process:** [Free call / paid audit / proposal]
- **Communication cadence:** [Weekly check-ins, monthly reports, etc.]
- **Tools used with clients:** [Slack, Notion, project management tools]
- **Response time SLA:** [What clients can expect]
- **Confidentiality:** [NDA defaults, IP terms]
- **Subcontractors / team members:** [Who else might work on a client's project]
```

---

### Section 7: Differentiators and Positioning Facts

**Purpose:** The factual claims about what makes this business different. These are the facts behind marketing copy. AI tools reference these when generating positioning content.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 7. Differentiators and Positioning Facts

### Verifiable differentiators
[Things this business offers that are factually different from most or all competitors. Each must be a fact, not an adjective.]

For each:
- **The differentiator:** [Specific claim]
- **The proof:** [Why this is true / how to verify]
- **What this lets us say in marketing:** [The defensible claim]

### Comparison to typical competitors
[A short table or list showing how this business compares to the typical alternative on 3-5 dimensions that matter.]

### Awards, certifications, press mentions, recognitions
[Each one with date, source, and link if available.]

### Years in business / track record numbers
[Specific numbers — years, projects completed, weddings hosted, students taught, clients served — that the AI can reference.]
```

**Test:** Every line in this section should pass the "would a new employee learn something useful here?" test. Vague claims like "exceptional service" don't belong; "average response time of 47 minutes during business hours" does.

---

### Section 8: Recurring Customer Questions Reference

**Purpose:** A quick-lookup index of facts that come up most often in customer interactions. Not the FAQ Bank itself (that's Document 7), but the factual inputs the FAQ Bank is built on top of.

**Word count target:** 150-300 words.

**Required structure:**

```markdown
## 8. Recurring Customer Questions Reference

This is a quick-lookup index for the facts customers ask about most often. The full pre-approved answer language lives in Document 07 (FAQ Bank); this section is just the source-of-truth facts.

| Question category | Key facts | Where the full answer lives |
|---|---|---|
| Pricing | See Section 4 | FAQ Bank Section [X] |
| Capacity | See Section 5 | FAQ Bank Section [X] |
| Availability | See Section 1 (hours) and Section 5 (booking lead time) | FAQ Bank Section [X] |
| What's included | See Section 3 and Section 4 | FAQ Bank Section [X] |
| Vendor policies (if applicable) | See Section 6 | FAQ Bank Section [X] |
| Cancellation / refund | See Section 6 | FAQ Bank Section [X] |
| [Industry-specific top question] | See Section [X] | FAQ Bank Section [X] |
```

This section exists so an AI tool can quickly orient itself to where in the document it needs to look.

---

### Section 9: Information That Must Stay Current

**Purpose:** A flagged list of facts that go stale fastest. These are the items that need quarterly review at minimum.

**Word count target:** 150-250 words.

**Required structure:**

```markdown
## 9. Information That Must Stay Current

These items change most often and need to be verified on the quarterly fact-check cycle. If any of these are wrong, the AI will produce wrong outputs immediately.

### Quarterly review required
- Pricing (Section 4)
- Capacity / availability (Section 5)
- Current enrollment / project pipeline / booking calendar (Section 5)
- Team members (Section 2) — turnover happens
- Hours of operation (Section 1)
- Active promotions or seasonal pricing (Section 4)

### Annual review required
- Vendor policies (Section 6)
- Insurance and contract terms (Section 6)
- Awards and certifications (Section 7)

### Update immediately when changed
- Address, phone, email (Section 1)
- Owner / key team member changes (Section 2)
- Major new offerings or discontinued offerings (Section 3)
- Major price changes (Section 4)

### Last updated
- Section 1: [Date]
- Section 2: [Date]
- Section 3: [Date]
- Section 4: [Date]
- Section 5: [Date]
- Section 6: [Date]
- Section 7: [Date]
```

This section is the maintenance anchor for the document. Every quarterly retainer client gets a Section 9 review at minimum.

---

## How to Build This Document

The full process, in order. Total time: 2-3 hours including client time.

### Step 1: Pre-Build Prep (15 minutes, Joshua)

Before doing any building:

1. Pull the onboarding questionnaire response — it covers about 40% of this document
2. Open the client's website in one tab
3. Open the client's Google Business Profile in another tab
4. Open any brochures, PDFs, or marketing collateral the client has shared
5. Have the discovery call notes available

### Step 2: First Draft From Questionnaire (30 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate a Business Facts Reference for [Business Name] using Document Production Spec 02 as the structure. Industry: [industry].

Source materials:

[Paste: completed onboarding questionnaire]

[Paste: discovery call notes]

[Paste: any pricing documents, brochures, or service menus the client provided]

[Paste: relevant URLs from the client's website — about page, services page, pricing page, FAQ page]

Build all 9 sections following the spec. Use the industry-specific templates where the spec calls for them. For any field where the source materials don't have an answer, write [NEEDS CONFIRMATION] in brackets so I can flag it for the client.

Be exhaustive. It's better to include too much factual detail than too little. The whole point of this document is that AI tools never have to guess.
```

### Step 3: Website + GBP Sweep (30 minutes, Joshua)

Read through the client's website front to back and Google Business Profile. For every factual claim on the website, verify it's captured in the document. Common gaps:

- Vendor policies on a sub-page
- Pricing in a downloadable PDF that wasn't shared
- Capacity numbers on the venue tour page
- Hours that differ from GBP
- Service area that's vague on the website

Add anything missing to the draft.

### Step 4: Mark All Gaps (15 minutes, Joshua)

Read the full draft. For every field with `[NEEDS CONFIRMATION]`, decide whether:
- It can be answered from research Joshua does (verify and fill)
- It needs a quick text or email to the client
- It needs a 15-minute fact-check call with the client

Compile everything that needs the client into a single message.

### Step 5: Client Fact-Check Pass (30-45 minutes client time)

Send to client with this email:

```
Subject: Quick fact-check — Business Facts Reference draft

Attached: the Business Facts Reference for [Business Name].

This is the document every AI tool, chatbot, and automated email will reference for facts about your business. If something here is wrong, every system that uses it will be wrong.

Two asks:

1. Read the whole thing. Anything that's incorrect, mark it.

2. There are [X] specific items I need you to confirm — they're flagged with [NEEDS CONFIRMATION] in the doc. Reply with answers to those, or if it's faster, hop on a 15-minute call.

Once you sign off, this becomes the source of truth and goes into your AI Operating System.
```

### Step 6: Final Edits and Delivery (15 minutes)

- Apply client edits and confirmations
- Replace all `[NEEDS CONFIRMATION]` flags with confirmed facts
- Fill in Section 9 dates ("Last updated" for each section)
- Update version to 1.0 final
- Save with naming convention `[client-slug]-02-business-facts-v1.0.md`
- Upload to client's Claude Project as knowledge

### Step 7: Cross-Reference Pass (10 minutes, Joshua)

Open the Brand Voice Guide (Document 01) in one window and the Business Facts Reference in another. Verify:

- The Key Facts Block in the Brand Voice Guide matches the facts in the Business Facts Reference
- Any inconsistencies get resolved (Business Facts Reference wins on facts; Brand Voice Guide wins on phrasing)

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 9 sections are complete with no `[NEEDS CONFIRMATION]` placeholders remaining
- [ ] Identity and Contact section has every field filled
- [ ] People section names everyone customers might encounter and clearly assigns scope
- [ ] What the Business Sells section explicitly lists what the business does NOT do (this prevents AI overpromising)
- [ ] Pricing section distinguishes shareable vs. non-shareable pricing with deflection language for the latter
- [ ] Capacity section uses the industry-appropriate template
- [ ] Operations section includes vendor policies (if applicable), payment terms, and customer requirements
- [ ] Differentiators section contains only facts, not adjectives
- [ ] Recurring Questions section maps to the FAQ Bank (Document 7) — even if the FAQ Bank doesn't exist yet, the index is in place
- [ ] Information That Must Stay Current section has all "Last updated" dates filled
- [ ] Client has reviewed and approved every fact
- [ ] Cross-reference pass against Brand Voice Guide is complete
- [ ] File is saved with correct naming convention and uploaded to client's Claude Project
- [ ] Total document length is between 1,500 and 3,000 words

---

## Common Failure Modes

When this document is wrong, it's usually because of one of these:

**Failure 1: Pricing is from the website, not from the client.** Websites are often outdated. The price page hasn't been touched in 18 months. AI tools then quote stale pricing. Fix: every price gets confirmed by the client during the fact-check pass, not pulled from the website.

**Failure 2: "What we don't do" is missing or thin.** The biggest AI accuracy problem is over-promising — saying yes to something the business doesn't offer. Fix: spend at least 15 minutes specifically on the "what we don't do" lists in Sections 3 and 5.

**Failure 3: Vendor policies are vague.** "Open vendor policy with some restrictions" is useless to an AI tool. Fix: every vendor category gets a specific policy statement.

**Failure 4: Team scope isn't clear.** AI routes inquiries to the wrong person, or makes up a contact name. Fix: every named person gets a clear "what they handle" line.

**Failure 5: Capacity numbers conflict between sections.** The website says 200, the brochure says 180, the owner says 175 in conversation. Fix: get one definitive number per metric and make sure it's the only number in the document.

**Failure 6: Section 9 ("Information That Must Stay Current") is treated as an afterthought.** A year later the document is stale and nobody knows. Fix: Section 9 is a hard requirement; the quarterly review goes on Joshua's calendar at delivery.

**Failure 7: "Differentiators" become marketing copy.** "Award-winning service" is not a fact. Fix: every line in Section 7 must be falsifiable. If you couldn't disprove it with a phone call, it's not a fact.

---

## Worked Example: Audrey's Farmhouse Business Facts Reference

The following is a complete sample of what a finished Business Facts Reference looks like. Use this as a pattern reference when building one for a new client.

---

# Audrey's Farmhouse Business Facts Reference

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last fact-check:** April 2026, Joshua + [Owner Name]
**Next scheduled fact-check:** July 2026

**For:** Inquiry responses, chatbot accuracy, content that includes factual claims, automated email content, AI-generated blog and social posts.

**Companion documents:**
- Document 01: Brand Voice Guide (how this information is communicated)
- Document 07: FAQ and Common Questions Bank (pre-approved framings of these facts)
- Document 10: Automation Spec Package (where these facts get used in automated systems)

**Critical rule:** Anything an AI tool says about Audrey's Farmhouse should be verifiable against this document. If a fact isn't here, the AI tool should say "I don't have that information" — never invent.

---

## 1. Identity and Contact

- **Legal business name:** [Legal entity name]
- **Public-facing name:** Audrey's Farmhouse
- **DBA / sub-brands / sister properties:** [Sister property names if applicable]
- **Category:** Wedding and event venue
- **Sub-category:** Boutique multi-venue hospitality property with on-site lodging and in-house catering
- **Year established:** [Year as wedding venue]
- **Brief history:** The property was a working dairy farm into the 1970s, converted to a guest house and restaurant in the early 2000s, and began hosting weddings full-time in [Year]. The current ownership took over in [Year].
- **Primary address:** [Full address, Wallkill, NY]
- **Mailing address (if different):** Same as primary
- **Service area:** Wedding and event hosting on-site only. Couples come primarily from NYC (90 minutes south), the Hudson Valley, Boston, Philadelphia, and the broader Northeast.
- **Main phone:** [Phone]
- **Main email:** info@audreysfarmhouse.com
- **Website:** audreysfarmhouse.com
- **Google Business Profile:** [URL] — claimed and active
- **Social media:**
  - Instagram: @audreysfarmhouse
  - Facebook: facebook.com/audreysfarmhouse
- **Hours of operation:** Property tours by appointment, typically Saturdays at 10am or 2pm and weekday afternoons. Office responds to inquiries Monday–Friday, 9am–5pm ET.

---

## 2. People

### Ownership
- **Owner:** [Owner Name]. Took over the property in [Year]. Lives on site for part of the year.

### Key team members

**[Owner Name]** — Owner. Handles partnership and high-level booking conversations, vendor relationships, and overall direction. Customers don't typically interact with the owner unless escalated.

**Megan [Last Name]** — On-site coordinator and day-of operations lead. Handles all wedding-day execution, vendor coordination on the day, and logistics for the weekend. Couples meet Megan in the planning window (3 months out) and on the wedding weekend.

**[Booking Coordinator Name]** — Inquiry and booking coordinator. Handles all initial inquiries, tours, contracts, and the booking process from first contact through signed contract. This is the person customers should be routed to for new inquiries.
- Direct contact: [email]
- What they handle: All inquiries, tour scheduling, pricing conversations, contract execution. NOT day-of coordination (that's Megan), NOT catering menu development (that's the chef).

**[Chef Name]** — Executive chef and kitchen lead. Handles all in-house catering menu development, dietary accommodations, and kitchen operations. Couples meet the chef during the menu tasting (typically 4 months before the wedding).

### Who customers should NOT be routed to
- Don't route new inquiries to the owner — route to the booking coordinator.
- Don't route catering menu questions to the booking coordinator — route to the chef once the couple is in the planning phase.
- Don't route day-of questions in the week leading up to the wedding to anyone but Megan.

---

## 3. What the Business Sells / Does

### Core offerings

**Saturday Wedding Weekend (peak season)**
- What it includes: Friday afternoon access through Sunday morning checkout. Full venue (farmhouse, barn, ceremony lawn, kitchen, grounds). Use of the kitchen for the rehearsal dinner (self-catered or use our chef). On-site coordinator (Megan) for the wedding day. Use of the farmhouse for the couple and immediate family Friday and Saturday nights.
- What it does NOT include: Catering (separate, in-house, per person pricing — see Section 4). Bar service (separate, we run it). Guest rooms beyond the farmhouse (cottage and carriage house priced per night). Florals, photography, music, officiant. Wedding planning beyond day-of coordination.
- Typical use case: 80-180 guest weddings, multi-day weekend format.
- Typical price range: See Section 4.

**Friday or Sunday Wedding (off-peak day)**
- What it includes: Same as Saturday but for a Friday or Sunday only.
- What it does NOT include: Same exclusions as Saturday.
- Typical use case: Couples wanting to save on venue cost, smaller weddings, or peak-season Saturdays already booked.
- Typical price range: See Section 4.

**Weekday Microwedding (Monday–Thursday)**
- What it includes: 12-hour day access. Ceremony lawn or barn. Use of farmhouse for couple and immediate family overnight.
- What it does NOT include: Sister properties' lodging, full weekend programming.
- Typical use case: 30 guests or fewer, often elopements or second-marriage weddings.
- Typical price range: See Section 4.

### Secondary or add-on offerings

- **Rehearsal dinner in the kitchen** (Friday night, in-house catered, separate per-person pricing)
- **Sunday brunch** (post-wedding, in-house catered, separate per-person pricing)
- **Additional lodging** in the cottage and carriage house (priced per room per night)
- **Welcome bag service** (arrangement of welcome bags in guest rooms; small per-room fee)

### Things customers commonly ask for that we DON'T do

- We don't host destination weddings (we ARE a destination, but the couple has to come to us — we don't travel).
- We don't allow outside catering. The kitchen is in-house, period.
- We don't host events on Christmas Eve, Christmas Day, New Year's Eve, or New Year's Day.
- We don't book more than 18 months out (calendar opens 18 months before the date).
- We don't allow open flame fireworks. Sparklers yes, fireworks no.
- We don't allow drone photography without prior approval and a copy of the operator's license.

### Things we used to do but no longer offer

- We used to host corporate retreats. We discontinued that in [Year] to focus exclusively on weddings.
- We used to offer day-of-only rentals (no overnight lodging). We don't anymore — weekend format only.

---

## 4. Pricing

### What's publicly shareable

**Saturday Wedding (peak season: late May, June, September, October)**
- Price: $14,500 venue all-in
- What's included: Venue access Fri-Sun, on-site coordinator, farmhouse for couple's family Fri-Sat nights, use of kitchen for rehearsal
- What's NOT included: Catering, bar, additional lodging, anything from external vendors
- Conditions: Saturday only; peak season months only

**Friday or Sunday Wedding (peak season)**
- Price: $11,500 venue all-in
- Same inclusions as Saturday at the lower rate

**Saturday Wedding (shoulder season: April, early May, early November)**
- Price: $11,000 venue all-in
- Same inclusions

**Weekday Microwedding (Mon–Thu, any season)**
- Price: $4,500 venue all-in (capped at 30 guests)
- Includes: 12-hour day access, ceremony space, farmhouse for couple's overnight stay
- Excludes: Catering, bar, additional lodging

**In-house catering**
- Range: $145–$185 per person (depends on menu selection)
- Includes: All food courses, service staff, china, glassware, linens
- Doesn't include: Bar (separate), cake (couple sources separately), late-night snack (add-on)

**Bar packages**
- Beer and wine open bar: $42 per person, 5 hours
- Full open bar: $58 per person, 5 hours
- Hourly extension: $9 per person per hour
- Custom packages available

**Lodging beyond the farmhouse**
- Cottage rooms: $295/night
- Carriage house rooms: $395/night
- 2-night minimum on wedding weekends

### What's NOT publicly shareable

- We don't quote final all-in numbers without knowing guest count, menu, bar package, and lodging needs. The publicly shareable per-component pricing is the floor; the AI should always direct couples to a conversation for an accurate total.
- For the chatbot or auto-responder, when a couple asks "what does a wedding here cost," the answer is: "Saturday venue rentals start at $14,500 in peak season. Catering ranges $145–$185 per person, and there's bar and lodging on top of that. The fastest way to get an accurate all-in number for your guest count is a quick call with [booking coordinator]. Want me to set that up?"

### Seasonal or time-based pricing

| Season | Saturday | Friday/Sunday | Weekday |
|---|---|---|---|
| Peak (late May, Jun, Sep, Oct) | $14,500 | $11,500 | $4,500 |
| Shoulder (Apr, early May, early Nov) | $11,000 | $9,000 | $4,500 |
| Off (Dec–Mar) | Limited bookings, contact for pricing | Limited bookings | $4,500 |

### Discounts, promotions, and exceptions

- 10% discount on venue rental for weddings with 50 guests or fewer (excludes weekday microwedding which is already discounted)
- No price-matching with other venues
- No discount for cash payment
- No discount for repeat customers (anniversaries, vow renewals)

### Last pricing update

April 2026

---

## 5. Capacity, Scope, and Capabilities

### Event capacity

- **Ceremony capacity (seated):** 200 outdoor on the ceremony lawn; 180 indoor in the barn (with backup ceremony layout)
- **Reception capacity (seated):** 180 in the barn
- **Reception capacity (standing/cocktail):** 250 in the barn + adjacent porch
- **Capacity by space:**
  - Ceremony lawn: 200 seated
  - Barn (reception): 180 seated, 250 cocktail
  - Farmhouse great room: 40 seated (used for rehearsal dinners)
  - Kitchen: 25 seated (used for intimate rehearsal dinners)

### Lodging

- **Total guest rooms on site:** 23
- **Breakdown by building:**
  - Farmhouse: 7 rooms (couple + immediate family)
  - Cottage: 8 rooms
  - Carriage house: 8 rooms
- **Maximum overnight guests:** 46 (with double occupancy)
- **Pet policy in lodging:** Service animals always; pets in cottage rooms only with prior approval and $150 cleaning fee

### Event types hosted

- **Yes:** Weddings, microweddings, elopements, vow renewals, multi-day weekend weddings
- **No:** Corporate events, milestone birthday parties (50th, 60th, etc.), bar/bat mitzvahs, baby showers, graduation parties, funerals/memorials, fundraisers

### Schedule and availability

- **Number of events per weekend:** One. We don't host two weddings on a weekend.
- **Booking lead time (typical):** 12-18 months out
- **Booking lead time (minimum):** Will consider bookings 60 days out for off-season; 90 days out for peak/shoulder
- **Blackout dates:** Christmas Eve, Christmas Day, New Year's Eve, New Year's Day, Easter Sunday, owner's family vacation (typically last 2 weeks of February)

---

## 6. Operations and Logistics

### How a customer engages the business

1. Inquiry comes in (website form, email, Instagram DM, or phone)
2. Booking coordinator responds within 24 business hours with availability for requested date(s) and pricing for that season/day
3. Couple schedules a tour (Saturday morning/afternoon or weekday afternoon)
4. Tour with booking coordinator (90 minutes, walks the property)
5. If interested, couple receives a contract proposal within 48 hours
6. Couple signs contract and pays 25% deposit to hold the date
7. Welcome packet sent with planning timeline
8. Menu tasting with the chef ~4 months before wedding
9. Final walk-through with Megan ~30 days before wedding
10. Final headcount and balance due 14 days before wedding
11. Wedding weekend
12. Post-wedding follow-up email and Google review request

### Booking / payment terms

- **Deposit / retainer:** 25% of venue fee due at contract signing
- **Payment schedule:**
  - 25% at contract signing
  - 25% at 6 months out
  - 25% at 90 days out
  - Remaining 25% + final headcount-adjusted catering and bar 14 days before the wedding
- **Final payment:** 14 days before wedding
- **Accepted payment methods:** Check, ACH transfer, credit card (3% surcharge applies)
- **Refund / cancellation policy:** Deposit non-refundable. Cancellations 6+ months out forfeit deposit only. Cancellations 3-6 months out forfeit 50%. Cancellations under 90 days forfeit 100%.
- **Rescheduling policy:** One reschedule allowed without penalty if requested 6+ months out and rebooked within 18 months. Subsequent reschedules treated as cancellation.

### What's required from the customer

- Signed contract within 7 days of receiving the proposal to hold the date
- 25% deposit at contract signing
- Wedding insurance policy ($1M liability minimum) submitted 30 days before the wedding
- Final headcount confirmed 14 days before the wedding
- Payment of remaining balance 14 days before the wedding
- Contact information for all vendors (florist, photographer, music, officiant, etc.) shared with Megan 60 days before the wedding

### Insurance and contracts

- We require couples to carry $1M in event liability insurance. Most couples obtain this through Wedsure, eWed, or similar. We provide the document specifying our requirement at contract signing.
- Vendors hired by the couple must carry their own insurance and submit a COI naming Audrey's Farmhouse as additional insured.
- Standard contract is 14 pages and reviewed by an attorney. We don't substantially modify the contract. Couples wanting significant contract changes are not the right fit.

### Accessibility

- The barn, ceremony lawn, farmhouse great room, and one farmhouse room are wheelchair accessible.
- The cottage and carriage house lodging is not wheelchair accessible (older buildings, no elevator, stairs to entry).
- We accommodate dietary restrictions including vegan, vegetarian, gluten-free, kosher (limited), halal (limited), and life-threatening allergies. Allergies must be flagged 30 days before the wedding.
- Hearing accommodations: We can provide ASL interpretation contact info but the couple sources the interpreter.

### Vendor policies

- **Catering:** In-house only. No outside catering, no exceptions.
- **Bar:** In-house only. We hold the liquor license. Couples can request specific brands or signature cocktails.
- **Photography / videography:** Open vendor policy. We have a preferred list of 8 photographers (Joshua Brown Photography among them).
- **Florals:** Open vendor policy. Preferred list of 5 florists available on request.
- **Music / DJ / band:** Open vendor policy. Sound restrictions: outdoor amplified music ends at 9pm (township ordinance). Indoor reception music until 11pm cutoff.
- **Officiant:** Couple's choice. We can provide a list of local officiants if needed.
- **Cake:** Couple sources separately. Refrigeration and serving available; no cake-cutting fee.
- **Transportation:** Couple sources. We can recommend local shuttle services.
- **Hair / makeup:** Couple sources. Onsite setup available in farmhouse.
- **Planner:** Optional. Megan handles day-of coordination but is not a full-service planner. Couples wanting more than day-of often hire a planner; we have 4 we work well with.
- **Rentals:** Most rentals not needed (we provide china, glass, linens through catering). Specialty items (lounge furniture, dance floor for non-barn ceremonies, tents for outdoor cocktails in inclement weather) sourced from local rental companies.

### Site rules

- **Curfew / noise ordinance:** 11pm hard cutoff for all amplified music and outdoor sound. Township ordinance, not negotiable. We enforce strictly because we lose our event hosting permit if we don't.
- **Setup / teardown timing:** Vendor setup begins Friday at 12pm or Saturday at 10am for day-of weddings. Teardown completed by 11am Sunday.
- **Open flame:** Sparklers yes (with two designated lighting locations and water buckets). Candles in hurricanes or votives yes. Open candelabras with no protection no. Fireworks no.
- **Confetti / rice / petals:** Real flower petals yes (biodegradable). Rice yes. Paper confetti, glitter, or non-biodegradable items no.
- **Pets:** Couple's dog welcome at the ceremony with prior approval. Other pets at the event by case-by-case.
- **Children:** Welcome at all events. We have one farmhouse room set up as a kids' lounge with games and movies if the couple wants quiet space for younger guests.
- **Smoking:** Designated smoking area behind the barn. No smoking in any building or on the ceremony lawn.
- **Drone use:** Permitted with prior approval, valid Part 107 license submitted, and operator insurance.
- **Alcohol service rules:** Bar opens after the ceremony, closes at 10:30pm (30 min before sound cutoff). All guests carded if they appear under 30. We refuse service to visibly intoxicated guests.

---

## 7. Differentiators and Positioning Facts

### Verifiable differentiators

**In-house kitchen.**
- Proof: 90% of Hudson Valley wedding venues require BYO catering from approved lists. We have a full commercial kitchen and chef on staff.
- What this lets us say: "One of the only Hudson Valley venues with in-house catering."

**23 on-site guest rooms.**
- Proof: Most Hudson Valley wedding venues have either zero on-site lodging or 6-12 rooms. We have 23 across three buildings.
- What this lets us say: "23 on-site guest rooms — the largest on-site lodging capacity of any boutique Hudson Valley wedding venue."

**Multi-day weekend format included in venue rental.**
- Proof: Most Hudson Valley venues charge for the wedding day and bill rehearsal dinner space and Sunday brunch separately. Our venue fee includes Friday access through Sunday morning.
- What this lets us say: "Full weekend included — rehearsal dinner space, wedding day, Sunday brunch."

**Day-of coordinator (Megan) included in venue rental.**
- Proof: Most Hudson Valley venues require couples to hire an outside coordinator or bill the day-of coordinator separately ($1,500–$3,500 typical add-on). Megan is included in the venue fee.
- What this lets us say: "Day-of coordination included — no need to hire a separate coordinator."

### Comparison to typical competitors

| Dimension | Audrey's | Typical Hudson Valley wedding venue |
|---|---|---|
| Catering | In-house | BYO from preferred list |
| Lodging on-site | 23 rooms | 0-12 rooms |
| Weekend format | Friday-Sunday included | Day-of only |
| Day-of coordinator | Included | Separate $1,500-$3,500 |
| Wedding capacity | 80-180 | Varies widely |
| Saturday peak rate | $14,500 venue + $145-185pp catering | $8,000-$25,000+ venue, catering separate |

### Awards, certifications, press mentions, recognitions

- Featured in Junebug Weddings, [date]
- Featured in The Knot, [date]
- Featured in Brides Magazine Hudson Valley feature, [date]
- The Knot Best of Weddings winner, [year(s)]
- WeddingWire Couples' Choice Award, [year(s)]

### Years in business / track record numbers

- [X] years hosting weddings
- [X]+ weddings hosted to date
- [X] reviews averaging 4.[X] stars across Google, The Knot, and WeddingWire

---

## 8. Recurring Customer Questions Reference

This is a quick-lookup index for the facts customers ask about most often. The full pre-approved answer language lives in Document 07 (FAQ Bank); this section is just the source-of-truth facts.

| Question category | Key facts | Where the full answer lives |
|---|---|---|
| Pricing | See Section 4 | FAQ Bank Section 1 |
| Capacity | See Section 5 | FAQ Bank Section 2 |
| Availability | See Section 1 (hours) and Section 5 (booking lead time) | FAQ Bank Section 3 |
| What's included in the venue fee | See Section 3 and Section 4 | FAQ Bank Section 4 |
| Catering questions | See Section 6 (vendor policies) | FAQ Bank Section 5 |
| Lodging | See Section 5 | FAQ Bank Section 6 |
| Vendor policies | See Section 6 | FAQ Bank Section 7 |
| Weather contingencies | See Section 6 (site rules) | FAQ Bank Section 8 |
| Cancellation / refund | See Section 6 (booking terms) | FAQ Bank Section 9 |
| Accessibility | See Section 6 (accessibility) | FAQ Bank Section 10 |
| Tour scheduling | See Section 1 (hours) | FAQ Bank Section 11 |

---

## 9. Information That Must Stay Current

These items change most often and need to be verified on the quarterly fact-check cycle.

### Quarterly review required
- Pricing (Section 4)
- Booking calendar / availability (Section 5)
- Team members (Section 2)
- Hours of operation (Section 1)
- Active promotions or seasonal pricing (Section 4)

### Annual review required
- Vendor policies (Section 6)
- Insurance and contract terms (Section 6)
- Awards and certifications (Section 7)

### Update immediately when changed
- Address, phone, email (Section 1)
- Owner / key team member changes (Section 2)
- Major new offerings or discontinued offerings (Section 3)
- Major price changes (Section 4)

### Last updated
- Section 1: April 2026
- Section 2: April 2026
- Section 3: April 2026
- Section 4: April 2026
- Section 5: April 2026
- Section 6: April 2026
- Section 7: April 2026

---

## End of Worked Example

The example above is a complete reference Business Facts Reference. Use this as the quality bar for any new client. If your draft for a new client is shorter, has empty fields, or feels generic, go back and complete the gaps before delivering. Wrong facts here become wrong facts everywhere downstream.
