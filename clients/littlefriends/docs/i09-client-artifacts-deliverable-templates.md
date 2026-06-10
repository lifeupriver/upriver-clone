# I09: Client artifacts and deliverable templates
[NEEDS CONFIRMATION: client/business name], Artifact Library Reference

**Doc number:** I09  
**Prepared by:** Upriver Consulting  
**Date:** 2026-06-09  
**Status:** Draft (pending plan tier and business facts confirmation)  
**Prerequisite docs:** I01 (Project), I07 (plan tier)  
**File to upload to Project knowledge base as:** `[client]-artifact-library.md`

---

## 1. What artifacts are and what they are not

Artifacts are small, self-contained applications and structured deliverables Claude generates inside a conversation and displays in a side panel. For a preschool or childcare operation, the practical payoff is: a monthly board report that was previously a manual assembly job becomes a short invocation with a copy-paste prompt. A tuition and program calculator that lives as a PDF nobody reads becomes an interactive tool a prospective family can use at 10 p.m. from their phone.

**Artifacts are the right fit for:**

- Reports and dashboards that recur on a predictable cadence (same structure, different data each time). The board report and the weekly newsletter match this pattern exactly for this engagement.
- Interactive tools for internal use: enrollment pipeline views, inquiry routing aids, immunization and training status snapshots.
- Customer-facing microapps: a tuition calculator, a program overview decision guide, an inquiry form warm-up tool.
- Structured deliverables the client wants to share: a vendor list, a parent-facing event summary, a welcome packet component.
- Quick prototypes to test an idea before committing time to a real build.

**Artifacts are not the right fit for:**

- Production applications with real databases, authentication, or multi-user state management. Those go to Claude Code per I06.
- Any tool that stores personally identifiable information about children or families at a publicly accessible URL. This is a hard stop for OCFS-adjacent data: immunization records, incident notes, and enrollment documentation belong in Brightwheel or a compliant records system, not in a published artifact.
- High-traffic or complex user flows, anything requiring precise brand-system design polish, or long text-heavy deliverables that are really documents. Those belong in the Project knowledge base as markdown.
- The chasing-late-payments workflow and anything touching billing or financial records for individual families. Per the governance policy in the client profile, billing and money are human-in-the-loop matters and do not belong in a publicly reachable or AI-auto-sent artifact.

**The 70% rule.** Artifacts get about 70% of the way to a working tool. The last 30% usually requires a real build. For this client, a published tuition calculator is a good artifact that can ship early and stay useful well past the first year. A full enrollment management system with family portals and payment processing is not an artifact; it's an app build. I set this expectation explicitly from the first walkthrough so the team does not mistake "we have a calculator artifact" for "we have a booking system."

---

## 2. Artifact starter library for this client

Based on the recurring tasks documented in the client profile and the deliverables identified in docs 11 and 12, the initial library is five artifacts. The mix is three internal and two customer-facing.

| # | Artifact | Audience | Cadence | Storage | Distribution |
|---|----------|----------|---------|---------|--------------|
| 1 | Monthly board report | Internal | Monthly | None | Org-shared (requires Team plan) or private |
| 2 | Weekly parent newsletter builder | Internal | Weekly | None | Org-shared or private |
| 3 | Enrollment and inquiry dashboard | Internal | Per-invocation / weekly | None | Org-shared or private |
| 4 | Tuition and program calculator | Customer-facing | Per-invocation (regenerate when pricing changes) | None | Published (public URL) |
| 5 | Immunization and training status snapshot | Internal | Per-invocation / monthly | None | Private only |

**Why no storage in the initial library.** Every artifact in this library pulls data from the Project knowledge base each time it is invoked rather than accumulating data across sessions. This is the simpler, safer starting point for a client handling child and staff records. Two future candidates for storage-backed artifacts are noted in section 3 below, along with the constraints that apply before building them.

---

## 3. Persistent storage: personal, shared, and none

**No storage (all five initial artifacts).** The artifact generates, is used, and does not save state between sessions. The board report, newsletter, dashboard, calculator, and immunization snapshot all work this way. The data comes from the Project knowledge base or from content Rebecca pastes into the prompt. This is appropriate for the full initial library.

**Personal storage (future candidate).** Each user of the artifact has a private data pool. A personal barter-ledger tracker for Rebecca would be a candidate here: she enters monthly barter credit amounts for the music teacher arrangement and the artifact accumulates the running balance across sessions. This only works on a paid plan and only after the artifact is published.

