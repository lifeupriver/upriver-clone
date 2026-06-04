# Document Production Spec 10: Website Content Audit and Recommendations

## What This Spec Is

This is the production specification for Document 10 of the 12-document AI Operating System. It tells anyone building this document exactly what goes in, what each section looks like, and how to know when it's done.

The Website Content Audit and Recommendations document evaluates the client's website page-by-page against everything else in the AI Operating System — voice, facts, SEO targets, customer search behavior, competitive positioning, sales process integration, and content inventory. It's the document that translates strategy into "here's what specifically needs to change on your website and in what priority." Without this document, the website drifts out of sync with the rest of the operating system, or improvements get made in ad-hoc ways that don't compound.

This is the document most likely to trigger substantial production work — whether that's a page rewrite, a new page build, or a full website rebuild. The audit surfaces exactly what the investment would be.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 10 of 12 |
| **Priority** | High |
| **Total length target** | 3,000-6,000 words |
| **Total time to produce** | 4-6 hours |
| **Joshua's time** | 3-4 hours |
| **Claude's time** | 45-60 minutes |
| **Client's time** | 30-45 minutes |
| **Delivery format** | Markdown file loaded into client's Claude Project |
| **File naming convention** | `[client-slug]-10-website-audit.md` |
| **Foundation for** | Document 11 (Automation Spec Package); also scope document for any website build/rebuild engagement |

---

## When This Document Gets Built

**Phase 3 of engagement, Week 3.** Built after Documents 01-09 are in place. This is the document that integrates everything.

**Triggers:** All prerequisite documents delivered. Full access to the current website.

**Blocks:** Automation Spec Package (Document 11). Also a hard prerequisite for any rebuild engagement.

---

## Section-by-Section Template

### Header Block

```markdown
# [Business Name] Website Content Audit and Recommendations

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Website URL audited:** [URL]
**Website platform:** [Squarespace / WordPress / Wix / Webflow / Custom]
**Last site-wide audit:** [Month Year]
**Next scheduled audit:** [Month Year — annual default]

**Companion documents:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 11.

**Critical principle:** Every recommendation in this document must tie back to another document in the operating system. Recommendations are never "I think this would be better" — they're "this page fails the Brand Voice Guide test on paragraph 3" or "this page doesn't target its assigned SEO keyword from Document 06."
```

---

### Section 1: Website Structural Overview

**Purpose:** The architecture of the site today. What pages exist, how they're organized.

**Word count target:** 300-500 words.

Required content:
- Current sitemap (hierarchical list of every public page)
- Navigation structure (primary, footer, CTAs, mobile differences)
- Platform and technical baseline (platform, theme, responsive status, page speed scores, SSL, analytics, schema markup presence)
- Information architecture assessment (2-3 paragraphs: does current architecture serve the customer journey from Document 03?)

**How to source:** Manual browse, Screaming Frog crawl for larger sites, Google Search Console pages report, Lighthouse audit.

---

### Section 2: Page-by-Page Audit

**Purpose:** The heart of the document. Structured audit of every significant page against the operating system's standards.

**Word count target:** 1,000-3,000 words depending on site size.

For each significant page (typically 10-20 pages), include:

```markdown
### Page: [URL]

**Role in funnel:** [Per Document 03]
**SEO target (per Document 06):** [Primary keyword; secondary keywords]

**Current state assessment:**

| Dimension | Assessment | Evidence |
|---|---|---|
| Brand voice alignment | [Strong / Drifting / Fails] | [Specific examples] |
| Factual accuracy | [Accurate / Partial / Outdated] | [Examples] |
| SEO optimization | [Optimized / Partial / Weak] | [Title tag, H1, meta description] |
| Customer-journey fit | [Serves / Confuses / Doesn't match] | [Examples] |
| Mobile experience | [Strong / Functional / Broken] | [Specifics] |
| Conversion elements | [Clear CTA / Confused CTA / No CTA] | [Specifics] |
| Content freshness | [Current / Stale / Abandoned] | [Last visible update] |

**What's working:** [Specific strengths to preserve]
**What's broken:** [Specific issues]

**Recommendations:**
- **P0 (must fix):** [Specific edits with rationale]
- **P1 (should fix):** [Specific edits]
- **P2 (nice to have):** [Specific edits]

**Estimated effort:** [Light / Medium / Heavy]
**Who can do this:** [Joshua / client / needs developer / needs designer]
```

**Which pages to audit:** Homepage (always), every top-level navigation page (always), primary service pages, top 10-15 by organic traffic, sales-critical pages (pricing, contact, scheduling), key blog posts ranking for target keywords.

---

### Section 3: Homepage Deep Dive

**Purpose:** The homepage deserves separate treatment as the first impression for most visitors.

**Word count target:** 400-700 words.

