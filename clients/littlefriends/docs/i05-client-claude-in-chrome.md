# [NEEDS CONFIRMATION: client/school name]: browser and spreadsheet workflows

*Spec I05 | Produced 2026-06-09 | Upriver Consulting*

---

## 1. Browser compatibility check

The only team member who does browser-based work on a desktop is Rebecca (director). Her browser is listed as Chrome, but that is an assumption and not yet confirmed.

[NEEDS CONFIRMATION: confirm Rebecca is on Google Chrome or Microsoft Edge on her office laptop. Brave, Arc, Firefox, Safari, and all mobile browsers are not supported by the Claude Chrome extension.]

All three lead teachers (Tova, Carla, Dana) and Yael (aftercare) work from personal phones via Slack. Mobile browsers are not supported by the Claude Chrome extension. I am documenting this as a deliberate skip, not an omission. This is flagged in the client-tracker for re-visit if Anthropic ships mobile browser support.

Linda (bookkeeper, part-time, JCC) does not appear in the browser/device landscape.

[NEEDS CONFIRMATION: is Linda a Claude user for this engagement? If so, what browser and machine does she use?]

**Users receiving Chrome setup:** Rebecca only (one user), pending browser confirmation.
**Users skipped (mobile):** Tova, Carla, Dana, Yael. Mobile browsers are unsupported; this is documented and flagged for quarterly re-visit.
**Users with unknown status:** Linda.

---

## 2. Permissions and safety envelope

I establish the following hard limits with Rebecca before anything is installed. These are not defaults she can change later without a review conversation.

**Hard rules:**

- The Claude Chrome extension is never granted permission to any site handling billing, payroll, tuition processing, or banking. These sites are explicitly denied, not merely left ungiven.
- Claude does not complete payment submissions, tuition entries, or financial transactions on Rebecca's behalf under any circumstances.
- Any action that sends an email to a parent, submits an enrollment form, or posts content to an external party requires Rebecca's explicit approval before Claude proceeds. Ask-before-acting mode is mandatory on all shortcuts for the first 30 days.
- If a page produces unexpected behavior (Claude starts doing things Rebecca did not ask for), she closes the tab, pauses the session, and flags me. This is the sign of a prompt injection attempt, and I treat it seriously.
- After 30 days of clean, consistent use on a specific shortcut, Rebecca and I review together before she moves that shortcut to autonomous mode. She does not flip it alone.

**Site-level permission management.** I walk Rebecca through chrome://extensions, open the Claude extension settings, and confirm that the "allow on all sites" option is declined. Every site in the allowlist below gets an explicit per-site grant. All others are denied by default.

---

## 3. Site allowlist

These sites are approved for Rebecca's Chrome Claude setup. All permissions are per-site only.

| Site | Purpose | Permission level |
|---|---|---|
| [NEEDS CONFIRMATION: enrollment system name, e.g. ChildPilot, Procare Online, HiMama, or other] | Waitlist review, enrollment pipeline review | Read-only review; no form submission without human approval |
| [NEEDS CONFIRMATION: parent-communication platform name, e.g. Brightwheel, Procare, or other] | Parent-message triage | Read and draft only; human approval before any send |
| Gmail (mail.google.com) | Email triage and draft review | Read and draft; human approval before send |
| Google Drive (drive.google.com) | Newsletter and communications draft access | Read only; no auto-edit or share |
| Google Calendar (calendar.google.com) | Tour scheduling, availability lookup | Read; human approval before any invite is sent |

**Explicitly denied (never grant, even if prompted):** Any payroll processor [NEEDS CONFIRMATION: confirm processor name, e.g. Gusto, Paychex, or JCC-managed], any banking portal, any tuition billing or payment system, any JCC finance system.

---

## 4. Workflow shortcuts

I record 3-5 shortcuts with Rebecca based on the preschool archetype. The shortcut descriptions below are plans. Recording happens live during the install call, and the steps are adjusted to match Rebecca's actual screens and workflow.

[NEEDS CONFIRMATION: confirm the enrollment system and parent-communication tool names. The shortcut steps below are drafted against the archetype and need the real tool names before recording.]

1. **Parent-message triage.** Rebecca opens the parent-communication platform ([NEEDS CONFIRMATION: tool name]). Claude reads the inbox, groups messages by type (question, absence notice, general update), and produces a prioritized summary in the side panel. Rebecca decides which to act on. Claude does not send replies or take any action. Mode: Ask-before-acting.

2. **Waitlist conversion workflow.** Rebecca opens the enrollment system ([NEEDS CONFIRMATION: tool name]) and navigates to the waitlist view. Claude reads each record, notes how long each family has been waiting and which classroom they are waiting for, and drafts a ranked outreach order in the side panel. Rebecca initiates any outreach herself. Mode: Ask-before-acting.