**Shared storage (future candidate).** All users of the artifact read from and write to the same pool. A shared staff-assignment tracker or team-visible event-setup checklist would fit this pattern. Same requirements: paid plan, published artifact. The important constraint for this client: do not use shared storage for any artifact that would be publicly published and that contains family names, child records, or financial data tied to specific individuals. Shared storage plus public publishing creates a window for accidental data exposure.

**The publishing requirement.** Persistent storage only works on published artifacts. During development and testing in chat, storage operations silently do nothing; entries appear to save and then vanish on refresh. The correct workflow is always: build and test the logic without storage, publish the artifact, then test storage. I document this in the operator runbook and flag it on every walkthrough call.

**Storage limit.** 20 MB per artifact. More than sufficient for text-based trackers and logs. Not sufficient for anything that stores photos or document attachments.

---

## 4. Publishing, sharing, and keeping artifacts private

**Keep private.** The artifact lives inside the conversation. Only the user who created it (or someone with access to that conversation) can see it. No persistent storage is possible. This is the right default for drafts, one-off analyses, and anything containing sensitive family or staff data.

**Publish.** The artifact becomes available at a public URL. Anyone with the link can view and interact with it. Required for embedding on the client's website. Required for persistent storage to work. Unpublishing immediately revokes access and permanently deletes all storage data. For this client, published artifacts are limited to customer-facing tools with no PII: the tuition calculator and any future program-overview or FAQ tool.

**Org-share.** [NEEDS CONFIRMATION: plan tier] The artifact is available only within the client's Claude organization. Viewers must be logged into the organization's Team or Enterprise account. This is the right distribution for internal dashboards and reports. Org-sharing requires a Team or Enterprise plan. If the client is on Pro, Free, or Max, internal artifacts are kept private (conversation-level access only) until the plan is confirmed or upgraded.

**Defaults for this client:**

- Monthly board report, weekly newsletter builder, enrollment dashboard: org-shared if Team plan is confirmed; private otherwise.
- Immunization and training status snapshot: private only, regardless of plan tier. This artifact surfaces staff health and compliance records and must not be org-shared to a broad group.
- Tuition calculator: published publicly, then embedded on the client's website or linked from inquiry emails.
- Any artifact involving child records, billing, or OCFS-related data: private only, never published.

---

## 5. MCP integration inside artifacts

Paid-plan artifacts can connect to MCP servers configured in I04. For this client, the practical integrations that would matter are:

- **Google Calendar** (if configured in I04): a tour-scheduling artifact that reads available slots and writes a new appointment when a family confirms.
- **Gmail** (if configured in I04): an inquiry-triage artifact that reads the inbox, classifies messages, and surfaces items that need Rebecca's direct response per the governance policy.

**Brightwheel constraint.** The client's daily parent messaging, immunization records, and primary family communication all run through Brightwheel. Brightwheel does not currently have a documented public MCP server. [NEEDS CONFIRMATION: does Brightwheel offer any API or MCP connection compatible with I04?] Until that changes, the weekly newsletter builder and parent-message drafting workflow pull from the Project knowledge base and output text that Rebecca reviews and pastes into Brightwheel manually. I document this workaround in each relevant artifact spec block.

**Authentication note.** Even when an artifact is org-shared within a Team organization, each team member must authenticate their own MCP connection when they open the artifact. This is not a bug; Claude can only access data the specific user is authorized to see in the external service. I explain this on the walkthrough call so no team member is surprised when the artifact asks them to log in the first time.

[NEEDS CONFIRMATION: which MCP servers are configured in I04 for this client?]

---

## 6. Artifact template specifications

### 6.1 Monthly board report

**Type:** Report  
**Audience:** Internal (board and director)  
**Storage:** None  
**Distribution:** Org-shared (requires Team plan) or private  
**MCPs used:** None (pulls from Project knowledge base)

**What it does:**  
Generates the monthly board report as a structured artifact covering enrollment figures, incident and health summary, financial notes, staff updates, and programming highlights for the period. Data comes from the director's monthly summary notes uploaded to the Project and from figures in doc-02 (Business Facts Reference). The artifact formats the content to match the board's existing report structure. [NEEDS CONFIRMATION: does the board have a specific report template or section order it expects?]

**Invocation prompt:**  
```
Generate the monthly board report artifact for [MONTH YEAR]. Use the report format from doc-02 and the monthly summary notes I have uploaded. Include sections for: enrollment headcount, incidents and health events, financial snapshot, staffing, and upcoming programming. Flag any item that may require board discussion. Format for presentation.
```

