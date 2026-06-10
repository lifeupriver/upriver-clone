# Little Friends Learning Loft automation spec package

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0
**Last update:** June 2026

**For:** Zach (implementation lead), Joshua (oversight), and any future automation engineer inheriting these systems.

**Companion documents:** 01, 02, 03, 07, 08, 09, 10.

[NEEDS CONFIRMATION: the upstream documents for this engagement (02, 03, 07, 08) each cross-reference the Automation Spec Package as "Document 10." This file is numbered 11 per the engagement document map. Please confirm the correct numbering before publishing so companion document references are consistent.]

**Critical principle:** Every automation references at least one source document for facts, voice, or process. Automations that hardcode facts, voice, or process logic are not permitted. They drift silently and require code review to fix rather than a simple document update.

---

## 1. Automation architecture principles

### Design principles

1. Every automation has exactly one primary trigger.
2. Every automation has at least one explicit escalation condition (when to route to a human). The five escalation categories below are built into every automation in this package by design, not added later.
3. Every automation logs its actions to a central log (Supabase `automation_logs` table, or a Google Sheet as an interim fallback if Supabase is not yet provisioned).
4. Every automation has a dry-run mode for testing before going live.
5. Every AI prompt references the source document it pulls voice or facts from.
6. Every automation has a named owner responsible for monitoring.

### Hardwired escalation categories (preschool-specific)

These five categories apply to every automation in this package. If any automation can plausibly encounter one of these trigger types, its escalation logic must handle it explicitly:

| Escalation type | Mandatory route |
|---|---|
| Child wellbeing or an incident of any kind | Director (Rebecca). Never automated, no exceptions. |
| Anything about money or billing | Director, or Linda (bookkeeper) if purely billing. |
| An upset or distressed parent | Director (Rebecca). |
| Hiring or staffing matters | Director (Rebecca). |
| OCFS or state regulatory communication | Director (Rebecca). |

### Design red lines (non-negotiable constraints)

The following constraints come directly from the engagement profile and govern what these automations can and cannot do:

- **Tuition is never published.** The only dollar amount permitted in any automated output is the $75 registration fee, and only when directly asked about fees. Tuition amount and deposit amount are excluded from all automation outputs, full stop.
- **No child image without consent.** Any photo-related automation must verify that a signed photo release form exists for each child before surfacing or distributing any image containing that child's face.
- **Parents must not feel like they are talking to a robot about their child.** All AI-generated communication touching enrolled families defaults to draft-assist mode: a human reviews and sends. Fully automated sends are reserved for operational logistics (tour confirmations, reminder sequences) that parents understand to be system-generated.
- **Teacher names are public; personal details are not.** First names (Miss Tova, Miss Carla, Miss Dana, Yael for Aftercare) are appropriate in automated communications. Personal phone numbers, personal email addresses, home addresses, and personal social media profiles are excluded from all automation outputs.

### Tool stack