3. **Newsletter asset pull.** Rebecca opens Google Drive and navigates to the current newsletter draft folder. Claude reads the draft, identifies referenced photos or classroom updates, and lists them in the side panel so Rebecca can confirm what to include before anything moves or sends. Mode: Ask-before-acting.

[NEEDS CONFIRMATION: are there 1-2 additional recurring browser tasks Rebecca wants covered? Common preschool candidates include enrollment inquiry first-reply drafting, Google Business Profile review response drafting, or tour availability reply drafting from Google Calendar.]

---

## 5. Installation and setup mechanics

**For Rebecca (one user):**

1. [OPERATOR ACTION: on Rebecca's office laptop, open Google Chrome, navigate to the Chrome Web Store, search for "Claude," install the extension published by Anthropic, and approve the permissions screen.]
2. [OPERATOR ACTION: sign in to the Claude extension with Rebecca's account credentials.]
3. [OPERATOR ACTION: click the puzzle-piece icon in the Chrome toolbar and pin the Claude extension so it is always visible.]
4. [OPERATOR ACTION: open any tab and click the Claude icon to confirm the side panel loads correctly.]
5. [OPERATOR ACTION: open chrome://extensions > Claude > Details > Site access. Set the default to "On specific sites" or "Ask." Decline "On all sites."]
6. [OPERATOR ACTION: visit each site in the allowlist above and grant the Claude extension permission when prompted.]
7. [OPERATOR ACTION: run a test prompt ("What's on this page?") on one allowlist site. Confirm Claude reads the page correctly and returns a coherent summary.]
8. [OPERATOR ACTION: set "Ask before acting" as the default mode in the extension settings panel.]

**Claude Desktop + Chrome handoff (if Rebecca uses Cowork):** If Rebecca runs daily routines from Claude Desktop, I also connect the Chrome extension as a Cowork connector so she can start a task in Cowork and hand a browser-based step to Chrome, then return results to Cowork.

[OPERATOR ACTION: in Claude Desktop, click Rebecca's initials in the lower-left corner > Settings. Toggle the Claude in Chrome connector on. Then, in any Cowork conversation, click + > Connectors and enable Claude in Chrome for that conversation.]

**Model tier note:**

[NEEDS CONFIRMATION: confirm Rebecca's Claude plan tier (Pro, Max, Team, or Enterprise).]

- **Pro plan:** The Chrome extension is limited to Haiku 4.5. This is adequate for simple read-and-summarize tasks such as parent-message triage. The waitlist conversion workflow, which involves reading and reasoning across multiple enrollment records, may produce inconsistent results at Haiku. I document this limitation clearly with Rebecca at setup. If her enrollment pipeline work is a regular, high-stakes task, I recommend upgrading to Team or Max before recording that shortcut.
- **Max, Team, or Enterprise:** Full model choice is available, including the models needed for multi-step reasoning across records.

---

## 6. Recording the shortcuts

For each of the 3-5 shortcuts above, the recording session happens live with Rebecca present:

1. [OPERATOR ACTION: on the relevant site, click the record icon in the Claude extension side panel.]
2. [OPERATOR ACTION: perform the steps manually once, narrating each action so the extension captures the sequence and the annotations match Rebecca's actual pattern, not a generic one.]
3. [OPERATOR ACTION: stop the recording. Name the shortcut clearly, for example "Parent message triage" or "Waitlist rank."]
4. [OPERATOR ACTION: test the shortcut on a different instance of the workflow before the call ends. Confirm the output matches what Rebecca expected.]

Scheduled shortcuts (clock icon in the extension panel) require Chrome to be open at the scheduled time. For Rebecca's recurring routines, I use Cowork routines instead where possible, because Cowork is more reliable for time-based execution. Browser shortcuts are invoked on-demand by default.

---

## 7. Claude in Excel

Linda (bookkeeper, part-time, JCC) is the likeliest Excel candidate. Her device and access are not confirmed.

[NEEDS CONFIRMATION: does Linda do real spreadsheet work in Microsoft Excel (financial modeling, variance reporting, pivot-heavy analysis), or does her bookkeeping flow through QuickBooks, a JCC-managed system, or another tool? If she is a Claude user and works primarily in Excel, the Excel add-in is worth setting up for her.]

If Linda is confirmed as a Claude user doing spreadsheet work:

1. [OPERATOR ACTION: on Linda's machine, navigate to Microsoft AppSource. Search for "Claude for Excel" and click "Get it now." Approve permissions.]
2. [OPERATOR ACTION: open Excel. Locate Claude in the Home ribbon or Tools > Add-ins. Activate the add-in and sign in with Linda's Claude account credentials.]
3. [OPERATOR ACTION: open the Claude sidebar in Excel. Confirm it reads the open workbook.]
4. [OPERATOR ACTION: run a test prompt ("Explain what's happening in this workbook") and confirm Claude cites specific cells.]

**Safety rule for Excel:** Claude in Excel is used only on files Rebecca or Linda created. It is never used on downloaded templates, vendor-supplied spreadsheets, or external files until those files have been manually reviewed. Malicious instructions can be hidden in cells or comments. I train Linda on this explicitly before she starts using the add-in.

---

## 8. Browser workflows reference sheet

This section becomes the client-facing PDF once all [NEEDS CONFIRMATION] items above are resolved. I populate the tool names, Rebecca's email, and the final shortcut names, then convert to PDF and upload to the Project knowledge base.

---

```
[NEEDS CONFIRMATION: school name]: your browser workflows

Claude in Chrome

Installed for
- Rebecca ([NEEDS CONFIRMATION: Rebecca's email address])

Allowed sites
- [NEEDS CONFIRMATION: enrollment system name]: waitlist and pipeline review, read-only
- [NEEDS CONFIRMATION: parent-communication platform]: inbox triage, read and draft only, no auto-send
- Gmail (mail.google.com): triage and draft, human approval before send
- Google Drive (drive.google.com): read-only access for newsletter and communication drafts
- Google Calendar (calendar.google.com): availability review, human approval before any invite

Recorded shortcuts
- Parent-message triage: opens [NEEDS CONFIRMATION: tool name], groups messages by type,
  outputs prioritized list in side panel. Invoke from the side panel while on the inbox page.
- Waitlist conversion: opens [NEEDS CONFIRMATION: enrollment system name], reads waitlist records,
  outputs a ranked outreach summary. Invoke from the side panel on the waitlist view.
- Newsletter asset pull: reads the current Drive newsletter draft and lists referenced assets
  in the side panel. Invoke from Drive while the draft is open.
[NEEDS CONFIRMATION: add shortcuts 4 and 5 once confirmed with Rebecca]

Hard rules
- Never approve Claude to interact with billing, payroll, tuition-processing, or banking sites
- Keep "Ask before acting" mode on; do not switch any shortcut to autonomous without a review
  conversation with your consultant
- If a site produces unexpected Claude behavior (actions you didn't ask for), close the tab
  and flag it immediately
- Plan tier is [NEEDS CONFIRMATION]; if on Pro, Claude in Chrome runs Haiku 4.5, and
  multi-step reasoning tasks (waitlist analysis) may need Max or Team

How to revoke a site permission
- chrome://extensions > Claude > Details > Site access > remove the site from the list

Teachers and mobile devices
- All three lead teachers and aftercare staff use personal phones. The Claude Chrome extension
  does not run on mobile browsers. This gap is documented and will be re-evaluated if
  Anthropic ships mobile support.

Claude in Excel
- Status: [NEEDS CONFIRMATION, see section 7]
```

---

## Operator runbook

These are the steps I perform to build and deliver this setup, in order.

**Step 1: Resolve the open confirmations (5-10 minutes).** Before scheduling the install call, get answers to: (a) Rebecca's exact browser and OS on her office laptop, (b) Rebecca's Claude plan tier, (c) the exact name of the enrollment system, (d) the exact name of the parent-communication platform, (e) whether Linda is a Claude user and whether Excel is in scope.

**Step 2: Confirm browsers and users (done in Step 1).** Chrome or Edge only. Document that all teachers operate from personal phones and are skipped. Document Linda's status once confirmed.

**Step 3: Finalize the allowlist and shortcut shortlist (10 minutes).** Replace the [NEEDS CONFIRMATION] tool names in sections 3 and 4 with the confirmed platform names. Adjust shortcut steps to match Rebecca's actual screens before recording.

**Step 4: Schedule the install call with Rebecca (20-30 minutes, shared screen).** Walk through the Chrome Web Store install, pin the extension, deny all-sites, grant per-site permissions for the allowlist, run a test prompt, and set Ask-before-acting mode.

**Step 5: Set the model tier expectation (during the install call).** If Rebecca is on Pro, explain Haiku 4.5 before the session begins. If the waitlist conversion workflow is a priority and Pro is the plan, present the Team/Max upgrade recommendation explicitly and document it in the client-tracker.

**Step 6: Enable the Cowork connector (5 minutes, if Rebecca uses Claude Desktop).** Toggle the Claude in Chrome connector in Cowork settings and test that the handoff route works.

**Step 7: Record 3-5 shortcuts live with Rebecca (30-45 minutes total).** Do this in the same call as the install or in a dedicated follow-up. Record with Rebecca present so each shortcut captures her actual pattern and screen layout. Name each shortcut clearly. Test on a different instance before signing off.

**Step 8: If Linda is in scope, install Claude in Excel (15-20 minutes, shared screen with Linda).** AppSource install, add-in activation in Excel, sign in with Linda's credentials, test prompt on a trusted workbook. Establish the trusted-files-only rule verbally before she starts using it.

**Step 9: Build the reference sheet (15 minutes).** Populate section 8 above with confirmed tool names, Rebecca's email, and final shortcut names. Convert to PDF.

**Step 10: Upload the reference sheet to the Project knowledge base.**
[OPERATOR ACTION: upload the finalized PDF to the client's Claude Project knowledge base.]

**Step 11: Record the Loom walkthrough (7-10 minutes).** Cover: how to open the Chrome side panel, how to invoke each of Rebecca's shortcuts, how Ask-before-acting mode looks in practice, how to revoke a site permission, and (if applicable) how to use Claude in Excel. Send the link to Rebecca.
[OPERATOR ACTION: record and send the Loom walkthrough to Rebecca.]

**Step 12: Update the client-tracker.** Record who has what installed, which shortcuts exist and their current mode (Ask-before-acting vs. autonomous), the site allowlist, and the next review date (90 days out from install). Flag the mobile-teachers gap and the re-visit condition (Anthropic mobile browser support).

---

## Operator must do (cannot be generated)

These steps require action inside the client's Anthropic account, a browser consent screen, physical access to Rebecca's or Linda's machine, or a third-party admin portal. I cannot produce them as file content.

- [ ] Confirm Rebecca's browser (Chrome or Edge) and OS before scheduling the install call.
- [ ] Confirm Rebecca's Claude plan tier (Pro, Max, Team, or Enterprise) in the Anthropic billing portal.
- [ ] Confirm the exact name of the enrollment system Rebecca uses.
- [ ] Confirm the exact name of the parent-communication platform Rebecca uses.
- [ ] Confirm whether Linda is included in the client's Claude plan and whether Excel is in scope.
- [ ] On Rebecca's office laptop: open the Chrome Web Store, search "Claude," install the extension published by Anthropic, and approve the permissions screen.
- [ ] On Rebecca's office laptop: sign in to the Claude extension with Rebecca's account credentials.
- [ ] On Rebecca's office laptop: pin the extension in the Chrome toolbar.
- [ ] On Rebecca's office laptop: open chrome://extensions > Claude > Details > Site access. Decline "On all sites." Set to per-site only.
- [ ] On Rebecca's office laptop: visit each allowlist site and grant the Claude extension permission when prompted.
- [ ] On Rebecca's office laptop: run a test prompt and confirm the extension reads the page correctly.
- [ ] On Rebecca's office laptop: set "Ask before acting" as the default mode in the extension settings.
- [ ] On Rebecca's office laptop (if Cowork is in use): toggle the Claude in Chrome connector in Claude Desktop > Settings, then confirm the handoff works in a test Cowork conversation.
- [ ] Live with Rebecca: record each shortcut using the extension's record icon, name each one, and test each on a different workflow instance before ending the call.
- [ ] If upgrading the plan is recommended (Pro + complex workflows): present the recommendation to Rebecca and walk her through the upgrade in the Anthropic billing portal.
- [ ] If Linda is in scope: on Linda's machine, install Claude for Excel from Microsoft AppSource, activate the add-in in Excel, sign in with Linda's credentials, and run a test prompt on a trusted workbook.
- [ ] Upload the finalized reference sheet PDF to the client's Claude Project knowledge base.
- [ ] Record the Loom walkthrough (side panel, shortcuts, Ask-before-acting, permission revocation, Excel if applicable) and send the link to Rebecca.
- [ ] Update the client-tracker with: who has what installed, shortcut list and modes, allowlist count, mobile-teacher skip note and re-visit flag, and next review date.

---

*Definition of done:*

- [ ] Browser and OS confirmed for Rebecca
- [ ] Plan tier confirmed and Haiku 4.5 limitation (if Pro) communicated before setup
- [ ] Chrome extension installed, pinned, and signed in for Rebecca
- [ ] "Ask before acting" mode set as default for all shortcuts
- [ ] Per-site permissions granted only for the allowlist; "all sites" denied
- [ ] 3-5 shortcuts recorded, named, and tested
- [ ] Hard-rule safety boundaries documented and acknowledged by Rebecca verbally
- [ ] Mobile-teacher skip documented in client-tracker with re-visit condition noted
- [ ] Linda's Excel status confirmed and actioned or deferred with a note
- [ ] Reference sheet PDF in the Project knowledge base
- [ ] Loom walkthrough recorded and sent to Rebecca
- [ ] Client-tracker updated with all fields above