**Data sources:**  
doc-02 (Business Facts Reference); director's monthly summary notes (uploaded to Project before invocation); [NEEDS CONFIRMATION: any standing financial or enrollment reports that feed this]

**Published URL:** Not applicable (internal only)

**Update cadence:** First Monday of each month, triggered by Rebecca or by the monthly routine from I03.

**Maintenance:** If the board's preferred report structure changes, update the invocation prompt above and note the change in this library doc. No template rebuild is required unless the section structure changes substantially.

**Created:** 2026-06-09  
**Status:** Active

---

### 6.2 Weekly parent newsletter builder

**Type:** Report / Communications tool  
**Audience:** Internal (director drafts; output sent externally to families via Brightwheel)  
**Storage:** None  
**Distribution:** Org-shared (requires Team plan) or private  
**MCPs used:** None (Brightwheel has no MCP connection; output is copy-pasted by Rebecca)

**What it does:**  
Generates a draft weekly newsletter as a formatted artifact that Rebecca reviews and sends to families through Brightwheel. Content covers the week's classroom highlights, upcoming events, any reminders (supply requests, payment due dates, field trip notes), and a closing message in the school's voice. Rebecca reviews the draft before sending; nothing goes out automatically, consistent with the human-in-the-loop governance policy.

**Invocation prompt:**  
```
Generate this week's parent newsletter artifact. Use the voice and tone from doc-04 (Content Library). Include: classroom highlights for the week (use the notes I have pasted below), upcoming events for the next two weeks, any reminders (I will list them), and a closing. Keep it warm and readable on a phone screen. Draft only. I will review before sending through Brightwheel.

[Rebecca pastes: weekly classroom notes, event list, reminders]
```

**Data sources:**  
doc-04 (Content Library, voice and tone reference); director's weekly notes (pasted into the invocation prompt)

**Published URL:** Not applicable

**Update cadence:** Weekly, Monday morning or Tuesday before send.

**Maintenance:** If the school's voice guide in doc-04 changes, the updated doc in the Project is picked up automatically on the next invocation. No structural changes anticipated unless new standing sections are added.

**Created:** 2026-06-09  
**Status:** Active

---

### 6.3 Enrollment and inquiry dashboard

**Type:** Dashboard  
**Audience:** Internal (director)  
**Storage:** None  
**Distribution:** Org-shared (requires Team plan) or private  
**MCPs used:** None (pulls from Project knowledge base and director-supplied data)

**What it does:**  
Interactive dashboard showing current enrollment by classroom, open spots, active inquiries in the pipeline, scheduled tours for the next two weeks, and waitlist count by age group. Rebecca supplies the current numbers when invoking; the artifact formats them into a visual summary useful for weekly planning and for assembling the monthly board report. This is a snapshot tool, not a live-connected database.

[NEEDS CONFIRMATION: does Rebecca track enrollment and inquiries in a spreadsheet or entirely in Brightwheel? If a spreadsheet is exported regularly and uploaded to the Project, the invocation prompt can reference it directly rather than requiring manual number entry each time.]

**Invocation prompt:**  
```
Generate the enrollment and inquiry dashboard artifact using the current figures below. Show: total enrollment vs. capacity by classroom, open spots, active inquiries (by date and age group), tours scheduled in the next 14 days, and waitlist count. Use a clean, readable layout.

[Rebecca pastes: current enrollment figures, inquiry list, tour schedule]
```

**Data sources:**  
Director-supplied enrollment and inquiry data (pasted at invocation) or enrollment export from Brightwheel (if uploaded to Project); doc-02 for capacity figures [NEEDS CONFIRMATION: enrollment capacity per classroom is in doc-02?]

**Published URL:** Not applicable

**Update cadence:** Per-invocation; recommended weekly before Rebecca's Monday planning review.

**Maintenance:** Low. If classroom configuration or capacity changes, update doc-02 and the invocation prompt references it automatically.

**Created:** 2026-06-09  
**Status:** Active

---

### 6.4 Tuition and program calculator

**Type:** Calculator  
**Audience:** Customer-facing (prospective families)  
**Storage:** None  
**Distribution:** Published (public URL); embedded on client website or linked from inquiry emails  
**MCPs used:** None

**What it does:**  
Interactive calculator where prospective families enter their child's age, desired enrollment type, and start-date preference to see a ballpark monthly tuition figure and a summary of what is included in that program tier. Ends with a prompt to schedule a tour or complete an inquiry form. Does not collect family names, contact information, or any PII inside the artifact. Pulls rate structures from doc-02 at the time of generation.

