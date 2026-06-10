# I03: Client routines and cowork setup

**Client:** [NEEDS CONFIRMATION: organization name]
**Prepared by:** Upriver Consulting
**Date:** 2026-06-09
**Document number:** I03
**Dependencies:** I01 (Project live), I02 (Skills deployed), I04 (MCPs connected)

---

## Section 1: Routine type decision

**Decision for this client: Cowork scheduled tasks across the board, for now.**

Rebecca's office has a laptop she keeps running during business hours, and Claude Desktop stays open on it. That satisfies the primary Cowork precondition. The staff beyond Rebecca consists of lead teachers (Tova, Carla, Dana) and aftercare lead Yael, all working from personal phones, plus Linda the bookkeeper (part-time, JCC). No developer-adjacent team member is identified in the engagement profile, which rules out the Claude Code routine setup described in I06. Every routine in the starter set runs as a Cowork scheduled task.

One caveat worth naming: the always-on machine is a laptop, not a desktop. Cowork only runs when the lid is open and the Desktop app is active. All six routines below are timed to fall within Rebecca's established office hours, where that window is expected to be reliable on weekdays. If Rebecca is working remotely on a given morning and the laptop is closed, the scheduled task will fire the next time the machine wakes. I flag the two routines where a missed run is material (payroll summary, health-check on payroll Fridays) and address them explicitly in the failure-handling layer.

**Cloud routines (claude.ai/code/routines):** Not deployed at this time. The team is non-technical; without a developer-adjacent contact, the Claude Code setup in I06 does not have an owner on the client side. If a future phase introduces a technical contact, or if a reliability-critical timed send is identified (for example, a payment-chasing email that must go out on a specific date regardless of machine state), I will revisit and confirm the client's plan tier at that point.

