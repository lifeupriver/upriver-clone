# Little Friends Learning Loft: Claude project setup
## I01: Client Claude project | Upriver Consulting

**Client:** Little Friends Learning Loft  
**Engagement start:** June 2026  
**Consultant:** Joshua Brown, Upriver Consulting  
**Doc number:** I01  
**Status:** Ready to build pending confirmations noted inline

---

## 1. Project name

`Little Friends Learning Loft - Operating System`

## 2. Project description

`Early childhood education | Upriver Consulting engagement started June 2026`

## 3. Custom instructions

Keep the final paste under 600 words. Fill in Block B and Block C once the dependency documents are confirmed.

### Block A: Role and scope

You are the marketing and operations AI for Little Friends Learning Loft, an early childhood education program offering Twos, Threes, and Pre-K classrooms plus an aftercare program. [NEEDS CONFIRMATION: physical location, ownership structure, and the core purpose of this engagement, as these details were not available in the onboarding questionnaire at the time this document was drafted.] You help the Little Friends team draft parent-facing content, handle inquiry responses, build workflows, and pull from the engagement's operating system documents for every answer. You work under the direction of the program's owner and lead teachers. Joshua Brown at Upriver Consulting built this Project and has ongoing access.

### Block B: Voice and style rules

[NEEDS CONFIRMATION: Brand Voice Guide (Doc 01) was not yet finalized at draft time. Once it is, extract five to ten specific rules from it (banned words, sentence-length targets, first-person vs. third-person preferences, paragraph length, and any format preferences) and paste them here in list form. Do not paste explanatory paragraphs. Rules only.]

### Block C: Behavioral guardrails

[NEEDS CONFIRMATION: Guardrails are drawn from the completed kickoff questionnaire (Doc 14) and the Retainer Engagement Playbook (Doc 15). Once both are finalized, add the rules specific to what Claude should never do in this Project, for example: restrictions on quoting tuition or fee figures from memory, rules about naming competing programs, approval gates before any parent-facing communication is sent, and any language or licensing restrictions that surfaced during the kickoff call.]

The following defaults are active until confirmed guardrails replace them:

- Never quote tuition, deposit, or fee figures without checking `02-business-facts-reference.md` first. If the figure is not in that document, say so rather than estimating.
- Never draft content that names a competing program.
- Always produce a draft for human review. Do not publish directly to any channel.
- Route questions about enrollment availability, waitlists, or contracts to the program owner rather than generating a speculative answer.

### Block D: Reference pointers

For voice and tone questions, check `01-brand-voice-guide.md`.  
For tuition, enrollment policies, classroom capacities, and program details, check `02-business-facts-reference.md`.  
For the enrollment funnel and inquiry-handling workflow, check `03-sales-process-map.md`.  
For photography, past event summaries, and existing content assets, check `04-content-library.md`.  
For competitor context, check `05-competitor-landscape.md`.  
For keyword targets and SEO priorities, check `06-seo-keyword-strategy.md`.  
For parent and prospect questions, check `07-faq-bank.md` before generating a new answer.  
For email copy, check `08-email-templates.md`.  
For social post drafts, check `09-social-media-playbook.md`.

---

## 4. Knowledge base load

Upload in numeric order. Markdown is preferred for text-heavy documents; PDF is acceptable only where visual layout carries meaning.

| # | File | Format |
|---|------|--------|
| 1 | `01-brand-voice-guide.md` | .md |
| 2 | `02-business-facts-reference.md` | .md |
| 3 | `03-sales-process-map.md` | .md |
| 4 | `04-content-library.md` | .md |
| 5 | `05-competitor-landscape.md` | .md |
| 6 | `06-seo-keyword-strategy.md` | .md |
| 7 | `07-faq-bank.md` | .md |
| 8 | `08-email-templates.md` | .md |
| 9 | `09-social-media-playbook.md` | .md |
| 10 | `10-website-audit.md` | .md |
| 11 | `11-automation-spec-package.md` | .md |
| 12 | `12-measurement-kpi-framework.md` | .md |
| 13 | `13-master-build-sequence.md` | .md |
| 14 | `14-client-onboarding-kit.md` | .md |
| 15 | `15-retainer-engagement-playbook.md` | .md |
| 16 | `16-sales-collateral.md` | .md (or .pdf if the layout depends on visual formatting) |
| 17 | `17-handoff-offboarding.md` | .md |
| 18 | `18-ai-operating-system-sales-document.md` | .md (or .pdf if delivered as a designed one-pager) |

At 13 or more files, Claude switches from direct context loading to RAG retrieval mode. That is expected and desirable at this doc count. The Block D reference pointers in the custom instructions tell Claude which file to search for which kind of question, which is what makes RAG useful in practice.