[NEEDS CONFIRMATION: tuition structure, program tiers, age groupings, and pricing from doc-02. Required before this artifact can be generated]  
[NEEDS CONFIRMATION: should the calculator show annual and monthly figures, or monthly only?]  
[NEEDS CONFIRMATION: does the school offer sibling discounts or income-based sliding scale that should appear in the calculator?]  
[NEEDS CONFIRMATION: website URL and which page(s) the calculator should be embedded on or linked from]

**Invocation prompt (for generation or regeneration when pricing changes):**  
```
Generate the tuition and program calculator artifact using the current rate structure from doc-02. The user inputs: child's age (infant / toddler / preschool / pre-K, confirm exact tiers from doc-02), enrollment type (confirm full-day and part-time options from doc-02), and desired start month. Output: monthly tuition for the selected program, a three-bullet summary of what is included, and a call to action to schedule a tour. Do not collect family names or contact information inside the artifact. End state: ready to publish as a public artifact with a URL suitable for embedding.
```

**Data sources:**  
doc-02 (Business Facts Reference: rate structures, program definitions, age groupings)

**Published URL:** [OPERATOR ACTION: generate and publish the artifact, then record the URL here]

**Embed code location:** [OPERATOR ACTION: install link or embed on client website. Confirm page placement with Rebecca]

**Update cadence:** Per-invocation when doc-02 pricing changes (expected annually or when a new program tier is added).

**Maintenance:**  
When tuition rates change, update doc-02 first, then run the invocation prompt above. Claude regenerates the artifact using the updated numbers from the Project. Publish to overwrite the existing version rather than creating a new one; a new URL requires updating the website embed. If a new URL is unavoidable, update the embed before unpublishing the old version to avoid any gap in availability.

**Created:** 2026-06-09  
**Status:** Draft (awaiting doc-02 pricing confirmation before generation)

---

### 6.5 Immunization and training status snapshot

**Type:** Dashboard / Status report  
**Audience:** Internal (director, for compliance review)  
**Storage:** None  
**Distribution:** Private only (never published, never org-shared)  
**MCPs used:** None

**What it does:**  
Generates a formatted status snapshot showing which staff members are current on required immunizations, CPR/first aid certification, and OCFS-mandated training hours, and which items are coming due within 60 days. Rebecca supplies the current records by pasting a table or uploading a CSV at invocation. The artifact formats them into a scannable compliance view with color-coded warnings. This is a reporting tool; the records themselves remain in Brightwheel or whatever system the client uses for official OCFS documentation.

**This artifact must remain private.** It surfaces staff health and compliance records. Distribution is limited to Rebecca's own conversation access. It is never published and never org-shared.

**Invocation prompt:**  
```
Generate the immunization and training status snapshot artifact using the staff records I am pasting below. For each staff member, show: name, role, immunization status (current / due within 60 days / overdue), CPR and first aid expiration date, and OCFS training hours completed this cycle vs. required. Highlight anything due within 60 days in yellow and anything overdue in red. This is for internal compliance review only; do not format it for sharing.

[Rebecca pastes: staff records table]
```

**Data sources:**  
Director-supplied staff compliance records (pasted at invocation); [NEEDS CONFIRMATION: does Rebecca export this from Brightwheel, or is it maintained in a separate spreadsheet?]

**Published URL:** Not applicable

**Update cadence:** Per-invocation; recommended monthly or when a new staff member is onboarded.

**Maintenance:**  
If OCFS changes required training categories or hours, update the invocation prompt to reflect the new requirements. No external dependency.

**Created:** 2026-06-09  
**Status:** Active

---

## 7. Invocation patterns

**For recurring artifact regeneration (board report, newsletter):**  
Rebecca or the weekly/monthly routine from I03 sends the invocation prompt for that artifact, pastes or uploads the current data, and receives the artifact in the side panel. Review, adjust if needed, and use. The prompts are stored in this library doc so there is no need to reconstruct them from memory each time.

**For the tuition calculator (regeneration after pricing changes):**  
Update doc-02 with the new pricing first, then run the invocation prompt for artifact 6.4. Claude regenerates the artifact pulling the updated numbers from the Project. Publish to overwrite the existing URL so the website embed stays live without requiring a code change.