Required content:
- Current homepage structure (section-by-section walkthrough top to bottom)
- Five-second test (can a customer determine what the business does, who it's for, why different, what to do next, within 5 seconds?)
- Voice assessment (paste current headline + first two paragraphs; test against Brand Voice Guide)
- Differentiation assessment (does the homepage claim the open positioning space from Document 05?)
- Conversion path assessment (how many clicks from homepage to conversion; friction points)
- Homepage-specific recommendations (P0/P1/P2)
- Recommended homepage structure if major rework warranted

---

### Section 4: Critical Content Gaps

**Purpose:** Content that needs to exist on the site but doesn't.

**Word count target:** 300-500 words.

Required content:

**Missing pages (must be built):** For each missing page: role it would serve, target keyword from Document 06, length target, content brief (3-5 bullets), priority, effort estimate.

**Missing content within existing pages:** Content holes in existing pages.

**Missing FAQ entries:** Cross-reference Document 07; which approved FAQ answers are not yet on the website.

**Missing schema markup and metadata:**
- Organization schema
- LocalBusiness schema (critical for local SEO)
- Product/Service schema
- FAQ schema (pairs with FAQ Bank content)
- Review/AggregateRating schema

---

### Section 5: Technical SEO Audit

**Purpose:** Site health issues affecting rankings and user experience.

**Word count target:** 200-400 words.

Required content:

**Core Web Vitals:** LCP, FID/INP, CLS for desktop and mobile vs. targets.

**Indexation:** Pages in index, intentional exclusions, unintentional exclusions with causes, duplicate content issues.

**On-page technical elements:** Title tag formatting, meta descriptions, H1 usage, image alt text, internal linking, broken links, redirect chains.

**Mobile-specific issues:** Tap targets, menu usability, form friction.

**Accessibility baseline:** Color contrast, alt text, keyboard navigation, ARIA labels.

**Platform-specific limitations:** Limitations the platform imposes on SEO, performance, customization.

**Recommended technical fixes:** Tiered P0/P1/P2.

---

### Section 6: Conversion Element Audit

**Purpose:** The conversion mechanics — forms, CTAs, scheduling links, contact paths.

**Word count target:** 300-500 words.

Required content:

**Primary inquiry form audit:** Location, fields (required vs. optional), length assessment, friction fields, validation, post-submit experience, integration.

**Calendar and scheduling integration:** Cal.com/Calendly presence, accessibility, mobile experience.

**CTA audit (site-wide):** Table with page, primary CTA, language, visibility, assessment.

**CTA consistency:** Are CTAs consistent across the site; do they match page role; are there competing CTAs.

**Contact information accessibility:** Email, phone, address, contact page clarity.

**Conversion recommendations:** Tiered P0/P1/P2.

---

### Section 7: Brand Voice and Copy Audit

**Purpose:** Systematic check of copy against the Brand Voice Guide.

**Word count target:** 300-500 words.

Required content:

**Voice consistency across pages:** Table with each significant page and voice alignment assessment with issues found.

**Banned phrase audit:** For each banned phrase in the Brand Voice Guide, search the site and list instances by page.

**Generic language audit:** Look for "Welcome to...", "At [Business Name], we...", "Our team is dedicated to...", "world-class", throat-clearing openings.

**Headline audit:** For major pages, does the H1 state value specifically, use target keyword, apply brand voice.

**Micro-copy audit:** Button text, form labels, tooltips, error messages.

**Copy recommendations:** Tiered P0/P1/P2.

**Suggested rewrites:** For 2-3 most important pages, include before/after snippets to demonstrate quality bar.

---

### Section 8: Competitive Benchmark

**Purpose:** The site compared to competitors from Document 05.

**Word count target:** 200-400 words.

Required content:

**Competitor website comparison table:** Client vs. 3 competitors on site quality, mobile experience, homepage clarity, content depth, conversion UX, visible pricing, voice differentiation.

**What competitors are doing that the client should consider:** Specific practices worth borrowing.

**What competitors are doing that the client should NOT emulate:** Practices to avoid.

**Where the client's website is ahead:** Strengths to preserve.

**Where the client's website is behind:** Honest gaps.

---

### Section 9: Prioritized Implementation Plan

**Purpose:** The action plan. Everything from Sections 2-8 translated into a sequenced backlog.

**Word count target:** 400-700 words.

Required content:

**P0 backlog (must fix — do first):** Ordered list with task, effort estimate, owner, source section.

**P1 backlog (should fix — do in weeks 2-8):** Same format.

**P2 backlog (nice to have):** Same format.

**Total scope assessment:** Hours by priority tier.

**Options for executing:** Present 2-3 realistic options:
- **Option A: Iterative improvements on current platform** (description, best for, estimated cost/timeline)
- **Option B: Partial rebuild of highest-priority pages** (description, best for, estimated cost/timeline)
- **Option C: Full rebuild (new platform, new design)** (description, best for, estimated cost/timeline)

**Recommendation:** Joshua's opinionated recommendation with reasoning.

**What happens if nothing changes:** Honest assessment of cost of inaction.

**Dependencies and sequencing:** What must happen before what.

---

## How to Build This Document

Total time: 4-6 hours.

**Step 1: Pre-Build Prep (15 min).** Confirm prerequisite documents delivered. Gather access: public URL, admin access, GA, GSC, Ahrefs data from prior docs.

**Step 2: Site Crawl and Technical Baseline (45 min).** Run Screaming Frog (or equivalent) for sites over ~20 pages. Run PageSpeed Insights and Lighthouse on homepage, key service pages, representative blog post. Check GSC for indexation and coverage.

**Step 3: Manual Page-by-Page Audit (90-120 min).** For each page worth auditing (10-20 pages): read end-to-end, test on mobile, check against Brand Voice Guide, Business Facts Reference, SEO Strategy, FAQ Bank. Keep structured notes.

**Step 4: Homepage Deep Dive (30 min).** Run five-second test, walk through section by section, apply all voice/fact/SEO tests.

**Step 5: Gap Analysis (30 min).** Against Documents 06 and 07, identify missing pages, FAQ answers not yet on-site, missing schema.

**Step 6: Competitor Website Comparison (20 min).** Revisit competitor websites from Doc 05. Assess on same dimensions.

**Step 7: Draft Generation (45-60 min, Claude).** Run this prompt:

```
Generate a Website Content Audit and Recommendations document for [Business Name] using Document Production Spec 10 as the structure. Industry: [industry].

Source materials:
[Paste: sitemap and platform details]
[Paste: technical baseline from Screaming Frog + PageSpeed + Lighthouse]
[Paste: page-by-page audit notes for 10-20 pages]
[Paste: homepage deep-dive notes]
[Paste: gap analysis against Documents 06 and 07]
[Paste: competitor website comparison notes]
[Paste: Brand Voice Guide voice + banned phrases, Business Facts Reference, SEO Strategy target keywords]

Build all 9 sections. Every recommendation in Sections 2-8 must tie back to a source document. Section 9 should produce a realistic prioritized backlog with effort estimates, 2-3 execution options, and Joshua's opinionated recommendation.
```

**Step 8: Joshua Review and Sharpen (45 min).** Check every recommendation is source-grounded. This document often needs more sharpening than others — breadth creates risk of generic findings.

**Step 9: Client Review (30-45 min client time).** Send with focus instruction: Section 3 (Homepage Deep Dive), Section 4 (Content Gaps), Section 9 (Implementation Plan).

**Step 10: Scope Conversation (30-60 min client meeting).** Unlike other documents, this triggers a scope conversation. Walk through Section 9 with client. Lock in what's in-scope for current engagement, what becomes separate project, what's deferred.

**Step 11: Final Edits and Delivery (30 min).** Apply client edits and scope decisions. Save with naming convention `[client-slug]-10-website-audit-v1.0.md`.

---

## Definition of Done

- [ ] All 9 sections complete
- [ ] Sitemap documented with every significant page
- [ ] Technical baseline established (Core Web Vitals, indexation, platform-specific notes)
- [ ] 10-20 pages audited with structured scorecard
- [ ] Homepage deep-dive complete with five-second test
- [ ] Critical content gaps identified with target keywords and briefs
- [ ] Technical SEO findings specific and prioritized
- [ ] Conversion element audit includes inquiry form, CTAs, contact accessibility
- [ ] Brand voice audit identifies specific banned-phrase instances
- [ ] Competitor benchmark uses consistent dimensions
- [ ] Implementation plan tiered P0/P1/P2 with effort estimates
- [ ] Every recommendation cites its source document
- [ ] Joshua's opinionated recommendation stated for execution path
- [ ] Client has reviewed and scope decisions locked
- [ ] File saved and uploaded to Claude Project

---

## Common Failure Modes

**Failure 1: Recommendations aren't grounded.** Audit says "improve the homepage" without citing which brand voice attribute or SEO target the homepage fails. Fix: every recommendation ties to a source document.

**Failure 2: Generic findings.** "The website needs to be more modern" isn't actionable. Fix: findings must be specific enough to produce a specific change.

**Failure 3: Too many P0 items.** Everything gets flagged critical; client feels overwhelmed and does nothing. Fix: P0 should be 5-10 items max.

**Failure 4: Technical audit gets glossed.** Section 5 is thin because audit focused on copy. Technical issues can sink rankings independent of copy quality. Fix: run actual tools, document actual metrics.

**Failure 5: Implementation plan doesn't match scope.** Client hires for content refresh; audit proposes full rebuild. Fix: Section 9 presents options matching likely scope appetite.

**Failure 6: No honest assessment of the platform.** Client is on Squarespace; audit recommends fixes requiring code-level access. Fix: platform-specific limitations shape what's realistic in Section 9.

**Failure 7: Audit becomes a sales pitch.** Every item conveniently needs a Joshua-led engagement. Fix: many items are DIY-able or belong with existing team; call this out honestly.

---

## Worked Example: Audrey's Farmhouse Website Content Audit

---

# Audrey's Farmhouse Website Content Audit and Recommendations

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Website URL:** audreysfarmhouse.com
**Website platform:** Squarespace 7.1
**Last site-wide audit:** April 2026
**Next scheduled audit:** April 2027

**Companion documents:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 11.

---

## 1. Website Structural Overview

### Current sitemap

- Home (/)
- About (/about)
- Weddings (/weddings)
- Gallery (/gallery)
- Real Weddings (/real-weddings) — ~18 individual real wedding features
- Blog (/blog) — ~38 individual posts
- FAQ (/faq) — thin, 12 questions (Doc 07 has 30+)
- Contact (/contact)
- Inquiry form (/inquire)

### Navigation structure

- **Primary navigation:** Home | About | Weddings | Gallery | Real Weddings | Blog | FAQ | Contact
- **Footer navigation:** Contact | Inquire | Blog | Real Weddings | Instagram | Privacy | Accessibility
- **CTAs in navigation:** "Inquire" button top right
- **Mobile menu:** Hamburger with same primary nav

### Platform and technical baseline

- **Platform:** Squarespace 7.1
- **Theme:** Hester variant, customized
- **Mobile responsive:** Yes
- **Page speed:** Desktop 62/100 Lighthouse, Mobile 38/100 (below targets)
- **SSL/HTTPS:** Yes
- **Analytics:** GA4 + Squarespace built-in
- **Search Console verified:** Yes
- **Schema markup:** Partial — Organization present; LocalBusiness, FAQ, AggregateRating missing

### Information architecture assessment

Current architecture serves awareness and decision stages reasonably well — Home, Weddings, Gallery introduce the venue. Missing is mid-funnel consideration content: no dedicated pricing page, no "what's included" page, no weekend format page, no comparison-decision content. Customers arriving mid-funnel have to patch together their understanding from the homepage and a blog post.

Navigation is one item too long. FAQ and Real Weddings could live under broader parents or in footer, simplifying primary nav.

---

## 2. Page-by-Page Audit

### Page: / (Homepage)

**Role in funnel:** Awareness + top of consideration
**SEO target:** "boutique wedding venue hudson valley" (Doc 06)

| Dimension | Assessment | Evidence |
|---|---|---|
| Brand voice | Drifting | Hero headline reads "Your magical Hudson Valley wedding begins here" — uses banned "magical" (Doc 01) |
| Factual accuracy | Accurate | Pricing aligns with Doc 02 |
| SEO optimization | Weak | H1 is the logo (no text H1); meta description generic |
| Customer-journey fit | Partial | Strong visual intro but no clear next-step hierarchy |
| Mobile experience | Functional | Hero video doesn't play on mobile Safari — shows black |
| Conversion elements | Confused | Two competing CTAs above fold; two more below |
| Content freshness | Stale | Testimonial carousel references 2022 weddings |

**What's working:** Hero video (desktop) shows property atmosphere well. Three-feature grid lower on page hits Doc 05 differentiators (Weekend Format / On-Site Lodging / In-House Catering).

**What's broken:** Banned phrase in hero. No text H1. Too many competing CTAs. Mobile hero doesn't render video. Testimonials outdated.

**Recommendations:**
- **P0:** Rewrite hero headline per Doc 01; add text H1; fix mobile video or use static hero on mobile
- **P0:** Consolidate to one primary CTA above fold ("Schedule a Tour"); demote "Inquire" to secondary
- **P0:** Refresh testimonials with 2024-2025 weddings from Doc 04
- **P1:** Add LocalBusiness + AggregateRating schema
- **P1:** Rewrite meta description targeting "boutique wedding venue hudson valley"

**Effort:** Medium (4-6 hours). **Owner:** Joshua + Claude; client approves.

### Page: /weddings

**Role in funnel:** Primary consideration page
**SEO target:** "hudson valley wedding venue" (Tier 1) + "hudson valley wedding venue on-site lodging" + "boutique wedding venue hudson valley"

| Dimension | Assessment | Evidence |
|---|---|---|
| Brand voice | Drifting | Uses "special day" and "dream wedding" (banned) |
| Factual accuracy | Partial | Capacity listed as "up to 200" — should be 180 seated (Doc 02) |
| SEO optimization | Partial | H1 is "Weddings" (generic); meta description solid |
| Customer-journey fit | Strong | Matches how couples evaluate venues |
| Mobile experience | Good | Responsive; images load well |
| Conversion elements | Strong | Clear primary CTA, secondary CTA |
| Content freshness | Partial | Last updated 14 months ago |

**What's working:** IA matches Doc 03 sales process. Photography is strong and representative.

**What's broken:** Banned phrases in paragraphs 2 and 4. Capacity inaccuracy. H1 generic. No weekend format section (Doc 05 positioning gap). Pricing implied but not shown.

**Recommendations:**
- **P0:** Rewrite paragraphs 2 and 4 to remove banned phrases; correct capacity
- **P0:** Rewrite H1 to "Boutique Hudson Valley Wedding Venue"
- **P0:** Add weekend format section (the undermarketed differentiator from Doc 05)
- **P1:** Add pricing-shown component (per Doc 02 transparency strategy)
- **P1:** Refresh gallery images to 2024-2025 weddings

**Effort:** Medium-heavy (6-10 hours). **Owner:** Joshua + Claude for copy; designer for layout.

### Page: /about

**Role in funnel:** Trust-building for mid-to-late funnel
**SEO target:** Brand + supporting phrases

| Dimension | Assessment | Evidence |
|---|---|---|
| Brand voice | Fails | Third-person corporate — "Audrey's Farmhouse is a premier wedding venue..." doesn't match Doc 01 first-person voice |
| Factual accuracy | Partial | References owner; doesn't mention Megan, chef, or booking coordinator despite all being in Doc 02 |
| SEO optimization | Weak | Title tag generic |
| Customer-journey fit | Partial | Covers history but misses team — #1 praised element from Doc 04 |

**What's working:** Property history story is solid. Exterior photography is strong.

**What's broken:** Third-person corporate voice throughout. Megan not featured despite being named in 50% of reviews. Chef not featured despite in-house kitchen being #1 differentiator. Doesn't connect to Doc 05 differentiators.

**Recommendations:**
- **P0:** Full rewrite in first-person voice per Doc 01
- **P0:** Add team section featuring Megan, chef, booking coordinator (dependency: team photo shoot in Doc 04 Section 9 priority list)
- **P1:** Restructure: property story → team → philosophy
- **P2:** Add Person schema for key team members

**Effort:** Heavy (8-12 hours including team content production).

### Page: /faq

**Role in funnel:** Consideration + pre-tour research
**SEO target:** Question keywords from Doc 06 Section 4

| Dimension | Assessment | Evidence |
|---|---|---|
| Brand voice | Drifting | Several answers use "we" when Doc 01 says first-person singular |
| Factual accuracy | Accurate for what's covered | But only 12 questions — Doc 07 FAQ Bank has 30+ |
| SEO optimization | Weak | No FAQ schema |
| Customer-journey fit | Partial | Misses 18+ questions from FAQ Bank |

**What's broken:** 18 FAQ Bank questions missing. No FAQ schema. Voice drift. Missing AEO-target question keywords from Doc 06.

**Recommendations:**
- **P0:** Expand to full FAQ Bank coverage (30+ questions from Doc 07)
- **P0:** Add FAQ schema markup (enables Google rich results and AI citation)
- **P0:** Rewrite answers in first-person voice
- **P1:** Categorize questions (Pricing, Capacity, Planning, Day-of) for scanability

**Effort:** Medium (4-6 hours content; 1 hour schema).

### Page: /blog (top posts)

| Post | Status | Issues | Priority |
|---|---|---|---|
| Hudson Valley Fall Weddings Guide | Ranking #7 for target | Could push to top 3 with refresh | P0 |
| What's Included in Our Wedding Weekend | Ranking for "wedding weekend venue hudson valley" | Voice drift paragraphs 3-5 | P1 |
| Saturday vs Friday Wedding | Top 5 for target | Maintain | P2 |
| In-House Catering | Mid-ranking | Should expand to full pillar per Doc 06 | P1 |
| October Light at Audrey's | Strong photo post | Thin on copy; beef up for SEO | P2 |

**Blog-wide:**
- **P0:** Refresh top 5 posts with Doc 02 facts and Doc 01 voice
- **P0:** Build 5 pillar pages identified in Doc 06 Section 6 as new posts
- **P1:** Archive ~12 outdated posts (identified in Doc 04 Section 9)

### Other pages (spot-checked)

- `/gallery` — Strong; no action (P2)
- `/real-weddings` individual pages — 18 pages mixed quality; template revision + refresh most recent 3 (P1)
- `/contact` — Functional, P2 only

---

## 3. Homepage Deep Dive

### Current homepage structure

1. **Hero:** Full-screen video of property with text overlay "Your magical Hudson Valley wedding begins here" + two CTAs (Inquire Now, Schedule Tour)
2. **Introduction paragraph:** 3-paragraph block about the venue (third-person voice)
3. **Three-feature grid:** Weekend Format / On-Site Lodging / In-House Catering
4. **Image gallery:** 6 photos in mosaic
5. **Testimonial carousel:** 5 testimonials (2022 dates visible)
6. **Real Weddings preview:** 3 recent (well, recent-ish) weddings
7. **Blog preview:** 3 most-recent posts
8. **Instagram feed embed:** Last 6 posts
9. **Footer CTA section:** "Ready to tour?" + final CTA button

### Five-second test

- **What this business does:** Yes — "wedding venue" reads quickly
- **Who it's for:** Partial — Hudson Valley location clear but nothing on ideal guest count or style
- **Why different from competitors:** Partial — three features show but only after scrolling past banned-phrase hero
- **What to do next:** No — four competing CTAs create decision paralysis

Two "No" or "Partial" responses. Homepage is failing the baseline test.

### Voice assessment

Current hero: "Your magical Hudson Valley wedding begins here"
- Uses "magical" — banned per Doc 01
- Uses "your" opening — generic, competes with every venue website
- "Begins here" — throat-clearing

Opening paragraph: "Audrey's Farmhouse is a premier Hudson Valley wedding venue offering elegant weekend weddings in the heart of the Catskills..."
- Third-person corporate voice
- "Premier" and "elegant" — weak generic adjectives
- Doesn't apply first-person voice from Doc 01

Fails brand voice on both hero and opener. These are the two highest-visibility copy elements on the site.

### Differentiation assessment

The three-feature grid (Weekend Format, On-Site Lodging, In-House Catering) aligns with Doc 05 positioning. Good. But the grid is below the fold — visitors see the generic hero first. The positioning space identified in Doc 05 ("grounded, warm, slightly skeptical of wedding industry conventions") is not claimed anywhere in the hero or opening content.

### Conversion path assessment

A qualified customer visiting the homepage has four competing CTAs: "Inquire Now" (hero), "Schedule Tour" (hero), "Inquire" (nav), "Ready to tour?" (footer CTA). Mid-page there are also "View Gallery" and "Read More" prompts on the Real Weddings and Blog previews.

Two clicks to convert (homepage → Schedule Tour → Cal.com). The path is short, but the decision paralysis between which CTA to click adds friction.

### Homepage-specific recommendations

- **P0:** Rewrite hero headline. Candidates from Doc 05 positioning: "Weekend weddings, 80-180 guests, at a boutique Hudson Valley venue that actually includes everything" or similar. Test 3 variants.
- **P0:** Rewrite opening paragraph in first-person voice applying Doc 01 voice attributes.
- **P0:** Consolidate above-fold CTAs to one — "Schedule a Tour." Move "Inquire" to secondary position or footer only.
- **P0:** Fix mobile hero video (loads black on Safari) or replace with static hero image on mobile.
- **P0:** Refresh testimonial carousel with 2024-2025 weddings curated by theme from Doc 04.
- **P1:** Move three-feature grid higher (above the fold on desktop if possible).
- **P1:** Add a pricing-visible component. Per Doc 05 positioning: transparency is a differentiator vs. opaque competitors (Stonecroft, Brookside).

### Recommended homepage structure (if major rework warranted)

1. Hero: Text-forward headline + subhead + single primary CTA + property photo/video
2. Differentiators grid: Weekend Format / On-Site Lodging / In-House Catering (higher than current)
3. Pricing transparency component: "Saturdays from $14,500 venue + $145-185/pp catering. See what's actually included."
4. Real Weddings gallery: 3-6 recent weddings, visual-forward
5. Testimonials by theme: 3-4 curated testimonials covering different angles
6. Team / who you'll work with: Introduce Megan, chef, booking coordinator
7. Secondary CTA: Blog preview or educational content
8. Footer CTA: Schedule a tour

---

## 4. Critical Content Gaps

### Missing pages (must be built)

**Pricing page (/pricing)**
- **Role:** Decision support
- **Target keyword:** "audrey's farmhouse pricing" (branded) + "hudson valley wedding venue pricing" (consideration)
- **Length target:** 1,200-1,800 words
- **Why missing:** Owner historically opted for opaque pricing; Doc 05 analysis shows transparency is the differentiator
- **Content brief:** All-in cost ranges by format (Saturday/Friday/Sunday/weekday), what's included, what's separate, how to compare with competitors, how to get an exact quote
- **Priority:** P0
- **Effort:** Medium (6-8 hours)

**Weekend Format pillar (/weekend-weddings)**
- **Role:** Awareness + consideration
- **Target keyword:** "hudson valley weekend wedding venue" (320/mo)
- **Length target:** 2,000+ words (per Doc 06 Section 6)
- **Content brief:** What a weekend wedding is, why couples choose it, logistics and planning, how Audrey's does it specifically, pricing implications
- **Priority:** P0
- **Effort:** Medium (6-8 hours)

**Catskills Wedding Venue pillar (/catskills-wedding-venue)**
- **Role:** Awareness
- **Target keyword:** "wedding venue catskills" (880/mo)
- **Length target:** 2,000+ words
- **Content brief:** Geographic context, why couples choose Catskills weddings, lodging considerations, seasonal framing, how Audrey's fits
- **Priority:** P0
- **Effort:** Medium (6-8 hours)

**In-House vs BYO Catering pillar (/in-house-catering)**
- **Role:** Decision
- **Target keyword:** "in-house catering wedding venue hudson valley" (180/mo)
- **Length target:** 1,800 words
- **Status:** Existing blog post; expand and promote to pillar page
- **Priority:** P1

**Microwedding/Elopement venue page (/microwedding)**
- **Role:** Consideration
- **Target keyword:** "microwedding venue catskills" (240/mo) + "weekday wedding venue hudson valley"
- **Length target:** 1,500 words
- **Priority:** P1

**Team page (/team) or expanded About**
- **Role:** Trust
- **Content brief:** Megan, chef, booking coordinator, owner — with photos and real narrative
- **Priority:** P0 (blocked by team photo shoot from Doc 04 Section 9)

### Missing content within existing pages

- `/weddings` page: no weekend format section despite being key differentiator
- `/faq` page: 18+ questions from Doc 07 not present
- `/about` page: no team section beyond owner
- Real wedding feature pages: most don't include vendor credits consistently

### Missing FAQ entries (from Doc 07)

Priority additions to /faq:
- How far is Audrey's from NYC?
- What's included in the weekend wedding rate?
- Can you bring your own caterer? (Answer: no, with reasoning)
- How many guests can Audrey's accommodate?
- What time can wedding music play until?
- How far in advance can you book?
- What's the deposit?
- What happens if it rains?
- Are sparklers allowed?
- Can we bring our dog to the ceremony?

Plus 12 additional questions from the FAQ Bank.

### Missing schema markup

- **LocalBusiness schema:** Missing (critical for local SEO and Google Maps integration)
- **FAQ schema:** Missing on /faq — required for Google FAQ rich results and AI citation
- **Review/AggregateRating schema:** Missing — should pull from Google Reviews
- **Event schema:** Could be used on Real Wedding pages
- **Person schema:** Could be added for key team members once /about is rebuilt

---

## 5. Technical SEO Audit

### Core Web Vitals (PageSpeed Insights, April 2026)

| Metric | Desktop | Mobile | Target |
|---|---|---|---|
| LCP | 2.1s | 4.3s | Under 2.5s |
| INP | 180ms | 420ms | Under 200ms |
| CLS | 0.08 | 0.14 | Under 0.1 |

Mobile Core Web Vitals are failing on LCP and INP. Desktop passes LCP, borderline on INP.

### Indexation

- **Pages in Google index:** 47
- **Pages excluded (intentional):** Tag pages, admin pages — fine
- **Pages excluded (unintentional):** 3 real wedding features are "discovered but not indexed" — likely duplicate-content-like patterns
- **Duplicate content issues:** Real wedding templates share significant boilerplate; may trigger thin-content flags

### On-page technical elements

- **Title tags:** Inconsistent — some use "| Audrey's Farmhouse" suffix, some don't
- **Meta descriptions:** Present on 28 of 47 indexed pages
- **H1 usage:** 4 pages have no text H1 (homepage, gallery, contact, /real-weddings index)
- **Image alt text:** Missing on ~60% of images (typical Squarespace pattern)
- **Internal linking:** Weak — blog posts rarely link to other blog posts or to pillar pages
- **Broken links:** 8 found (mostly in blog posts pointing to competitor/vendor sites that reorganized)
- **Redirect chains:** 2 found (minor)

### Mobile-specific issues

- Hero video doesn't render on Safari mobile (shows black)
- CTA buttons on gallery page are below tap target size (36px vs. 44px recommended)
- Contact form on mobile has overflow issue in landscape

### Accessibility baseline

- Color contrast: Passes on most pages; fails on one footer text block (stone on cream)
- Alt text: Missing on ~60% of images (same as SEO issue)
- Keyboard navigation: Works
- ARIA labels: Missing on navigation hamburger button

### Platform-specific limitations (Squarespace 7.1)

- Limited control over HTML head (some schema types require workarounds)
- Image optimization is automatic but suboptimal (no AVIF support)
- Limited ability to implement complex page speed optimizations
- Custom code injection requires Business plan or higher

### Recommended technical fixes

- **P0:** Add image alt text site-wide (~4 hours manual OR Squarespace bulk tool)
- **P0:** Fix mobile Safari hero video rendering
- **P0:** Add text H1 to homepage, gallery, contact, /real-weddings
- **P0:** Add LocalBusiness schema via code injection
- **P1:** Add FAQ schema (after FAQ page expansion)
- **P1:** Standardize title tag format
- **P1:** Fill missing meta descriptions
- **P1:** Fix 8 broken links in blog posts
- **P1:** Improve mobile CTA tap target sizing
- **P2:** Optimize images for mobile LCP
- **P2:** Fix footer color contrast
- **P2:** Add ARIA labels to navigation

---

## 6. Conversion Element Audit

### Primary inquiry form audit

- **Location:** `/inquire` (standalone); embedded in `/contact` and footer of every page
- **Fields required:** Name, email, phone, date of interest, guest count estimate, free-text note
- **Fields optional:** Partner's name, referral source
- **Form length:** Right-sized (6-7 fields depending on optional selections)
- **Friction fields:** None significant; phone being required is borderline — test removing
- **Validation:** Works; error messages unhelpful ("Please complete this field" vs. specific)
- **Post-submit experience:** Thank-you page is generic HoneyBook default; no personalization
- **Auto-responder:** Current HoneyBook auto-confirmation is generic — to be replaced by AI auto-responder per Doc 08 Section 9
- **Integration:** Sends to HoneyBook + booking coordinator email

### Calendar and scheduling integration

- **Cal.com presence:** Partial — link exists in nav but not consistently promoted on every page
- **Accessibility:** 2-3 clicks from most pages; harder from blog posts (no inline CTA)
- **Mobile experience:** Works well

### CTA audit (site-wide)

| Page | Primary CTA | Button text | Visibility | Assessment |
|---|---|---|---|---|
| Homepage | Schedule Tour | "Schedule a Tour" | Above fold (1 of 4 competing) | Confused by competing CTAs |
| /weddings | Schedule Tour | "Schedule Your Tour" | Above fold | Strong |
| /about | Inquire | "Inquire Now" | Below fold only | Weak placement |
| /gallery | Schedule Tour | "Schedule a Tour" | Below fold | Weak placement |
| /faq | Contact | "Have more questions? Contact Us" | Footer | Weak |
| /blog posts | Inquire | Varies by post | Inconsistent | Weak |
| /contact | Submit | "Submit Inquiry" | On form | Adequate |

### CTA consistency

CTAs are inconsistent across the site. Some pages say "Schedule a Tour," others "Schedule Your Tour," others "Inquire Now." Customers have to figure out the hierarchy. Per Doc 08, primary CTA should consistently be "Schedule a Tour" (next step in Doc 03 sales process).

### Contact information accessibility

- **Email visible:** On contact page and footer; not on individual service pages
- **Phone visible:** Not listed (intentional per owner preference)
- **Address visible:** Footer + contact page
- **Contact page clarity:** Functional but not warm

### Conversion recommendations

- **P0:** Consolidate primary CTA to "Schedule a Tour" site-wide
- **P0:** Add inline CTA to every blog post (currently missing on most)
- **P0:** Replace generic HoneyBook thank-you page with personalized branded thank-you page
- **P1:** Test removing phone field from inquiry form (measure conversion delta)
- **P1:** Improve error message specificity on inquiry form
- **P1:** Add "Ask a Question" secondary CTA on FAQ page for questions not covered

---

## 7. Brand Voice and Copy Audit

### Voice consistency across pages

| Page | Voice alignment | Issues |
|---|---|---|
| Homepage | Fails | Banned phrase "magical" in hero; third-person in opening; generic adjectives ("premier," "elegant") |
| About | Fails | Third-person corporate voice throughout; "offering elegant weekend weddings" |
| Weddings | Drifting | Banned phrases "special day" and "dream wedding" in paragraphs 2 and 4 |
| Gallery | N/A | Minimal copy |
| Real Weddings individual pages | Mixed | Varies by who wrote them; some strong, some generic |
| Blog top posts | Mostly strong | Some older posts drift |
| FAQ | Drifting | "We" pattern when Doc 01 says first-person singular |
| Contact | Functional | No voice issues |

### Banned phrase audit

| Banned phrase | Instances | Pages |
|---|---|---|
| "magical" | 4 | Homepage hero, /about paragraph 2, 2 blog posts |
| "special day" | 6 | /weddings paragraph 2, /faq (2 answers), 3 blog posts |
| "dream wedding" | 3 | /weddings paragraph 4, 2 blog posts |
| "elegant" | 9 | /about, /weddings, 7 blog posts |
| "elevate" | 2 | 2 blog posts |
| "stunning" | 5 | /weddings, /gallery caption, 3 blog posts |
| "seamlessly" | 1 | /weddings |
| "transform" | 2 | /about, 1 blog post |

Total: 32 banned-phrase instances across 10+ pages. Significant site-wide voice cleanup required.

### Generic language audit

Found across multiple pages:
- "Welcome to..." opening (on /about and 2 blog posts)
- "At Audrey's Farmhouse, we..." pattern (on /weddings, /about, /faq)
- "Our team is dedicated to..." pattern (/about paragraph 3)
- "Premier" and "best-in-class" descriptors (/about, /weddings)
- Throat-clearing openings on 6 of 38 blog posts

### Headline audit

- Homepage H1: None (logo image only). P0 fix.
- /about H1: "About Audrey's Farmhouse" — generic. Should apply voice + pull weight.
- /weddings H1: "Weddings" — generic. Should target keyword: "Boutique Hudson Valley Wedding Venue."
- /faq H1: "Frequently Asked Questions" — acceptable; could be improved.
- /gallery H1: None. P0 fix.
- /contact H1: "Contact Us" — acceptable.
- Blog post H1s: Strong for most posts; a few generic ("Our Latest Wedding").

### Micro-copy audit

- Button text: Inconsistent ("Schedule Tour" / "Schedule Your Tour" / "Book a Tour")
- Form labels: Acceptable but could be warmer
- Error messages: Generic HoneyBook defaults
- Footer copyright: Generic ("© 2024 Audrey's Farmhouse. All rights reserved.") — minor but reflects brand inattention

### Copy recommendations

- **P0:** Full rewrite of Homepage hero + opening; /about paragraph structure; /weddings paragraphs 2 and 4; /faq answers (all)
- **P0:** Site-wide banned phrase removal (32 instances)
- **P1:** Add text H1s to homepage and gallery; rewrite generic H1s on /weddings and /about
- **P1:** Standardize CTA button text to "Schedule a Tour" site-wide
- **P2:** Refine error messages and micro-copy

### Suggested rewrites

**Homepage hero (before):**
> Your magical Hudson Valley wedding begins here.
> Elegant weekend weddings at a premier Catskills venue.

**Homepage hero (after):**
> A boutique wedding venue in the Hudson Valley where your people stay the whole weekend.
> Friday through Sunday. 80-180 guests. In-house catering. One coordinator who knows every inch of the property. That's it.

**/about opening (before):**
> Audrey's Farmhouse is a premier Hudson Valley wedding venue offering elegant weekend weddings in the heart of the Catskills. Our team is dedicated to creating magical experiences for every couple who walks through our doors...

**/about opening (after):**
> I took over Audrey's in 2015. It had been a working dairy farm until the 1970s, then a guest house, then something in between until a full wedding venue finally stuck. Most weddings that happen here now are 100 to 150 guests, over a full weekend, with family and friends staying in the cottage and carriage house. The kitchen is ours — no outside caterers. Megan runs the day.

---

## 8. Competitive Benchmark

### Competitor website comparison

| Dimension | Audrey's | Roundhouse | Stonecroft | Hill at Highlands |
|---|---|---|---|---|
| Site quality | Standard | Strong | Strong | Template |
| Mobile experience | Functional with bugs | Strong | Strong | Strong |
| Homepage clarity | Weak | Strong | Strong | Standard |
| Content depth | Moderate (38 blog posts) | Heavy (90+ posts) | Moderate (60+ posts) | Light (22 posts, inactive) |
| Conversion UX | Confused (multiple CTAs) | Clean | Clean | Clean |
| Visible pricing | Partial | Full | Hidden | Full |
| Voice differentiation | Drifting | Claimed (architectural) | Claimed (luxury) | Claimed (modern) |

### What competitors are doing that Audrey's should consider

- **Roundhouse:** Consistent weekly blog cadence. Every post targets a specific keyword per Doc 06 patterns. Heavier content investment clearly pays off in SEO traffic (3x Audrey's).
- **Roundhouse:** Pricing page shows full all-in ranges with "what's included" clearly laid out — directly models what Audrey's /pricing page could be.
- **Hill at Highlands:** Homepage is visual-forward but keeps text minimal and direct. Audrey's could learn from the restraint.

### What competitors are doing that Audrey's should NOT emulate

- **Stonecroft:** Hidden pricing — requires inquiry to get any number. Per Doc 05, Audrey's transparency is a differentiator; don't sacrifice it.
- **Brookside:** Outdated design and inconsistent voice. Obvious anti-pattern.
- **Stonecroft:** Over-polished "luxury estate" voice. Not Audrey's lane per Doc 01.

### Where Audrey's website is ahead

- More authentic voice when the coordinator writes (most blog posts)
- Stronger photography integration (Doc 04 assets)
- More specific differentiators (the three-feature grid concept is good; just needs to be more prominent)
- Better pricing transparency than Stonecroft and Brookside

### Where Audrey's website is behind

- Content volume (38 posts vs. Roundhouse 90+ and Stonecroft 60+)
- Page speed on mobile (38/100 vs. competitors all above 70)
- Homepage conversion clarity (4 competing CTAs vs. competitors' clean single CTAs)
- Technical SEO baseline (missing schema, H1s, alt text)

---

## 9. Prioritized Implementation Plan

### P0 backlog (must fix — do first, weeks 1-4)

1. **Homepage rewrite** (hero, opening, CTA consolidation, mobile video fix) — Medium (6-8h) — Joshua + Claude — Sections 2, 3, 7
2. **/weddings page rewrite** (banned phrases, capacity correction, H1, weekend format section) — Medium-heavy (6-10h) — Joshua + Claude — Section 2
3. **/about page full rewrite** (first-person voice, add team section) — Heavy (8-12h, includes team photo shoot) — Joshua + Claude + photographer — Section 2
4. **/faq expansion to full FAQ Bank (30+ questions) + FAQ schema** — Medium (5-7h) — Joshua + Claude + light dev — Section 2
5. **Build /pricing page** — Medium (6-8h) — Joshua + Claude — Section 4
6. **Build Weekend Format pillar page** — Medium (6-8h) — Joshua + Claude — Section 4
7. **Build Catskills Wedding Venue pillar page** — Medium (6-8h) — Joshua + Claude — Section 4
8. **Add LocalBusiness + AggregateRating schema site-wide** — Light (2h) — Light dev — Section 4
9. **Add text H1s to homepage and gallery** — Light (1h) — Joshua — Section 5
10. **Site-wide banned phrase removal (32 instances)** — Medium (3-4h) — Joshua + Claude — Section 7
11. **CTA consolidation to "Schedule a Tour" site-wide** — Light (2h) — Joshua — Section 6
12. **Image alt text site-wide** — Medium (4h) — Joshua or assistant — Section 5
13. **Replace generic HoneyBook thank-you page** — Light (2h) — Joshua + light dev — Section 6
14. **Fix mobile Safari hero video** — Light (1-2h) — Light dev — Section 5

### P1 backlog (should fix — do in weeks 5-10)

15. **Refresh top 5 existing blog posts** (Hudson Valley Fall, Weekend Included, Sat vs Fri, In-House Catering, October Light) — Medium (6-8h) — Joshua + Claude
16. **Build 3 additional pillar pages** (Cost pillar, In-House vs BYO Catering pillar, Microwedding pillar) — Heavy (18-24h) — Joshua + Claude
17. **Archive ~12 outdated blog posts** — Light (2h) — Joshua
18. **Restructure navigation** (move Real Weddings and FAQ into broader parents or footer) — Light (2h) — Joshua
19. **Refresh /real-weddings template + 3 most recent features** — Medium (6-8h) — Joshua + Claude
20. **Fix 8 broken links in blog posts** — Light (1h) — Joshua
21. **Standardize title tag format site-wide** — Light (2h) — Joshua
22. **Fill missing meta descriptions** (19 pages) — Light (3h) — Joshua + Claude
23. **Add inline CTA to every blog post** — Light (2h) — Joshua
24. **Test removing phone field from inquiry form** — Light (30 min setup + measurement) — Joshua

### P2 backlog (nice to have — tackle when capacity allows)

25. Add Person schema for team members
26. Add Event schema for real wedding pages
27. Footer color contrast fix
28. ARIA labels on navigation
29. Image optimization for mobile LCP
30. Micro-copy polish on forms and error messages

### Total scope assessment

- **P0:** 14 tasks, approximately 55-75 hours
- **P1:** 10 tasks, approximately 40-55 hours
- **P2:** 6 tasks, approximately 8-12 hours
- **Total:** 30 tasks, approximately 105-145 hours of work

### Options for executing

**Option A: Iterative improvements on current Squarespace platform**
- Description: Execute P0 and P1 backlog sequentially on the existing Squarespace site. No platform migration. Squarespace's limitations (schema workarounds, mobile performance ceiling) remain.
- Best for: If the budget is tight or the client prefers to extend the current platform's life before rebuilding.
- Estimated cost: $12,000-$18,000 (Joshua's blended rate applied to 100-125 hours, excluding any designer work for /about team section)
- Estimated timeline: 10-14 weeks

**Option B: Partial rebuild — highest-priority pages on Next.js**
- Description: Rebuild homepage, /weddings, /about, /pricing, and 3-5 pillar pages as a Next.js site deployed to Vercel. Keep /blog and /real-weddings on Squarespace via subdomain or phased migration. Addresses mobile performance and schema limitations while preserving investment in existing blog content.
- Best for: If the client wants meaningful page speed improvements and control over schema/SEO, but isn't ready for full rebuild investment.
- Estimated cost: $18,000-$28,000 (including Next.js build, design system, migration)
- Estimated timeline: 10-14 weeks

**Option C: Full rebuild — new Next.js site**
- Description: Complete site rebuild on Next.js. Design refresh. All content migrated or rewritten. Full technical SEO control. Sets up for 2027+ content cadence.
- Best for: If the client sees the website as a multi-year investment and wants to align with the consulting brand positioning (you build Next.js sites for clients).
- Estimated cost: $28,000-$45,000
- Estimated timeline: 14-20 weeks

### Recommendation

**Option B: Partial rebuild.** Audrey's revenue and brand position justify the investment in a better technical foundation, but the existing blog content (38 posts, some ranking) is too valuable to disrupt in a single migration. Rebuild the high-value marketing pages (homepage, /weddings, /about, /pricing, 5-7 pillars) on Next.js with a clean design system. Phase the blog migration over 6-12 months post-launch.

This option:
- Delivers the P0 performance and conversion improvements decisively
- Preserves existing SEO equity in the blog
- Demonstrates what a Next.js site looks like for future retainer or referral conversations
- Sits in the middle of budget options — meaningful investment without open-ended scope

### What happens if nothing changes

- Per Doc 03 analysis, current homepage conversion is measurably worse than it could be. Conservative estimate: improved homepage clarity + CTA consolidation alone would recover 1-3 additional inquiries per month at current traffic levels. At ~$32K average revenue and ~14% close rate on qualified leads, that's $4,500-$13,500/month in lost revenue.
- Mobile performance will continue degrading SEO — Google increasingly weights mobile experience in rankings.
- Content production gap vs. competitors will compound. Roundhouse and Stonecroft are already 3x on organic traffic; the gap widens each month without investment.
- Per Doc 05 positioning analysis, the open positioning space (weekend format + in-house catering + grounded voice) is uncontested today but could be claimed by a competitor expanding into that lane.

### Dependencies and sequencing

- **Team photo shoot** (for /about rebuild) must happen first or in parallel with /about work — already scheduled per Doc 04 Section 9
- **FAQ expansion** depends on full FAQ Bank (Doc 07) being finalized
- **Pillar page builds** depend on SEO Strategy (Doc 06) target keywords and content briefs
- **AI auto-responder replacement** (Doc 08 Section 9) is a parallel workstream — can proceed regardless of this scope decision
- **Pricing page build** depends on owner approval of transparency framing (confirm before build starts)

---

## End of Worked Example

The example above is a complete reference Website Content Audit and Recommendations document. Use this as the quality bar for any new client. The strongest indicator of a thorough job: every recommendation ties to a specific source document, and Section 9 presents 3 realistic execution options with an opinionated recommendation.