---

## 5. Access configuration

**Plan tier:** [NEEDS CONFIRMATION: `goals.engagementScope` was empty at draft time, and the I07 digest did not contain a plan-tier decision. If any team members beyond the owner need Project access, the account must be on Anthropic Team plan at minimum, because Pro does not support shared Projects. Confirm the plan tier against the I07 decision tree before creating the Project. This is a blocking step: do not build the Project until the tier is resolved.]

**Proposed access map:**

| Person | Role at Little Friends | Proposed Project access | Notes |
|--------|------------------------|------------------------|-------|
| [NEEDS CONFIRMATION: owner name and email] | Program owner | Can edit | Creates the Project and invites collaborators |
| Tova | Twos lead teacher | [NEEDS CONFIRMATION: Can edit or Can use?] | Propose Can use unless she needs to update knowledge docs |
| Carla | Threes lead teacher | [NEEDS CONFIRMATION: Can edit or Can use?] | Same question as Tova |
| Dana | Pre-K lead teacher | [NEEDS CONFIRMATION: Can edit or Can use?] | Same question as Tova |
| Yael | Aftercare | [NEEDS CONFIRMATION: Can use?] | Aftercare role suggests output-only access is sufficient |
| Linda | Bookkeeper, part-time (JCC) | [NEEDS CONFIRMATION: Does she need access?] | Part-time and JCC-affiliated; confirm whether her bookkeeping scope intersects with this Project before adding a seat |
| Joshua Brown | Upriver Consulting | Can edit | Standard for an active engagement; edit access is required to update the knowledge base and adjust instructions |

[NEEDS CONFIRMATION: Are any Upriver subcontractors (Annmarie, Louis, Zach, or Megan) active on this engagement? If yes, add each at Can edit while their scope is active and set a calendar reminder to remove access at their confirmed scope-end date, per I07 governance.]

---

## 6. Starter conversations

I create and test all four starter conversations before handing the Project to the client. Each is renamed to its standard title so the client sees clear labels in their chat history on day one.