**For one-off customized artifacts:**  
Rebecca describes what she needs. Example: "Build me a summary card for families joining the pre-K class in September. Use the welcome information from doc-04 and include the supply list." Claude generates the artifact. If it turns into a recurring deliverable, I add it to this library.

**For iterating on an existing artifact:**  
Rebecca requests changes. Claude regenerates the full artifact with the change applied. Note that each regeneration replaces the entire artifact, not just the changed section. This can introduce unintended changes to code that was working. Once an artifact's structure is stable and iteration is ongoing, exporting the underlying code to a real codebase (via I06) is the right move. I flag this on the walkthrough call.

**Brightwheel limitation:**  
For artifacts whose output goes to families via Brightwheel (weekly newsletter, event summaries), the workflow is always: generate artifact in Claude, Rebecca reviews in the side panel, Rebecca copies the text into Brightwheel, Rebecca sends. There is no direct push from Claude to Brightwheel. This is a manual handoff step and I document it clearly so the team does not expect automation that does not exist.

---

## 8. Artifact library overview and maintenance

This document is the artifact library for this engagement. It lives in the Project knowledge base as `[client]-artifact-library.md`.

**What this doc covers:**

- The five active artifact templates (sections 6.1 through 6.5)
- Storage and publishing rules and the initial library's no-storage decision
- Distribution defaults by artifact (published, org-shared, or private)
- Invocation prompts for each template, copy-paste ready
- Known constraints: plan-tier dependency for org-sharing, Brightwheel manual handoff, PII and publishing rules for OCFS-adjacent data

**What is not covered here:**

- The client's full recurring task list and automation specs (doc-11)
- The KPI and measurement framework (doc-12)
- The full content and voice guide (doc-04)
- Payroll hours to Linda (biweekly), supply and snack ordering, music teacher barter tracking, and event-setup workflows. These are automation candidates per doc-11 but do not map to interactive artifacts in the initial library.

**Maintenance cadence:**  
Quarterly artifact review per I15. At each review: confirm published URLs are still live, verify the tuition calculator reflects current pricing from doc-02, and evaluate whether either of the two deferred storage candidates below is worth building given usage patterns at that point.

**Storage artifact deferral note:**  
Two recurring tasks in the client profile are candidates for storage-backed artifacts once the team is comfortable with the initial library.

1. **Music teacher barter tracking** (ongoing): a personal-storage artifact Rebecca uses to log monthly barter credits and see the running balance. This requires a paid plan and must be published for storage to work. Because it contains financial information tied to a named individual, it should be published with a non-guessable URL and not indexed or linked publicly. Before building this, confirm plan tier and confirm Rebecca is comfortable with the published-but-unlisted model.
2. **Staff training log** (if the immunization snapshot proves insufficient as a point-in-time report): a tracker that accumulates entries across sessions rather than regenerating from pasted data each time. The same paid-plan and publishing requirements apply. The same PII caution applies: publishing staff health and compliance data publicly, even to an unlisted URL, is a risk I would surface to Rebecca and likely the board before proceeding. The better architecture at that point is a real app build per I06 with proper authentication, not a published artifact.

**Open items as of 2026-06-09:**

- [NEEDS CONFIRMATION: client business name]
- [NEEDS CONFIRMATION: plan tier (Free / Pro / Max / Team / Enterprise). This determines org-sharing availability]
- [NEEDS CONFIRMATION: tuition structure and program tiers from doc-02. Required before generating artifact 6.4]
- [NEEDS CONFIRMATION: enrollment capacity per classroom from doc-02]
- [NEEDS CONFIRMATION: board report format or section order the board currently expects]
- [NEEDS CONFIRMATION: whether Brightwheel exports enrollment and inquiry data in a format uploadable to the Project]
- [NEEDS CONFIRMATION: which MCP servers are configured in I04 for this client]
- [NEEDS CONFIRMATION: Brightwheel API or MCP availability]
- [NEEDS CONFIRMATION: website URL and which pages the tuition calculator should be embedded on or linked from]

---

## Operator runbook

Steps I perform to stand up this artifact library, in order.

**Step 1: Confirm prerequisites.**  
Confirm I01 (Project exists and is populated with doc-01 through doc-12) and I07 (plan tier confirmed). Without plan tier, I cannot determine distribution mode. Without doc-02 pricing, I cannot generate artifact 6.4. If either is missing, block here and resolve before continuing.

**Step 2: Resolve open items.**  
Walk through the open items listed in section 8 with Rebecca. Confirm plan tier, business name, tuition structure, board report format, and Brightwheel export options. Update this doc with the confirmed facts before generating any artifact.

