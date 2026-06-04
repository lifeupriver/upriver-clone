# Document Production Spec 11: Automation Spec Package

## What This Spec Is

This is the production specification for Document 11 of the 12-document AI Operating System. It tells anyone building this document exactly what goes in, what each section looks like, and how to know when it's done.

The Automation Spec Package is where the strategy from Documents 01-10 becomes actual automated systems. Every automation Zach (or any future automation engineer) builds is specified here first — trigger conditions, data sources, AI prompt structure, error handling, escalation rules, monitoring. Without this document, automations get built ad-hoc, lose track of what they're supposed to do, reference stale facts, and become invisible failure modes that drift without anyone noticing.

This document is a package — a container for individual automation specs. The parent document establishes the standards and principles; each individual automation gets its own structured spec inside. A typical client's Automation Spec Package contains 5-12 individual automation specs.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 11 of 12 |
| **Priority** | High (execution layer) |
| **Total length target** | Variable. Parent document 2,000 words; each individual automation spec 800-1,500 words. Total typically 6,000-15,000 words. |
| **Total time to produce** | 4-8 hours for parent document + 1-2 hours per individual automation spec |
| **Joshua's time** | 2-3 hours on parent + 60-90 min per automation spec |
| **Claude's time** | 45 min parent + 15-30 min per automation spec |
| **Zach's time** | 30-60 min review per automation spec before implementation |
| **Client's time** | 30 min parent review; 15 min per automation spec |
| **Delivery format** | Markdown file for parent, plus individual markdown files per automation spec in a `/automations` subfolder |
| **File naming convention** | `[client-slug]-11-automation-spec-package.md` (parent); `[client-slug]-11-automation-[short-name].md` (individual) |
| **Foundation for** | Direct operational handoff to Zach for n8n implementation |

---

## When This Document Gets Built

**Phase 3-4 of engagement, Week 3-4.** Parent document built after Documents 01-10 are all in place. Individual automation specs built as each automation gets prioritized for implementation — may be phased over multiple weeks or retainer months.

**Triggers:** All foundational documents delivered. Priority automations identified (typically from Doc 03 bottlenecks and Doc 08 template mapping).

**Blocks:** Zach's actual n8n implementation work. Without a spec, Zach builds blind.

---

## Section-by-Section Template (Parent Document)

### Header Block

```markdown
# [Business Name] Automation Spec Package

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last update:** [Month Year]

**For:** Zach (implementation lead), Joshua (oversight), any future automation engineer inheriting these systems.

**Companion documents:** 01, 02, 03, 07, 08, 09, 10.

**Critical principle:** Every automation references at least one source document for facts, voice, or process. Automations that hardcode facts, voice, or process logic are forbidden — they drift silently and can't be updated without code review.
```

---

### Section 1: Automation Architecture Principles

**Purpose:** The rules every automation in this package follows.

**Word count target:** 300-500 words.

Required content:

**Design principles:**
1. Every automation has exactly one primary trigger
2. Every automation has at least one explicit escalation condition (when to route to human)
3. Every automation logs its actions to a central log (Google Sheet, Supabase table, or similar)
4. Every automation has a "dry-run" mode for testing before going live
5. Every AI prompt inside an automation references the source document it pulls from
6. Every automation has a named owner responsible for monitoring

**Tool stack:**
- **n8n:** Orchestration layer. All workflows live here unless specifically noted.
- **Claude API (Anthropic):** AI content generation and decision logic
- **Supabase:** State storage, logs, contact data
- **HoneyBook / [primary CRM]:** Customer data source of truth
- **Gmail / [email platform]:** Sending layer for emails
- **Cal.com:** Scheduling integration
- **Slack:** Alerts and human-escalation channel

**Logging standard:** Every automation writes to the central log with: timestamp, automation name, trigger, input summary, action taken, output summary, success/failure, error details if applicable.