**Starter 1: "Brand voice check"**  
[NEEDS CONFIRMATION: This starter requires a sample of the client's existing copy. Once Doc 01 and Doc 04 are finalized, pull one paragraph from the current website or a past parent newsletter. Paste it into the conversation and ask Claude to rewrite it per the brand voice rules. Demonstrates how the voice guide changes output in practice.]

**Starter 2: "Competitor analysis summary"**  
Ask Claude: "Summarize how Little Friends Learning Loft's positioning differs from the programs listed in the competitor landscape document." Output pulls from `05-competitor-landscape.md`. Demonstrates knowledge retrieval from a specific document.

**Starter 3: "Weekly status draft"**  
Ask Claude to produce a weekly status update template the owner or a lead teacher can fill in and send to the team each Friday. Output is a reusable artifact. Demonstrates artifact creation.

**Starter 4: "Next blog post topic"**  
Ask Claude: "Based on the SEO keyword strategy and content library, suggest the next three blog post topics with a short outline for each." Output pulls from `06-seo-keyword-strategy.md` and `04-content-library.md`. Demonstrates multi-document retrieval.

---

## 7. Walkthrough deliverable

One-page PDF titled `Little Friends Learning Loft - How to Use Your Claude Project.pdf`, uploaded to the Project knowledge base after the 18 operating system docs are in place.

Covers: how to open the Project, how to start a new conversation inside it, how the knowledge base works (the team does not have to paste documents (Claude already has them)), how custom instructions shape every response, what each of the four starter conversations demonstrates, and who to contact when something breaks or new knowledge needs to be added.

---

## Operator runbook

Steps in the order the spec prescribes. Every step that requires action inside the client's Anthropic account or a third-party interface is marked [OPERATOR ACTION].

**Step 1: Confirm the plan tier (5 minutes)**  
I check the client's current Anthropic account tier before creating anything. If the engagement requires multiple team members to access the Project, the account must be on Team or Enterprise. Pro does not support shared Projects. I resolve any tier uncertainty against I07 before moving to Step 2. If an upgrade is needed, I do not proceed until it is complete.

[OPERATOR ACTION: Log into the client's Anthropic account and confirm the current plan tier. If an upgrade to Team is required, walk the client through the upgrade flow inside their billing settings, as this requires a payment step that cannot be done from a file.]

**Step 2: Create the Project in the client's account (5 minutes)**  
I prefer to do this live on a shared screen with the owner during the kickoff call so they see the setup in real time and can ask questions.

[OPERATOR ACTION: Inside the client's Anthropic account, click "New Project." Set the name to exactly `Little Friends Learning Loft - Operating System` and the description to `Early childhood education | Upriver Consulting engagement started June 2026`.]

**Step 3: Set visibility (2 minutes)**  
Private by default. I do not share organization-wide.

[OPERATOR ACTION: Set Project visibility to private inside the account settings. Add each collaborator by email at their confirmed role level, one at a time. Do not use the "share with organization" option.]

**Step 4: Write and paste custom instructions (15-20 minutes)**  
I open `client-project-custom-instructions-template.md` in my Upriver Obsidian vault. I fill in Block A from the client profile. I fill in Block B from Doc 01 once it is final. I fill in Block C from the kickoff questionnaire and Doc 15 once both are done. Block D is drafted above and ready to paste. I verify the total word count stays under 600 before pasting.

[OPERATOR ACTION: Paste the finalized custom instructions into the Project's custom instructions field. Click save. Reopen the field to confirm the save took correctly.]

**Step 5: Upload knowledge docs in order (10 minutes)**  
I upload all 18 docs one at a time in numeric order. I watch the "project capacity" indicator as I go. RAG mode activates somewhere around doc 7 or 8 depending on file sizes. That is the expected behavior.

[OPERATOR ACTION: Upload each of the 18 knowledge files in numeric order using the Project's file-upload interface. Each upload requires a separate file-picker action inside the account. Confirm each upload completes before moving to the next file.]

**Step 6: Create and test the four starter conversations (15-20 minutes)**  
I run each starter conversation myself, read the output, and confirm Claude is retrieving from the right documents and applying voice rules correctly. I rename each conversation to its standard title before handing off.

[OPERATOR ACTION: Create, run, and rename all four starter conversations inside the Project. Renaming a conversation requires clicking it in the sidebar and editing the title (this is done inside the account interface and cannot be scripted).]

**Step 7: Generate and upload the walkthrough PDF (10 minutes)**  
I open the Canva walkthrough template, swap in the client's name and Project URL, export as PDF, and upload it to the Project as the 19th file.

[OPERATOR ACTION: Export the PDF from Canva and upload it to the Project knowledge base as `Little Friends Learning Loft - How to Use Your Claude Project.pdf`.]

**Step 8: Send the handoff email (5 minutes)**  
Short email to the owner and any team members given access. I include the Project URL, the one-page walkthrough PDF, a Loom link (12-15 minutes showing me using the Project), and homework: run all four starter conversations before the next check-in and report back.

**Step 9: Log in my client tracker (2 minutes)**  
I record the Project URL, creation date, plan tier, access map, and any subcontractor access expiry reminders in my client-tracker file.

---

## Operator must do (cannot be generated)

Every item below requires action inside the client's Anthropic account or a third-party interface and cannot be produced as file content. Complete them in this order.

- [ ] Confirm the program owner's full name and Anthropic account email before any account work begins.
- [ ] Confirm the current Anthropic account plan tier. If shared access is needed and the account is on Pro, complete the upgrade to Team before creating the Project.
- [ ] Confirm access level (Can edit vs. Can use vs. no access) for each of the following before adding them: Tova, Carla, Dana, Yael, and Linda.
- [ ] Confirm whether any Upriver subcontractors (Annmarie, Louis, Zach, or Megan) are active on this engagement and, if so, set their access expiry reminders in the client tracker.
- [ ] Obtain a sample of the client's existing copy (a website paragraph, a past parent newsletter, a classroom description) to use in Starter 1.
- [ ] Finalize Doc 01 (Brand Voice Guide) and fill in Block B of the custom instructions before pasting them into the Project.
- [ ] Finalize Doc 14 (Client Onboarding Kit) and Doc 15 (Retainer Engagement Playbook) and replace the placeholder guardrails in Block C with confirmed, client-specific rules.
- [ ] Create the Project inside the client's Anthropic account with the exact name and description shown in sections 1 and 2 above.
- [ ] Set Project visibility to private and add each collaborator by email at their confirmed role level.
- [ ] Paste the finalized custom instructions into the Project's custom instructions field and save.
- [ ] Upload all 18 AI Operating System knowledge docs in numeric order via the file-upload interface. Confirm each upload before proceeding to the next.
- [ ] Create, run, confirm output quality for, and rename all four starter conversations inside the Project.
- [ ] Export the one-page walkthrough PDF from Canva and upload it to the Project knowledge base as the 19th file.
- [ ] Send the handoff email to the owner (and any team members with access) with the Project URL, walkthrough PDF, and Loom link.
- [ ] Confirm the client can open the Project and has completed at least one starter conversation.
- [ ] Update the client-tracker file with Project URL, creation date, plan tier, access map, and any subcontractor access expiry dates.
