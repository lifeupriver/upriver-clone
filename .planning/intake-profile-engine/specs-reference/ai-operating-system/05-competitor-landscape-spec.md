# Document Production Spec 05: Competitor Landscape Brief

## What This Spec Is

This is the production specification for Document 5 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The Competitor Landscape Brief is the document that grounds positioning, content strategy, SEO, and sales conversations in market reality. Every business operates in a competitive context, and the AI Operating System needs to know what that context is — who the alternatives are, what they offer, what they charge, where they're stronger, where they're weaker, and where the open positioning space lives. Without this document, AI tools generate marketing language in a vacuum, recommend keyword targets that competitors already dominate, and miss opportunities to position against specific named alternatives in the way customers actually compare options.

This is also the most opinionated document in the suite. The Brand Voice Guide and Business Facts Reference describe the client. This document evaluates the market — and that evaluation must be honest, specific, and useful, not a polite competitive analysis that says everyone is doing fine.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 05 of 12 |
| **Priority** | Medium-High |
| **Total length target** | 1,500-3,000 words |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 2.5-3 hours |
| **Claude's time** | 30-45 minutes |
| **Client's time** | 15-30 minutes (input on perceived competitors and review) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-05-competitor-landscape.md` |
| **Foundation for** | Documents 6 (SEO and Keyword Strategy), 8 (Social Media Playbook), 11 (Website Audit), and all positioning content |

---

## When This Document Gets Built

**Phase 2 of engagement, Week 2.** Built after the Brand Voice Guide (01) and Business Facts Reference (02), in parallel with the Sales Process Map (03) and Content Library (04). Should be in place before the SEO Strategy (06) since SEO targets competitor-relative.

**Triggers:** Onboarding questionnaire submitted (specifically Q10/Q13 — perceived competitors), Ahrefs access available, Joshua has done at least 2-3 hours of independent market scanning.

**Blocks:** SEO and Keyword Strategy (Document 06) — keyword gap analysis depends on competitor SEO data. Also blocks any positioning content production.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required.

### Header Block

```markdown
# [Business Name] Competitor Landscape Brief

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last competitive scan:** [Month Year]
**Next scheduled refresh:** [Month Year — annual default; semi-annual for fast-changing markets]

**For:** Positioning content, SEO strategy, sales conversations, content topic selection, and any AI-generated content that addresses why this business is different.

**Companion documents:**
- Document 01: Brand Voice Guide (the voice the positioning gets expressed in)
- Document 02: Business Facts Reference (the verifiable claims behind positioning)
- Document 06: SEO and Keyword Strategy (where competitive keyword gaps get operationalized)
- Document 11: Website Audit (where competitive positioning shows up on the site)

**Critical principle:** This document is opinionated. It evaluates competitors honestly — including where they're stronger than the client and where the client is at a real disadvantage. Sanitized competitive analyses that conclude "we're great" are useless. The point is to find the truth so the client can make better decisions.
```

**Word count:** 100-150 words.

---

### Section 1: Market Context

**Purpose:** The shape of the market this business operates in. Who's the customer, how big is the market locally, what's the competitive intensity, what's changing.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 1. Market Context

### The market this business operates in
- **Geographic market:** [City / metro / region / national — where competition is meaningful]
- **Customer market:** [Who the customer is — already covered in other docs but restate briefly]
- **Estimated market size locally:** [If knowable — number of relevant transactions or businesses per year in the geographic market]
- **Market saturation:** [Saturated / growing / contracting]
- **Market dynamics worth knowing:** [Trends, regulatory changes, new entrants, exits, consolidation]

### How customers compare options in this market
- **Typical search behavior:** [What do customers actually search? Google? Industry directories? Word of mouth?]
- **Number of options typically considered:** [How many competitors does a customer evaluate before deciding?]
- **Decision criteria customers use:** [Top 3-5 in order of weight]
- **Decision timeline:** [How long does the comparison process take?]

### Pricing context for the market
- **Typical price range for this category locally:** [Floor to ceiling]
- **Where this business sits in the range:** [Bottom 25% / mid / top 25% / top 10%]
- **Price sensitivity of the customer:** [High / medium / low]
- **Discounting norms in the category:** [Heavy / moderate / rare]
```

**Industry adaptation:**
- **Wedding venue:** Geographic market is often a 1-2 hour drive radius. Customers consider 4-8 venues. Decision criteria: capacity, price, lodging availability, available date, vibe.
- **Contractor:** Geographic market is a 30-60 minute drive radius. Customers consider 3-5 contractors. Decision criteria: price, references, timeline, communication, professionalism of the estimate.
- **Preschool:** Geographic market is the immediate neighborhood and a 15-20 minute drive. Customers consider 3-5 schools. Decision criteria: philosophy, ratios, hours, price, location.
- **Restaurant:** Geographic market is a 15-minute drive radius for casual dining; longer for destination dining. Customers consider 3-5 options for a given meal occasion. Decision criteria: cuisine, price point, atmosphere, reviews, availability.
- **Professional services:** Geographic market varies wildly — local for some specialties (estate attorney), national for others (specialized consultant). Customers consider 2-4 firms. Decision criteria: expertise fit, price, references, chemistry.

---

### Section 2: Direct Competitor Profiles

**Purpose:** Detailed profiles of the 3-5 most direct competitors. This is the heart of the document.

**Word count target:** 600-1,500 words depending on number of competitors profiled.

**Required structure:**

For each competitor (3-5 total):

```markdown
## 2. Direct Competitor Profiles

### Competitor 1: [Name]

**The basics**
- **Website:** [URL]
- **Location:** [City, distance from client]
- **Founded / how long in business:** [Year or duration]
- **Ownership / leadership:** [Owner name(s) if relevant]
- **Size of operation:** [Number of staff, scale indicator appropriate to industry]

**What they offer**
- **Core offering:** [Short description]
- **Pricing position:** [Public pricing or estimated range; note if pricing is opaque]
- **Capacity / scope:** [Industry-relevant capacity number]
- **Key differentiators (their stated positioning):** [How they describe themselves]

