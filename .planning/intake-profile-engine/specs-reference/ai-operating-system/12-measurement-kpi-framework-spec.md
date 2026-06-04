# Document Production Spec 12: Measurement and KPI Framework

## What This Spec Is

This is the production specification for Document 12 of the 12-document AI Operating System. It tells anyone building this document exactly what goes in, what each section looks like, and how to know when it's done.

The Measurement and KPI Framework is the accountability layer of the AI Operating System. It defines what gets tracked, why, how often, and what the targets are. Without this document, the operating system runs without evidence of whether it's working. Bottlenecks fixed in Document 03 never get measured post-fix. Automations from Document 11 run invisibly without success metrics. Content produced against Document 06's SEO strategy never gets evaluated against traffic targets. The client pays for work they can't evaluate.

This is also the document that closes the loop. Every other document makes a claim ("this keyword matters," "this automation will recover X revenue," "this voice is right for your brand"). Without measurement, those claims stay assertions. With measurement, they become falsifiable and adjustable.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 12 of 12 |
| **Priority** | High (execution accountability layer) |
| **Total length target** | 2,000-4,000 words |
| **Total time to produce** | 3-5 hours |
| **Joshua's time** | 2-3 hours |
| **Claude's time** | 45-60 minutes |
| **Client's time** | 30-45 minutes (review and target confirmation) |
| **Delivery format** | Markdown file, loaded into client's Claude Project; often accompanied by a dashboard setup (Umami, GA4, Supabase views, or similar) |
| **File naming convention** | `[client-slug]-12-measurement-kpi-framework.md` |
| **Foundation for** | Monthly reporting cadence; quarterly strategic reviews; retainer engagement accountability |

---

## When This Document Gets Built

**Phase 4 of engagement, Week 4.** Built last because it measures the outcomes of everything preceding it. Can be built in parallel with final Documents 10-11 if timeline is compressed.

**Triggers:** All prior documents delivered. Analytics access confirmed. Pre-baseline numbers captured where possible.

**Blocks:** Nothing strictly — but without this document, the 30/60/90 day review checkpoints have no objective basis.

---

## Section-by-Section Template

### Header Block

```markdown
# [Business Name] Measurement and KPI Framework

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Baseline capture date:** [Month Year — the "starting line" for all measurement]
**Next review cycle:** Monthly dashboard review; quarterly strategic review

**For:** Performance tracking, retainer engagement accountability, automation monitoring, strategic review cadence, and objective decisions about what to continue, what to change, and what to retire.

**Companion documents:** 01 through 11. This document measures outcomes of all of them.

**Critical principle:** Every metric in this framework must be tied to a decision. "We'll track X" is only useful if the framework specifies what decision X changes at what threshold. Metrics without decisions attached are vanity metrics.
```

**Word count:** 100-200 words.

---

### Section 1: Baseline Capture

**Purpose:** The "starting line" numbers. Without a baseline, improvement can't be measured.

**Word count target:** 300-500 words plus tables.

Required content:

**Baseline date:** The specific date these numbers were captured. Any metric without a baseline date is unmeasurable.

**Baseline metrics by category:**