- **n8n:** Orchestration layer. All workflows live here. Status: to be provisioned; credentials transfer from Upriver to Rebecca at handoff.
- **Claude API (Anthropic):** AI content generation and decision logic. Model version and per-month spending cap to be set at provisioning. [NEEDS CONFIRMATION: spending cap not yet established]
- **Supabase:** State storage, automation logs, contact and family data, consent form records.
- **Gmail (or school's primary email platform):** Sending layer for email communications. [NEEDS CONFIRMATION: confirm whether the school uses Gmail or another provider as its primary email platform]
- **Sign-Up Genius:** Tour scheduling. n8n reads Sign-Up Genius confirmations via email parsing; fully automated webhook integration depends on Sign-Up Genius account tier.
- **Brightwheel:** Enrolled-family daily communications. Brightwheel does not expose a public API suitable for automated sending; all Brightwheel automations in this package are draft-assist only (the teacher or Rebecca sends from within Brightwheel after reviewing the draft).
- **Instagram (Meta Graph API or semi-manual monitoring):** Inquiry channel for DM-originated leads. n8n can alert Rebecca when a new DM arrives but does not send DMs autonomously. The Meta Graph API requires a business account and approved permissions; the Instagram path may begin as a semi-manual workflow. [NEEDS CONFIRMATION: current Instagram account type and API access status]
- **Alert channel:** [NEEDS CONFIRMATION: does Rebecca or Zach use Slack? If not, escalation alerts route to email by default.]

### Logging standard

Every automation writes to `automation_logs` with: timestamp, automation name, trigger type, input summary (PII-safe hash or category description, not raw family data), action taken, output summary, status (success / failure / escalation), error details if applicable, human-followup-required flag.

### Error handling standard

- **External API failure:** 3 retries with exponential backoff (1s, 5s, 25s), then escalate.
- **Rate limit:** Exponential backoff up to 5 minutes, then escalate.
- **Unexpected input:** Log and escalate, do not proceed.
- **Missing required data:** Escalate, do not proceed.

### Monitoring standard

Weekly log review for first 30 days post-launch; monthly thereafter; quarterly full audit.

---

## 2. Automation inventory

| # | Automation name | Priority | Status | Effort | Owner | Dependencies |
|---|---|---|---|---|---|---|
| 01 | AI inquiry auto-responder (email and Instagram DM alert) | P0 | Spec in progress | 10h | Zach | Gmail webhook or IMAP parse; Claude API |
| 02 | Tour confirmation and day-before reminder | P0 | Planned | 5h | Zach | Sign-Up Genius email parse; Gmail send |
| 03 | Post-inquiry 3-touch follow-up sequence | P0 | Planned | 7h | Zach | Automation 01 live first |
| 04 | Post-tour follow-up sequence | P1 | Planned | 6h | Zach | Automation 02 live first |
| 05 | Enrollment welcome packet on application receipt | P1 | Planned | 4h | Zach | Application trigger TBD |
| 06 | Brightwheel daily message draft assist | P1 | Planned | 6h | Zach | Claude API; draft review by teacher or Rebecca |
| 07 | Weekly newsletter draft assist | P1 | Planned | 5h | Zach | Claude API; email send platform |
| 08 | Bi-weekly payroll hours reminder to Linda | P1 | Planned | 2h | Zach | Calendar cron |
| 09 | Late payment follow-up sequence (with escalation) | P1 | Planned | 5h | Zach | Billing data source TBD; escalation to Rebecca or Linda |
| 10 | Supply and snack ordering reminder | P2 | Planned | 2h | Zach | Calendar cron |
| 11 | Monthly board report data compilation | P2 | Planned | 6h | Zach | Supabase logs; enrollment data |
| 12 | Photo curation and consent-gated sharing workflow | P2 | Planned | 8h | Zach | Consent form database in Supabase; photo storage TBD |
| 13 | Music teacher barter tracking log | P2 | Planned | 3h | Zach | Supabase tracking table |
| 14 | Immunization and training compliance tracker | P2 | Planned | 5h | Zach | Compliance data source TBD |

**Note on Automation 06 (Brightwheel draft assist):** Because the profile explicitly flags "never make a parent feel like they are talking to a robot about their kid," this automation is draft-assist only. n8n generates a suggested message; the relevant teacher (or Rebecca) reviews and sends from within Brightwheel. No auto-send path exists for this automation.

**Note on Automation 09 (late payment follow-up):** All escalation logic for money-related matters routes to Rebecca or Linda. This automation can draft and optionally send courtesy-reminder messages for mildly overdue accounts, but any message referencing a specific amount or implying a consequence requires director review before sending.

**Note on Automation 12 (photo curation):** The consent-gated step is mandatory, not optional. A child's image is never surfaced or distributed by this automation unless a signed photo release form is confirmed in Supabase for that child. Building and populating the consent form database is a prerequisite to this automation's launch; that work is outside the automation spec scope.

### Phase 1 (first 30 days): automations 01, 02, 03

The inquiry auto-responder is the highest-value automation in this package. Doc 03 identifies first-touch response as the most variable step in the admissions funnel and the one with the clearest opportunity for improvement. Phase 1 captures that, adds the tour confirmation sequence, and closes the pre-tour loop with a follow-up sequence.

### Phase 2 (days 31-60): automations 04, 05, 06, 07, 08

Post-tour and enrollment communications; Brightwheel draft assist; newsletter draft assist; payroll reminder.

### Phase 3 (days 61-90): automations 09, 10, 11

Late payment sequence; supply ordering reminder; board report data compilation.

### Phase 4 (month 3 and beyond): automations 12, 13, 14

Photo workflow (requires consent form database to be ready first), barter tracking, compliance tracker.

---

## 3. Individual automation spec template

Each automation gets its own spec. The full spec for Automation 01 (inquiry auto-responder) follows in the section after this one. All subsequent specs follow the same structure:

- **Purpose:** What it does and why it exists, tied to a specific bottleneck or process step from Documents 03, 07, or 08.
- **Trigger:** Primary trigger event, mechanism, expected frequency.
- **Input data:** Required and optional fields, validation rules, invalid-input behavior.
- **Data sources:** Source documents or systems this automation reads from, with specific section callouts.
- **Logic flow:** Step-by-step with all decision branches named explicitly.
- **AI prompt (if applicable):** Model selection note, temperature, full system prompt, user prompt template, expected output format, output validation.
- **Escalation conditions:** At least 3 specific conditions with routing destination. For Little Friends, all five hardwired categories from Section 1 apply to every spec; this section documents the automation-specific additions.
- **Error handling:** API failure, rate limit, invalid input, missing data, partial success behavior.
- **Logging:** Fields written to `automation_logs`.
- **Success metrics:** What is tracked and what counts as success.
- **Dependencies:** What must be live before launch; what this automation blocks downstream.
- **Testing plan:** At least 5 dry-run scenarios with pass criteria.
- **Deployment checklist:** Pre-go-live gates.

---

## 4. Phased implementation roadmap

### Phase 1: Foundation (weeks 1-4)

- **Week 1:** Supabase provisioned; `automation_logs` table created; Gmail webhook or IMAP polling configured in n8n; Claude API key provisioned with initial spending limit set.
- **Week 2:** Automation 01 (inquiry auto-responder): build, dry-run all scenarios, soft-launch with Rebecca reviewing every draft for the first 30 days.
- **Week 3:** Automation 02 (tour confirmation and day-before reminder).
- **Week 4:** Automation 03 (post-inquiry 3-touch follow-up sequence).

### Phase 2: Nurture (weeks 5-8)

- **Week 5:** Automation 04 (post-tour follow-up).
- **Week 6:** Automation 05 (enrollment welcome packet).
- **Week 7:** Automations 07 and 08 (newsletter draft assist; bi-weekly payroll reminder).
- **Week 8:** Automation 06 (Brightwheel daily message draft assist).

### Phase 3: Lifecycle (weeks 9-12)

- **Week 9-10:** Automation 09 (late payment follow-up with escalation).
- **Week 11:** Automation 10 (supply and snack ordering reminder).
- **Week 12:** Automation 11 (board report data compilation).

### Phase 4: Infrastructure (month 3 and beyond)

- Automation 12 (photo curation and consent-gated sharing). Requires consent form database built and populated before launch.
- Automation 13 (music teacher barter tracking).
- Automation 14 (immunization and training compliance tracker). Requires compliance data source identified and structured.

### Sequencing rationale

Automation 01 goes first because Doc 03 identifies first-touch response time as the primary variable in the inquiry-to-enrollment funnel. Every other admissions automation builds on it. The Brightwheel draft assist (06) sits in Phase 2 rather than Phase 1 because it needs a calibration period: Rebecca and the teachers need to trust the drafts before the workflow becomes part of their daily routine. The photo workflow (12) sits in Phase 4 because it requires a consent form database that doesn't yet exist; building that database is a prerequisite, not part of this spec's scope.

---

## 5. Monitoring and maintenance

### Responsibilities

- **Zach:** Weekly log review, error investigation, technical fixes, escalation of any pattern or anomaly to Joshua.
- **Joshua:** Monthly strategic review, voice and drift check, source document sync verification.
- **Rebecca:** Daily triage of escalated items (routed by email or alert channel); final approver on any automation output that touches enrolled families or involves money.

### Scheduled reviews

- **Weekly (Zach):** Error logs, escalation patterns, success rate per automation, Claude API usage and cost against the spending cap.
- **Monthly (Joshua):** Volume trends, output quality sample (3-5 outputs reviewed against source doc voice), check that Doc 02 facts still match what the automations are saying.
- **Quarterly (Joshua and Zach):** Full audit: compare automation outputs to source documents, update prompts for any drift, retire or restructure automations that are underperforming or unused.

### Drift indicators to watch

- Any automated output includes a dollar figure for tuition. This is a hard red-line violation.
- Any automated output references a teacher or staff member no longer at the school.
- Any automated output uses banned phrases from Doc 01 (nurturing environment, second family, thrive, emerging readers, school-ready, and others listed in that document).
- Escalation rate above 20% on any single automation (usually means trigger logic or prompt needs revision).
- Error rate above 5% (usually means an external dependency has changed).
- Rebecca or a teacher flags that a parent responded strangely or felt talked to like a number. This is a signal worth investigating even if logs show no technical errors.

### Change management

- Doc 02 (Business Facts) updates propagate automatically to automations that fetch facts at runtime. No automation should hardcode teacher names, classroom ratios, registration fee amounts, or enrollment capacity. Those values must always be read from the current Doc 02 at execution time.
- Doc 01 (Brand Voice Guide) updates trigger a prompt review across all Claude-powered automations. Any voice rule change is a forced review, not an optional one.
- Doc 08 (Email Templates) updates trigger a review of every automation that references those templates.
- Any prompt change is version-controlled with a dated comment explaining what changed and why.

---

## 6. Cost and resource planning

### Ongoing costs (monthly estimates, pending provisioning)

| Item | Monthly estimate | Notes |
|---|---|---|
| n8n (self-hosted or cloud) | $20-$50 | Self-hosted on a VPS (e.g., Hetzner or DigitalOcean) is lower cost; n8n Cloud is simpler to maintain but higher cost. [NEEDS CONFIRMATION: hosting preference] |
| Claude API | $15-$50 | Preschool inquiry volume is modest and seasonal; actual cost depends on monthly inquiry count and token usage per call. [NEEDS CONFIRMATION: spending cap to be set at provisioning] |
| Supabase | $25 | Pro plan, if not shared with other infrastructure. Free tier may be sufficient in Phase 1 for testing. |
| Email sending platform | $0-$20 | If Gmail is the sending layer, no additional cost. A transactional sending service (Resend, Postmark, or similar) adds $10-$20/month and improves deliverability for automated sends. |
| **Total monthly infrastructure** | **$60-$145** | Scales with inquiry volume and Claude call frequency; revisit at end of Phase 1 with actual usage data. |

### Labor costs

- **Zach Phase 1-2 build:** Approximately 45-55 hours across Automations 01-08.
- **Zach ongoing maintenance:** 2-4 hours per month once all Phase 1-2 automations are live.
- **Joshua oversight:** 2-3 hours per month.

### ROI context

The inquiry auto-responder is the highest-leverage automation in this package. Doc 03 identifies no consistent first-touch process and no tracking of response time or conversion rate at first touch. A consistent, same-day (or better) response to every inquiry reduces the risk of warm, word-of-mouth leads going cold before a tour is scheduled. Revenue impact depends on current inquiry volume and conversion rate, neither of which is tracked. Establishing that baseline in Phase 1 makes a meaningful before-and-after comparison possible in Phase 2.

The Brightwheel draft assist and newsletter draft assist are operational efficiency gains, not direct revenue drivers. They reduce daily and weekly preparation time for Rebecca and the teaching staff. The payroll reminder eliminates a recurring administrative risk. These are quality-of-life improvements for the director; their value is real but harder to quantify in dollars.

[NEEDS CONFIRMATION: before provisioning, Joshua and Rebecca should agree on a monthly ceiling for Claude API spend. I recommend building an alert trigger in n8n at 80% of that ceiling so there are no billing surprises.]

---

# Automation spec: inquiry auto-responder

**Client:** Little Friends Learning Loft
**Automation ID:** lf-inquiry-autoresponder-v1
**Priority:** P0
**Owner:** Zach (implementation); Joshua (oversight); Rebecca (review loop, first 30 days)
**Status:** Spec complete, awaiting provisioning
**Version:** 1.0

## Purpose

This automation drafts a warm, personalized response within a target of two hours of a new family inquiry arriving via email or Instagram DM. It exists because Doc 03 identifies first-touch response as the most variable step in the admissions funnel. Rebecca responds when she gets to it, which ranges from same-day to several days depending on her schedule. Inquiries that go cold before a tour is scheduled are leads lost, and there is currently no tracking to know how often this happens.

The automation generates a draft response using the Doc 08 template framework (Template 2A for standard qualified inquiries, 2B for inquiries with a specific question, 2C for full or near-full classrooms, 2D for children under age 2). It pulls pre-approved answer language from Doc 07 when the inquiry contains a question the FAQ Bank covers. All outputs apply Doc 01 voice rules. During the first 30 days, every draft is reviewed by Rebecca before sending; after that, eligible outputs can send automatically, with Rebecca spot-reviewing a 10% sample.

**What this automation does not do:** It never sends tuition amounts or estimates. It never makes promises about classroom availability beyond what Doc 02 currently confirms. It does not handle messages from enrolled families about their child's day (those belong in Brightwheel and are handled directly by teachers or Rebecca). It does not respond to any message containing a welfare concern, incident reference, or distressed tone. Those escalate immediately to Rebecca.

## Trigger

**Primary trigger:** New email arrives in the school's inquiry inbox from a sender not already in Supabase as an enrolled family, OR Rebecca manually triggers the workflow for an Instagram DM inquiry she has flagged.
**Trigger mechanism:** Gmail webhook or IMAP polling (email path); manual n8n trigger from DM alert (Instagram path).
**Trigger frequency expected:** [NEEDS CONFIRMATION: inquiry volume is not currently tracked; estimate 5-20 per month based on school size and enrollment cycle, with higher volume in October-February and a secondary peak in spring]

**Instagram note:** The Meta Graph API for Instagram DMs requires a business account and specific API permissions. Depending on the school's account type and approval status, the Instagram path may begin as a semi-manual workflow (Rebecca clicks a button in n8n to process a DM she has flagged) rather than fully automated. Both paths produce the same drafted response; only the delivery mechanism differs.

## Input data

**Required inputs:**
- `sender_email` (string, valid email format)
- `sender_name` or `first_name` (string; parsed from email header or message body)
- `message_body` (string; full text of the inquiry)

**Optional inputs:**
- `child_name` (string; parsed from body if mentioned)
- `child_age` (string or integer; parsed from body if mentioned)
- `program_of_interest` (string: Twos, Threes, Pre-K, or Aftercare; parsed from body if mentioned)
- `referral_source` (string; if mentioned, e.g., "I heard about you from...")

**Input validation rules:**
- `sender_email` must be a valid email format.
- `message_body` must be non-empty.
- If `sender_name` cannot be parsed, draft proceeds without a name in the greeting rather than guessing.

**Invalid input behavior:**
- Missing `sender_email` or empty `message_body`: log the failure and skip; no response attempted; alert to Rebecca.
- Spam pattern (same email more than 3 times in 24 hours): suppress after first response, flag in logs.

## Data sources

- **Document 02 (Business Facts Reference):** Age eligibility (2 through 5, NYS OCFS-licensed; no infant care), teacher names by classroom (Miss Tova for Twos at 1:5 ratio, Miss Carla for Threes at 1:7, Miss Dana for Pre-K at 1:8, Yael for Aftercare), licensed capacity (58 children), current enrollment (approximately 52), Twos classroom space (room for a few more as of June 2026), registration fee ($75).
- **Document 07 (FAQ Bank):** Pre-approved answer language for Q1.2 (ages served), Q1.3 (infant decline), Q2.1 (space available), Q2.2 (how to schedule a tour), Q3.1 (tuition shared during the enrollment conversation, not before), Q3.2 (registration fee). When the inquiry contains a question the FAQ Bank covers, the system prompt loads the pre-approved answer text.
- **Document 08 (Email Templates):** Template 2A (standard qualified), 2B (with specific question), 2C (full or near-full classroom), 2D (child under 2). The selected template structure is inserted into the AI prompt at runtime.
- **Sign-Up Genius:** Current tour scheduling link, loaded as variable `{{sign_up_genius_link}}` in n8n. This variable must be updated manually whenever the active Sign-Up Genius link changes.

## Logic flow

1. Trigger fires: new qualifying email arrives, or Rebecca manually triggers for a flagged DM.
2. Parse input: extract `sender_name`, `sender_email`, `message_body`.
3. Check if `sender_email` matches any record in Supabase `enrolled_families` table. If yes: escalate to Rebecca with original message. Enrolled-family matters do not route through this automation.
4. Check `message_body` for escalation keywords (incident, hurt, injury, sick, upset, complain, unfair, lawyer, refund, OCFS, licensing, billing dispute, prior payment, hiring). If any match: escalate to Rebecca immediately with original message; no draft attempted.
5. Classify the inquiry:
   a. Scan `message_body` for child age signals. If the child is clearly under 2 or the message mentions "infant," "baby," or an age below 2: select Template 2D.
   b. If age is 2-5 or unclear: proceed as potentially qualified.
6. Check classroom availability against Doc 02 current data:
   - Twos: room for a few more (as of June 2026).
   - Threes and Pre-K: [NEEDS CONFIRMATION: current availability for these classrooms before auto-sending any Template 2A or 2B response that implies space is likely available]
   - If the requested classroom is at or near capacity: select Template 2C.
7. Scan `message_body` for FAQ-matched questions (keywords: cost, tuition, price, fee, ratio, hours, schedule, curriculum, Montessori, meals, snack, allergy, teacher, pickup, drop-off). If match found: select Template 2B and load the relevant FAQ Bank answer text into the prompt context.
8. Default for qualified, space-available, no-specific-question: Template 2A.
9. Call Claude API with the selected template structure, inquiry variables, Doc 01 voice rules, and Doc 02 facts.
10. Run output validation (see Output validation below).
11. During soft-launch period (first 30 days): stage every draft for Rebecca's review. Send her an alert with the draft and a one-click approve or edit path.
12. After day 30: if validation passes and classification is standard (2A or 2B), auto-send. Log the send.
13. Write entry to `automation_logs`.

## AI prompt

**Model:** [NEEDS CONFIRMATION: model version to be selected at provisioning; consult current Anthropic model catalog and pricing at that time to pick the appropriate tier for short-form email generation]
**Max tokens:** 600
**Temperature:** 0.4

**System prompt:**
```
You are drafting an inquiry response email for Little Friends Learning Loft, a NYS OCFS-licensed preschool serving children ages 2 through 5, operated under the auspices of the JCC. Rebecca, the school director, is the sender of all inquiry responses. Write as Rebecca in first-person singular.

VOICE RULES (from Little Friends Learning Loft Brand Voice Guide):
- First-person singular ("I," not "we").
- Warm, direct, calm. A parent should feel calmer after reading this, not sold to.
- No em dashes. Use commas, periods, or parentheses instead.
- Sentence case throughout. Proper nouns (Little Friends Learning Loft, JCC, Twos, Threes, Pre-K) are capitalized; everything else is sentence case.
- No narrating the child's emotional future. Do not write "she will love it," "he will thrive," "your child will blossom," or any equivalent. Describe what the classroom is. Let the parent bring the emotional projection.
- Banned phrases (never use any of these): nurturing environment, second family, school-ready, emerging readers, thrive, transformative, unique, seamless, magical, special day.
- Sign-off: "- Rebecca" (a hyphen, not an em dash, followed by a space and Rebecca).

HARD RULES FOR THIS SCHOOL:
- Never include tuition amounts, tuition estimates, or any language implying a specific cost beyond the $75 registration fee. The $75 registration fee may be mentioned only if the parent directly asked about fees.
- Never suggest the school accepts children under age 2. This is a NYS OCFS licensing limit. There are no exceptions and no waitlist for infants.
- Never include a specific teacher's personal contact details. First names used with the "Miss" prefix (Miss Tova, Miss Carla, Miss Dana) are appropriate. Yael is the Aftercare teacher. No home addresses, personal phones, or personal social media.
- If the inquiry is about an enrolled child's day-to-day wellbeing, an incident, or a classroom concern: do not respond with this template. Escalation to Rebecca handles that; this automation does not.

FACTS (from Little Friends Learning Loft Business Facts Reference, June 2026):
- Programs: Twos (Miss Tova, 1:5 ratio), Threes (Miss Carla, 1:7 ratio), Pre-K (Miss Dana, 1:8 ratio), Aftercare (Yael).
- Licensed for ages 2 through 5 by NYS OCFS. No infant care, no exceptions.
- Licensed capacity: 58 children. Current enrollment: approximately 52.
- Twos class has room for a few more as of June 2026. Threes and Pre-K availability: confirm before use.
- Registration fee: $75. Tuition is shared during the enrollment conversation, not before.
- Tours are in-person, led by Rebecca, and scheduled through Sign-Up Genius.

TEMPLATE STRUCTURE:
[The selected template from Document 08 (2A, 2B, 2C, or 2D) is inserted here at runtime by the automation.]

[If Template 2B is selected, the relevant pre-approved answer from the FAQ Bank is inserted here at runtime.]

Generate ONLY the email body. No subject line. No signature block beyond "- Rebecca." Plain text only, no markdown formatting.
```

**User prompt template:**
```
Draft a response to this inquiry using the template structure provided above.

Parent first name: {{sender_name_or_blank}}
Message they sent: "{{message_body}}"
Child age (if mentioned): {{child_age_or_not_mentioned}}
Program of interest (if mentioned): {{program_of_interest_or_not_mentioned}}
Referral source (if mentioned): {{referral_source_or_not_mentioned}}

Template selected: {{selected_template_name}}

If the message body contains a specific, usable detail (a child's name, a stated referral source, a question that merits direct acknowledgment), reference it naturally in the opening line. If the message body is generic, contains nothing to anchor on, or contains details that might be sensitive to reflect back, skip personalization entirely. Do not invent a detail.

Apply the template structure. Confirm all facts in the draft match the FACTS block above. Sign off with "- Rebecca."
```

**Expected output format:**
- Plain text email body only.
- 120-300 words.
- Includes greeting, core content per selected template, one clear call to action (Sign-Up Genius link), and sign-off.
- No markdown.

**Output validation:**
- Check for any dollar figure other than $75. Fail and escalate if found.
- Check for any language accepting or implying an exception for children under age 2. Fail and escalate if found.
- Check for em dashes. Fail and escalate if found.
- Check for any banned phrase from Doc 01. Fail and escalate if found.
- Check that all `{{variables}}` in the draft are replaced and no placeholder text remains.
- Check word count: below 80 or above 400 words, flag for review without blocking.

## Escalation conditions

This automation does not send automatically and routes to Rebecca in all of the following cases:

1. `sender_email` matches a record in the `enrolled_families` table in Supabase. Enrolled-family matters route to Rebecca regardless of message content.
2. `message_body` contains keywords indicating a child welfare concern, incident, injury, illness, or any safety matter. Route immediately with original message; no draft attempted.
3. `message_body` contains an upset or distressed tone (keywords: complain, upset, unfair, lawyer, refund, issue, problem, worried about). Route to Rebecca with original message.
4. `message_body` mentions OCFS, the state, licensing, or any regulatory reference. Route to Rebecca.
5. `message_body` references money in a way that goes beyond asking about fees (billing dispute, prior payment, late charge). Route to Rebecca or Linda depending on content.
6. Output validation fails on any check. Stage draft for Rebecca with the failure reason noted.
7. Instagram DM path is active and Meta API authentication has lapsed. Alert Zach to re-authenticate; alert Rebecca to respond manually.
8. Template 2C is selected (full or near-full classroom) and classroom availability data in Doc 02 is marked as unconfirmed. Stage for Rebecca rather than auto-sending; she confirms availability before the response goes out.

**Escalation destination:** Email to Rebecca at [NEEDS CONFIRMATION: Rebecca's direct email address] with the original message attached and, where applicable, the staged draft with the failure reason.

## Error handling

- **Gmail or email platform failure:** 3 retries (1s, 5s, 25s); then alert Rebecca and Zach; Rebecca responds manually using Doc 08 templates.
- **Claude API failure:** 3 retries; then alert Rebecca; she responds manually.
- **Claude API rate limit:** Exponential backoff up to 5 minutes; then alert and fall back to manual.
- **Sign-Up Genius link stale or broken:** Flag before sending; alert Zach to update the link variable in n8n before the next draft goes out.
- **Output validation failure:** Do not send; route draft to Rebecca with the specific failure reason noted in plain language.

## Logging

Every run writes to `automation_logs`:
- `timestamp`
- `automation_id`: `lf-inquiry-autoresponder-v1`
- `trigger_type`: `email_inquiry` or `instagram_dm_manual`
- `input_hash`: SHA-256 of `sender_email` (PII-safe identifier; not the raw address)
- `inquiry_classification`: standard / has_question / full_classroom / under_age_2 / escalated
- `template_selected`: 2A / 2B / 2C / 2D / none (if escalated before template selection)
- `actions_taken`: JSON with model version used, token count, latency in milliseconds, send status
- `status`: success / failure / escalation / staged_for_review
- `error_details`: if applicable
- `human_followup_required`: true for all records in the first 30 days; true thereafter if escalated or flagged
- `full_output`: stored separately in `automation_outputs` table (encrypted at rest, 90-day retention)

## Success metrics

**Tracked:**
- Time from trigger to draft ready (target: under 5 minutes, including validation).
- Share of eligible inquiries handled without escalation (target: at least 75-80% after day 30, once Rebecca and Joshua have calibrated the escalation thresholds against real inquiry volume).
- Output validation pass rate (target: above 95%).
- Inquiry-to-tour-scheduled conversion rate (tracked via Sign-Up Genius signups; compare pre-launch baseline to post-launch).

**What counts as success:**
- Phase 1 (days 1-30): Every eligible inquiry receives a reviewed draft sent same-day. Baseline established for inquiry volume and conversion rate.
- Phase 2 (days 31-90): Inquiry-to-tour-scheduled rate is being tracked and is stable or improving versus the Phase 1 baseline.
- Phase 3 (day 90 and beyond): Automation runs without active daily oversight; quarterly audit catches any drift.

**Note:** Because Doc 03 identifies no current tracking of inquiry volume, response time, or conversion rate, Phase 1's most important output is establishing a baseline, not hitting a number.

## Dependencies

**Must be live before launch:**
- Supabase `automation_logs` and `automation_outputs` tables.
- Supabase `enrolled_families` table with current family email addresses (needed for the enrolled-family escalation check).
- Gmail webhook or IMAP polling configured in n8n.
- Claude API key provisioned with spending limit set.
- Sign-Up Genius current link loaded as a variable in n8n.
- Rebecca's direct email address confirmed in n8n as the escalation destination.
- Doc 08 Templates 2A, 2B, 2C, 2D loaded as prompt context in n8n.
- Doc 07 FAQ Bank answers for Q1.2, Q1.3, Q2.1, Q2.2, Q3.1, Q3.2 loaded as prompt context.

**Blocks downstream:**
- Automation 03 (post-inquiry 3-touch follow-up sequence) depends on this automation having fired and logged a `lf-inquiry-autoresponder-v1` record for the relevant inquiry.

## Testing plan

**Dry-run scenarios (all must pass before go-live):**

1. **Standard inquiry, Twos classroom, no specific question.** Message: "Hi, my daughter is 2.5 and I'm starting to look at preschools for next fall. Can you tell me more about your program?" Expected: Template 2A draft, Miss Tova mentioned by name, Sign-Up Genius link present, no tuition dollar figure, no em dash, word count in range.

2. **Inquiry with tuition question.** Message: "How much does the Threes program cost?" Expected: Template 2B draft leading with the Doc 07 Q3.1 pre-approved answer (tuition shared during the enrollment conversation, not before), Sign-Up Genius link, no dollar figure for tuition.

3. **Inquiry with curriculum question.** Message: "I've heard you're Montessori. Can you tell me more about how that works?" Expected: Template 2B draft with Doc 07 Q5.1 or Q5.2 answer language, no banned phrases, Sign-Up Genius link.

4. **Inquiry for child under 2.** Message: "My son just turned 18 months. Do you have a spot for him?" Expected: Template 2D draft, OCFS licensing limit stated clearly and directly, warm invitation to reconnect when the child approaches 2, no apology pile-on.

5. **Inquiry from enrolled family email.** `sender_email` matches a record in `enrolled_families` Supabase table. Expected: No draft generated; immediate escalation to Rebecca with original message.

6. **Incident-related language in body.** Message: "My daughter mentioned something happened on the playground today and I want to understand what's going on." Expected: Immediate escalation to Rebecca; no draft attempted.

7. **Upset or distressed tone.** Message: "I've been trying to reach someone for days and I'm very frustrated." Expected: Escalation to Rebecca; no draft sent.

8. **Missing sender name.** Inquiry arrives from an email address with no name in the header and no name in the body. Expected: Draft proceeds without a name in the greeting (no "Hi ," error); validation passes; graceful handling confirmed.

9. **Output validation failure: forced tuition mention.** For dry-run only: temporarily modify the prompt to force a dollar figure into the output. Expected: Output fails validation check, draft is staged for Rebecca review with failure reason noted, nothing is sent.

10. **Instagram DM path, manual trigger.** Rebecca manually triggers the n8n workflow from a DM she has flagged. Expected: Same draft logic as the email path; draft delivered to Rebecca for review (not auto-sent to Instagram).

**Pass criteria:** All 10 scenarios produce the expected behavior. No auto-sends during the dry-run phase. No unfilled `{{variables}}` in any output. No tuition amounts in any output. No banned phrases in any output. No em dashes in any output.

**Live soft-launch approach:**
- First 30 days: every draft reviewed and sent by Rebecca; Zach is BCCed on the first 10 sends to confirm delivery.
- Days 31-60: auto-send enabled for Template 2A and 2B classifications that pass validation; Rebecca reviews a 10% sample plus all escalations.
- Day 60 and beyond: exception-based review; quarterly audit.

## Deployment checklist

- [ ] Spec approved by Joshua
- [ ] Spec reviewed by Zach for implementation feasibility and n8n workflow design
- [ ] Supabase `automation_logs`, `automation_outputs`, and `enrolled_families` tables created and tested
- [ ] Gmail webhook or IMAP polling configured in n8n and verified with a test message
- [ ] Claude API key provisioned with monthly spending limit set and 80% alert configured
- [ ] Sign-Up Genius current link loaded as a variable in n8n
- [ ] Doc 08 Templates 2A, 2B, 2C, 2D loaded into prompt context
- [ ] Doc 07 FAQ Bank answers (Q1.2, Q1.3, Q2.1, Q2.2, Q3.1, Q3.2) loaded into prompt context
- [ ] Rebecca's escalation email address confirmed and tested in n8n
- [ ] Threes and Pre-K classroom availability confirmed and reflected in Doc 02 before Template 2A/2B can safely auto-send for those programs
- [ ] All 10 dry-run scenarios pass
- [ ] Rollback plan documented: the n8n workflow can be disabled in seconds from the n8n dashboard; Rebecca falls back to manual responses using Doc 08 templates
- [ ] Rebecca briefed on launch date, the 30-day review protocol, and how to flag a draft for escalation
- [ ] 30-day manual review loop active before any auto-send is enabled
- [ ] First 7 days: Zach and Joshua review logs daily