**Marketing presence**
- **Website quality:** [Strong / standard / weak — with one-sentence note]
- **Blog activity:** [Active / dormant / nonexistent — frequency if active]
- **Social media:**
  - Instagram: [@handle, follower count, posting frequency, content quality]
  - Facebook / LinkedIn / TikTok / others as relevant
- **YouTube / video content:** [Active or not, library size]
- **Email/newsletter activity:** [Visible signs — newsletter signup on site, etc.]

**SEO profile (from Ahrefs)**
- **Domain Rating (DR):** [#]
- **Estimated organic traffic:** [#/month]
- **Number of organic keywords:** [#]
- **Top 10 keywords they rank for:** [List with positions]
- **Content gaps the client could exploit:** [Keywords this competitor doesn't rank for that the client could target]

**Reviews and reputation**
- **Google rating and review count:** [Rating, count, last review date, response rate]
- **Industry-platform ratings:** [The Knot, Yelp, Houzz, etc. as relevant]
- **Common positive themes in their reviews:** [What customers praise them for]
- **Common critical themes in their reviews:** [What customers complain about — these are exploitable gaps]

**Where they win against the client**
- [Honest list. What does this competitor do better, charge less for, offer that the client doesn't, etc.]

**Where the client wins against them**
- [Specific advantages the client has, ideally tied to facts in Document 02]

**How to position against them in sales conversations**
- [Specific language and framing for when a customer says "I'm also looking at [Competitor]"]
```

**Critical detail:** Joshua should personally browse each competitor's website end-to-end, scroll their Instagram, read 10+ of their reviews, and pull their Ahrefs metrics. Don't rely on Claude's training data for competitor information — it will be outdated and possibly invented.

---

### Section 3: Indirect and Adjacent Competitors

**Purpose:** Alternatives that aren't direct competitors but still take share. Customers don't only compare apples to apples.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 3. Indirect and Adjacent Competitors

### Adjacent categories that take share
[Other categories of solutions customers consider before choosing this category at all. For example: a couple choosing between a venue wedding and a destination wedding, a homeowner choosing between hiring a contractor and DIY, a parent choosing between a preschool and a nanny.]

### Lower-tier or budget alternatives
[Cheaper alternatives that some customers will choose. For example: AirBnB-style wedding venue, a handyman vs. a licensed contractor, an in-home daycare vs. a licensed preschool.]

### Higher-tier or premium alternatives
[More expensive alternatives that some customers consider. For example: luxury destination resort vs. boutique venue, a design-build firm vs. a general contractor, a Montessori vs. a play-based preschool.]

### DIY / no-action alternatives
[The "do nothing" or "do it yourself" option. Often the biggest competitor. For example: friends and family hosting a wedding at home, a homeowner deferring a renovation, a parent staying home with the child.]

### How the client should address these alternatives
[Briefly: which alternatives are worth addressing in marketing content, and which can be safely ignored.]
```

---

### Section 4: Competitive Positioning Analysis

**Purpose:** A structured comparison of the client against direct competitors on the dimensions that matter to customers.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 4. Competitive Positioning Analysis

### Comparison matrix

A side-by-side comparison on the dimensions customers actually use to decide.

| Dimension | [Client] | [Competitor 1] | [Competitor 2] | [Competitor 3] | [Competitor 4] |
|---|---|---|---|---|---|
| [Dimension 1 — e.g., Price range] | [Value] | [Value] | [Value] | [Value] | [Value] |
| [Dimension 2 — e.g., Capacity] | [Value] | [Value] | [Value] | [Value] | [Value] |
| [Dimension 3] | [Value] | [Value] | [Value] | [Value] | [Value] |
| [Dimension 4] | [Value] | [Value] | [Value] | [Value] | [Value] |
| [Dimension 5] | [Value] | [Value] | [Value] | [Value] | [Value] |
| [Dimension 6] | [Value] | [Value] | [Value] | [Value] | [Value] |

### What this matrix reveals

[2-3 paragraphs of analysis. Where does the client cluster with competitors? Where does the client stand alone? Where is the client at a clear disadvantage?]

### The positioning narrative the matrix supports

[1-2 paragraphs. Given what the matrix shows, what's the strongest honest positioning the client can take? Should be specific enough to inform headline copy.]
```

**Industry-typical comparison dimensions:**

- **Wedding venue:** Price range, capacity, on-site lodging, in-house vs. BYO catering, weekday vs. weekend availability, day-of coordination included, photography rights/restrictions, drive time from major city
- **Contractor:** Price range, project size sweet spot, design services included, project timeline, warranty length, communication style, lead time before start
- **Preschool:** Tuition, hours, age range, ratios, philosophy, outdoor space, food provided, after-care available
- **Restaurant:** Price point, cuisine type, reservation policy, private event capability, ambience descriptor, hours
- **Professional services:** Hourly rate or engagement size, specialty depth, team size, geographic coverage, response time, retainer vs. project structure

---

### Section 5: Voice and Brand Differentiation

**Purpose:** How competitors sound. Identifies the generic industry voice the client should NOT emulate, and the specific voice patterns to avoid because they're claimed by competitors.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 5. Voice and Brand Differentiation

### The generic voice of this industry

[Read 3-5 competitor websites. Document the recurring patterns — the words everyone uses, the structures everyone follows, the imagery everyone leans on. This is the voice the client should differentiate from.]

### Voice positions claimed by specific competitors

[If a specific competitor has carved out a distinctive voice, document it so the client doesn't accidentally mimic it.]

| Competitor | Their voice position | Don't accidentally claim this |
|---|---|---|
| [Competitor 1] | [E.g., "Romantic and dreamy"] | [Don't lean dreamy in your copy] |
| [Competitor 2] | [E.g., "Hyper-modern minimalist"] | [Don't go too sleek] |

### Voice opportunity for the client

[Given what competitors claim, what voice space is open? Cross-reference with the Brand Voice Guide attributes.]

### Visual/aesthetic differentiation

[How do competitors look on the website and Instagram? Where can the client visually stand apart? Often: photography style, color palette, layout density.]
```

---

### Section 6: Pricing Position and Strategy

**Purpose:** Where the client sits in the market on pricing, what that means strategically, and what pricing decisions are warranted.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 6. Pricing Position and Strategy

### Public pricing comparison

| Business | Entry-level price | Mid-tier price | Premium price | Pricing transparency |
|---|---|---|---|---|
| [Client] | [$] | [$] | [$] | [Transparent / Partial / Opaque] |
| [Competitor 1] | [$] | [$] | [$] | [Transparent / Partial / Opaque] |
| [Competitor 2] | [$] | [$] | [$] | [Transparent / Partial / Opaque] |

### Where the client sits in the pricing range

[Top 10% / Top 25% / Mid / Bottom 25% / Bottom 10% — with one-sentence justification.]

### Whether the pricing position is right

[Joshua's assessment. Is the client priced too low for what they offer? Too high for what they deliver? Priced appropriately but communicating it badly?]

### Recommended pricing actions

[Specific recommendations if any — e.g., "Raise weekday rate by 8% — currently 15% below comparable competitors with weaker offerings." Or: "Pricing is right; messaging needs to emphasize what's included so the price feels justified."]

### Pricing transparency strategy

[Should the client share pricing publicly? Most established competitors are opaque, but in many markets transparency is a differentiator. Joshua's recommendation here.]
```

---

### Section 7: SEO and Content Competitive Position

**Purpose:** Where the client stands in organic search and content production relative to competitors. Drives the SEO Strategy (Document 06).

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 7. SEO and Content Competitive Position

### Domain authority comparison

| Business | Domain Rating | Organic keywords | Estimated traffic | Backlink count |
|---|---|---|---|---|
| [Client] | [#] | [#] | [#/mo] | [#] |
| [Competitor 1] | [#] | [#] | [#/mo] | [#] |
| [Competitor 2] | [#] | [#] | [#/mo] | [#] |
| [Competitor 3] | [#] | [#] | [#/mo] | [#] |

### Where the client lags

[Specific gap analysis. If competitors have 4x the organic traffic, what's driving it? Volume of content? Higher-authority backlinks? Better-targeted keywords?]

### Where the client leads

[If the client has any SEO advantages — better-quality content, higher-converting pages, fresher content — document them so they don't get lost in optimization work.]

### Keyword gaps the client should target

[Top 5-10 keywords competitors rank for that the client doesn't, with notes on which are realistic targets and which are aspirational.]

### Content production cadence comparison

| Business | Blog post frequency | Total blog posts | Most recent post | Approximate content investment |
|---|---|---|---|---|
| [Client] | [#/month] | [#] | [Date] | [Light / moderate / heavy] |
| [Competitor 1] | [#/month] | [#] | [Date] | [Light / moderate / heavy] |
| [Competitor 2] | [#/month] | [#] | [Date] | [Light / moderate / heavy] |
```

---

### Section 8: Open Positioning Space and Recommendations

**Purpose:** Joshua's strategic conclusion. Given everything documented above, where does the client have the strongest defensible positioning, and what should the client do about it?

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 8. Open Positioning Space and Recommendations

### The positioning gap

[1-2 paragraphs. Where is there open space in the market that the client is best-positioned to claim? This should be specific enough that the client can use it as a north star for messaging.]

### Recommended positioning statement

[One sentence. The "if a customer remembers one thing about why we're different, this is it" statement. Should be evidenced by Sections 2-7.]

### Three things the client should emphasize more

1. [Specific positioning element with rationale]
2. [Specific positioning element with rationale]
3. [Specific positioning element with rationale]

### Three things the client should de-emphasize or stop saying

1. [Element with rationale — usually because it's a generic claim that competitors also make]
2. [Element with rationale]
3. [Element with rationale]

### Competitive risks to monitor

[New entrants, competitor moves, market shifts that could change the analysis. What should the client be watching?]

### Recommended next actions tied to other documents

- [What this means for the SEO Strategy (Doc 06)]
- [What this means for the Social Media Playbook (Doc 08)]
- [What this means for the Website Audit (Doc 11)]
- [What this means for sales conversations and the Email Templates (Doc 07)]
```

---

## How to Build This Document

The full process, in order. Total time: 3-4 hours.

### Step 1: Identify the Competitor List (15 minutes, Joshua)

Sources for the initial list:
- Onboarding questionnaire response (Q10/Q13 — perceived competitors)
- Joshua's market knowledge for the geographic area and category
- Google search of the primary local keyword to surface who else ranks
- Social platform search to surface adjacent competitors

Goal: A list of 4-8 candidate competitors. Will narrow to the most relevant 3-5 for deep profiling.

### Step 2: Narrow to Direct Competitors (10 minutes, Joshua)

From the candidate list, pick the 3-5 that are most directly competitive — same geographic market, same customer, similar offering. Note which ones are tier-up or tier-down for inclusion in Section 3 (Indirect competitors).

### Step 3: Competitor Deep Dive (90-120 minutes, Joshua)

For each direct competitor, allocate ~20-30 minutes to:

1. Read the full website end to end
2. Scroll the Instagram feed (last 30+ posts, plus engagement patterns)
3. Read 10+ Google reviews
4. Pull Ahrefs metrics (DR, organic keywords, traffic, top keywords, backlinks)
5. Note the visual aesthetic, voice patterns, and any distinctive positioning
6. Capture pricing if shareable; note opacity if not

Keep notes organized by competitor.

### Step 4: Competitive Matrix Build (20 minutes, Joshua)

Pick the 5-7 dimensions customers actually use to compare options in this market. For each dimension, fill in the client and each competitor. This is the input for Section 4.

### Step 5: Voice Pattern Extraction (15 minutes, Joshua)

Across the competitor websites, identify:
- The generic phrases everyone uses
- The structural patterns (e.g., "About → Services → Gallery → Contact" homepage flow)
- Specific voice positions any competitor has carved out

### Step 6: Draft Generation (30-45 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate a Competitor Landscape Brief for [Business Name] using Document Production Spec 05 as the structure. Industry: [industry].

Source materials:

[Paste: notes from competitor deep dive, organized by competitor]

[Paste: Ahrefs data for client and each competitor]

[Paste: competitive matrix Joshua filled in with dimensions]

[Paste: voice pattern observations from competitor scan]

[Paste: pricing comparison data]

[Paste: relevant context from the Brand Voice Guide and Business Facts Reference]

Build all 8 sections following the spec. Section 8 (Open Positioning Space and Recommendations) is the most important and should reflect Joshua's strategic perspective — be specific, not diplomatic. Honest competitive analysis is the goal.

For Section 2 (Direct Competitor Profiles), keep each profile concise but complete. Don't pad with adjectives. Use the structured fields.
```

### Step 7: Joshua Review and Sharpen (45 minutes)

Read the full draft. For each section, check:

- Section 2: Are competitor facts accurate? Cross-check anything Claude might have invented from training data.
- Section 4 (Matrix): Are the dimensions the right ones? Do the values match real research, not assumptions?
- Section 5 (Voice): Did Claude actually identify generic patterns, or summarize generally?
- Section 6 (Pricing): Is the pricing position assessment defensible?
- Section 8 (Recommendations): Is this opinionated enough to be useful? If it reads as polite, sharpen it.

Edit directly. Be willing to remove sections that ended up shallow rather than padding.

### Step 8: Internal Strategic Review (Optional, 15 minutes)

Before delivering to client, ask: "If I were the owner of [Client], reading this document, would I learn something I didn't already know?"

If the answer is no, the document is too cautious. Find the things the client doesn't already know and surface them.

### Step 9: Client Review (15-30 minutes client time)

Send to client with this email:

```
Subject: Competitor Landscape Brief — your market, honestly

Attached: the Competitor Landscape Brief for [Business Name].

This is the most opinionated document I'll send you. It evaluates your direct competitors honestly — including where they're stronger than you, where you're stronger than them, and where the open positioning space is.

Read Section 8 (Open Positioning Space and Recommendations) first. That's the strategic conclusion.

If anything is wrong about a competitor, mark it. If anything is right but uncomfortable, that's the point — clear competitive analysis is what makes the rest of the work effective.

This document feeds the SEO strategy, the website work, and how we position you in any sales-supporting content.
```

### Step 10: Final Edits and Delivery (15 minutes)

- Apply client edits
- Save with naming convention `[client-slug]-05-competitor-landscape-v1.0.md`
- Upload to client's Claude Project as knowledge

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 8 sections are complete
- [ ] 3-5 direct competitors are profiled with full data (basics, offerings, marketing presence, SEO, reviews, win/lose)
- [ ] Indirect and adjacent competitors section identifies at least 3 alternative categories
- [ ] Competitive positioning matrix has 5-7 dimensions and includes the client + at least 3 competitors
- [ ] Voice differentiation section identifies the generic industry voice pattern
- [ ] Pricing position section includes a defensible assessment of where the client sits and whether it's right
- [ ] SEO competitive position includes Ahrefs data for client and at least 3 competitors
- [ ] Open positioning space section concludes with a specific positioning statement and 3 emphasis recommendations
- [ ] Cross-reference pass against Brand Voice Guide complete (positioning aligns with voice)
- [ ] Cross-reference pass against Business Facts Reference complete (claimed differentiators are factually supported)
- [ ] Client has reviewed
- [ ] File saved with correct naming convention and uploaded to Claude Project

---

## Common Failure Modes

**Failure 1: Competitor data is invented or outdated.** Claude pulls competitor info from training data and confidently reports a competitor's pricing, capacity, or positioning that no longer matches reality. Fix: every competitor fact must come from Joshua's manual research, not Claude's prior knowledge.

**Failure 2: The matrix is filled with generic dimensions.** "Quality" and "service" are not useful comparison dimensions because every business claims to be high on both. Fix: pick dimensions that are observable and falsifiable — capacity, price, lead time, included features, etc.

**Failure 3: Section 8 reads as diplomatic.** "Both we and Competitor X have strong positioning" doesn't help the client. Fix: take a clear position. The client paid for analysis, not balance.

**Failure 4: "Where competitors win against us" is left blank.** It feels uncomfortable to write. But it's the most useful section because it identifies real risks. Fix: every competitor profile must include at least 1-2 honest "where they win" lines.

**Failure 5: Voice differentiation section is generic.** "They sound corporate, you sound warm" doesn't work. Fix: pull specific phrases competitors use, name them, document the patterns to avoid.

**Failure 6: Recommendations don't connect to other documents.** Section 8 says "emphasize X more" but the SEO Strategy and Website Audit aren't updated to reflect it. Fix: Section 8 must explicitly call out implications for Documents 06, 08, and 11.

**Failure 7: The competitor list is too long or too short.** Too long (8+ competitors) means each profile is shallow. Too short (1-2 competitors) means the analysis lacks dimensionality. Fix: 3-5 direct competitors is the right range.

---

## Worked Example: Audrey's Farmhouse Competitor Landscape Brief

The following is a complete sample of what a finished Competitor Landscape Brief looks like. Use this as the quality bar.

---

# Audrey's Farmhouse Competitor Landscape Brief

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last competitive scan:** April 2026
**Next scheduled refresh:** October 2026 (semi-annual for active wedding venue market)

**For:** Positioning content, SEO strategy, sales conversations, content topic selection, and any AI-generated content that addresses why this venue is different.

**Companion documents:**
- Document 01: Brand Voice Guide
- Document 02: Business Facts Reference
- Document 06: SEO and Keyword Strategy
- Document 11: Website Audit

**Critical principle:** This document is opinionated.

---

## 1. Market Context

### The market this venue operates in
- **Geographic market:** Hudson Valley wedding venues, broadly defined as the region from Westchester north to Albany, with the heaviest concentration of competitors in Ulster, Dutchess, and Columbia counties.
- **Customer market:** Couples planning weddings of 80-180 guests, primarily from NYC (90 minutes south), with secondary markets in Boston, Philadelphia, and the broader Northeast.
- **Estimated market size locally:** Roughly 200-250 active Hudson Valley wedding venues operate in the 80-200 guest range. Industry data suggests ~6,000-8,000 weddings happen in the Hudson Valley each year across all venue types.
- **Market saturation:** Saturated and slightly contracting. Several new boutique venues opened in 2022-2024; some have struggled and are pulling back marketing investment.
- **Market dynamics worth knowing:** Catering economics have tightened (food costs up 18% in 2 years); this is squeezing BYO-catering venues more than in-house venues. The Knot's pricing leverage on venues is increasing as listings get more expensive. Couples are booking later (12-month average vs. 14 months pre-pandemic).

### How couples compare options
- **Typical search behavior:** Google search ("hudson valley wedding venue"), The Knot, Junebug, Instagram for atmosphere, planner referrals
- **Number of options typically considered:** 4-8 venues toured; 8-15 inquiries sent
- **Decision criteria couples use:** (1) Available date, (2) Capacity fit, (3) Price all-in, (4) Vibe/atmosphere, (5) On-site lodging availability
- **Decision timeline:** 4-12 weeks from first inquiry to signed contract

### Pricing context for the market
- **Typical price range for Hudson Valley wedding venues (Saturday peak):** $5,000 (DIY barn) to $40,000+ (luxury estate). Most boutique venues fall in $8,000-$25,000.
- **Where Audrey's sits:** Mid-to-upper market. Saturday venue rate of $14,500 is in the top third for boutique venues but not luxury tier.
- **Price sensitivity of the customer:** Medium. Couples in this market have budgets but are highly attuned to "what's included" because Hudson Valley pricing varies enormously in scope.
- **Discounting norms in the category:** Discounts on Friday/Sunday and weekday formats are normal. Cash discounts and price-matching are unusual.

---

## 2. Direct Competitor Profiles

### Competitor 1: The Roundhouse at Beacon Falls

**The basics**
- Website: theroundhouseatbeaconfalls.com
- Location: Beacon, NY (45 min south of Audrey's, 75 min from NYC)
- Founded: ~2007 as a wedding venue
- Ownership / leadership: Independent, owner-operated
- Size of operation: ~25 staff during peak season; ~80 weddings/year

**What they offer**
- Core offering: Boutique wedding venue with on-site restaurant (no BYO catering) and 8 on-site rooms
- Pricing position: Saturday venue $11,500 in shoulder, $14,000 in peak. Catering $135-$175 per person. Lodging $295-$395.
- Capacity: Up to 200 seated reception
- Key differentiators (their stated positioning): Architecturally distinctive (round building, Hudson River views), in-house restaurant with award-winning chef, walking distance to Beacon's Main Street

**Marketing presence**
- Website quality: Strong. Modern, fast, photo-forward.
- Blog activity: Active — ~2 posts/month. Strong SEO performance.
- Instagram: @theroundhousebeacon, ~22K followers, 3-4 posts/week
- YouTube: Inactive
- Email: Visible newsletter signup; sending appears regular

**SEO profile (from Ahrefs)**
- Domain Rating: 38
- Estimated organic traffic: 3,400/month
- Number of organic keywords: 1,420
- Top 10 keywords they rank for: "hudson valley wedding venue" (#3), "beacon ny wedding venue" (#1), "wedding venue near me hudson valley" (#5), "boutique hudson valley wedding venue" (#2), "small wedding venue hudson valley" (#7)
- Content gaps Audrey's could exploit: They under-target weekday/microwedding keywords; they don't have content targeting Catskills-specific search

**Reviews and reputation**
- Google: 4.8 stars, 142 reviews, 90% response rate
- The Knot: 4.9, 78 reviews
- Common positive themes: Food, views, walking distance to Beacon
- Common critical themes: Limited lodging (only 8 rooms creates problems for larger families), not a true weekend format, valet/parking complaints

**Where they win against Audrey's**
- Stronger SEO presence (DR 38 vs. Audrey's ~22)
- More central location (closer to NYC, easier train access)
- Walking-distance to a real downtown (Beacon)
- More established brand recognition

**Where Audrey's wins against them**
- 23 rooms vs. their 8 (almost 3x lodging capacity)
- True weekend format (Friday-Sunday) vs. their day-of model
- More land/grounds (40 acres vs. their constrained urban-adjacent property)
- Catskills setting (more atmospheric for couples wanting a "destination feel")

**How to position against them in sales conversations**
"The Roundhouse is a great venue if your priorities are easy NYC access and walkability to a town. The trade-offs are limited lodging (8 rooms vs. our 23) and a one-day rather than weekend format. If you're hoping to host family on-site for the full weekend, we're a better fit."

### Competitor 2: Stonecroft

**The basics**
- Website: stonecroftvenue.com
- Location: Cold Spring, NY (60 min from Audrey's, 60 min from NYC)
- Founded: 2018 as a wedding venue (older estate property)
- Ownership / leadership: Hospitality group (operates 2 other venues)
- Size of operation: Larger team, professionally managed; ~120 weddings/year across the venue

**What they offer**
- Core offering: Estate-style wedding venue with multiple ceremony and reception spaces, BYO catering from a preferred list, 14 on-site rooms in a converted manor house
- Pricing position: Saturday venue $18,500 in peak, $14,000 in shoulder. Catering separate (couples spend $180-$250 per person depending on caterer).
- Capacity: Up to 250 seated reception
- Key differentiators (their stated positioning): Historic estate, refined/elegant aesthetic, larger capacity for bigger weddings, more "luxury" positioning

**Marketing presence**
- Website quality: Very strong. Hospitality-group level production. Polished.
- Blog activity: Sporadic — ~1 post/month
- Instagram: @stonecroftvenue, ~31K followers, 4-5 posts/week, very polished aesthetic
- YouTube: Active, ~12 videos
- Email: Strong visible nurture program; shows up in lead gen materials

**SEO profile (from Ahrefs)**
- Domain Rating: 35
- Estimated organic traffic: 2,800/month
- Number of organic keywords: 1,180
- Top 10 keywords: "luxury hudson valley wedding venue" (#1), "estate wedding venue ny" (#2), "cold spring wedding venue" (#1), "historic wedding venue hudson valley" (#3)

**Reviews and reputation**
- Google: 4.8, 96 reviews, 80% response rate
- The Knot: 4.9, 54 reviews
- Common positive themes: Aesthetic, photography backdrop, large capacity, professional staff
- Common critical themes: Pricing creep (additional fees), feels less personal than smaller venues, BYO catering coordination is complicated

**Where they win against Audrey's**
- More established luxury positioning
- Larger capacity (good for 180-250 weddings)
- Stronger SEO and brand visibility
- More polished marketing assets
- Hospitality-group operational sophistication

**Where Audrey's wins against them**
- In-house catering vs. their BYO complication
- More personal, owner-operated experience
- Better price-to-value at the 80-180 guest count range
- 23 rooms vs. their 14
- Stronger reviews on day-of coordination (their reviews mention the venue feels "transactional")

**How to position against Stonecroft in sales conversations**
"Stonecroft is the right answer if you're at the 200-250 guest range and want a hospitality-group level of polish. For weddings in the 80-180 range, the trade-off is that things at Stonecroft cost more once everything is added up — primarily because catering is BYO and gets layered in at $180-$250 per person. We're in-house, more transparent on the all-in number, and more personal in the experience."

### Competitor 3: The Hill at Highlands

**The basics**
- Website: thehillathighlands.com
- Location: New Paltz, NY (35 min from Audrey's, 90 min from NYC)
- Founded: 2020 as a wedding venue
- Ownership / leadership: Independent, owner-operated (former corporate event planners)
- Size of operation: ~10 staff; ~50 weddings/year

**What they offer**
- Core offering: Modern barn venue, BYO catering from preferred list, no on-site lodging
- Pricing position: Saturday venue $9,500 in peak, $7,500 shoulder. Catering separate (couples spend $150-$200 per person).
- Capacity: Up to 175 seated reception
- Key differentiators (their stated positioning): Modern aesthetic (not rustic), Catskills views, more affordable than competitors

**Marketing presence**
- Website quality: Standard. Modern but template-like.
- Blog activity: Inactive — last post 2023
- Instagram: @thehillathighlands, ~8K followers, 2-3 posts/week
- YouTube: One property tour video
- Email: Basic newsletter; light cadence

**SEO profile (from Ahrefs)**
- Domain Rating: 18
- Estimated organic traffic: 850/month
- Number of organic keywords: 380
- Top 10 keywords: "new paltz wedding venue" (#2), "modern barn wedding venue ny" (#5), "affordable hudson valley wedding venue" (#8)

**Reviews and reputation**
- Google: 4.7, 42 reviews, 70% response rate
- The Knot: 4.8, 28 reviews
- Common positive themes: Affordability, aesthetic, view
- Common critical themes: No lodging on-site means logistical complexity for guests, BYO catering is "complicated to coordinate," "feels new" (less polished operations)

**Where they win against Audrey's**
- More affordable entry point (couples eliminated by Audrey's pricing may end up here)
- Modern aesthetic appeals to couples who don't want "barn wedding" associations
- New Paltz location is more recognized than Wallkill

**Where Audrey's wins against them**
- On-site lodging (huge advantage they can't replicate)
- In-house catering vs. their BYO complication
- More established operational sophistication (they're 5 years in vs. our 12+)
- Weekend format vs. day-of

**How to position against The Hill in sales conversations**
"The Hill is a real option, especially if budget is the leading constraint. The two main differences: they don't have on-site lodging, so all guests need to find local hotels, and catering is BYO which adds complexity and usually adds 25-40% to the per-person spend once everything is included. If guests staying together and a more turnkey experience matter, we're the better fit even at the higher price."

### Competitor 4: Brookside Manor

**The basics**
- Website: brooksidemanor.com
- Location: Hyde Park, NY (40 min from Audrey's, 90 min from NYC)
- Founded: ~1995 as a wedding venue
- Ownership / leadership: Family-owned, multi-generational
- Size of operation: ~15 staff; ~80 weddings/year

**What they offer**
- Core offering: Mansion-style venue with multiple ceremony spaces, in-house catering, 6 on-site rooms (limited)
- Pricing position: Saturday venue $13,000 in peak, $10,500 shoulder. Catering $130-$170 per person.
- Capacity: Up to 200 seated reception
- Key differentiators (their stated positioning): Established family-owned, in-house catering, "elegant" mansion aesthetic

**Marketing presence**
- Website quality: Weak. Outdated design, mobile-unfriendly. Updated last in 2022.
- Blog activity: Inactive — last post 2022
- Instagram: @brooksidemanor, ~6K followers, 1-2 posts/week (often phone-quality)
- YouTube: Inactive
- Email: Light, intermittent

**SEO profile (from Ahrefs)**
- Domain Rating: 14
- Estimated organic traffic: 410/month
- Number of organic keywords: 215
- Top 10 keywords: "hyde park ny wedding venue" (#3), "mansion wedding venue hudson valley" (#4)

**Reviews and reputation**
- Google: 4.6, 78 reviews, 50% response rate
- The Knot: 4.7, 42 reviews
- Common positive themes: Food, family-owned warmth, value
- Common critical themes: "Showing its age," limited lodging, communication slow, marketing materials weak compared to other venues toured

**Where they win against Audrey's**
- In-house catering at slightly lower per-person cost
- Established brand (~30 years)
- Slightly lower pricing across the board

**Where Audrey's wins against them**
- Modern marketing presence (their website is a clear weak point)
- Lodging capacity (23 vs. their 6)
- Weekend format
- More current brand aesthetic and updated property
- Faster communication and modern booking process (HoneyBook vs. their phone-and-email system)

**How to position against Brookside in sales conversations**
"Brookside is a long-established family venue with great food and warm hospitality. Where the trade-off shows up is in the experience leading up to the wedding — limited lodging means guests scatter to local hotels, the booking process is slower (they don't use modern tools), and the property hasn't seen the kinds of updates ours has in the last few years. If those things matter, we're the better fit. If you're prioritizing established family-owned warmth and absolute lowest cost, they're worth a look."

---

## 3. Indirect and Adjacent Competitors

### Adjacent categories that take share

- **Destination weddings (Mexico, Caribbean, Italy):** A non-trivial portion of NYC couples consider going destination instead of Hudson Valley. Audrey's is well-positioned because the "destination feel without the destination logistics" framing addresses this directly.
- **Backyard / private estate weddings:** Some couples have access to a family property and consider DIY hosting. Hard to compete with on price; not worth chasing in marketing.

### Lower-tier or budget alternatives

- **DIY barn rentals (Airbnb-style):** $2,000-$5,000 day rental with full BYO. Couples in this segment are not Audrey's target.
- **Restaurants with private rooms:** $5,000-$10,000 all-in for 60-100 guests. Different category; not direct competition.

### Higher-tier or premium alternatives

- **Troutbeck (Amenia, NY):** Higher-end at $25K-$40K venue. Different customer.
- **Private hotel buyouts:** Some couples consider buying out a small inn or boutique hotel. Higher cost, less wedding-specific operation. Limited overlap.

### DIY / no-action alternatives

- **Couples who push the wedding back a year or downscope:** Audrey's microwedding format (weekday $4,500) addresses this directly and should be more aggressively marketed to couples in price hesitation.

### How Audrey's should address these alternatives

The "destination feel without the destination logistics" framing addresses destination weddings effectively. The microwedding format address downscoping. The other categories are not worth substantial attention in marketing.

---

## 4. Competitive Positioning Analysis

### Comparison matrix

| Dimension | Audrey's | Roundhouse | Stonecroft | Hill at Highlands | Brookside |
|---|---|---|---|---|---|
| Saturday peak venue rate | $14,500 | $14,000 | $18,500 | $9,500 | $13,000 |
| Catering model | In-house | In-house | BYO | BYO | In-house |
| Per-person catering | $145-185 | $135-175 | $180-250 | $150-200 | $130-170 |
| On-site rooms | 23 | 8 | 14 | 0 | 6 |
| Weekend format included | Yes (Fri-Sun) | No | No | No | No |
| Day-of coordination included | Yes | Yes | No (separate) | No (separate) | Yes |
| Max capacity | 180 seated | 200 seated | 250 seated | 175 seated | 200 seated |
| Distance from NYC | 90 min | 75 min | 60 min | 90 min | 90 min |

### What this matrix reveals

Audrey's has the strongest combined offering in the 80-180 guest range. The combination of in-house catering, 23 on-site rooms, weekend format, and included day-of coordination is not matched by any of the four direct competitors. The Roundhouse comes closest on catering and coordination but has only 8 rooms and no weekend format. Stonecroft has more capacity and stronger brand visibility but is more expensive once catering is layered in. The Hill is cheaper but lacks lodging entirely. Brookside is older, limited on lodging, and weak on modern marketing.

The matrix also reveals where Audrey's is structurally disadvantaged: NYC distance (we're farther than Roundhouse and Stonecroft) and capacity ceiling (we cap at 180; Stonecroft handles up to 250). These limit certain customer segments.

### The positioning narrative the matrix supports

"For weddings of 80-180 guests where the couple wants their family and friends staying on-site for a real weekend, with food handled by an in-house kitchen and the day run by a coordinator who's part of the venue: Audrey's is the only venue in the Hudson Valley that does all four. Other venues do one or two of these things. None do all four."

---

## 5. Voice and Brand Differentiation

### The generic voice of this industry

Hudson Valley wedding venue websites overwhelmingly use the same vocabulary: "magical," "stunning," "your special day," "elegant," "timeless," "rustic charm," "your love story." Most homepages open with an emotional flourish before getting to specifics. Most "about" pages tell the venue's story with romantic framing. Most pricing pages are opaque or absent.

The visual aesthetic is similarly homogeneous: warm-toned photography, cursive script fonts, soft sage and dusty rose accents, lots of overhead reception shots, lots of golden-hour ceremony photos.

### Voice positions claimed by specific competitors

| Competitor | Their voice position | Don't accidentally claim this |
|---|---|---|
| Stonecroft | Refined / luxury / "estate" | Don't try to compete on luxury polish |
| The Hill | Modern / minimalist / "not rustic" | Don't lean too modern; we're not trying to be the modern alternative |
| Brookside | Family-owned legacy / "elegant" | The "elegant" lane is over-claimed; avoid |
| Roundhouse | Architecturally distinctive / "Beacon" location | The "iconic building" angle isn't ours |

### Voice opportunity for Audrey's

The open voice space is "grounded, warm, slightly skeptical of wedding industry conventions, weekend-format-confident." Nobody else in the Hudson Valley wedding venue market is leading with this voice. The Brand Voice Guide already documents this opportunity; the competitive analysis confirms it.

### Visual/aesthetic differentiation

Audrey's photography style (Joshua's work) is distinctive vs. competitors — more film-leaning, more documentary-style, less "perfect overhead shot." This should be leaned into. The website aesthetic could push further from the generic Hudson Valley palette (sage/cream/blush) toward a more warm-grounded palette.

---

## 6. Pricing Position and Strategy

### Public pricing comparison

| Business | Saturday peak | Saturday shoulder | Pricing transparency |
|---|---|---|---|
| Audrey's | $14,500 | $11,000 | Transparent (published) |
| Roundhouse | $14,000 | $11,500 | Transparent |
| Stonecroft | $18,500 | $14,000 | Partial (pricing on inquiry) |
| Hill at Highlands | $9,500 | $7,500 | Transparent |
| Brookside | $13,000 | $10,500 | Partial (pricing on inquiry) |

### Where Audrey's sits in the pricing range

Mid-to-upper third on venue rate. When in-house catering and lodging are added in to make an apples-to-apples comparison with BYO competitors (Stonecroft, Hill), Audrey's frequently comes in lower on all-in cost than competitors charging less on the venue line.

### Whether the pricing position is right

Pricing is correct but is being underleveraged in marketing. Audrey's is the second-highest venue rate among the four direct competitors but offers more included than any of them (in-house catering AND weekend format AND day-of coordination AND most lodging). The all-in story should be told more aggressively.

### Recommended pricing actions

1. Publish all-in cost examples on the pricing page or a "what does a wedding here actually cost" blog post. Show side-by-side what a Saturday wedding actually totals at Audrey's vs. what it would total at a BYO venue charging $11,000 with $200/pp catering.
2. Increase the weekday microwedding rate from $4,500 to $5,500 in 2027. It's currently underpriced relative to demand and value. Calendar shows weekday format is consistently booked when offered.
3. No change to Saturday or shoulder rates. Pricing is appropriate.

### Pricing transparency strategy

Audrey's already publishes pricing, which is itself a competitive advantage given Stonecroft and Brookside are opaque. Lean into this in marketing: "We share our pricing because you deserve to know what it costs to plan a wedding here without booking a tour to find out."

---

## 7. SEO and Content Competitive Position

### Domain authority comparison

| Business | DR | Organic keywords | Estimated traffic | Backlinks |
|---|---|---|---|---|
| Audrey's | 22 | 460 | 1,100/mo | ~140 referring domains |
| Roundhouse | 38 | 1,420 | 3,400/mo | ~520 referring domains |
| Stonecroft | 35 | 1,180 | 2,800/mo | ~410 referring domains |
| Hill at Highlands | 18 | 380 | 850/mo | ~85 referring domains |
| Brookside | 14 | 215 | 410/mo | ~60 referring domains |

### Where Audrey's lags

Roundhouse and Stonecroft both have 3x Audrey's organic traffic. The gap is primarily driven by:
- More indexed blog content (both have 60+ posts vs. Audrey's 38)
- More referring domains from press features and partnerships
- Higher-volume target keywords (they target "hudson valley wedding venue" head terms; we mostly rank for longer-tail terms)

### Where Audrey's leads

- Audrey's content quality is higher than Brookside and Hill on a per-post basis
- Audrey's converts better per visitor (CTR from organic is higher than estimated for competitors)
- Audrey's branded search volume is healthy relative to size

### Keyword gaps Audrey's should target

| Keyword | Who ranks now | Volume | Difficulty | Audrey's opportunity |
|---|---|---|---|---|
| "hudson valley weekend wedding venue" | Underserved — no clear winner | 320/mo | Low | High — own this term |
| "in-house catering wedding venue hudson valley" | Roundhouse #1, Brookside #4 | 180/mo | Medium | High — natural fit |
| "microwedding venue catskills" | Underserved | 240/mo | Low | High — own the niche |
| "wedding venue with on-site lodging hudson valley" | The Knot listing pages dominate | 280/mo | Medium | Medium — possible to break through |
| "boutique wedding venue catskills" | Underserved | 190/mo | Low | High — own the term |
| "october wedding venue hudson valley" | Stonecroft #2, Roundhouse #5 | 410/mo | Medium-high | Medium — content opportunity |

### Content production cadence comparison

| Business | Blog frequency | Total posts | Most recent | Investment level |
|---|---|---|---|---|
| Audrey's | ~1/quarter | 38 | Sept 2025 | Light |
| Roundhouse | ~2/month | 90+ | This week | Heavy |
| Stonecroft | ~1/month | 60+ | Last month | Moderate |
| Hill at Highlands | Inactive | 22 | 2023 | None |
| Brookside | Inactive | 14 | 2022 | None |

To close the SEO gap, Audrey's needs to move from quarterly to weekly or bi-weekly posting cadence. This is a core recommendation for the AI Foundation Package and any retainer engagement.

---

## 8. Open Positioning Space and Recommendations

### The positioning gap

The four direct competitors collectively occupy these positioning spaces: luxury-estate (Stonecroft), iconic-architecture-and-walkability (Roundhouse), modern-minimalist-affordable (Hill), legacy-family-owned (Brookside). What no one credibly owns is the "weekend format with on-site lodging plus in-house catering" position — which is exactly what Audrey's does and what the matrix in Section 4 confirms is unmatched in the 80-180 guest range.

There is also an under-claimed voice position: "grounded, warm, slightly skeptical of wedding industry conventions" is open. Stonecroft is too refined to occupy it. The Hill is too modern. Brookside is too traditional. Roundhouse leans more architectural-cool. The voice space is Audrey's to claim.

### Recommended positioning statement

"For weddings of 80 to 180 guests where the couple wants their people staying on-site for the full weekend, food handled by an in-house kitchen, and the day run by a coordinator who actually works at the venue: Audrey's is the only Hudson Valley venue that does all four."

### Three things Audrey's should emphasize more

1. **The weekend format.** "Friday through Sunday included" is undermarketed. Most of the sales benefit shows up only after the booking conversation; it should be a top-of-funnel hook.
2. **The all-in cost story.** Couples are comparing line-item venue fees and missing that Audrey's all-in often beats BYO competitors by $5K-$15K. Show the math.
3. **The in-house kitchen as a differentiator.** Currently treated as one feature among many. Should be a top-three positioning element. Reviews confirm this is the #1 praised attribute.

### Three things Audrey's should de-emphasize or stop saying

1. **"Charming farmhouse" framing.** Generic and competes with every barn venue. The atmosphere should be shown in photos, not labeled with industry-cliché adjectives.
2. **"Magical wedding" or any romance-overload language.** Already banned in the Brand Voice Guide; needs continued enforcement in any AI-generated content.
3. **Generic "Hudson Valley wedding venue" framing.** Too contested. Lean into Catskills-specific framing where possible to differentiate from Beacon/Cold Spring/Hyde Park-area competitors.

### Competitive risks to monitor

- **Roundhouse expanding lodging.** They're zoned for additional rooms and have hinted at future expansion. If they go from 8 rooms to 15+, the lodging gap closes meaningfully.
- **Stonecroft's hospitality group launching a sister property.** They've teased a second Hudson Valley property; if they open something at the 80-150 capacity range with similar polish, it would be a more direct competitor.
- **The Knot pricing pressure.** As listing costs rise, Audrey's needs to make sure The Knot remains net-positive. The CRM data showing weak conversion from The Knot leads is worth tracking.

### Recommended next actions tied to other documents

- **For Document 06 (SEO Strategy):** Target the 6 keyword gaps identified in Section 7. Build a content calendar that publishes against these gaps. Move to weekly or bi-weekly cadence.
- **For Document 08 (Social Media Playbook):** Lean into the "grounded, slightly skeptical" voice position more aggressively. Photography style should differentiate visually from the sage/blush palette dominant in competitors.
- **For Document 11 (Website Audit):** Add an "all-in pricing" page or blog post. Make the weekend format more prominent on the homepage. Reframe the pricing page to emphasize what's included.
- **For Document 07 (Email Templates and FAQ Bank):** Ensure inquiry response language addresses the four competitors directly when couples mention them. The positioning lines in Section 2 should be in the templates.

---

## End of Worked Example

The example above is a complete reference Competitor Landscape Brief. Use this as the quality bar for any new client. The strongest indicator of a thorough job: Section 8 includes specific positioning recommendations that the client could implement next week — not abstract strategic guidance.