**Plan tier:** [NEEDS CONFIRMATION: client's Claude plan tier. Required before deploying cloud routines or estimating usage against the per-plan daily routine limits (Pro: 5/day, Max: 15/day, Team/Enterprise: 25/day).]

---

## Section 2: Starter routine library

I selected five operational routines plus the required health-check meta-routine, for six total. Selection criteria: highest-frequency recurring tasks from the client profile, clear deliverable format, and source data reachable via confirmed or confirmable connectors.

**The six routines I am deploying on day one:**

1. Daily Brightwheel parent message draft
2. Weekly tour and inquiry digest
3. Weekly newsletter draft
4. Biweekly payroll hours summary for Linda
5. Monthly board report draft
6. Weekly health-check meta-routine

**Deferred tasks and the reason for each deferral:**

- Music teacher barter tracking (ongoing): no clear data source identified in the profile. Revisit once the tracking format (spreadsheet, manual log, or another tool) is confirmed.
- Event setup (recurring): recurrence is irregular and the content of each setup varies too much for a repeating scheduled prompt.
- Supply and snack ordering (recurring): requires read access to an inventory or ordering platform not yet confirmed in I04.
- Chasing late payments (occasional): "occasional" frequency makes a trigger-based approach more appropriate than a fixed schedule. Revisit when the billing workflow is documented.
- Photo curation and sharing (ongoing): depends on where teachers upload photos (Slack, Google Drive, a local folder, or Brightwheel). Needs I04 connector confirmation before scheduling.
- Immunization and training tracking (ongoing): high compliance value but the data source (spreadsheet, a compliance portal, or another tool) is not confirmed in the profile.

---

## Section 3: Routine specifications

### Daily Brightwheel parent message draft

**Type:** Cowork scheduled task
**Cadence:** Daily, weekdays, 8:00 am (Rebecca's local timezone, confirm at setup)
**Trigger source:** Schedule
**Owner:** Rebecca (director)
**Connectors used:** [NEEDS CONFIRMATION: Brightwheel does not publish a documented MCP connector. Confirm whether Brightwheel parent messages are also forwarded to a Gmail address. If Gmail forwarding is active, the routine can pull overnight parent questions and draft replies in a second block. If no forwarding is configured, the routine drafts from a standing template only.]
**Skills used:** [NEEDS CONFIRMATION: see I02 for the deployed skill handling parent-facing voice and tone. Reference that skill by its deployed name before scheduling.]

**What it does:**
Drafts the day's Brightwheel parent message from a standing template Rebecca keeps in a note file in the output directory. Template fields: today's activity focus, a weather or outdoor-play note, and any reminders Rebecca has pre-populated. Because a direct Brightwheel connector is not confirmed, the routine produces the draft as a local markdown file for Rebecca to copy and post manually in the Brightwheel app. If Gmail forwarding from Brightwheel is active and confirmed in I04, the routine appends a second block with draft replies to any overnight parent questions.

**Expected output:**
File written to `~/Claude/[NEEDS CONFIRMATION: organization name]/daily-brightwheel/YYYY-MM-DD.md` with one draft parent message (under 150 words) and, if Gmail is connected, a draft-replies block beneath it.

**Success criteria:**
File exists by 8:05 am on weekdays. At least one draft message block is present. No error block in the summary footer.

**Failure handling:**
Skipped run surfaces in Cowork's Scheduled section sidebar. Weekly health-check meta-routine flags any weekday where the file is absent. Rebecca is the contact for failure notification.

**Usage cost:**
One Cowork session per run. Exact impact on daily usage pool depends on [NEEDS CONFIRMATION: plan tier].

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

### Weekly tour and inquiry digest

**Type:** Cowork scheduled task
**Cadence:** Weekly, Monday, 8:30 am (Rebecca's local timezone)
**Trigger source:** Schedule
**Owner:** Rebecca (director)
**Connectors used:** Gmail (inquiry emails from the website contact form or direct email), Google Calendar (upcoming scheduled tour slots)
**Skills used:** [NEEDS CONFIRMATION: see I02 for any deployed enrollment-support or inquiry-handling skill. Reference by deployed name before scheduling.]

**What it does:**
Pulls inquiry emails from the past seven days and reads the Google Calendar for confirmed tour appointments in the coming week. Summarizes each inquiry with: prospective family name (if captured), program interest (Twos, Threes, Pre-K, or Aftercare), preferred or requested tour date, and any specific questions raised. Flags any inquiry that has not received a reply in more than 48 hours. Produces a markdown digest Rebecca reviews Monday morning before returning calls or emails.

**Expected output:**
File written to `~/Claude/[NEEDS CONFIRMATION: organization name]/weekly-inquiries/YYYY-Www.md`. One section per inquiry received in the past seven days. A separate section listing confirmed upcoming tours from Google Calendar (an empty tour section is a valid output on slow weeks).

**Success criteria:**
File exists by Monday 8:35 am. Covers the prior seven days. Includes a tour-calendar section. No error block.

**Failure handling:**
Skipped run surfaces in Cowork sidebar. Health-check flags the missing weekly file. Rebecca reviews Gmail manually that morning if the file is absent.

**Usage cost:**
One Cowork session per week.

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

### Weekly newsletter draft

**Type:** Cowork scheduled task
**Cadence:** Weekly, Tuesday, 9:00 am (Rebecca's local timezone)
**Trigger source:** Schedule
**Owner:** Rebecca (director), reviews and sends via her existing newsletter platform
**Connectors used:** Gmail (any parent announcements or replies to fold in), Google Calendar (upcoming events for the week)
**Skills used:** [NEEDS CONFIRMATION: see I02 for the deployed newsletter-drafting or parent-communications skill. Reference by deployed name before scheduling. Also confirm which newsletter sending platform Rebecca uses so the output format can match it; plain-text email body is the default until I04 shows a sending connector.]

**What it does:**
Drafts the weekly parent newsletter. Draws on the Content Library (Doc 04) for standing program sections and pulls the week's event list from Google Calendar. Checks a standing announcements note file in the output directory for any items Rebecca has flagged to include. Produces a ready-to-review draft; Rebecca edits and sends via her existing platform.

**Expected output:**
File written to `~/Claude/[NEEDS CONFIRMATION: organization name]/weekly-newsletter/YYYY-Www.md`. Contains: one subject line suggestion, a body draft in plain text with three labeled sections (This week's highlights, Upcoming events, Reminders), and a word count in the footer (target under 400 words).

**Success criteria:**
File exists Tuesday by 9:05 am. Subject line present. Three labeled sections populated. Word count under 400.

**Failure handling:**
Skipped run surfaces in Cowork sidebar. Health-check flags the missing weekly file. Rebecca drafts manually that week and notes what the routine missed so the prompt can be refined at the next retainer check-in.

**Usage cost:**
One Cowork session per week.

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

### Biweekly payroll hours summary for Linda

**Type:** Cowork scheduled task
**Cadence:** Every two weeks, Friday, 3:00 pm (Rebecca's local timezone, on payroll-period end dates)
**Trigger source:** Schedule
**Owner:** Rebecca (director), reviews and forwards to Linda (bookkeeper, JCC)
**Connectors used:** [NEEDS CONFIRMATION: source for staff hours data. Confirm whether Rebecca tracks hours in a local spreadsheet on her laptop, Google Sheets, or another tool. If Google Sheets, the Google Drive connector in I04 must be confirmed as live before this routine is scheduled.]
**Skills used:** None required. This is a data-compilation and formatting task.

**What it does:**
On the final Friday of each two-week payroll period, reads the hours log (format and location confirmed before the first run) for each staff member and produces a clean summary table: name, role, hours worked per day, period total, and any notes Rebecca has flagged. Formats the output so Rebecca can forward it directly to Linda without editing. If Gmail is connected, the routine appends a draft forwarding email to Linda as a second block.

**Expected output:**
File written to `~/Claude/[NEEDS CONFIRMATION: organization name]/payroll/YYYY-MM-DD-payroll-summary.md`. Table of hours by staff member, including Tova (Twos lead), Carla (Threes lead), Dana (Pre-K lead), Yael (Aftercare), and any assistants Rebecca confirms are on the hours log. Total hours row at the bottom. Optional draft email to Linda appended if Gmail is connected.

**Success criteria:**
File exists by Friday 3:05 pm on payroll weeks. All named staff members present in the table. Total hours column populated. No error block.

**Failure handling:**
This is one of the two routines where a missed run is material: Linda needs the numbers on time for the JCC bookkeeping cycle. The health-check meta-routine runs an additional check at 3:15 pm on payroll Fridays (separate from its regular Monday cadence). If the file is absent at 3:15 pm, Rebecca compiles hours manually that afternoon and flags the miss to UPRIVER at the next retainer check-in.

**Usage cost:**
One Cowork session per two-week period.

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

### Monthly board report draft

**Type:** Cowork scheduled task
**Cadence:** Monthly, first Monday, 10:00 am (Rebecca's local timezone)
**Trigger source:** Schedule
**Owner:** Rebecca (director)
**Connectors used:** Gmail (enrollment inquiry volume for the month), Google Calendar (events held that month)
**Skills used:** [NEEDS CONFIRMATION: see I02 for any deployed reporting or program-summary skill. Reference by deployed name before scheduling. Also confirm the board's expected report format with Rebecca before the first run so the output sections match what the board receives.]

**What it does:**
Produces a draft board report for the month. Pulls enrollment inquiry count from Gmail (filtered to the school inbox), confirmed events and programming notes from Google Calendar, and standing program descriptions from the Content Library (Doc 04). Structures the draft in labeled sections Rebecca can edit before the board meeting. Note: the monitoring cadence for this engagement is monthly once stable, aligning with the board report cycle. The UPRIVER retainer review and the health-check happen in the same week this routine fires.

**Expected output:**
File written to `~/Claude/[NEEDS CONFIRMATION: organization name]/board-reports/YYYY-MM-board-draft.md`. Labeled sections: enrollment and inquiry summary, events and programming this month, staffing notes (if applicable), open items for board discussion.

**Success criteria:**
File exists first Monday of the month by 10:05 am. Four labeled sections populated. No error block.

**Failure handling:**
Skipped run surfaces in Cowork sidebar. Rebecca notices because the board report draft is a known monthly deliverable. Health-check flags the missing file. Rebecca drafts manually that week if needed.

**Usage cost:**
One Cowork session per month.

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

### Weekly health-check meta-routine

**Type:** Cowork scheduled task
**Cadence:** Weekly, Monday, 7:45 am (Rebecca's local timezone), plus a second run at 3:15 pm on payroll Fridays
**Trigger source:** Schedule
**Owner:** Rebecca (director) for day-to-day awareness; UPRIVER for technical review on retainer
**Connectors used:** Gmail (to send the health summary email)
**Skills used:** None

**What it does:**
Reads the expected output directories for all five operational routines. Confirms that each produced a file in the expected window (past week for weekly routines, past two weeks for the payroll routine, past month for the board report). Produces a one-paragraph health summary listing which routines ran successfully, which files are missing or older than expected, and any error blocks found in output files. Sends the summary to Rebecca and to UPRIVER's project contact via Gmail.

**Expected output:**
Email sent to Rebecca and UPRIVER project contact by 7:50 am Monday. Optional file copy written to `~/Claude/[NEEDS CONFIRMATION: organization name]/health-checks/YYYY-MM-DD.md`.

**Success criteria:**
Email sent before 7:50 am Monday. Covers all five operational routines by name. Clearly distinguishes routines that ran from those that are missing. No error block in the email body.

**Failure handling:**
If the health-check itself fails (no Monday email by 8:00 am), Rebecca flags it to UPRIVER. UPRIVER checks the run log in Cowork's Scheduled section at the next retainer review. The absence of a Monday health email is itself the signal.

**Usage cost:**
One Cowork session Monday plus one session on payroll Fridays.

**Created:** 2026-06-09
**Last modified:** 2026-06-09
**Status:** Active

---

## Section 4: Setup mechanics

All six routines run as Cowork scheduled tasks. The setup process for each follows the same sequence.

**Per-routine setup steps:**

1. Confirm Claude Desktop is installed and up to date on Rebecca's office laptop.
2. Open Cowork, start a new task with the prompt I have drafted for this routine.
3. Run it once manually to confirm it produces the expected output at the expected file location. Refine the prompt if needed. Do not schedule until a clean manual run completes.
4. Type `/schedule` in the task. Set cadence, time of day, and timezone. Confirm Rebecca's local timezone before the first scheduling action.
5. Confirm the schedule entry.
6. Allow Claude to rewrite the prompt internally after the first successful run. The rewrite improves subsequent run reliability; do not override it.
7. Verify the new entry appears in the Scheduled section of the Cowork sidebar.
8. Add the completed spec block to `[NEEDS CONFIRMATION: organization name]-routines-library.md`.

**Connector verification (done once per connector, before any routine that depends on it goes live):**

- Gmail: verify that OAuth authorization is active (or complete it if not yet done) and that the connector can read the past seven days of the school inbox, per I04. Test by pulling a known email in a manual Cowork task.
- Google Calendar: verify that OAuth is active and that the calendar connected is the school's main calendar, not Rebecca's personal calendar. Check one known upcoming event in a manual task.
- Google Drive: if hours tracking lives in Google Sheets, verify that the Drive connector in I04 is authorized and reading from the correct file before scheduling the payroll routine. Re-authorize if the token has expired.
- Brightwheel: [NEEDS CONFIRMATION: no documented MCP connector exists. Determine the workaround (Gmail forwarding or template-only mode) before scheduling the daily parent message routine.]

**Permissions walkthrough:**
Before any routine runs live against real data, I walk Rebecca through the connector list for that routine. She confirms she has reviewed what each connector can read and write. I log the walkthrough date in the client tracker as "connector permissions confirmed, [date]."

---

## Section 5: Monitoring and failure handling

**Monitoring cadence for this engagement:**
Weekly during the summer build; monthly once stable, aligning with the monthly board report. Rebecca is the day-to-day owner for output review. UPRIVER is on a light retainer through the fall and covers the technical health review.

**Output location convention:**
Every file-producing routine writes to `~/Claude/[NEEDS CONFIRMATION: organization name]/[routine-subfolder]/` with a date-stamped filename. If Rebecca opens a subfolder and the expected file is absent or stale, something failed.

**Failure surfacing:**

- Cowork: skipped or failed runs appear in the Scheduled section of the sidebar. Rebecca checks this as part of her Monday morning review, or whenever an expected file is missing.
- Health-check routine: emails a status summary by 7:50 am Monday and at 3:15 pm on payroll Fridays. If the Monday email does not arrive, Rebecca flags it to UPRIVER.
- UPRIVER retainer review: during weekly summer check-ins and monthly fall check-ins, I review each routine's run history in Cowork's Scheduled section and confirm output file timestamps match expected cadences.

**Payroll special handling:**
A missed payroll summary affects Linda's bookkeeping cycle at the JCC. The health-check runs a second time at 3:15 pm on payroll Fridays to catch failures in near-real-time. If the summary file is absent at 3:15 pm, Rebecca compiles hours manually that afternoon and reports the miss to UPRIVER.

**Connector auth expiry:**
OAuth tokens for Gmail, Google Calendar, and Google Drive typically expire after 60 to 90 days without a refresh. I set a reminder at approximately 75 days after initial setup to re-authorize each connector. UPRIVER adds this to the retainer calendar. If a connector expires between scheduled reviews, the affected routine will fail and produce an error block or no file; the health-check will catch it the following Monday.

**Routine retirement process:**
When a routine is no longer needed (the workflow changed, Rebecca switched tools, or the data source went away), I pause it first, watch for one full monitoring cycle (one week or one month depending on cadence) to confirm nobody misses it, then delete it and remove the spec block from the routines library doc.

---

## Section 6: Handoff to Rebecca

After setup, I give Rebecca:

- A one-page PDF titled `[NEEDS CONFIRMATION: organization name] - Your scheduled automations`, listing each of the six routines with its cadence, owner, and output location. No technical language; written for Rebecca to hand to any future administrator.
- A Loom walkthrough (5 to 8 minutes) covering: how to open the Scheduled section in Cowork, how to view a routine's run history, how to pause or resume a routine, and how to flag a missed file to UPRIVER.
- The `[NEEDS CONFIRMATION: organization name]-routines-library.md` doc (uploaded to the Project knowledge base by me as an operator step; see runbook Step 9).

**Connector walkthrough session (30 minutes, scheduled with Rebecca before any routine runs live):**
Rebecca sees the full connector list for each routine and confirms what Claude can read and write on her behalf. She signs off verbally. I log the session date in the client tracker.

---

## Operator runbook

The steps below are the sequence I follow to build this document and stand up the routines library. They draw from the spec's "How to Build This Document" section, adapted to this client's profile.

**Step 1: Review Doc 11 for this client (10 minutes).**
Read the Automation Spec Package for the [NEEDS CONFIRMATION: organization name] engagement. Cross-reference each of the eleven recurring tasks from the client profile against the Cowork vs. cloud-routine decision criteria in Section 1 above. Mark each as "Cowork-appropriate" or "defer." The six routines selected and the deferred list in Section 2 are the result of that review.

**Step 2: Confirm the starter set (5 minutes).**
Verify that the six routines above map to the highest-value recurring work in Doc 11. Resist adding more. The ceiling for initial deployment is six. Additional routines come later, as Rebecca requests them and the starter set proves stable.

**Step 3: Draft each routine's prompt (20 to 30 minutes per routine).**
Write each prompt as if running the task manually. Be specific: name the data source (Gmail inbox, Google Calendar, local spreadsheet), the output format (markdown file with labeled sections), and the success criteria. Keep each prompt under 400 words. Store draft prompts in a working note before entering them into Cowork.

**Step 3b: Verify connector OAuth before testing any routine that uses one (5 minutes per connector).**
Before running any routine's prompt as a test, confirm that each connector the routine depends on is authorized and live. If a connector has never been authorized for this engagement or its token has expired, re-authorize it before the test run. Spec Failure 7 applies: a routine that depends on an unconnected connector fails silently or produces an error block, which poisons the prompt-refinement step.

[OPERATOR ACTION: In the client's Anthropic account, verify or complete OAuth consent for Gmail, Google Calendar, and (if hours tracking is in Google Sheets) Google Drive. If any token is expired or the connector was never authorized, complete the OAuth consent flow before running any test that touches that connector.]

**Step 4: Test each routine manually (10 to 15 minutes per routine).**
Run each prompt as a regular Cowork task before scheduling. Confirm output quality, file location, and format against the spec block in Section 3. Refine the prompt if needed. Schedule only after a clean manual run.

[OPERATOR ACTION: Open Cowork on Rebecca's office laptop, run each routine's prompt as a one-off task, confirm output, and refine prompts before proceeding to scheduling.]

**Step 5: Schedule each routine (5 minutes per routine).**
In Cowork, type `/schedule` in the confirmed task. Set cadence, time, and timezone. Confirm the entry appears in the Scheduled section of the sidebar.

[OPERATOR ACTION: Complete the `/schedule` flow in Cowork for each of the six routines on Rebecca's office laptop. Rebecca should be present for at least the first routine so she sees how the Scheduled section works and understands how to find it.]

**Step 6: Document each routine (5 minutes per routine).**
Add the completed standard spec block to `[NEEDS CONFIRMATION: organization name]-routines-library.md`. This file will be uploaded to the Project knowledge base in Step 9.

**Step 7: Set up the health-check meta-routine (15 minutes).**
Draft the health-check prompt so it knows the exact output directories and expected cadences of all five operational routines. Run it manually to confirm it can locate the output files. Schedule it for Monday 7:45 am and additionally for 3:15 pm on payroll Fridays.

[OPERATOR ACTION: Add the health-check routine to Cowork and schedule both the Monday 7:45 am cadence and the payroll-Friday 3:15 pm cadence on Rebecca's laptop.]

**Step 8: Build the handoff deliverables (20 minutes).**

- One-page PDF: `[NEEDS CONFIRMATION: organization name] - Your scheduled automations`. List all six routines with cadence, owner, and output location. Keep the language non-technical; this document is for Rebecca and any future administrator, not for me.
- Loom walkthrough: 5 to 8 minutes. Show the Scheduled section, how to view a routine's run history, how to pause or resume a routine, and what to do when an expected file is missing.

**Step 9: Upload the routines library doc and schedule the 30-day review (5 minutes).**

[OPERATOR ACTION: Upload `[NEEDS CONFIRMATION: organization name]-routines-library.md` to the Project knowledge base in the client's Anthropic account.]

Put the 30-day review on UPRIVER's calendar. At the review, I check every routine's output history with Rebecca, confirm the health-check email has been arriving, and take requests for additions or changes. After the 30-day review, the monitoring cadence shifts to monthly (aligned with the board report cycle) if the starter set is confirmed stable.

---

## Operator must do (cannot be generated)

The following steps require action inside the client's Anthropic account, on Rebecca's machine, or through a third-party OAuth consent screen. They cannot be completed from a file.

- [ ] Confirm the client's Claude plan tier before deploying any cloud routines or citing usage figures against daily limits.
- [ ] Confirm Claude Desktop is installed and up to date on Rebecca's office laptop.
- [ ] Confirm Rebecca's local timezone (required before scheduling any routine).
- [ ] Confirm Rebecca's operating system (profile notes "unknown, to confirm").
- [ ] Confirm Rebecca's browser is Chrome on the laptop (profile notes "assumed, confirm at setup").
- [ ] Determine the Brightwheel workaround (Gmail forwarding or template-only mode) before scheduling the daily parent message routine.
- [ ] Confirm which newsletter sending platform Rebecca uses so the weekly newsletter draft output format can be matched to it.
- [ ] Confirm the board's expected report format with Rebecca before the first monthly board report routine run.
- [ ] Confirm the staff hours tracking format and file location (local spreadsheet, Google Sheets, or other) before scheduling the payroll routine.
- [ ] Confirm the names of all deployed skills in I02 and substitute them for the "[NEEDS CONFIRMATION: see I02]" references in the six spec blocks in Section 3.
- [ ] Complete OAuth authorization for the Gmail connector in Rebecca's account, per I04.
- [ ] Complete OAuth authorization for the Google Calendar connector in Rebecca's account, per I04.
- [ ] Complete OAuth authorization for the Google Drive connector in Rebecca's account if hours tracking lives in Google Sheets, per I04.
- [ ] Run each of the six routines as a one-off Cowork task on Rebecca's laptop to confirm output quality before scheduling.
- [ ] Complete the `/schedule` flow in Cowork for each of the six routines on Rebecca's laptop.
- [ ] Conduct the 30-minute connector permissions walkthrough with Rebecca and log the date in the client tracker.
- [ ] Upload `[NEEDS CONFIRMATION: organization name]-routines-library.md` to the Project knowledge base in the client's Anthropic account.
- [ ] Deliver the one-page PDF handout to Rebecca.
- [ ] Record and share the Loom walkthrough with Rebecca.
- [ ] Update the client tracker: routines deployed (list all six), cadence breakdown, output directory, health-check status, 30-day review date.
- [ ] Put the 30-day review on UPRIVER's calendar.
- [ ] Set a calendar reminder at 75 days after initial setup to re-authorize Gmail, Google Calendar, and Google Drive OAuth tokens.
