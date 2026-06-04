# Document Production Spec 06: SEO and Keyword Strategy

## What This Spec Is

This is the production specification for Document 6 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The SEO and Keyword Strategy is the search-demand layer of the AI Operating System. It defines what the business is trying to rank for, where it currently ranks, what's realistic to target, and how content should be produced against those targets. Without this document, content production is directionless — blog posts get written on topics that have no search demand, the client competes on head terms they can't win, and AI-generated content misses the long-tail opportunities where real organic traffic lives.

This document is also the bridge between the Competitor Landscape Brief (Document 05) and the actual content calendar. The competitor brief identifies keyword gaps; this document turns those gaps into a prioritized, realistic plan. And because AI tools are increasingly answering questions that would previously have gone to search — through features like AI Overviews, Perplexity, ChatGPT answers — this document also addresses answer engine optimization (AEO), which is starting to matter as much as traditional SEO.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 06 of 12 |
| **Priority** | Medium-High |
| **Total length target** | 1,500-2,500 words |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 2.5-3 hours |
| **Claude's time** | 30-45 minutes |
| **Client's time** | 20-30 minutes (review and priority input) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-06-seo-keyword-strategy.md` |
| **Foundation for** | All content production (blog, landing pages, social supporting SEO), Website Audit (Document 11), and content calendar planning |

---

## When This Document Gets Built

**Phase 2 of engagement, Week 2-3.** Built after the Competitor Landscape Brief (05) because the keyword gap analysis in Section 7 of that doc feeds directly into this one. Also after the Business Facts Reference (02) because local SEO depends on verified NAP (name, address, phone) data.

**Triggers:** Competitor Landscape Brief is finalized, Ahrefs access is active, Google Search Console access is granted (critical — without GSC data, the "current performance" section is speculation).

**Blocks:** Content calendar production, Website Audit (Document 11), and any landing page builds.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required.

### Header Block

```markdown
# [Business Name] SEO and Keyword Strategy

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last SEO audit:** [Month Year]
**Next scheduled refresh:** [Month Year — quarterly default for keyword performance review; annual for full strategy refresh]

**For:** Content production, landing page builds, website optimization, local SEO work, and AI-generated content that needs to target specific search demand.

**Companion documents:**
- Document 02: Business Facts Reference (local SEO NAP data)
- Document 04: Content Library (existing content that may already rank)
- Document 05: Competitor Landscape Brief (keyword gaps and competitive SEO position)
- Document 11: Website Audit (where keyword targets get operationalized on the site)

**Critical principle:** This strategy is realistic, not aspirational. It targets keywords the business can actually win given domain authority, content capacity, and competitive intensity. Aspiration is cheap; strategy is about what's winnable in the next 12 months.
```

**Word count:** 100-150 words.

---

### Section 1: Current Performance Baseline

**Purpose:** Where the business stands in organic search today. This is the measurement baseline against which future progress gets tracked.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 1. Current Performance Baseline