**Error handling standard:** Every automation has explicit behavior for:
- External API failure (retry logic)
- Rate limit (backoff)
- Unexpected input (escalate to human)
- Missing required data (escalate, don't proceed)

**Monitoring standard:** Weekly review of logs for first 30 days post-launch; monthly thereafter. Quarterly full audit.

---

### Section 2: Automation Inventory

**Purpose:** The list of all automations planned and their priority.

**Word count target:** 200-400 words plus table.

Required content:

**Planned automations table:**

| # | Automation name | Priority | Status | Estimated effort | Owner | Dependencies |
|---|---|---|---|---|---|---|
| 01 | [Name] | P0 | [Not started / spec complete / in development / live] | [Hours] | Zach | [What must be done first] |
| 02 | [Name] | P0 | [Status] | [Hours] | Zach | [Dependencies] |

Typical automations for a service business:
1. AI-powered inquiry auto-responder (60-second personalized first-touch)
2. Follow-up sequence automation (post-inquiry, post-tour, post-verbal-yes)
3. Tour confirmation and reminder sequence
4. Welcome packet auto-send on contract-signed trigger
5. Milestone scheduling automations (menu tasting, walkthrough)
6. 30-day countdown and final headcount reminder
7. Post-event review request sequence
8. Lost-deal reactivation
9. Lead source tracking / attribution logging
10. Weekly performance report
11. FAQ-based chatbot on website
12. Social content drafting assistant

**Phase 1 (first 30-60 days):** Which automations launch first.
**Phase 2 (month 2-3):** Next wave.
**Phase 3 (month 3+):** Later wave or nice-to-have.

---

### Section 3: Individual Automation Spec Template

**Purpose:** The structure every individual automation spec follows.

**Word count target:** 400-700 words describing the template (actual specs are separate files).

Required content:

Each individual automation spec (in `[client-slug]-11-automation-[short-name].md`) contains these sections:

```markdown
# Automation Spec: [Automation Name]

**Client:** [Business Name]
**Automation ID:** [Short name used in n8n workflow naming]
**Priority:** [P0 / P1 / P2]
**Owner:** Zach (implementation); Joshua (oversight)
**Status:** [Spec / In development / Live]
**Version:** 1.0

## Purpose

[1-2 paragraphs: what this automation does and why it exists. Should tie back to a specific bottleneck or process step from Documents 03, 07, 08, etc.]

## Trigger

**Primary trigger:** [Specific event — e.g., "New inquiry submitted via HoneyBook form"]
**Trigger mechanism:** [Webhook / scheduled cron / manual / chained from another automation]
**Trigger frequency expected:** [Estimate per day/week]

## Input Data

**Required inputs:**
- [Field name and type]
- [Field name and type]

**Optional inputs:**
- [Field name and type]

**Input validation rules:**
- [What to check before proceeding]

**What happens on invalid input:**
- [Escalation or rejection behavior]

## Data Sources

Which source documents or systems this automation reads from:

- **Document 02 (Business Facts Reference):** [Specific facts used — e.g., "pricing for the requested date type and season"]
- **Document 07 (FAQ Bank):** [How used — e.g., "answer template for FAQ-matched inquiries"]
- **Document 08 (Email Templates):** [Which templates — e.g., "Template 2A standard inquiry response"]
- **HoneyBook / CRM:** [What data is fetched — e.g., "calendar availability for requested date"]
- **Other sources:** [As applicable]

## Logic Flow

Step-by-step flow of the automation:

1. [Trigger fires]
2. [Data fetched from source X]
3. [Validation check Y]
4. [If condition A, do X; if condition B, do Y]
5. [AI prompt call to Claude with structured input]
6. [Output processing]
7. [Action taken — send email, create record, notify human, etc.]
8. [Log entry written]

Include a flowchart diagram if the logic is complex enough to benefit from visual representation.

## AI Prompt (if applicable)

For automations that call Claude:

**Model:** claude-opus-4-7 (or specified alternative)
**Max tokens:** [Number]
**Temperature:** [0.0-1.0; typically 0.3-0.7 for business content]

**System prompt:**
```
[Full system prompt text, including references to source documents that should be loaded as context]
```

**User prompt template:**
```
[Template with variables, showing exactly what the automation will send to Claude]
```

**Expected output format:**
- [Plain text / JSON / structured format]
- [Length expectations]
- [What the automation does with the output]

**Output validation:**
- [Checks applied to AI output before using — e.g., banned phrase check, fact-check against source, length limits]

## Escalation Conditions

When this automation should NOT proceed and should instead route to a human:

1. [Specific condition with action]
2. [Specific condition with action]
3. [Specific condition with action]

Escalation destination: [Slack channel / email / CRM flag]

## Error Handling

**External API failure:** [Retry logic — typically 3 retries with exponential backoff, then escalate]
**Rate limit:** [Backoff behavior]
**Unexpected input format:** [Escalate]
**Missing required data:** [Escalate, don't proceed]
**Partial success:** [What counts as success vs. failure]

## Logging

Every run writes to the central log with these fields:

- Timestamp
- Automation ID
- Trigger details
- Input summary (PII-safe)
- Actions taken
- Output summary (PII-safe)
- Success / failure / escalation
- Error details if applicable
- Human follow-up required (yes/no)

## Success Metrics

**What this automation tracks:**
- [Metric 1 — e.g., "Time from trigger to first-touch response sent"]
- [Metric 2]
- [Metric 3]

**What counts as success:**
- [Threshold or target]

**Monitoring cadence:**
- First 30 days: daily log review by Joshua
- Days 30-90: weekly log review
- Day 90+: monthly review + exception-based alerts

## Dependencies

**Must be live before this automation can launch:**
- [Dependency 1]
- [Dependency 2]

**Blocks these downstream automations:**
- [Downstream automation 1]
- [Downstream automation 2]

## Testing Plan

**Dry-run tests before go-live:**

1. [Test scenario 1 — e.g., "Standard inquiry, date available"]
2. [Test scenario 2 — e.g., "Inquiry with FAQ-matched question"]
3. [Test scenario 3 — e.g., "Inquiry for unavailable date"]
4. [Test scenario 4 — e.g., "Edge case — inquiry with only email, no name"]
5. [Test scenario 5 — e.g., "Escalation trigger — VIP planner inquiry"]

**Pass criteria:**
- [Specific criteria for each test]

**Live soft-launch approach:**
- First 30 days: every output BCCed/reviewed by human
- Day 30-60: 10% sample review
- Day 60+: exception-based review only

## Deployment Checklist

- [ ] Spec reviewed and approved by Joshua
- [ ] Spec reviewed by Zach
- [ ] All data sources accessible (API keys, webhook URLs, credentials)
- [ ] All prerequisite documents current (facts, templates, FAQ Bank)
- [ ] Dry-run tests pass all scenarios
- [ ] Escalation channels verified (Slack, email)
- [ ] Logging table exists and writes correctly
- [ ] Rollback plan documented (how to disable quickly if problems emerge)
- [ ] Client informed of launch
- [ ] Human review loop active for first 30 days
```

---

### Section 4: Phased Implementation Roadmap

**Purpose:** The order automations get built and launched.

**Word count target:** 300-500 words.

Required content:

**Phase 1: Foundation (weeks 1-4)**

Usually includes:
- Central logging infrastructure (Supabase tables or Sheets)
- AI inquiry auto-responder (highest-value automation per Doc 03 bottleneck analysis)
- Tour confirmation + reminder sequence

**Phase 2: Nurture (weeks 5-8)**

- Follow-up sequences (post-inquiry, post-tour, post-verbal-yes)
- Welcome packet on contract-signed trigger
- Milestone scheduling automations

**Phase 3: Lifecycle (weeks 9-12)**

- Post-event review requests
- Lost-deal reactivation
- Quarterly newsletter automation
- Performance reporting

**Phase 4: Advanced (month 3+)**

- Website chatbot
- Social content drafting assistant
- Any custom automations identified during retainer

**Sequencing principles:**
- High-value, contained automations first (inquiry auto-responder is P0 for almost every client)
- Dependent automations after prerequisites (contract-signed welcome requires HoneyBook webhook; tour confirmation requires Cal.com integration)
- Risk order: lower-risk automations first (scheduled confirmations) before higher-risk (AI-generated responses going out unsupervised)

---

### Section 5: Monitoring and Maintenance

**Purpose:** How automations stay healthy over time.

**Word count target:** 200-400 words.

Required content:

**Monitoring responsibilities:**
- **Zach:** Weekly log review, error investigation, technical fixes
- **Joshua:** Monthly strategic review, voice/drift check, document updates
- **Booking coordinator or operations person:** Daily triage of escalated items

**Scheduled reviews:**
- **Weekly:** Error logs, escalation patterns, success rate by automation
- **Monthly:** Volume trends, cost (AI API usage), drift indicators
- **Quarterly:** Full audit — compare automation outputs to source documents, update prompts as needed, retire or restructure underperforming automations

**Drift indicators (things to watch for):**
- AI outputs using banned phrases from Brand Voice Guide
- AI outputs referencing outdated facts (pricing, capacity, team names)
- Escalation rate trending up (may indicate prompt or trigger logic needs revision)
- Error rate trending up (may indicate external dependency issue)

**Change management:**
- Document updates (Doc 02, Doc 07, Doc 08) automatically propagate to automations that reference them by pulling at runtime
- For automations with hardcoded logic, explicit review required when source docs change
- Any prompt changes go through version control with dated comments

---

### Section 6: Cost and Resource Planning

**Purpose:** Honest forecast of ongoing costs.

**Word count target:** 200-300 words.

Required content:

**Ongoing costs (monthly estimates):**

| Item | Monthly cost | Notes |
|---|---|---|
| n8n (self-hosted or cloud) | $X | [Plan tier] |
| Claude API | $X | [Volume estimate] |
| Supabase | $X | [Plan tier] |
| Other tools | $X | [Which ones] |
| **Total monthly infrastructure** | **$X** | |

**Labor costs:**
- Zach initial build: [Hours total across all Phase 1-2 automations]
- Zach ongoing maintenance: [Hours per month]
- Joshua oversight: [Hours per month]

**Per-automation cost breakdown:**
For each automation, estimate:
- Claude API calls per trigger × expected triggers per month × average token count × per-token cost

**ROI context:**
- Per Doc 03 analysis, the inquiry auto-responder alone is projected to recover $X/month in previously-lost revenue.
- Total expected revenue impact of Phase 1 automations: $X/month.
- Break-even vs. monthly costs: typically within 30-60 days.

---

## How to Build This Document

**Parent document (4-6 hours):**

**Step 1: Pre-Build Prep (30 min).** Confirm all 10 prerequisite documents delivered. Identify automation priorities from Doc 03 bottlenecks and Doc 08 template mapping.

**Step 2: Automation Inventory (45 min).** List every automation the operating system implies. Prioritize based on ROI and dependencies.

**Step 3: Architecture Principles (30 min).** Document the tool stack and design principles. Pull from any existing client patterns Joshua uses.

**Step 4: Phased Roadmap (30 min).** Sequence automations into Phase 1-4 based on priority, dependencies, and risk.

**Step 5: Draft Generation (45 min, Claude).** Generate parent document from inventory, principles, and roadmap.

**Step 6: Zach Review (30 min).** Zach reviews architecture principles and inventory for feasibility and implementation preferences.

**Step 7: Client Review (30 min client time).** Parent document review — focus on inventory priorities and cost expectations.

**Step 8: Final Edits (15 min).** Apply edits, save, upload.

**Per individual automation spec (1-2 hours each):**

**Step 1: Source document review (15 min).** Pull relevant excerpts from source docs (Doc 02, 07, 08 most commonly).

**Step 2: Logic flow design (30 min, Joshua + Zach).** Whiteboard the automation's logic. Identify decision points, escalations, data sources.

**Step 3: AI prompt drafting (20 min, Joshua + Claude).** For automations using Claude, draft system and user prompts. Include source document references.

**Step 4: Error and escalation design (15 min).** Document what goes wrong and what happens in each case.

**Step 5: Testing plan (15 min).** Define dry-run test scenarios.

**Step 6: Zach review (30 min).** Zach validates feasibility, flags implementation concerns.

**Step 7: Deployment checklist (included in spec).**

---

## Definition of Done

**Parent document:**
- [ ] All 6 sections complete
- [ ] Architecture principles documented
- [ ] Automation inventory complete with priorities and dependencies
- [ ] Individual spec template defined
- [ ] Phased implementation roadmap sequenced
- [ ] Monitoring and maintenance plan documented
- [ ] Cost forecast with realistic estimates
- [ ] Zach and client have reviewed
- [ ] File saved with correct naming convention

**Each individual automation spec:**
- [ ] Purpose clearly ties to a source document or documented bottleneck
- [ ] Trigger is specific and unambiguous
- [ ] Input data requirements and validation rules documented
- [ ] Data sources referenced with specific document and section callouts
- [ ] Logic flow is step-by-step
- [ ] AI prompt (if applicable) includes system prompt, user template, expected output format, validation
- [ ] Escalation conditions listed with destinations
- [ ] Error handling covers API failure, rate limit, invalid input, missing data
- [ ] Logging schema defined
- [ ] Success metrics specified
- [ ] Testing plan includes 5+ scenarios
- [ ] Deployment checklist complete
- [ ] Zach has reviewed for feasibility
- [ ] Dry-run tests pass all scenarios before go-live
- [ ] First 30 days of live operation have human review loop active

---

## Common Failure Modes

**Failure 1: Automations hardcode facts that should come from source docs.** Pricing gets hardcoded in a workflow. Pricing changes; workflow continues sending old pricing. Fix: every fact comes from Doc 02 at runtime, never from automation code.

**Failure 2: No escalation conditions defined.** Automation tries to handle every case, makes mistakes on edge cases. Fix: every automation must have 3+ explicit escalation conditions.

**Failure 3: No logging.** Automation runs for months; something goes wrong; nobody can reconstruct what happened. Fix: logging is non-negotiable on every automation.

**Failure 4: AI prompts don't reference source documents.** Prompt says "respond in the brand voice" without loading the Brand Voice Guide. AI drifts. Fix: every AI prompt loads source documents as context or loads them via tool calls.

**Failure 5: No testing plan before go-live.** Automation goes live directly. Edge case breaks it. Real customers see the failure. Fix: 5+ dry-run scenarios required before go-live.

**Failure 6: No human review loop for first 30 days.** AI auto-responder goes live unsupervised; drift goes unnoticed until customer complaint. Fix: 30-day BCC / review loop is mandatory for every AI-powered automation.

**Failure 7: Automations accumulate without being retired.** Over time, 20+ automations exist; nobody remembers what half of them do. Fix: quarterly audit retires unused or low-value automations.

---

## Worked Example: Audrey's Farmhouse Automation Spec Package

The worked example below shows the parent document AND one complete individual automation spec (the inquiry auto-responder, which is typically P0 for most clients). Additional individual specs follow the same structure.

---

# Audrey's Farmhouse Automation Spec Package

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0

**For:** Zach (implementation), Joshua (oversight), and future automation engineers.

**Companion documents:** 01, 02, 03, 07, 08, 09, 10.

---

## 1. Automation Architecture Principles

### Design principles

1. Every automation has exactly one primary trigger
2. Every automation has at least one explicit escalation condition
3. Every automation logs to the central Supabase `automation_logs` table
4. Every automation has a dry-run mode
5. Every AI prompt references source documents at runtime
6. Every automation has a named owner (Zach for implementation; Joshua for oversight)

### Tool stack

- **n8n:** Self-hosted on Hetzner; all workflows live here
- **Claude API:** claude-opus-4-7 for generation; temperature 0.3-0.5 for content
- **Supabase:** `automation_logs`, `prospects`, `contacts` tables
- **HoneyBook:** CRM source of truth; inquiries trigger webhooks
- **Gmail (Resend for transactional):** Sending layer
- **Cal.com:** Scheduling
- **Slack:** Alerts to #audreys-automations channel

### Logging standard

Every automation writes to `automation_logs` with: timestamp, automation_id, trigger_type, input_hash (PII-safe), actions_taken (JSON), output_hash, status (success/failure/escalation), error_details, human_followup_required (bool).

### Error handling standard

- External API failure: 3 retries with exponential backoff (1s, 5s, 25s), then escalate
- Rate limit: exponential backoff up to 5 min, then escalate
- Unexpected input: log and escalate, don't proceed
- Missing required data: escalate, don't proceed

### Monitoring

- Weekly: Zach reviews logs for errors and escalations
- Monthly: Joshua reviews logs for drift indicators
- Quarterly: Full audit

---

## 2. Automation Inventory

| # | Name | Priority | Status | Effort | Owner | Dependencies |
|---|---|---|---|---|---|---|
| 01 | AI inquiry auto-responder | P0 | Spec in progress | 12h | Zach | HoneyBook webhook, Claude API |
| 02 | Tour confirmation + reminder sequence | P0 | Planned | 6h | Zach | Cal.com, Gmail |
| 03 | Post-inquiry 3-touch follow-up sequence | P0 | Planned | 8h | Zach | Automation 01 live first |
| 04 | Post-tour follow-up sequence | P1 | Planned | 6h | Zach | Automation 02 live first |
| 05 | Contract-signed welcome packet send | P1 | Planned | 4h | Zach | HoneyBook contract webhook |
| 06 | Menu tasting scheduling prompt (4 months out) | P1 | Planned | 3h | Zach | Automation 05 |
| 07 | Final walkthrough scheduling (30 days out) | P1 | Planned | 3h | Zach | Automation 05 |
| 08 | 30-day countdown + final headcount reminder | P1 | Planned | 4h | Zach | Automation 05 |
| 09 | 2-week post-event review request | P1 | Planned | 3h | Zach | Event-complete flag in HoneyBook |
| 10 | 1-year anniversary touch | P2 | Planned | 2h | Zach | Event-complete timestamp |
| 11 | Lost-deal reactivation (6 months out) | P2 | Planned | 4h | Zach | HoneyBook lost-deal flag |
| 12 | Weekly performance report to Slack | P2 | Planned | 6h | Zach | Supabase logs, HoneyBook API |

---

## 3. Individual Automation Spec Template

See template in parent spec Section 3 above. Each automation gets its own file:
- `/automations/01-inquiry-auto-responder.md`
- `/automations/02-tour-confirmation.md`
- etc.

---

## 4. Phased Implementation Roadmap

### Phase 1: Foundation (weeks 1-4)

- **Week 1:** Supabase setup, `automation_logs` table, HoneyBook webhook integration
- **Week 2:** Automation 01 (inquiry auto-responder) — build, dry-run, soft-launch
- **Week 3:** Automation 02 (tour confirmation + reminder) — build and launch
- **Week 4:** Automation 03 (post-inquiry 3-touch follow-up) — build and launch

### Phase 2: Nurture (weeks 5-8)

- **Week 5:** Automation 04 (post-tour follow-up)
- **Week 6:** Automation 05 (contract-signed welcome)
- **Week 7:** Automations 06, 07 (milestone scheduling)
- **Week 8:** Automation 08 (30-day countdown)

### Phase 3: Lifecycle (weeks 9-12)

- **Week 9-10:** Automation 09 (post-event review request)
- **Week 11:** Automation 10 (1-year anniversary)
- **Week 12:** Automation 11 (lost-deal reactivation)

### Phase 4: Reporting (month 3+)

- Automation 12 (weekly performance report)
- Any custom automations identified during retainer

### Sequencing principles applied here

- Automation 01 is highest-value (Doc 03 identified $216-324K/year in lost revenue from slow response) — goes first
- Automations 02 and 03 launch soon after to complete the first-touch-through-tour flow
- Post-sale automations wait until the pre-sale flow is stable
- Reporting comes last because it requires accumulated log data

---

## 5. Monitoring and Maintenance

### Responsibilities

- **Zach:** Weekly log review, error investigation, technical fixes, monthly reporting to Joshua
- **Joshua:** Monthly strategic review, voice/drift check, source document updates
- **Booking coordinator:** Daily triage of escalated items in Slack #audreys-automations channel

### Scheduled reviews

- **Weekly (Zach):** Error logs, escalation patterns, success rate by automation, API usage trend
- **Monthly (Joshua):** Volume trends, AI output quality sample, source document sync check
- **Quarterly (Joshua + Zach):** Full audit — compare outputs to source docs, update prompts, retire underperformers

### Drift indicators

- AI outputs using banned phrases from Doc 01
- AI outputs quoting pricing not in current Doc 02
- AI outputs referencing team members not currently on staff
- Escalation rate trending up (>15% indicates prompt or trigger logic needs revision)
- Error rate trending up (>5% indicates external dependency issue)

### Change management

- Doc 02 (Business Facts) updates propagate automatically when automations fetch at runtime
- Doc 01 (Voice) updates trigger prompt review across all AI-powered automations
- Doc 08 (Templates) updates trigger review of matching automations
- Any prompt change goes through version control with dated comments

---

## 6. Cost and Resource Planning

### Ongoing costs (monthly estimates)

| Item | Monthly cost | Notes |
|---|---|---|
| n8n (self-hosted Hetzner VPS) | $20 | Shared across clients |
| Claude API | $60-120 | ~75 inquiries/mo × ~3 Claude calls per flow × ~$0.05 avg |
| Supabase | $25 | Pro plan, shared |
| Resend (transactional email) | $20 | Sending layer |
| **Total monthly infrastructure** | **$125-185** | Scales with volume |

### Labor costs

- **Zach Phase 1-2 build:** 50-65 hours total across 12 automations
- **Zach ongoing maintenance:** 4-6 hours/month
- **Joshua oversight:** 2-3 hours/month

### ROI context

Per Doc 03 bottleneck analysis, the inquiry auto-responder alone is projected to recover $18-27K/month in previously-lost revenue by closing the response-time gap (67 hours → under 60 seconds). Follow-up sequences (Automations 03-04) add estimated $8K/month. Total Phase 1 revenue impact: $25-35K/month.

Break-even vs. monthly infrastructure costs: well within 30 days. Labor costs amortize over several months of steady operation.

---

# Individual Automation Spec: Inquiry Auto-Responder

**Client:** Audrey's Farmhouse
**Automation ID:** audreys-inquiry-autoresponder-v1
**Priority:** P0
**Owner:** Zach (implementation); Joshua (oversight)
**Status:** Spec complete — awaiting implementation
**Version:** 1.0

## Purpose

The inquiry auto-responder sends a personalized response within 60 seconds of a new inquiry arriving via the Audrey's Farmhouse website form, The Knot inbox, or HoneyBook inquiry intake. Per Doc 03 Section 9 analysis, current response time of 4-72 hours is the single largest revenue bottleneck, estimated at $216-324K/year in lost bookings. Industry data indicates venues responding within 1 hour book 7x more often than those responding after 24 hours. This automation closes that gap.

The automation generates a response using Doc 08 Template 2A (standard) or 2B (question-matched) as the structural template, with personalization pulled from the inquiry form and pricing pulled from Doc 02. All outputs apply Doc 01 voice rules.

## Trigger

**Primary trigger:** New inquiry created in HoneyBook via website form or direct inquiry intake
**Trigger mechanism:** HoneyBook webhook → n8n
**Trigger frequency expected:** 60-100 inquiries per month (varies seasonally)

## Input Data

**Required inputs (from HoneyBook inquiry):**
- first_name (string)
- email (string, valid format)
- date_of_event (date)

**Optional inputs:**
- partner_first_name (string)
- guest_count_estimate (int)
- free_text_note (string) — used for personalization callback
- phone_number (string)
- referral_source (string)

**Input validation:**
- first_name and email required; if missing, escalate
- date_of_event must be between today+14 days and today+540 days (18 months)
- If date_of_event is >18 months out, use Template 2C-variant explaining calendar-opens-18-months-ahead

**Invalid input behavior:**
- Missing required data: escalate to Slack #audreys-automations with raw inquiry details
- Spam pattern detected (same email >3x in 60 seconds): silently suppress, flag in logs

## Data Sources

- **Document 02 (Business Facts Reference):** Pricing by date type/season (Section 4), what's included (Section 3), booking coordinator name (Section 2)
- **Document 07 (FAQ Bank):** Answer templates if inquiry contains FAQ-matched question
- **Document 08 (Email Templates):** Template 2A (standard), Template 2B (with question), Template 2C (unavailable), Template 2D (disqualified)
- **HoneyBook calendar API:** Real-time availability check for requested date
- **HoneyBook contact database:** Check if inquiry email matches existing customer (escalate if yes)

## Logic Flow

1. Webhook fires on new inquiry
2. Parse inquiry data, validate required fields
3. Check if email matches existing HoneyBook customer → if yes, escalate (handled by coordinator)
4. Check calendar availability for requested date via HoneyBook API
5. Determine date type: Saturday/Friday/Sunday/weekday
6. Determine season: peak (May-June, Sept-Oct)/shoulder (April, early May, early Nov)/off (Dec-Mar)
7. Check guest count qualification: 30-200 range → qualified; <30 → suggest microwedding; >200 → disqualified with referral
8. Check referral_source for VIP patterns (named planner, past customer keyword) → if VIP, escalate
9. Scan free_text_note for FAQ-matched questions via keyword detection (pricing, capacity, catering, lodging, vendor policy)
10. Select template:
   - If date available + qualified + no FAQ question → Template 2A
   - If date available + qualified + FAQ question detected → Template 2B (lead with FAQ answer)
   - If date unavailable → Template 2C (suggest 2-3 nearby open dates from calendar)
   - If disqualified → Template 2D (with referral if possible)
11. Call Claude API with template + variables + voice rules + source doc context
12. Validate Claude output (length, banned phrases, variable fill)
13. Send via Resend
14. Write to automation_logs
15. BCC to booking coordinator during first 30 days

## AI Prompt

**Model:** claude-opus-4-7
**Max tokens:** 800
**Temperature:** 0.4

**System prompt:**
```
You are generating an inquiry response email for Audrey's Farmhouse, a boutique Hudson Valley wedding venue. You must apply these rules strictly:

BRAND VOICE (from Audrey's Brand Voice Guide):
- First-person singular ("I"), not "we"
- Direct over diplomatic; warm but not effusive
- Real numbers over adjectives
- NO em dashes anywhere (use commas, periods, or semicolons instead)
- 2-4 sentence paragraphs

BANNED PHRASES (never use any of these):
stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, dream wedding

TEMPLATE STRUCTURE:
[Paste the full text of the chosen template from Document 08 with variable markers]

FACTS TO USE (from Audrey's Business Facts Reference):
- Saturday peak season (late May, June, September, October): $14,500 venue
- Saturday shoulder season (April, early May, early November): $11,000 venue
- Friday/Sunday peak: $11,500; shoulder: $9,000
- Weekday microwedding (any season): $4,500, capped at 30 guests
- In-house catering: $145-$185 per person
- Bar: $42 (beer and wine) or $58 (full bar) per person for 5 hours
- Lodging beyond farmhouse: $295-$395/room/night
- Capacity: 180 seated reception, 200 ceremony lawn
- 23 on-site rooms across farmhouse, cottage, carriage house
- Friday-Sunday weekend format included
- Day-of coordination by Megan included
- Booking coordinator name: [current coordinator name]

Generate ONLY the email body. No subject line, no signature block (handled by Resend). Output plain text only, no markdown formatting.
```

**User prompt template:**
```
Generate a response for this inquiry:

First name: {{first_name}}
Partner first name: {{partner_first_name_or_blank}}
Date of event: {{date_of_event}} ({{day_of_week}}, {{season_pricing_tier}} season)
Guest count estimate: {{guest_count_estimate_or_unknown}}
Date availability: {{available_or_unavailable}}
Free-text note from inquiry: "{{free_text_note_or_blank}}"

Template to follow: {{template_name}}

If free_text_note contains a specific detail worth referencing back (a mentioned name, preference, or situation), reference it naturally in the opening. If free_text_note is blank or generic, skip any personalization callback — don't fabricate details.

Apply the template structure. Use exact pricing from the facts block. Sign off with: "— {{coordinator_name}}"
```

**Expected output format:**
- Plain text email body only
- 150-400 words
- Includes greeting, availability/pricing block, CTA to Cal.com, sign-off
- No markdown

**Output validation:**
- Check for banned phrases (fail if found, escalate)
- Check for em dashes (fail if found, escalate — rewrite manually)
- Check word count (150-450 words acceptable; outside = escalate)
- Check that pricing matches Doc 02 exactly (no rounding, no approximations)
- Check that {{variables}} are all filled (no unreplaced markers)

## Escalation Conditions

Automation does NOT send automatically if:

1. Inquiry email matches existing HoneyBook customer → coordinator handles (personalized outreach appropriate)
2. Referral source field contains named planner from preferred list OR contains "referral from" language → coordinator handles (relationship context matters)
3. Free-text note contains keywords indicating special circumstance (memorial, vow renewal, accessibility needs, language other than English) → coordinator handles
4. Spam pattern detected (same email >3x in 60 seconds; suspicious domain) → silently suppress
5. Date requested >18 months out → use Template 2C-variant (calendar opens 18mo ahead)
6. Output validation fails (banned phrase, em dash, pricing mismatch, unfilled variables) → escalate to coordinator with draft attached for human review
7. HoneyBook API fails after 3 retries → escalate with raw inquiry data; coordinator responds manually
8. Claude API fails after 3 retries → escalate; coordinator responds manually

**Escalation destination:** Slack #audreys-automations channel + email to booking coordinator

## Error Handling

- **HoneyBook API failure:** 3 retries with 1s/5s/25s backoff; then escalate with inquiry data
- **Claude API failure:** 3 retries; then escalate
- **Claude rate limit:** Exponential backoff up to 5 min; then escalate
- **Resend sending failure:** 3 retries; then escalate; include draft in escalation
- **Output validation failure:** Don't send; escalate with generated draft for manual review

## Logging

Every run writes to `automation_logs`:
- timestamp
- automation_id: `audreys-inquiry-autoresponder-v1`
- trigger_type: `honeybook_webhook_inquiry`
- input_hash: SHA-256 hash of inquiry email (PII-safe identifier)
- date_of_event (non-PII)
- actions_taken: JSON with template_selected, claude_model_used, tokens_used, claude_latency_ms
- output_hash: SHA-256 of output
- status: success / failure / escalation
- error_details: if applicable
- human_followup_required: true during first 30 days (all); false after if no issue flagged
- full_output: stored separately in `automation_outputs` (encrypted at rest, 90-day retention)

## Success Metrics

**Tracked:**
- Time from trigger to email sent (target: <60 seconds)
- Response sent / trigger count (target: >85% auto-sent, <15% escalated)
- Claude API success rate (target: >99%)
- Output validation pass rate (target: >95%)
- Inquiry-to-tour-scheduled rate (tracked separately in HoneyBook; comparison pre/post launch)

**Success thresholds:**
- Phase 1 (days 1-30): 95% of eligible inquiries get response within 60 seconds
- Phase 2 (days 30-90): Inquiry-to-tour-scheduled rate improves ≥20% vs. pre-launch baseline
- Phase 3 (days 90+): Sustained performance; drift monitoring active

## Dependencies

**Must be live before launch:**
- Supabase `automation_logs` and `automation_outputs` tables
- HoneyBook inquiry webhook configured
- Resend sending domain verified
- Claude API key configured in n8n with usage limits
- Booking coordinator Slack access to #audreys-automations

**Blocks downstream:**
- Automation 03 (post-inquiry follow-up) depends on this automation having fired

## Testing Plan

**Dry-run scenarios (all must pass before go-live):**

1. **Standard inquiry, date available, qualified** — Saturday 10/17/2026, 120 guests, brief note about hosting out-of-town family. Expected: Template 2A response with pricing, CTA, personalization callback referencing family.
2. **Inquiry with FAQ-matched question** — Saturday 6/20/2026, free-text says "what's your catering situation?" Expected: Template 2B response leading with catering answer from FAQ Bank, then standard structure.
3. **Inquiry for unavailable date** — Saturday 10/10/2026 (already booked). Expected: Template 2C response with 2-3 alternative open dates.
4. **Disqualified — guest count too large** — 250 guests. Expected: Template 2D response with honest decline and referral to Stonecroft.
5. **Disqualified — guest count too small** — 22 guests. Expected: Template 2D response suggesting weekday microwedding format.
6. **Edge case — missing first name** — only email provided. Expected: Escalation to coordinator.
7. **VIP escalation — inquiry from preferred planner's email** — Expected: No auto-send; escalation to coordinator.
8. **Spam pattern — same email 5 times in 30 seconds** — Expected: Silent suppression after first response.
9. **Special circumstance — free-text mentions vow renewal** — Expected: Escalation to coordinator.
10. **Date >18 months out** — June 2028. Expected: Template 2C-variant about calendar timing.
11. **Output validation failure simulation** — force Claude to output banned phrase. Expected: Don't send, escalate with draft.

**Pass criteria:** All 11 scenarios produce expected behavior; no false negatives (automation suppressing valid inquiries); no false positives (automation sending to ineligible).

**Live soft-launch approach:**
- First 30 days: every output BCCed to booking coordinator; coordinator flags any issues in Slack
- Days 30-60: 10% sample review by coordinator; 100% error/escalation review
- Day 60+: exception-based review; quarterly full audit

## Deployment Checklist

- [ ] Spec approved by Joshua
- [ ] Spec reviewed by Zach for implementation feasibility
- [ ] Supabase tables created and tested
- [ ] HoneyBook webhook configured and verified
- [ ] Resend domain verified (audreysfarmhouse.com)
- [ ] Claude API key configured with $200/month spending limit
- [ ] Coordinator has Slack access to #audreys-automations
- [ ] All 11 dry-run scenarios pass
- [ ] Doc 02 current as of launch date
- [ ] Doc 07 FAQ Bank loaded into prompt context
- [ ] Doc 08 Templates 2A, 2B, 2C, 2D loaded into prompt context
- [ ] Rollback plan documented (n8n workflow can be disabled instantly; HoneyBook webhook can be removed; coordinator takes over manually)
- [ ] Client informed of launch
- [ ] 30-day BCC review loop active
- [ ] First 7 days monitored daily by Zach + Joshua

---

## End of Worked Example

The example above shows the parent package document plus one complete individual automation spec. Additional automations from Section 2's inventory follow the same spec template. The strongest indicator of a thorough job: every automation spec is detailed enough that Zach could implement it without a single clarifying question — and detailed enough that a future automation engineer inheriting the system could maintain or modify it.