**Traffic and SEO baseline (from Document 06 Section 1):**
| Metric | Value | Date captured | Source |
|---|---|---|---|
| Organic monthly traffic | [#] | [Date] | Ahrefs + GSC |
| Total organic keywords ranking | [#] | [Date] | Ahrefs |
| Domain Rating | [#] | [Date] | Ahrefs |
| Branded vs. non-branded traffic split | [% / %] | [Date] | GSC |
| Top 10 keywords by traffic | [List] | [Date] | Ahrefs |

**Sales funnel baseline (from Document 03 Section 7):**
| Metric | Value | Date captured | Notes |
|---|---|---|---|
| Inquiries per month | [#] | [Date] | HoneyBook or equivalent |
| First-response time (average) | [Hours] | [Date] | Secret shopper + CRM |
| Inquiry → tour conversion | [%] | [Date] | CRM data or estimate |
| Tour → booking conversion | [%] | [Date] | CRM data or estimate |
| Overall inquiry → customer conversion | [%] | [Date] | CRM data or estimate |

**Social baseline (from Document 09 Section 1):**
| Metric | Value | Date captured | Platform |
|---|---|---|---|
| Primary platform followers | [#] | [Date] | [Platform] |
| Primary platform engagement rate | [%] | [Date] | [Platform] |
| DM inquiries per month | [#] | [Date] | [Platform] |
| Website clicks from social | [#] | [Date] | Analytics |

**Content baseline (from Document 04 Section 3):**
| Metric | Value | Date captured |
|---|---|---|
| Total published blog posts | [#] | [Date] |
| Blog posts published in trailing 90 days | [#] | [Date] |
| Total published pages on website | [#] | [Date] |

**Review and reputation baseline (from Document 04 Section 4):**
| Metric | Value | Date captured |
|---|---|---|
| Google reviews count | [#] | [Date] |
| Google average rating | [#] | [Date] |
| Industry platform reviews (The Knot / etc.) | [#] | [Date] |
| Review response rate | [%] | [Date] |

**Data quality notes:**
Explicitly flag which baselines are data-confirmed vs. owner-recall vs. estimated. This transparency matters — some baselines will be imprecise at the start, and Phase 1 of the engagement may include establishing better data capture.

---

### Section 2: Target Metrics (30/60/90-Day Horizons)

**Purpose:** What success looks like over three time horizons.

**Word count target:** 300-500 words plus tables.

Required content:

**30-day targets (foundational work complete):**

These are not "results" targets — they're execution targets. Did the foundational work actually happen?

| Metric | Target | Source of truth |
|---|---|---|
| Brand Voice Guide delivered and loaded into Claude Project | Yes | Document 01 delivery |
| Business Facts Reference delivered and loaded | Yes | Document 02 delivery |
| Automation 01 (inquiry auto-responder) live | Yes | n8n |
| GBP improvements complete | Yes | GBP audit |
| Homepage P0 fixes complete | Yes | Website |
| First-touch response time (new inquiries) | Under 60 seconds | Automation logs |

**60-day targets (early results visible):**

| Metric | Baseline | 60-day target | Why this is achievable |
|---|---|---|---|
| Inquiry-to-tour conversion | [%] | [+X pts] | [Reasoning] |
| First-touch response time | [Hours] | Under 60 sec (sustained) | Automation 01 live |
| DM response time | [Hours] | [Target] | Operational process change |
| GBP weekly posts | [0] | [4-8/mo] | Process change |

**90-day targets (meaningful momentum):**

| Metric | Baseline | 90-day target | Why this is achievable |
|---|---|---|---|
| Organic monthly traffic | [#] | [+X%] | SEO content pipeline live |
| Total bookings from inquiries | [#] | [+X] | Auto-responder + follow-up sequences |
| Review volume | [#] | [+X] | Post-event automation live |
| New content published | [0] | [5-8 pieces] | Content pipeline running |

**Why 30/60/90 and not shorter/longer:**
- Under 30 days: too short to measure change meaningfully
- 30-60 days: execution validation window
- 60-90 days: first results window for fast-moving metrics (conversion, response time)
- 90+ days: needed for slow-moving metrics (SEO rankings, content traffic compound)

**6-month and 12-month targets:**

Documented separately because they depend on execution of 30/60/90 milestones. Built out in quarterly reviews.

---

### Section 3: KPIs Tied to Decisions

**Purpose:** The metrics that actually get reviewed monthly. Every metric must have an attached decision.

**Word count target:** 400-700 words plus table.

Required content:

**KPI table format:**

| KPI | How measured | Review cadence | Threshold for action | Decision if threshold hit |
|---|---|---|---|---|
| [Metric] | [Source] | [Monthly/weekly] | [Specific number] | [Specific action] |

**Categories of KPIs:**

**1. Response time and first-touch quality**
- First-touch response time (auto-responder): Target <60s. If >120s for 3 consecutive days → investigate automation.
- First-touch output validation failure rate: Target <5%. If >10% for a week → review prompts.
- Human coordinator response time (for escalated inquiries): Target <4 business hours. If average >8 hours for a month → staffing review.

**2. Funnel conversion**
- Inquiry-to-tour-scheduled: Per Doc 03 baseline. If sustained drop >20% from baseline → diagnostic.
- Tour-to-booking: Per Doc 03 baseline. If sustained drop >15% → review tour experience.
- Verbal-yes-to-signed: Per Doc 03 baseline. If sustained drop → review contract/follow-up.

**3. Revenue impact**
- New bookings from inquiries (count): Per baseline. If sustained drop → diagnostic.
- Revenue per booking (average): Per baseline. Flag if shifting.
- Revenue by channel: If any channel drops sharply → investigate or pause.

**4. SEO and content**
- Organic monthly traffic: Trend line. Quarterly review.
- Target keyword positions: Monthly pull from Ahrefs. Track top 15 target keywords specifically.
- Content pieces published vs. planned: Weekly/monthly. If falling behind → capacity check.

**5. Automation health**
- Automation success rate: Target >95%. If drops below 90% for any automation for a week → investigate.
- Automation escalation rate: Target <15%. If >25% → prompt or trigger logic needs revision.
- AI cost per month: Track vs. baseline. Flag if >150% of expected.

**6. Social and engagement**
- Primary platform follower growth (monthly): Quarterly review.
- Primary platform engagement rate: Monthly trend. Flag sustained drops.
- DM inquiries per month from social: Track as channel attribution.

**7. Review and reputation**
- Google review volume: Monthly count. Flag if post-event review automation isn't generating expected volume.
- Average rating trend: Monthly.
- Response rate to reviews: Target >95%. Flag any drop.

**What's NOT a KPI:**
- Follower count alone (vanity; tracked but not decision-weighted)
- Total impressions without conversion context
- Vanity "engagement" metrics without tied business outcome
- Time spent on the website (interesting but not actionable)

---

### Section 4: Measurement Infrastructure

**Purpose:** The specific tools and tables that collect and display the metrics.

**Word count target:** 300-500 words.

Required content:

**Analytics tools:**

| Tool | What it measures | Access status |
|---|---|---|
| Google Search Console | Search visibility, keyword impressions, clicks | Verified; Joshua and client have access |
| Ahrefs | SEO rankings, backlinks, competitor comparison | Joshua's account; client does not need direct access |
| Google Analytics 4 or Umami | Website traffic, conversion paths | Installed; Joshua and client have access |
| HoneyBook or primary CRM | Funnel data, conversion tracking | Client-owned; Joshua has access for reporting |
| Supabase | Automation logs, custom metrics | Joshua-owned; client sees reports |
| GBP Insights | Local search performance | Client-owned |
| Platform analytics (Instagram, Pinterest, etc.) | Social performance | Client-owned |

**Custom infrastructure (from Document 11):**

- Supabase `automation_logs` table: Records every automation run
- Supabase views: Aggregated success rates, error patterns, escalation tracking
- Slack notifications: Real-time errors and escalations

**Dashboard build (if included in engagement):**

Options for the client-facing dashboard:
- **Lightweight:** Google Sheets pulling from CSV exports weekly (manual, cheap, flexible)
- **Mid-weight:** Umami analytics (website) + Supabase views (automations) displayed in a simple Next.js dashboard
- **Heavy:** Full Metabase or Grafana build with scheduled ETL (typically for larger clients or multi-location operations)

**Recommended for most small business clients:** Mid-weight. The dashboard effort should match the client's capacity to actually look at it.

**Data capture gaps identified:**

If the baseline capture revealed metrics that aren't being tracked today, list them here with recommendations for how to start capturing them:

- [Metric that needs infrastructure] — [Recommended approach]

---

### Section 5: Reporting Cadence

**Purpose:** Who looks at what, when, with what structure.

**Word count target:** 300-500 words.

Required content:

**Weekly review (Joshua, internal):**

Every Monday. Duration: 30 minutes. Focus:
- Automation logs (errors, escalations, volume)
- New inquiries count vs. typical
- Any urgent client-facing issues
- Content production status vs. calendar

Output: Internal notes; no client-facing report weekly by default.

**Monthly review (Joshua → client):**

First week of every month. Duration to prepare: 2-3 hours. Focus:

1. **Executive summary** (1 page): What happened, what worked, what didn't
2. **KPI dashboard snapshot:** Baseline vs. current vs. targets
3. **Inquiries and bookings:** Count, conversion rates, trends
4. **SEO progress:** Keyword position changes, new pages indexed, traffic trends
5. **Automation health:** Success rates, volume, notable escalations
6. **Content published:** What got published, performance early indicators
7. **Flagged items:** Anything that crossed a threshold from Section 3
8. **Recommended actions for next 30 days:** Prioritized list

Delivery format: PDF report emailed to client; optional 30-minute review call.

**Quarterly strategic review (Joshua + client):**

Every 3 months. Duration: 90-minute meeting. Focus:

1. **Baseline vs. current (3-month lookback):** Every KPI plotted
2. **What worked / what didn't:** Opinionated assessment
3. **Source document updates needed:** Any docs due for refresh (per each doc's scheduled refresh cadence)
4. **Competitive landscape changes:** Doc 05 refresh triggers
5. **Strategic priorities for next quarter:** 3-5 focus areas
6. **Scope adjustments:** Any retainer changes needed

Output: Updated Document 12 with revised targets, refreshed source docs as needed.

**Annual review:**

Once per year. Full audit of all 12 documents. Major refresh of baselines, targets, and strategy. Option to revise engagement structure.

---

### Section 6: Thresholds and Escalation

**Purpose:** What triggers an alarm and what happens when it does.

**Word count target:** 200-400 words.

Required content:

**Performance thresholds and actions:**

| Signal | Threshold | Automatic action | Human action |
|---|---|---|---|
| Inquiry auto-responder failure rate | >10% for 24 hours | Slack alert | Zach investigates within 24h |
| First-touch response time | >120 seconds for 6 hours | Slack alert | Zach investigates |
| Any automation down | Any failure | Slack alert | Zach investigates immediately |
| AI output containing banned phrase | Any instance | Escalation to coordinator | Coordinator reviews, Joshua updates prompt |
| Week-over-week inquiry drop | >30% | Dashboard flag | Joshua diagnostic in next weekly |
| Month-over-month conversion drop | >15% | Dashboard flag | Joshua diagnostic in monthly review |
| Negative review posted | Any new review below 4 stars | Email to client + Joshua | Coordinator + Joshua handle per Doc 07 protocol |
| AI API cost | >150% of baseline for 2 weeks | Dashboard flag | Joshua review; prompt efficiency audit |

**Escalation paths:**
- **Technical (automation failures, API issues):** Zach within 24 hours
- **Content (brand voice drift, factual errors):** Joshua within 48 hours
- **Strategic (conversion drops, competitive shifts):** Joshua in next monthly
- **Crisis (negative review, public issue):** Joshua + client immediately

---

### Section 7: Review of Decisions and Adjustments

**Purpose:** The log of what was changed based on data over time.

**Word count target:** 200-300 words.

Required content:

**Decision log template:**

Every time the framework triggers a decision (threshold hit, review action taken), it gets logged here:

| Date | Trigger | Data | Decision | Outcome (tracked 30 days later) |
|---|---|---|---|---|
| [Date] | [Metric crossed threshold] | [Specific numbers] | [Action taken] | [Result] |

**Why this matters:**

Over time, this log becomes a record of what actually worked vs. what didn't. It's the institutional memory that prevents "we tried that already and it didn't work" from becoming folklore instead of evidence. Also protects against thrashing — if a decision was made to address a drop and the drop resolved, don't reflexively intervene again.

**Initial state:** This section is empty at delivery. It fills in over time.

---

### Section 8: Framework Maintenance

**Purpose:** Keeping this document itself current.

**Word count target:** 150-250 words.

Required content:

**Update triggers:**
- **Every quarterly review:** Update targets based on latest baseline and progress
- **Every source document refresh:** Propagate any metric-relevant changes (new pricing changes baseline revenue; new team member changes response time tracking, etc.)
- **Major milestone:** First booking attributable to the automation system, first full quarter of sustained content cadence, etc. — these are signals the targets need to scale up
- **Annual:** Full framework rewrite aligned with business strategic planning cycle

**Version control:**
- Minor updates (targets, threshold adjustments): version increments within same year
- Major updates (new metric categories, reporting cadence changes): new annual version

**Last updated log:**
- Section 1 (baselines): [Date]
- Section 2 (targets): [Date]
- Section 3 (KPIs): [Date]
- Section 4 (infrastructure): [Date]
- Section 5 (cadence): [Date]
- Section 6 (thresholds): [Date]

---

## How to Build This Document

Total time: 3-5 hours.

**Step 1: Pre-Build Prep (15 min).** Confirm Documents 01-11 delivered. Confirm analytics access across all tools.

**Step 2: Baseline Capture (90 min).** Pull current-state numbers from:
- Ahrefs (SEO baseline)
- Google Search Console (traffic and queries)
- HoneyBook or CRM (funnel data)
- Primary social platform (followers, engagement, DMs)
- Content inventory (Doc 04 Section 3)
- Review platforms (Doc 04 Section 4)

Flag any metric that's owner-recall rather than data-confirmed.

**Step 3: Target Setting (45 min, Joshua).** For each metric, set realistic 30/60/90-day targets based on:
- Bottleneck severity from Doc 03
- Expected automation impact from Doc 11
- Content cadence committed to in Doc 09 and Doc 06
- Industry benchmarks

Be conservative — underpromise and overdeliver.

**Step 4: KPI-to-Decision Mapping (45 min).** For each KPI, define:
- How it's measured
- Review cadence
- Threshold for action
- Specific decision if threshold hit

Metrics without decisions get cut.

**Step 5: Infrastructure Design (30 min).** Define what tools feed what metrics, what gaps exist, what dashboard approach fits the client.

**Step 6: Draft Generation (45 min, Claude).** Run this prompt:

```
Generate a Measurement and KPI Framework for [Business Name] using Document Production Spec 12 as the structure. Industry: [industry].

Source materials:
[Paste: Baseline numbers captured in Step 2]
[Paste: Bottleneck analysis from Doc 03 Section 9]
[Paste: Automation inventory and ROI projections from Doc 11]
[Paste: Content strategy from Doc 06 Section 6]
[Paste: Social strategy from Doc 09 Section 9]
[Paste: Current analytics tool stack]

Build all 8 sections following the spec. Every KPI in Section 3 must have a decision attached — metrics without decisions get cut. Section 2 targets must be realistic given the execution plan; underpromise and overdeliver.
```

**Step 7: Joshua Review (30 min).** Sharpen targets. Verify every KPI has a decision attached. Cross-reference thresholds against Doc 11 automation monitoring.

**Step 8: Client Review (30-45 min client time).** Send with email:

```
Subject: Measurement Framework — how we'll know if this is working

Attached: the Measurement and KPI Framework for [Business Name].

This is the accountability layer. Every other document I've delivered makes a claim about what will happen. This document is how we'll know whether those claims come true.

Please confirm:
1. Section 1 (Baselines) — are these numbers right? Anything I captured wrong?
2. Section 2 (30/60/90 Targets) — do these feel right? Conservative enough? Ambitious enough?
3. Section 3 (KPI → Decisions) — are there metrics you want to track that I missed?

This document drives the monthly reporting cadence and quarterly strategic reviews.
```

**Step 9: Final Edits and Delivery (15 min).** Apply edits. Save with naming convention. Upload to Claude Project. Share dashboard access if building one.

---

## Definition of Done

- [ ] All 8 sections complete
- [ ] Baseline metrics captured with specific date stamps
- [ ] Data quality notes distinguish confirmed vs. recall vs. estimated baselines
- [ ] 30-day targets are execution milestones (did the foundational work happen?)
- [ ] 60- and 90-day targets are realistic given Doc 03 bottlenecks and Doc 11 automation impact
- [ ] Every KPI in Section 3 has an attached decision at a specific threshold
- [ ] Vanity metrics explicitly listed as NOT KPIs
- [ ] Measurement infrastructure documented including access status for each tool
- [ ] Data capture gaps identified with remediation recommendations
- [ ] Reporting cadence specified for weekly, monthly, quarterly, annual
- [ ] Escalation thresholds defined with automatic and human actions
- [ ] Decision log template in place (empty at delivery, fills over time)
- [ ] Framework maintenance cadence specified
- [ ] Cross-reference against Documents 03, 06, 09, 11 complete (metrics align with those documents' targets)
- [ ] Client has reviewed and confirmed baselines and targets
- [ ] File saved and uploaded to Claude Project
- [ ] Dashboard infrastructure (if scoped) set up or path to setup documented

---

## Common Failure Modes

**Failure 1: Metrics without decisions.** KPI section lists 20 metrics; none specify what changes when the metric moves. Fix: every metric in Section 3 has a threshold and attached action. Metrics without decisions get cut.

**Failure 2: Baselines never captured.** Document launches without a clear "starting line." Improvement is then unmeasurable. Fix: Section 1 must be complete with dates before client delivery.

**Failure 3: Targets are aspirational, not realistic.** Client expects 50% growth in 90 days from a single automation. Promise gets missed; trust erodes. Fix: underpromise, overdeliver. Targets should feel modest at delivery.

**Failure 4: Vanity metrics crowd out real ones.** Follower counts and impressions get tracked instead of inquiries and bookings. Fix: Section 3 must explicitly identify what's NOT a KPI.

**Failure 5: No reporting cadence sticks.** Monthly reports skip after month 2. Framework becomes forgotten. Fix: calendar the reporting cadence at framework delivery; reports are part of retainer scope.

**Failure 6: Infrastructure gap blocks measurement.** Framework promises to track conversion rate by channel; no system exists to capture channel attribution. Fix: Section 4 explicitly identifies gaps and remediates them in Phase 1 work.

**Failure 7: Decision log never used.** Section 7 stays empty forever; decisions get made ad-hoc without institutional record. Fix: quarterly review updates the decision log; retainer scope includes this.

---

## Worked Example: Audrey's Farmhouse Measurement and KPI Framework

---

# Audrey's Farmhouse Measurement and KPI Framework

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Baseline capture date:** April 22, 2026

**Companion documents:** 01 through 11.

**Critical principle:** Every metric here is tied to a decision.

---

## 1. Baseline Capture

Captured April 22, 2026.

### Traffic and SEO baseline

| Metric | Value | Source |
|---|---|---|
| Organic monthly traffic | 1,100 | Ahrefs + GSC (average trailing 3 months) |
| Total organic keywords ranking | 460 | Ahrefs |
| Domain Rating | 22 | Ahrefs |
| Branded vs. non-branded traffic split | 44% / 56% | GSC |
| Top 10 keywords (by traffic) | [See Doc 06 Section 1] | Ahrefs |

### Sales funnel baseline (from Doc 03 Section 7)

| Metric | Value | Notes |
|---|---|---|
| Inquiries per month | ~75 (average) | HoneyBook; varies seasonally 40-120 |
| First-response time (weekday average) | 4-12 business hours | Secret shopper + CRM |
| First-response time (weekend) | 36-72 hours | Secret shopper |
| Inquiry → tour scheduled | 40% | Estimate; HoneyBook imperfect |
| Tour show-up rate | 85% | Coordinator estimate |
| Tour → verbal yes | 62% | Coordinator estimate |
| Verbal yes → signed | 87% | CRM |
| Overall inquiry → customer | ~19% | Computed from above |
| Average revenue per booking | $32,000 | HoneyBook all-in average |

### Social baseline (from Doc 09 Section 1)

| Metric | Value | Platform |
|---|---|---|
| Instagram followers | 14,800 | Instagram |
| Instagram engagement rate | 3.4% | Instagram |
| Instagram DM inquiries per month | ~12 | Instagram (estimated) |
| Pinterest monthly views | 38,000 | Pinterest |
| Pinterest outbound clicks/month | ~180 | Pinterest |

### Content baseline

| Metric | Value |
|---|---|
| Total published blog posts | 38 |
| Blog posts published trailing 90 days | 1 |
| Total published pages on website | 62 |

### Review baseline

| Metric | Value |
|---|---|
| Google reviews count | 87 |
| Google average rating | 4.9 |
| The Knot reviews | 62 (4.9 avg) |
| WeddingWire reviews | 41 (4.9 avg) |
| Review response rate | 95% (Google), 100% (The Knot, WeddingWire) |

### Data quality notes

- **Data-confirmed:** All SEO metrics, review counts, content counts, Instagram follower/engagement
- **Partially data-confirmed:** Inquiry counts (HoneyBook captures most but not all — Instagram DMs inconsistently tracked)
- **Owner-recall / estimated:** Tour show-up rate, tour-to-verbal conversion, DM inquiry volume, social-to-website attribution
- **Data capture gaps to close in Phase 1:** Channel attribution on inquiries (currently ~60% have clear source); DM-to-inquiry tracking (no current method)

---

## 2. Target Metrics (30/60/90-Day Horizons)

### 30-day targets (execution milestones)

| Target | Achieved? | Source of truth |
|---|---|---|
| Documents 01-11 delivered and loaded into Claude Project | [Y/N] | Claude Project |
| Automation 01 (inquiry auto-responder) live | [Y/N] | n8n |
| Supabase logging infrastructure operational | [Y/N] | Supabase |
| GBP P0 improvements complete (posts active, Q&A backlog answered, 30+ photos added) | [Y/N] | GBP |
| Homepage P0 fixes complete (hero rewrite, CTA consolidation, mobile video fix) | [Y/N] | Website |
| /faq expansion to full FAQ Bank complete | [Y/N] | Website |
| First-touch response time | Under 60 seconds | Automation logs |

### 60-day targets

| Metric | Baseline | 60-day target | Why achievable |
|---|---|---|---|
| First-touch response time (all inquiries) | 4-72 hours | <60 sec sustained | Auto-responder Phase 1 live |
| GBP weekly posts | 0 | 4-6/month | Process change |
| Inquiry-to-tour conversion | 40% | 44% | Better first-touch + nurture sequence live |
| Published pillar pages | 0 | 2-3 | Phase 1 content production |

### 90-day targets

| Metric | Baseline | 90-day target | Why achievable |
|---|---|---|---|
| Organic monthly traffic | 1,100 | 1,300 (+18%) | 2-3 pillar pages indexed + technical SEO improvements |
| Inquiries per month | ~75 | ~85 | Partial — driven more by seasonal factor + SEO improvements beginning to show |
| Inquiry-to-booking conversion | ~19% | 22% | Auto-responder + 3-touch follow-up sequence + improved homepage |
| New bookings from inquiries | ~14/mo | ~19/mo | Combined effect of conversion improvements |
| Revenue impact | Baseline | +$80K-150K/month new bookings value | Primarily from conversion rate improvement |
| Published pillar pages | 0 | 5-6 | Phase 1 + Phase 2 content production |
| Keywords ranking top 10 | [Baseline from Ahrefs] | +15-25 new top-10 keywords | SEO work beginning to show |
| Google reviews | 87 | 100+ | Post-event review automation active |
| GBP impressions | [Baseline] | +30% | Active Posts, Q&A, photos |

**Why 30/60/90 and not shorter:**
- 30 days: execution validation (did the work happen?)
- 60 days: fast-moving metrics start showing (response time, conversion from better first-touch)
- 90 days: slow-moving metrics start to compound (SEO traffic, content volume, review accumulation)

**6-month target placeholder:** Organic traffic +40-50%; inquiry-to-booking conversion +25%; $300K+/quarter attributable revenue impact. Re-set at 90-day review.

**12-month target placeholder:** Organic traffic 2x baseline; inquiry-to-booking conversion sustained 22-25%; SEO Tier 2 keywords ranking top 5; content production cadence sustained at 2-3 pieces/month. Re-set at quarterly reviews.

---

## 3. KPIs Tied to Decisions

### Response time and first-touch quality

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| First-touch response time | Automation logs | Daily (auto-alert) | >120s for 6 hours | Zach investigates automation within 24h |
| Automation 01 success rate | Automation logs | Weekly | <90% | Zach + Joshua investigate prompt/logic |
| Output validation failure rate | Automation logs | Weekly | >10% for a week | Joshua reviews prompt, considers adjustment |
| Coordinator response time on escalated inquiries | HoneyBook timestamps | Monthly | Avg >8 business hours | Staffing or workflow review |

### Funnel conversion

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| Inquiry → tour conversion | HoneyBook | Monthly | Sustained drop >20% from baseline | Diagnostic sprint — follow-up sequence review, pricing clarity, competitive shift check |
| Tour → verbal yes conversion | HoneyBook + coordinator notes | Monthly | Sustained drop >15% | Tour experience review with coordinator |
| Verbal yes → signed conversion | HoneyBook | Monthly | Sustained drop >10% | Contract experience and follow-up timing review |

### Revenue impact

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| Bookings per month | HoneyBook | Monthly | Trailing-3-month avg drops >15% vs. year-ago | Full funnel diagnostic |
| Revenue per booking | HoneyBook | Quarterly | Drift >10% | Review pricing, upsell effectiveness |
| Revenue by channel (where attributable) | HoneyBook + inquiry source field | Quarterly | Any channel drops sharply | Investigate channel; consider pausing spend or repositioning |

### SEO and content

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| Organic monthly traffic | Ahrefs + GSC | Monthly trend; quarterly review | Month-over-month drop >15% for 2 consecutive months | Audit recent technical changes, Google algo updates, content retention |
| Top-15 target keyword positions | Ahrefs monthly | Monthly | Any P0 keyword drops >5 positions | Content refresh of ranking page; technical SEO check |
| Content pieces published vs. calendar | Internal tracker | Weekly | 50% behind calendar for a month | Capacity check; re-scope cadence |

### Automation health

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| Overall automation success rate | Supabase logs | Weekly | <90% for any automation for 1 week | Zach investigates |
| Escalation rate | Supabase logs | Weekly | >25% for 2 weeks | Prompt or trigger logic revision |
| AI API cost | Anthropic usage + Supabase logs | Monthly | >150% of expected for 2 weeks | Prompt efficiency audit, token reduction |

### Social and engagement

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| Instagram follower growth | Instagram Insights | Quarterly | Month-over-month drop in absolute followers | Content strategy review |
| Instagram engagement rate | Instagram Insights | Monthly | Sustained drop >25% from baseline | Pillar balance audit; content quality review |
| DM inquiries per month | Instagram + inquiry log | Monthly | Drop >30% | Investigate platform changes, pillar performance |
| Pinterest outbound clicks | Pinterest Analytics | Monthly | Drop >20% | Review pin titles/descriptions, keyword alignment |

### Review and reputation

| KPI | How measured | Cadence | Threshold | Decision |
|---|---|---|---|---|
| New Google reviews per month | GBP | Monthly | <3/month (expected 6-10 once automation live) | Review post-event automation; manual ask backup |
| Average rating trend | GBP + The Knot + WeddingWire | Monthly | Drop below 4.8 at any platform | Investigate cause; action if systemic |
| Response rate to reviews | GBP + platform | Monthly | <90% | Coordinator review; Q&A also addressed |
| Negative review posted | GBP | Real-time (alert) | Any <4-star | Coordinator + Joshua within 48h per Doc 07 protocol |

### What's NOT a KPI

- Instagram follower count alone (tracked as context, not decision-weighted)
- Total website impressions without click-through
- Time-on-page (interesting, not actionable for this business)
- Bounce rate (context only; too easily misinterpreted)
- Email "open rate" on newsletter alone (measured, but not decision-triggering alone)
- Generic "engagement" on social without tied business outcome

---

## 4. Measurement Infrastructure

### Analytics tools

| Tool | Measures | Access |
|---|---|---|
| Google Search Console | Search visibility, impressions, clicks, queries | Verified; Joshua + client |
| Ahrefs | SEO rankings, backlinks, competitor data | Joshua's account |
| Google Analytics 4 | Website traffic, conversion paths, events | Installed; both have access |
| HoneyBook | Inquiries, funnel, bookings, revenue | Client-owned; Joshua has reporting access |
| Supabase | Automation logs, custom metrics | Joshua-owned; client sees reports |
| GBP Insights | Local search + map pack performance | Client-owned |
| Instagram Insights | Social performance | Client-owned; screenshots for reports |
| Pinterest Analytics | Pinterest performance | Client-owned |
| Anthropic console | AI API usage and costs | Joshua |

### Custom infrastructure (from Doc 11)

- `automation_logs` table — every automation run recorded
- `automation_outputs` table — AI-generated content (encrypted, 90-day retention)
- Supabase views — aggregate success rates, error patterns, escalation tracking by automation
- Slack #audreys-automations — real-time error and escalation notifications

### Dashboard

**Recommended approach: Mid-weight.**

- Umami analytics for website (replaces or supplements GA4; lightweight, privacy-respecting)
- Supabase views for automation metrics
- Simple Next.js dashboard pulling from both, hosted on Vercel
- Dashboard URL accessible to Joshua and client
- Auto-refresh; month-over-month comparison built in

**Alternative if capacity or budget is tight:** Google Sheet updated weekly from CSV exports. Less elegant, still functional.

**Dashboard build:** Scoped as a Phase 2 task (month 2) to avoid overbuilding before data volume justifies it.

### Data capture gaps identified

| Gap | Remediation | Owner | Timeline |
|---|---|---|---|
| Channel attribution on ~40% of inquiries | Add "referral source" field to inquiry form with predefined options | Client + Joshua | Phase 1 (month 1) |
| Instagram DM inquiry tracking | Tag all DM-sourced inquiries in HoneyBook | Coordinator process change | Phase 1 |
| Automation-sourced revenue attribution | UTM on every CTA from automated emails; HoneyBook tracks source | Zach | Phase 1 |
| Social-to-website attribution | Link Cloaking via short URLs with UTM; track in Umami | Zach | Phase 2 |

---

## 5. Reporting Cadence

### Weekly (Joshua internal)

Every Monday. 30 minutes. Focus:
- Automation logs (errors, escalations, volume)
- New inquiries count (vs. typical seasonally)
- Urgent client-facing issues
- Content production status

Output: Internal notes.

### Monthly (Joshua → client)

First week of every month. 2-3 hours to prepare. Focus:

1. **Executive summary (1 paragraph):** What happened, what worked, what didn't
2. **KPI dashboard snapshot:** Baseline vs. current vs. targets
3. **Funnel report:** Inquiries, conversions, bookings, revenue vs. expected
4. **SEO progress:** Keyword position changes, new indexed pages, traffic trend
5. **Automation health:** Success rates, volume, notable escalations, cost
6. **Content published:** What got published, early performance indicators
7. **Threshold-triggered findings:** Anything that crossed a Section 3 threshold
8. **Recommended actions:** Prioritized list for next 30 days

Delivery: PDF emailed to client; optional 30-minute review call.

### Quarterly strategic review (Joshua + client)

Every 3 months. 90-minute meeting. Focus:

1. 3-month lookback: every KPI plotted against baseline
2. What worked / what didn't (opinionated)
3. Source document refresh needs (which of Docs 01-11 need updating)
4. Competitive landscape changes (Doc 05 refresh if warranted)
5. Strategic priorities for next quarter (3-5 focus areas)
6. Scope adjustments for retainer if needed

Output: Updated Doc 12 with revised targets; source docs refreshed as needed.

### Annual

Once per year, same month as delivery. Full audit of all 12 docs. Major refresh of baselines and strategy. Option to restructure engagement.

---

## 6. Thresholds and Escalation

### Performance thresholds

| Signal | Threshold | Automatic action | Human action |
|---|---|---|---|
| Automation 01 failure rate | >10% for 24 hours | Slack alert | Zach investigates within 24h |
| First-touch response time | >120s for 6 hours | Slack alert | Zach investigates |
| Any automation errors out | Any failure | Slack alert | Zach investigates immediately |
| AI output contains banned phrase | Any instance | Escalation | Coordinator reviews; Joshua updates prompt |
| Week-over-week inquiry drop | >30% | Dashboard flag | Joshua diagnostic in next weekly |
| Month-over-month conversion drop | >15% | Dashboard flag | Joshua diagnostic in monthly review |
| Negative review posted | Any <4-star | Email alert + Slack | Coordinator + Joshua per Doc 07 protocol |
| AI API cost | >150% of baseline for 2 weeks | Dashboard flag | Joshua review; efficiency audit |
| GBP rating drops | Any drop below 4.8 | Dashboard flag | Coordinator investigates |

### Escalation paths

- **Technical (automation failures, API issues):** Zach within 24 hours
- **Content (brand voice drift, factual errors):** Joshua within 48 hours
- **Strategic (conversion drops, competitive shifts):** Joshua in next monthly report
- **Crisis (negative public issue):** Joshua + client immediately

---

## 7. Decision Log

Empty at delivery. Populated over time with every threshold-triggered decision.

| Date | Trigger | Data | Decision | Outcome (30-day follow-up) |
|---|---|---|---|---|
| [To be populated] | | | | |

---

## 8. Framework Maintenance

### Update cadence

- **Quarterly:** Section 2 targets, Section 3 thresholds, based on actual performance and business changes
- **Source doc refresh propagation:** When Docs 01-11 update (per their schedules), check this framework for impact
- **Major milestones:** First full quarter of baseline exceeded, first attribution-quality channel data, etc.
- **Annual:** Full rewrite

### Version control

- Minor updates: increment within year (1.1, 1.2, 1.3)
- Annual: new year version (2.0, 3.0)

### Last updated log

- Section 1 (baselines): April 22, 2026
- Section 2 (targets): April 22, 2026
- Section 3 (KPIs): April 22, 2026
- Section 4 (infrastructure): April 22, 2026
- Section 5 (cadence): April 22, 2026
- Section 6 (thresholds): April 22, 2026

---

## End of Worked Example

The example above is a complete reference Measurement and KPI Framework. Use this as the quality bar for any new client. The strongest indicator of a thorough job: every KPI in Section 3 has a threshold and an attached decision. Metrics without decisions were cut. Targets in Section 2 are conservative enough to be achievable and specific enough to be measurable. Baselines in Section 1 distinguish what's data-confirmed from what's estimated.

---

## This Document Completes the AI Operating System

Document 12 is the final document in the 12-document AI Operating System. Together with Documents 01-11, it provides a full operating foundation for any small business running AI-assisted marketing, sales, and operations.

The documents work as a system:
- **01-02 (Brand Voice, Business Facts)** establish what's true
- **03-05 (Sales Process, Content Library, Competitor Landscape)** map the operational and market reality
- **06-07 (SEO, FAQ Bank)** ground the content and answer strategy
- **08-09 (Email Templates, Social Playbook)** translate strategy into channels
- **10-11 (Website Audit, Automation Spec Package)** operationalize across web and automation
- **12 (Measurement)** closes the loop

Each document is independently useful; the full system produces outcomes no single document could.