### Domain-level metrics
- **Domain Rating (Ahrefs):** [#]
- **Domain Authority (Moz, if tracked):** [#]
- **Estimated organic traffic:** [#/month]
- **Number of organic keywords:** [#]
- **Total backlinks:** [#]
- **Referring domains:** [#]
- **Indexed pages:** [# from Google Search Console]

### Top-performing pages

The 10-15 pages currently driving the most organic traffic.

| Page URL | Target keyword | Current position | Monthly traffic | Status |
|---|---|---|---|---|
| [URL] | [Keyword] | [#] | [#/mo] | [Performing / Plateaued / Declining] |

### Top keywords currently ranking (positions 1-10)
[List of keywords where the site ranks on page 1 of Google, with position and monthly search volume.]

### Keywords ranking in positions 11-30

Often the highest-ROI opportunity — these keywords are close to page 1 and a modest optimization push can move them into real traffic.

| Keyword | Current position | Monthly volume | Estimated effort to reach top 10 |
|---|---|---|---|
| [Keyword] | [#] | [#] | [Low / Medium / High] |

### Branded vs. non-branded search

- **Branded traffic:** [#/month] — traffic from people searching for the business by name
- **Non-branded traffic:** [#/month] — traffic from people searching for the category/problem
- **Ratio:** [Heavy branded = recognition is strong but discovery is weak. Heavy non-branded = discovery works but brand isn't being searched for.]

### Data sources
[Where each metric came from — Ahrefs, GSC, GA4, owner recall. Flag anything that's not from a direct data source.]
```

**Industry adaptation:**
- **Wedding venue:** Branded search volume is usually strong (couples who know the venue name search for it directly). Non-branded traffic is almost entirely geographic + category terms.
- **Contractor:** Branded traffic is usually weak unless the business has significant local brand equity. Non-branded is everything.
- **Preschool:** Strong local search signals ("[town] preschool," "preschool near me"). GBP performance is often more important than website SEO for this category.
- **Restaurant:** Google Business Profile and Google Maps dominate discovery. Website SEO is secondary to GBP optimization. Reservations and Yelp/OpenTable rankings often matter more than Google organic.
- **Professional services:** Head terms are usually dominated by directory sites (Clutch, Upcity, Yelp). Long-tail and thought-leadership content is where organic traffic comes from.

---

### Section 2: Primary Keyword Targets

**Purpose:** The short list of highest-priority keywords the business is trying to rank for over the next 6-12 months.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 2. Primary Keyword Targets

### Core target keywords (3-5)

The keywords that would drive the most qualified traffic if the business ranked on page 1. These are the most important long-term targets, though they may not be winnable in 12 months.

| Keyword | Monthly volume | Difficulty | Current position | Target position (12 mo) | Rationale |
|---|---|---|---|---|---|
| [Keyword] | [#] | [Score] | [# or Not ranking] | [Position] | [Why this keyword matters] |

### Why these and not others

[2-3 sentences explaining the selection logic. Volume + intent + winnability in that order.]

### Keywords explicitly NOT being targeted (and why)

[Terms that look attractive but aren't worth pursuing. Usually because: too competitive, wrong intent, or the business can't fulfill the implied promise. Prevents future "why aren't we going after X" conversations.]
```

---

### Section 3: Long-Tail Keyword Opportunities

**Purpose:** The long list of lower-volume, lower-competition keywords that collectively drive meaningful traffic and are realistically winnable.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 3. Long-Tail Keyword Opportunities

Long-tail keywords are where most small-business SEO traffic comes from. Individually low volume; collectively significant. These are also the keywords most aligned with high-intent bottom-of-funnel search.

### Organized by topic cluster

**Cluster: [Topic — e.g., "Weekend wedding format" or "Kitchen remodel cost"]**
- Parent keyword (if any): [Main topic term]
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | [Keyword] | [#] | [Score] | [Informational / Commercial / Transactional] | [Blog post, FAQ, landing page] |

[Repeat for 4-8 clusters covering the primary topic territories the business should own.]

### Total long-tail opportunity
- **Combined monthly search volume across all clusters:** [#]
- **Estimated traffic if top-3 positions achieved for half:** [#]
- **Estimated timeframe to meaningful traffic:** [Typically 6-12 months for long-tail; 12-18 for head terms]
```

**Industry-typical clusters:**

- **Wedding venue:** Cluster around format (weekend / microwedding / elopement), around location (nearest town / region / major city + distance), around season (fall wedding / winter wedding / summer wedding), around style (rustic / modern / boutique / barn), around capacity (small wedding / large wedding / intimate wedding), around included services (in-house catering / all-inclusive / pet-friendly).
- **Contractor:** Cluster around project type (kitchen / bath / addition / basement), around specific services (tile / cabinets / flooring), around location, around scope (small / full-gut / budget / high-end).
- **Preschool:** Cluster around age (infant / toddler / pre-K / kindergarten prep), around philosophy (Montessori / play-based / Reggio / Waldorf), around location and hours (morning / full-day / part-time), around features (outdoor / bilingual / special needs).
- **Restaurant:** Cluster around cuisine (Italian / Japanese / Southern), around occasion (date night / family / group / romantic), around dish or signature (best pizza / best brunch / best burger), around price and style (casual / fine dining / BYOB).
- **Professional services:** Cluster around service type, around industry vertical served, around company size served, around problem framing ("how to solve X"), around geographic or regulatory specialty.

---

### Section 4: Local SEO Strategy

**Purpose:** The local-specific optimization work — Google Business Profile, local citations, geographic content, review strategy. Often the highest-ROI SEO work for small businesses.

**Word count target:** 250-450 words.

**Required structure:**

```markdown
## 4. Local SEO Strategy

### Google Business Profile status
- **Profile claimed:** [Yes / No]
- **Primary category:** [Current category — e.g., "Wedding venue" or "General contractor"]
- **Secondary categories:** [List]
- **Hours accuracy:** [Current and correct / needs update]
- **Photos:** [# and quality notes]
- **Posts (GBP Posts feature):** [Active / inactive]
- **Q&A section:** [Monitored / ignored]
- **Service/product listings:** [Populated / empty]

### Google Business Profile optimization priorities

[3-5 specific actions to take on GBP. Often includes: adding photos in specific categories, seeding Q&A with common customer questions, updating primary category if wrong, enabling posts cadence.]

### NAP consistency

**Primary NAP (must be identical everywhere):**
- Name: [Exact business name]
- Address: [Exact address format]
- Phone: [Exact phone format]

**Citation audit summary:**
- **Consistent citations:** [#]
- **Inconsistent or outdated citations:** [# and list]
- **Missing high-value citations:** [Which important directories don't have a listing yet]

### Review strategy
- **Target review volume:** [# per month]
- **Review request process:** [How and when customers get asked]
- **Review response policy:** [Response rate target, tone, template availability]
- **Priority platforms:** [GBP primary; industry-specific secondary — The Knot / Houzz / Yelp / etc.]

### Local content strategy
- **Geographic modifiers to target:** [List of town / region / neighborhood terms to weave into content]
- **Local partnership opportunities:** [Businesses, organizations, or publications in the area that could link or co-promote]
```

**Industry adaptation:**
- **Wedding venue:** The Knot, WeddingWire, Junebug are primary citation sources alongside GBP. Review velocity on The Knot is worth tracking separately.
- **Contractor:** GBP, Angi, HomeAdvisor, Houzz, BBB. Local yellow-page-style directories still matter in this category.
- **Preschool:** GBP, greatschools.org, city-data.com, local parent community sites. Local Facebook groups drive material discovery.
- **Restaurant:** GBP, Yelp, OpenTable, Resy are the big four. TripAdvisor for tourism-adjacent restaurants.
- **Professional services:** GBP for location-based services; LinkedIn and industry-specific directories matter more than traditional citations.

---

### Section 5: Answer Engine Optimization (AEO)

**Purpose:** The newer discipline of optimizing for AI-powered search answers — Google's AI Overviews, Perplexity, ChatGPT answers, Gemini, and any AI search that pulls from web content to compose answers.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 5. Answer Engine Optimization (AEO)

### Why AEO matters now

AI-powered search is capturing an increasing share of question-based queries. A couple asking "what's the best wedding venue in the Hudson Valley for 150 guests" might now get an AI-synthesized answer that cites a few specific venues, bypassing the traditional top-10 list entirely. Businesses cited in AI answers get discovered; businesses that aren't, don't. Structuring content for AI extraction is increasingly important alongside traditional SEO.

### Question-format keywords to target

Search intent that's phrased as a question. These are the keywords AI answer engines most reliably quote.

| Question | Monthly volume | Current answer status (Google AI / Perplexity) | Content asset needed |
|---|---|---|---|
| [Question] | [#] | [Who's being cited, or "no current answer"] | [FAQ entry, blog post, landing page] |

### Content formatting for AEO

Content that ranks well in AI answers tends to:
- Answer the question directly in the first sentence of the relevant section
- Use clear headings that match question phrasing
- Include specific numbers, names, and facts (not vague claims)
- Use structured data (FAQ schema, HowTo schema, Organization schema)
- Be recent (freshness is weighted heavily by AI answer engines)

Specific content formatting recommendations for this business: [Client-specific guidance]

### Schema markup priorities

- [ ] Organization schema (NAP, hours, social profiles)
- [ ] LocalBusiness schema (for location-based businesses)
- [ ] FAQ schema (on the FAQ page and on pages answering specific questions)
- [ ] Review/AggregateRating schema (if review counts and ratings are shown on site)
- [ ] Product / Service schema (for specific offerings)
- [ ] HowTo schema (for instructional content, if applicable)
- [ ] Event schema (for venues hosting dated events)
- [ ] Article schema (for blog posts)

### Current schema implementation
[Audit of what's implemented today and what's missing. Usually, small business websites have Organization schema via a theme default and nothing else.]
```

---

### Section 6: Content Production Plan

**Purpose:** The actual calendar of content to produce against the keyword targets in Sections 2-5. This is where strategy becomes execution.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 6. Content Production Plan

### Content production cadence
- **Recommended frequency:** [Posts per week or month]
- **Current cadence:** [What the business is doing today]
- **Gap to close:** [How much production capacity needs to expand]

### First 90-day content calendar

The specific content pieces to produce in the first 90 days, each tied to a keyword target.

| Post # | Publish week | Title (working) | Target keyword | Keyword volume | Format | Length | Owner |
|---|---|---|---|---|---|---|---|
| 1 | Week 1 | [Title] | [Keyword] | [#] | [Blog / Landing page / Pillar page / FAQ] | [Word count] | [Who writes it] |
| 2 | Week 1 | [Title] | [Keyword] | [#] | [Format] | [Length] | [Owner] |
| [Continue for 8-16 pieces covering 90 days] | | | | | | | |

### Content pillars (topic territories)

The 3-5 content pillars the site should own. Each pillar is a cluster of related content that together builds topical authority.

**Pillar 1: [Topic]**
- Pillar page: [Title / URL]
- Supporting posts: [List of 5-10 supporting content pieces]
- Internal linking strategy: [How posts link back to the pillar]

[Repeat for each pillar.]

### Content repurposing
- **Blog to social:** [How blog posts become social content]
- **Blog to email:** [How blog content feeds newsletters]
- **Video to blog:** [If video is the primary medium, how it becomes text]

### Editorial guidelines (brief)
- **Target length by format:** [Blog 1,200-2,000; FAQ answers 150-300; landing pages 800-1,500]
- **Optimization requirements:** [Title tag, meta description, H1, internal links per post, external links]
- **Voice and style:** [Reference Document 01 Brand Voice Guide]
```

**Joshua's note on using AI for content production:** Claude produces the first draft; Joshua or a subcontractor edits; the client reviews and signs off. Content produced at scale by AI alone without human editing and voice calibration produces generic output that Google's AI overviews deprioritize. The voice work in Document 01 is what makes AI-assisted content production effective.

---

### Section 7: Technical SEO Priorities

**Purpose:** The site-level technical work that needs to happen for any SEO strategy to actually convert into rankings.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 7. Technical SEO Priorities

### Current technical health

**Core Web Vitals (from Google Search Console):**
- Largest Contentful Paint (LCP): [Pass / Fail, with ms]
- Cumulative Layout Shift (CLS): [Pass / Fail, with score]
- Interaction to Next Paint (INP): [Pass / Fail, with ms]

**Indexation:**
- Pages indexed: [#]
- Pages excluded from indexing: [#]
- Indexing errors to resolve: [#]

**Mobile usability:**
- [Pass / Fail with specific issues]

**HTTPS and security:**
- [Pass / Fail]

### Top technical issues to resolve

Prioritized list of specific technical fixes.

| Issue | Severity | Effort | Impact |
|---|---|---|---|
| [Issue] | [High / Medium / Low] | [Hours to fix] | [Rankings / traffic / conversion] |

### Site structure recommendations
[URL structure, internal linking patterns, breadcrumbs, navigation hierarchy. Often becomes input for Website Audit (Doc 11).]

### Sitemap and robots.txt
- Sitemap status: [Current / outdated / missing]
- robots.txt status: [Correct / blocking too much / blocking too little]

### Analytics and tracking
- **GA4 or equivalent:** [Installed / missing / misconfigured]
- **Google Search Console:** [Connected / unconnected]
- **Conversion tracking:** [Set up / not set up]
- **Recommended additions:** [Umami or similar for privacy-preserving analytics, if relevant]
```

---

### Section 8: Measurement and Reporting

**Purpose:** How SEO progress will be tracked and reported. Ties into Document 12 (Measurement and KPI Framework).

**Word count target:** 150-300 words.

**Required structure:**

```markdown
## 8. Measurement and Reporting

### Baseline metrics (as of [date])

| Metric | Baseline |
|---|---|
| Domain Rating | [#] |
| Organic keywords ranking | [#] |
| Estimated organic traffic | [#/month] |
| Keywords in top 10 | [#] |
| Keywords in top 3 | [#] |
| Backlinks | [#] |
| Referring domains | [#] |
| Branded search volume | [#/month] |

### 90-day targets

| Metric | Target |
|---|---|
| Organic keywords ranking | [#] |
| Estimated organic traffic | [#/month] |
| Keywords in top 10 | [#] |
| Content pieces published | [#] |
| Core Web Vitals | [All passing] |

### 12-month targets

| Metric | Target |
|---|---|
| Domain Rating | [#] |
| Estimated organic traffic | [#/month] |
| Keywords in top 3 for primary targets | [# of primary keywords in top 3] |
| Long-tail keyword footprint | [#] |
| Backlinks | [#] |

### Reporting cadence
- **Monthly:** [What gets reported monthly]
- **Quarterly:** [What gets reviewed quarterly]
- **Annually:** [Full strategy refresh]

### Tools used for measurement
- Google Search Console
- Google Analytics (GA4) or Umami
- Ahrefs
- [Any others specific to the engagement]
```

---

## How to Build This Document

The full process, in order. Total time: 3-4 hours.

### Step 1: Pre-Build Access Check (15 minutes)

Before doing any building, confirm access to:
- Ahrefs (for competitive and keyword data)
- Google Search Console (for actual performance data)
- Google Analytics / Umami (for conversion data)
- The client's website admin (for schema/technical audit)
- Google Business Profile (for local SEO audit)

If Google Search Console isn't connected or the client doesn't have access, that's the first thing to set up. Without GSC data, Section 1 (Current Performance) is speculation.

### Step 2: Baseline Pull (45 minutes)

Pull all the baseline numbers:

1. **From Ahrefs:** Domain Rating, organic keywords, organic traffic estimate, backlinks, referring domains, top pages, top keywords
2. **From GSC:** Top-performing queries (last 90 days), pages with impressions but low clicks, pages ranking in positions 11-30, total indexed pages
3. **From GA4/Umami:** Organic traffic volume, top landing pages by organic, conversion metrics by landing page
4. **From GBP insights:** Calls, direction requests, website clicks over last 30/90 days

### Step 3: Keyword Gap Analysis (45 minutes)

Using the Competitor Landscape Brief (Document 05), look at keyword gaps identified there. Expand that list using Ahrefs:

- Ahrefs → "Content Gap" for 3 top competitors
- Ahrefs → "Matching Terms" on primary topic keywords
- GSC → queries the site has impressions on but weak position (positions 11-30 especially)

Output: A working list of 40-80 candidate keywords with volume, difficulty, and current position.

### Step 4: Cluster and Prioritize (30 minutes)

Group the 40-80 candidate keywords into topic clusters. For each cluster:
- Identify which keywords are primary targets (Section 2)
- Identify which keywords are long-tail opportunities (Section 3)
- Identify which keywords have question format (Section 5)
- Discard keywords that don't fit the business

### Step 5: Local SEO Audit (30 minutes)

Audit the client's local SEO presence:
- GBP profile completeness
- NAP consistency across major directories
- Review volume and response rate
- Local citation coverage

Use a tool like BrightLocal or do a manual spot-check of top-10 directories.

### Step 6: Technical Audit (30 minutes)

- Core Web Vitals from GSC
- Mobile usability
- Schema markup audit (use schema.org validator or Rich Results Test)
- Sitemap and robots.txt check

### Step 7: Draft Generation (30-45 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate an SEO and Keyword Strategy for [Business Name] using Document Production Spec 06 as the structure. Industry: [industry].

Source materials:

[Paste: baseline metrics pulled from Ahrefs, GSC, GA4]

[Paste: prioritized keyword list with volumes, difficulty, current positions]

[Paste: Competitor Landscape Brief — specifically Section 7]

[Paste: local SEO audit notes]

[Paste: technical audit notes]

[Paste: current content cadence and top-performing existing pages]

Build all 8 sections following the spec. For Section 6 (Content Production Plan), generate a specific 90-day content calendar of 10-14 pieces, each tied to a keyword target with volume, difficulty, format, and length.

Be realistic about timelines and difficulty. If a keyword is difficulty 70+ and the client's DR is 22, that keyword is not a 12-month target — acknowledge this in the rationale.
```

### Step 8: Joshua Review and Sharpen (45 minutes)

Read the full draft. Check:

- Are primary keywords actually winnable given the client's DR?
- Are long-tail keywords clustered in a way that supports pillar content?
- Does the 90-day calendar tie each piece to a specific keyword and is each keyword realistic?
- Are local SEO priorities specific enough to be tasks?
- Is the measurement section realistic (both the baseline and the targets)?

### Step 9: Client Review (20-30 minutes client time)

Send to client with this email:

```
Subject: SEO and Keyword Strategy — what we're going after

Attached: the SEO and Keyword Strategy for [Business Name].

This document is the roadmap for the next 90 days of content and the next 12 months of organic growth. It's the bridge between "we know who our competitors are" and "here's specifically what we publish, when, and why."

Two asks:

1. Read Section 6 (Content Production Plan). That's the 90-day calendar. Tell me if any topics feel wrong for your brand, or if there's a topic you'd reorder toward the top.

2. Read Section 2 (Primary Keyword Targets). Confirm those are the terms you most want to be found for.

The rest is reference material — you don't need to memorize it, but skim so you know where to look when we reference it.
```

### Step 10: Final Edits and Delivery (15 minutes)

- Apply client edits
- Save with naming convention `[client-slug]-06-seo-keyword-strategy-v1.0.md`
- Upload to client's Claude Project as knowledge

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 8 sections are complete
- [ ] Current Performance baseline includes real data from Ahrefs, GSC, and GA4 (not owner recall)
- [ ] Primary Keyword Targets section lists 3-5 keywords with volume, difficulty, and realistic 12-month target positions
- [ ] Long-tail opportunities are clustered into 4-8 topic territories
- [ ] Local SEO section includes GBP audit, NAP consistency audit, and review strategy
- [ ] AEO section identifies question-format keywords and recommends schema markup
- [ ] Content Production Plan includes a specific 90-day calendar of 10-14 pieces
- [ ] Technical SEO section includes Core Web Vitals audit and specific issues to resolve
- [ ] Measurement section has baseline metrics and both 90-day and 12-month targets
- [ ] Cross-reference pass against Competitor Landscape Brief complete (keyword gaps covered)
- [ ] Cross-reference pass against Brand Voice Guide complete (content topics align with brand)
- [ ] Client has reviewed and approved
- [ ] File saved with correct naming convention and uploaded to Claude Project

---

## Common Failure Modes

**Failure 1: Primary keywords are too competitive.** The client's DR is 18 and the primary target is a DR-60 keyword. The strategy fails because nothing moves. Fix: target keywords within 15-20 DR points of the client's current authority.

**Failure 2: Content calendar isn't tied to specific keywords.** Each post is a topic idea with no clear search target. Content gets produced but rankings don't improve. Fix: every post in Section 6 must have a target keyword with volume in the table.

**Failure 3: Local SEO is treated as an afterthought.** For location-based businesses, local SEO drives 60%+ of discovery. If Section 4 is thin, the strategy is missing its biggest lever. Fix: for any local business, Section 4 should be at least as long as Section 2.

**Failure 4: AEO is ignored.** AI answer engines are already capturing question-based queries. Sites not structured for AEO get left out of AI answers. Fix: Section 5 is required, not optional.

**Failure 5: Baseline metrics are speculation.** "Estimated traffic" without GSC data is guesswork. The targets built on that baseline are also guesswork. Fix: never build this document without GSC access.

**Failure 6: Difficulty is underestimated.** Low-volume keywords get selected because they look easy, but many low-volume keywords are actually dominated by huge authority sites. Fix: check the SERP manually for a sample of targets. If the SERP is dominated by Wikipedia, Forbes, and huge authority sites, the keyword isn't winnable regardless of Ahrefs difficulty.

**Failure 7: Technical issues aren't prioritized against impact.** A strategy recommends fixing 40 technical issues, but the highest-impact issue is mobile Core Web Vitals. Fix: Section 7 prioritizes by impact, not by volume of issues.

---

## Worked Example: Audrey's Farmhouse SEO and Keyword Strategy

The following is a complete sample of what a finished SEO and Keyword Strategy looks like.

---

# Audrey's Farmhouse SEO and Keyword Strategy

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last SEO audit:** April 2026
**Next scheduled refresh:** July 2026 (quarterly performance); April 2027 (annual strategy)

**For:** Content production, landing page builds, website optimization, local SEO work, and AI-generated content that needs to target specific search demand.

**Companion documents:**
- Document 02: Business Facts Reference
- Document 04: Content Library
- Document 05: Competitor Landscape Brief
- Document 11: Website Audit

**Critical principle:** This strategy is realistic. It targets keywords Audrey's can actually win in 12 months given the current DR of 22.

---

## 1. Current Performance Baseline

### Domain-level metrics
- **Domain Rating (Ahrefs):** 22
- **Estimated organic traffic:** 1,100/month
- **Number of organic keywords:** 460
- **Total backlinks:** 840
- **Referring domains:** 140
- **Indexed pages (Google Search Console):** 78

### Top-performing pages

| Page URL | Target keyword | Current position | Monthly traffic | Status |
|---|---|---|---|---|
| /blog/hudson-valley-fall-weddings | hudson valley fall wedding | 6 | 180 | Performing |
| / (homepage) | audrey's farmhouse | 1 | 160 | Strong branded |
| /blog/wedding-weekend-included | wedding venue weekend included | 11 | 90 | Plateaued — close to page 1 |
| /blog/in-house-catering | in house catering wedding venue | 14 | 70 | Plateaued |
| /venue | hudson valley wedding venue | 38 | 40 | Declining |
| /blog/saturday-vs-friday-wedding | friday vs saturday wedding | 9 | 65 | Performing |
| /lodging | wedding venue with lodging | 28 | 35 | Opportunity |
| /blog/october-light | october wedding hudson valley | 12 | 55 | Plateaued |
| /catering | hudson valley wedding catering | 42 | 25 | Opportunity |
| /blog/choosing-wedding-date | choosing wedding date | 21 | 30 | Low intent but present |

### Top keywords ranking in positions 1-10

| Keyword | Position | Monthly volume |
|---|---|---|
| audrey's farmhouse wedding | 1 | 320 |
| audrey's farmhouse wallkill | 1 | 180 |
| hudson valley fall wedding | 6 | 880 |
| friday vs saturday wedding | 9 | 210 |
| wallkill ny wedding venue | 3 | 90 |

### Keywords ranking in positions 11-30 (high-ROI opportunities)

| Keyword | Current position | Monthly volume | Estimated effort to top 10 |
|---|---|---|---|
| wedding venue weekend included | 11 | 290 | Low — content optimization |
| in house catering wedding venue | 14 | 180 | Low — content optimization |
| boutique hudson valley wedding venue | 16 | 260 | Medium — new content + links |
| wedding venue with lodging hudson valley | 19 | 280 | Medium — pillar page needed |
| october wedding hudson valley | 12 | 410 | Low — content refresh |
| microwedding venue new york | 22 | 310 | Medium — new content |
| small wedding venue hudson valley | 24 | 340 | Medium — new content |
| hudson valley wedding venue | 38 | 2,900 | High — long play |

### Branded vs. non-branded search
- **Branded traffic:** ~340/month (mostly people who heard about the venue searching by name)
- **Non-branded traffic:** ~760/month
- **Ratio:** 31% branded / 69% non-branded — healthy. Discovery is working but brand recognition has room to grow.

### Data sources
Metrics pulled April 2026. Ahrefs data reflects 30-day averages; GSC data is rolling 90-day; GA4 organic sessions confirmed with GSC clicks. Branded/non-branded split from GSC queries filtered for brand name variations.

---

## 2. Primary Keyword Targets

### Core target keywords (3-5)

| Keyword | Monthly volume | Difficulty | Current position | Target position (12 mo) | Rationale |
|---|---|---|---|---|---|
| boutique hudson valley wedding venue | 260 | 28 | 16 | Top 5 | Winnable with DR 22; matches positioning perfectly; high intent |
| wedding venue with on-site lodging hudson valley | 280 | 32 | 19 | Top 5 | Unmatched differentiator; realistic 12-month win |
| wedding venue weekend included | 290 | 26 | 11 | Top 3 | Already close; optimization push moves this |
| in house catering wedding venue hudson valley | 180 | 30 | 14 | Top 5 | Differentiator-driven; aligns with #1 praised feature in reviews |
| microwedding venue catskills | 240 | 18 | 22 | Top 3 | Low difficulty, under-served, own-the-niche opportunity |

### Why these and not others

The strategy prioritizes keywords that are (1) already close to page 1 (positions 11-30) where small pushes deliver outsized traffic gains, (2) aligned with Audrey's actual differentiators rather than generic "wedding venue" head terms, and (3) realistically winnable given DR 22. Head terms like "hudson valley wedding venue" (volume 2,900, current position 38) are a longer-term play — target for 12-18 months, not 6.

### Keywords explicitly NOT being targeted (and why)

- **"luxury hudson valley wedding venue"** — Volume 140/mo but difficulty 45. Stonecroft owns this; trying to compete on the "luxury" frame is the wrong positioning.
- **"cheap wedding venue hudson valley"** — Volume 210/mo but wrong customer. Audrey's isn't a value play.
- **"all inclusive wedding venue ny"** — Volume 380/mo but we're not all-inclusive (catering and bar are in-house but lodging and other add-ons are separate line items). Targeting this creates expectation mismatch.

---

## 3. Long-Tail Keyword Opportunities

### Cluster: Weekend wedding format
- Parent keyword: "weekend wedding venue"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | weekend wedding venue hudson valley | 140 | 22 | Commercial | Landing page + blog |
  | what is a weekend wedding | 320 | 14 | Informational | Blog post, AEO target |
  | two day wedding venue ny | 110 | 18 | Commercial | Blog post |
  | friday rehearsal dinner venue hudson valley | 90 | 16 | Commercial | Blog post |
  | sunday brunch wedding venue hudson valley | 70 | 15 | Commercial | Blog post |

### Cluster: Microwedding and small weddings
- Parent keyword: "microwedding venue"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | microwedding venue catskills | 240 | 18 | Commercial | Landing page (/microweddings) |
  | intimate wedding venue hudson valley | 180 | 24 | Commercial | Blog + landing page refresh |
  | weekday wedding venue ny | 130 | 20 | Commercial | Blog post |
  | 30 guest wedding venue hudson valley | 70 | 14 | Commercial | Blog post |
  | elopement venue catskills | 160 | 22 | Commercial | Landing page + blog |

### Cluster: In-house catering
- Parent keyword: "in-house catering wedding venue"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | in house catering wedding venue hudson valley | 180 | 30 | Commercial | Landing page refresh |
  | wedding venue that provides food | 220 | 28 | Informational/commercial | Blog post |
  | farm to table wedding catering hudson valley | 90 | 20 | Commercial | Blog post (chef feature) |
  | how much does wedding catering cost hudson valley | 140 | 26 | Informational, high intent | Blog post, AEO target |

### Cluster: Seasonal wedding content
- Parent keyword: "hudson valley wedding by season"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | october wedding hudson valley | 410 | 28 | Mixed | Refresh existing post |
  | september wedding hudson valley | 290 | 24 | Mixed | New blog post |
  | spring wedding venue hudson valley | 180 | 22 | Commercial | New blog post |
  | winter wedding hudson valley | 140 | 20 | Mixed | New blog post |

### Cluster: On-site lodging
- Parent keyword: "wedding venue with lodging"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | wedding venue with rooms for guests | 320 | 30 | Commercial | Pillar page |
  | wedding venue with on-site rooms hudson valley | 150 | 24 | Commercial | Landing page refresh |
  | wedding venue with accommodations for 40 guests | 80 | 18 | Commercial | Blog post |
  | overnight wedding venue hudson valley | 110 | 22 | Commercial | Blog post |

### Cluster: Destination-feel content
- Parent keyword: "destination wedding feel hudson valley"
- Target long-tail keywords:
  | Keyword | Monthly volume | Difficulty | Intent | Content angle |
  |---|---|---|---|---|
  | destination wedding feel without travel | 90 | 16 | Informational | Blog post, conversion angle |
  | wedding venue 90 minutes from nyc | 140 | 20 | Commercial | Blog post |
  | catskills wedding venue near nyc | 180 | 22 | Commercial | Blog post |

### Total long-tail opportunity
- **Combined monthly search volume across all clusters:** ~4,500
- **Estimated traffic if top-3 positions achieved for half:** 900-1,200/month (roughly doubling current organic traffic)
- **Estimated timeframe:** 6-9 months to meaningful traffic gains; 9-12 months for full cluster authority

---

## 4. Local SEO Strategy

### Google Business Profile status
- **Profile claimed:** Yes
- **Primary category:** "Wedding venue"
- **Secondary categories:** "Event venue," "Bed & breakfast" (the second is incorrect — should be removed)
- **Hours accuracy:** Correct
- **Photos:** 62 photos uploaded; last photo added 7 months ago (stale)
- **Posts (GBP Posts feature):** Inactive
- **Q&A section:** 3 questions, 1 unanswered
- **Service/product listings:** Not populated

### Google Business Profile optimization priorities

1. Remove "Bed & breakfast" secondary category (incorrect; signals wrong intent)
2. Add services: "Wedding venue rental," "Weekend wedding package," "Microwedding venue," "In-house catering"
3. Begin weekly GBP Posts cadence — announcements, seasonal content, availability notes
4. Upload a fresh batch of 30+ recent wedding photos (last 6 months)
5. Seed 8-10 Q&A entries with the most common customer questions (pulls from the FAQ Bank when it's built)

### NAP consistency

**Primary NAP:**
- Name: Audrey's Farmhouse
- Address: [Exact address, Wallkill, NY 12589]
- Phone: [Exact phone]

**Citation audit summary:**
- **Consistent citations:** 18 directories (The Knot, WeddingWire, Junebug, Yelp, GBP, Facebook, Instagram, YellowPages, Foursquare, Yelp, BBB, plus 8 industry directories)
- **Inconsistent citations:** 4 directories have the old phone number (from 2022)
- **Missing high-value citations:** Zola (not listed), Here Comes The Guide (not listed), LocalWeddings.com (not listed)

### Review strategy
- **Target review volume:** 3-5 new reviews/month across Google + The Knot
- **Review request process:** Currently manual post-wedding ask; should be automated via HoneyBook two weeks after the event
- **Review response policy:** Respond to every review within 7 days; response rate currently 95% on Google
- **Priority platforms:** GBP primary, The Knot secondary, WeddingWire tertiary

### Local content strategy
- **Geographic modifiers to target:** "Hudson Valley," "Catskills," "Ulster County," "Wallkill," "New Paltz" (nearby town people search near Audrey's), "Kingston," "90 minutes from NYC"
- **Local partnership opportunities:**
  - Hudson Valley Wedding Professionals Association (already a member; underused)
  - Visit Ulster County tourism site (no current listing)
  - Local wedding planner blogs (4-5 active regional planners publish content that could include Audrey's)
  - Local lifestyle publications (Hudson Valley Magazine, Chronogram)

---

## 5. Answer Engine Optimization (AEO)

### Why AEO matters for Audrey's

Couples are increasingly asking conversational questions to AI tools during wedding planning ("best hudson valley wedding venue for a weekend wedding," "hudson valley wedding venue with on-site lodging for 150 guests," "what's the average cost of a hudson valley wedding"). These queries don't always land on Google's traditional top-10 list — they often route to AI Overviews or Perplexity, which synthesize answers from a handful of cited sources. Audrey's needs to be cited.

### Question-format keywords to target

| Question | Monthly volume | Current AI answer status | Content needed |
|---|---|---|---|
| what is a weekend wedding | 320 | No dominant source; AI pulls from weddingwire generically | Dedicated blog post + FAQ |
| how much does a hudson valley wedding cost | 490 | The Knot's generic range article gets cited | Specific cost breakdown blog post (high-value AEO target) |
| what's included in a wedding venue rental | 540 | Varies; generic answers | Blog post structured for AEO |
| wedding venue with on-site rooms for guests | 220 | No clear answer being cited | Landing page optimized for AEO |
| best hudson valley wedding venue for small wedding | 140 | The Knot venue roundups | Blog + landing page |
| can you do a weekend wedding in hudson valley | 110 | No answer; Audrey's owns this | Blog post + dedicated landing page |

### Content formatting for AEO

Every Audrey's blog post from here forward should follow this structure for AEO optimization:
- Open the post with a 1-2 sentence direct answer to the question in the H1/title
- Use H2 headings that mirror likely sub-questions
- Include specific numbers and facts (exact pricing ranges, exact capacities, exact policies) rather than adjectives
- Add FAQ schema to the end of every post with 3-5 related questions answered concisely
- Include last-updated dates prominently (AI engines weight freshness heavily)

### Schema markup priorities

- [x] Organization schema (currently implemented via Next.js default)
- [ ] LocalBusiness schema — **missing, high priority**
- [ ] FAQ schema — **missing, required for AEO**
- [ ] AggregateRating schema from reviews — **missing, high impact**
- [ ] Event schema for any hosted events (open houses, tasting events) — **missing**
- [x] Article schema on blog posts (implemented)
- [ ] HowTo schema on planning-guide content — **missing**

Current schema implementation is basic (Organization only). Adding LocalBusiness, FAQ, and AggregateRating is the top technical SEO priority and should happen in the first 30 days.

---

## 6. Content Production Plan

### Content production cadence
- **Recommended frequency:** 1 blog post per week (52 per year)
- **Current cadence:** 1 per quarter (4-5 per year)
- **Gap to close:** Need to scale 10x. This requires either a content subcontractor, Joshua producing on a retainer basis, or an AI-assisted production workflow with human editing.

### First 90-day content calendar

| # | Week | Title (working) | Target keyword | Volume | Format | Length | Owner |
|---|---|---|---|---|---|---|---|
| 1 | W1 | What Is a Weekend Wedding (And Why Hudson Valley Couples Are Choosing Them) | what is a weekend wedding | 320 | Blog post + AEO | 1,800 | Claude draft / Joshua edit |
| 2 | W2 | How Much Does a Hudson Valley Wedding Cost in 2026 | how much does a hudson valley wedding cost | 490 | Blog post + AEO | 2,200 | Claude draft / Joshua edit |
| 3 | W3 | Microwedding Venues in the Catskills: A Complete Guide | microwedding venue catskills | 240 | Pillar page | 2,400 | Claude draft / Joshua edit |
| 4 | W4 | What's Included in Our Wedding Venue Rental (Updated for 2026) | what's included in a wedding venue rental | 540 | Blog refresh from existing | 1,600 | Joshua |
| 5 | W5 | Hudson Valley Wedding Venues with On-Site Lodging for Guests | wedding venue with on-site rooms for guests | 220 | Landing page refresh | 1,400 | Joshua |
| 6 | W6 | In-House Catering vs BYO: What Hudson Valley Couples Should Know | in house catering wedding venue hudson valley | 180 | Blog post | 1,800 | Claude draft / Joshua edit |
| 7 | W7 | What a Farm-to-Table Wedding Menu Actually Looks Like | farm to table wedding catering hudson valley | 90 | Blog post (chef feature) | 1,600 | Joshua |
| 8 | W8 | September vs October: Choosing the Best Fall Wedding Date | september wedding hudson valley | 290 | Blog post | 1,400 | Claude draft / Joshua edit |
| 9 | W9 | Hudson Valley Wedding Venue for 90 Minutes from NYC | wedding venue 90 minutes from nyc | 140 | Blog post | 1,400 | Claude draft / Joshua edit |
| 10 | W10 | How to Plan a Two-Day Wedding at a Hudson Valley Venue | two day wedding venue ny | 110 | Blog post | 1,800 | Claude draft / Joshua edit |
| 11 | W11 | 30 Guest Wedding Venues: Small Weddings Done Right in Hudson Valley | 30 guest wedding venue hudson valley | 70 | Blog post | 1,400 | Claude draft / Joshua edit |
| 12 | W12 | Spring Weddings in the Hudson Valley: A Guide | spring wedding venue hudson valley | 180 | Blog post | 1,600 | Claude draft / Joshua edit |

### Content pillars (topic territories)

**Pillar 1: Weekend Wedding Format**
- Pillar page: /weekend-wedding (build in month 2)
- Supporting posts: #1, #4, #5, #10 from calendar
- Internal linking: all supporting posts link to pillar page; pillar links out to supporting posts

**Pillar 2: Microwedding and Intimate Weddings**
- Pillar page: /microweddings (build in month 1)
- Supporting posts: #3, #11; plus future posts on elopement, weekday weddings
- Internal linking: all supporting posts link to pillar

**Pillar 3: In-House Catering and Food**
- Pillar page: /catering (refresh existing in month 1)
- Supporting posts: #6, #7; plus future posts on seasonal menus, dietary accommodations
- Internal linking: all supporting posts link to pillar

**Pillar 4: Hudson Valley / Catskills Context**
- Pillar page: /hudson-valley-wedding-venue (new)
- Supporting posts: #2, #8, #9, #12; plus future posts on seasonal content
- Internal linking: all supporting posts link to pillar

### Content repurposing

- **Blog to social:** Each published blog produces 3 Instagram posts (hero image + 2 quote pulls) and 1 Reel
- **Blog to email:** Each published blog headlines a monthly newsletter with 3-4 post summaries
- **Existing video to blog:** Property tour video becomes 2 blog posts (full-length walkthrough + short-form tour narrative)

### Editorial guidelines

- **Target length by format:** Blog 1,400-2,400 words; FAQ answers 150-300; landing pages 1,000-1,600
- **Optimization requirements per post:** Title tag includes target keyword, meta description 150-160 chars, H1 matches title, 3-5 internal links, 1-2 external citations, FAQ schema, image alt text
- **Voice and style:** Reference Document 01 Brand Voice Guide. Grounded, first-person, no em dashes, no banned marketing words, real numbers over adjectives.

---

## 7. Technical SEO Priorities

### Current technical health

**Core Web Vitals (from Google Search Console):**
- LCP: Pass (2.1s)
- CLS: Pass (0.08)
- INP: Pass (160ms)

**Indexation:**
- Pages indexed: 78
- Pages excluded: 12 (most are duplicates from old blog migrations)
- Indexing errors to resolve: 2

**Mobile usability:** Pass across all pages
**HTTPS:** Pass

### Top technical issues to resolve

| Issue | Severity | Effort | Impact |
|---|---|---|---|
| Missing LocalBusiness and FAQ schema | High | 4 hours | Rankings + AEO inclusion |
| 12 duplicate URLs from old blog migration | Medium | 3 hours | Crawl budget + indexation |
| 4 citations with outdated phone number | Medium | 1 hour | Local SEO |
| 8 blog posts with no meta description | Low | 2 hours | CTR |
| No sitemap submitted in GSC for video content | Medium | 1 hour | Video SEO |

### Site structure recommendations

Current structure is flat (all pages are top-level). Recommend introducing hierarchy:
- /weddings (parent) → /weddings/microwedding, /weddings/weekend, /weddings/elopement
- /blog (parent) → /blog/[slug] (current)
- /about (parent) → /about/team, /about/property, /about/history

### Sitemap and robots.txt
- Sitemap status: Current XML sitemap exists and is submitted to GSC. Recommend adding a video sitemap for the Mux-embedded content.
- robots.txt status: Correctly allows crawling. No issues.

### Analytics and tracking
- **GA4:** Installed and configured
- **Google Search Console:** Connected, property verified
- **Conversion tracking:** Partial — form submissions tracked via HoneyBook; Cal.com tour bookings not currently tracked as a conversion in GA4
- **Recommended additions:** Add Umami as a secondary analytics tool for privacy-preserving insights (avoids GA4's cookie consent friction and provides cleaner engagement data)

---

## 8. Measurement and Reporting

### Baseline metrics (as of April 2026)

| Metric | Baseline |
|---|---|
| Domain Rating | 22 |
| Organic keywords ranking | 460 |
| Estimated organic traffic | 1,100/month |
| Keywords in top 10 | 18 |
| Keywords in top 3 | 6 |
| Backlinks | 840 |
| Referring domains | 140 |
| Branded search volume | 340/month |

### 90-day targets (by July 2026)

| Metric | Target |
|---|---|
| Organic keywords ranking | 650 |
| Estimated organic traffic | 1,800/month |
| Keywords in top 10 | 28 |
| Content pieces published | 12 |
| Core Web Vitals | All passing (already achieved) |
| Schema markup implemented | LocalBusiness + FAQ + AggregateRating |

### 12-month targets (by April 2027)

| Metric | Target |
|---|---|
| Domain Rating | 28-30 |
| Estimated organic traffic | 3,500-4,000/month |
| Keywords in top 3 for primary targets | 3 of 5 primary keywords in top 3 |
| Long-tail keyword footprint | 900+ keywords |
| Backlinks | 1,400+ |
| Content pieces published | 50+ |

### Reporting cadence

- **Monthly:** GSC performance (clicks, impressions, avg. position); Ahrefs organic traffic and keyword count; new content published; backlink acquisition
- **Quarterly:** Keyword ranking review (primary targets + long-tail clusters); content performance (top posts by traffic); technical audit spot-check; competitor position comparison
- **Annually:** Full strategy refresh — reassess primary targets, cluster performance, and overall authority trajectory

### Tools used for measurement
- Google Search Console (authoritative)
- Google Analytics 4 (traffic and conversion)
- Ahrefs (competitive and backlink)
- BrightLocal or manual audit (local SEO quarterly)

---

## End of Worked Example

The example above is a complete reference SEO and Keyword Strategy. The strongest indicator of a thorough job: Section 6 (Content Production Plan) includes a specific 12-week calendar where every piece is tied to a keyword with volume, not a vague topic idea.