**Step 3: Upload this doc to the Project knowledge base.**  
[OPERATOR ACTION: in the client's Claude Project, upload this file as `[client]-artifact-library.md` to the Project knowledge base]

**Step 4: Generate and test artifact 6.1 (monthly board report).**  
Open a conversation inside the Project. Run the invocation prompt with the most recent monthly summary notes. Refine the layout and section order until it matches what the board expects. Update the invocation prompt in section 6.1 if changes were made during refinement.

**Step 5: Generate and test artifact 6.2 (weekly newsletter builder).**  
Run the invocation prompt with a current set of classroom notes. Review the draft for voice consistency with doc-04. Confirm the output is suitable for direct paste into Brightwheel without reformatting. Refine if needed.

**Step 6: Generate and test artifact 6.3 (enrollment and inquiry dashboard).**  
Run the invocation prompt with current enrollment figures. Confirm the visual layout is readable and the sections match what Rebecca uses in weekly planning. Clarify whether Brightwheel can export the input data to reduce manual entry.

**Step 7: Generate, publish, and test artifact 6.4 (tuition calculator).**  
Requires confirmed pricing from doc-02.  
Generate the artifact in conversation using the invocation prompt in section 6.4.  
[OPERATOR ACTION: publish the artifact from the Claude interface to get a public URL]  
Record the published URL in section 6.4 of this doc.  
Test the calculator by entering sample inputs and verifying the output against the rate structure in doc-02.  
[OPERATOR ACTION: install the link or embed on the client's website. Confirm page placement with Rebecca before going live]

**Step 8: Generate and test artifact 6.5 (immunization and training snapshot).**  
Run the invocation prompt with a sample staff records table (anonymized for testing). Confirm the 60-day warning and overdue highlighting work correctly. Confirm this artifact is kept private and is not published or org-shared.

**Step 9: Update this library doc with final URLs and status.**  
After all artifacts are generated and tested, update section 6 with the published URL for artifact 6.4 and mark each artifact's status as Active.

**Step 10: Walk Rebecca through each artifact on a call (20 to 30 minutes).**  
Cover: how to invoke each artifact, how to iterate on a draft, where to find the published calculator URL, why the newsletter must be reviewed before sending, the publish-before-storage rule (even though no initial artifacts use storage, this will matter if the barter ledger artifact is built later), and the quarterly maintenance cadence. Record a Loom.

**Step 11: Have Rebecca invoke at least one artifact herself on the walkthrough call.**  
Confirm she can generate the newsletter or the board report snapshot without help. This is the definition-of-done gate.

**Step 12: Update the client tracker.**  
Record: artifacts deployed (count and names), published URLs where applicable, storage configuration (none for all initial artifacts), distribution modes, and next artifact review date (90 days out).

---

## Operator must do (cannot be generated)

The following steps require action inside the client's Anthropic account, their website, or a third-party consent screen. They cannot be completed from a file.

- [ ] [OPERATOR ACTION: confirm plan tier in the client's Anthropic account settings. Org-sharing requires Team or Enterprise]
- [ ] [OPERATOR ACTION: in the client's Claude Project, upload this file as `[client]-artifact-library.md` to the Project knowledge base]
- [ ] [OPERATOR ACTION: in the client's Claude Project, generate artifact 6.4 (tuition calculator) and publish it from the Claude interface to get a public URL]
- [ ] [OPERATOR ACTION: record the published URL for artifact 6.4 in section 6.4 of this doc]
- [ ] [OPERATOR ACTION: install the tuition calculator link or embed on the client's website. Confirm page placement and allowed domain with Rebecca]
- [ ] [OPERATOR ACTION: if Team or Enterprise plan is confirmed, org-share artifacts 6.1, 6.2, and 6.3 within the client's Claude organization]
- [ ] [OPERATOR ACTION: confirm artifact 6.5 (immunization snapshot) is set to private and has not been published or org-shared]
- [ ] [OPERATOR ACTION: if storage artifacts are built in the future (barter ledger, training log), publish each one before testing storage. Storage silently fails in unpublished artifacts]
- [ ] [OPERATOR ACTION: before unpublishing any artifact that has been live, export any data the client wants to retain. Unpublishing permanently and immediately deletes all storage data]
- [ ] [OPERATOR ACTION: record the Loom walkthrough link and share with Rebecca after the call]
- [ ] [OPERATOR ACTION: update the client tracker with artifact count, URLs, distribution modes, and next review date]
