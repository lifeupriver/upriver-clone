# Little Friends Loft: Claude skills deployment (I02)

**Prepared by:** Joshua Brown, Upriver Consulting
**Date prepared:** 2026-06-09
**Client contact:** Rebecca (director)
**Prerequisite:** I01 complete; client Claude Project is live

---

## 1. Skill inventory decision

I mapped Little Friends Loft's recurring task list against all four buckets. The client is a childcare center, not a content-heavy publishing operation, so Bucket B is empty by design. The spec says, "Service businesses: not many fits from my current library; more likely to build a custom skill for them." That holds here. Every skill with real value for Rebecca is either universal (Bucket A) or built specifically for her workflows (Bucket C).

### Bucket A: Universal skills (deployed to every client)

**`stop-slop`**: Removes AI writing tells from any prose. Rebecca produces daily Brightwheel messages, a weekly newsletter, and monthly board reports. All three benefit from this. No customization needed.

[NEEDS CONFIRMATION: what is the current master version of stop-slop? The ZIP filename and reference sheet version number depend on this answer.]

**`lfl-voice-check`**: A custom skill that loads Doc 01 (Little Friends Loft Brand Voice Guide) and reviews any pasted text against it, flagging and rewriting sections that violate the voice rules. This is the client-specific voice check every client receives. Built from scratch for this client; saved to `/mnt/skills/user/clients/little-friends-loft/lfl-voice-check/`.

### Bucket B: Industry-specific skills

None deployed. Little Friends Loft uses neither WordPress nor Pic-Time, and no wedding-venue archetype skills apply. The applicable recurring work is handled in Bucket C below.

### Bucket C: Client-specific custom skills (starter set, day one)

Three custom skills for the highest-frequency, highest-effort recurring tasks:

**`lfl-brightwheel-message-drafter`**: Daily parent communications via Brightwheel are Rebecca's single most time-consuming daily writing task (frequency: daily, per the automation spec). This skill drafts Brightwheel-ready daily classroom updates and direct parent messages from a short prompt. It references Doc 01 for voice and Doc 07 (FAQ Bank) for factual answers to common parent questions. Built from scratch; saved to `/mnt/skills/user/clients/little-friends-loft/lfl-brightwheel-message-drafter/`.

**`lfl-inquiry-tour-responder`**: Inquiries and tour scheduling are ongoing. This skill drafts a first-reply email to a tour inquiry using the FAQ Bank (Doc 07) and Sales Process Map (Doc 03). It produces a draft for Rebecca to review and send; it does not integrate directly with Sign-Up Genius (that step remains manual for now). Built from scratch; saved to `/mnt/skills/user/clients/little-friends-loft/lfl-inquiry-tour-responder/`.

**`lfl-weekly-newsletter-drafter`**: The weekly newsletter goes out in Mailchimp. Rebecca described Mailchimp as something she "has, barely used," which suggests the bottleneck is drafting, not the tool itself. This skill produces a Mailchimp-paste-ready newsletter draft from a one-sentence topic prompt, drawing from the Content Library (Doc 04) for program highlights and Doc 01 for tone. Built from scratch; saved to `/mnt/skills/user/clients/little-friends-loft/lfl-weekly-newsletter-drafter/`.

### Bucket C: Month-2 additions (not deployed on day one)

**`lfl-board-report-builder`**: Monthly board report. High effort when it comes around, but monthly frequency (once per month) is below the three-times-a-month threshold the spec uses to justify day-one deployment. I will introduce this in month two once Rebecca is comfortable with the starter set.

**`lfl-late-payment-follow-up`**: Chasing late tuition payments is listed as occasional. A short skill that drafts firm but warm follow-up messages is useful; timing is month two.

### Bucket D: Internal-only skills (never deployed)

`idea-to-app`, `expert-audit`, `backend-audit`, `frontend-audit`, `app-deploy`, `find-skills`, `skill-creator`, and any skill that references my Cloudinary account, my personal `/mnt/skills/user/` paths, or my `jbp` CLI. None of these are deployed to any client account.

---

## 2. Skill packaging and customization

| Skill | Customization tier | What changes | ZIP filename |
|---|---|---|---|
| `stop-slop` | None | No changes; zipped straight from master | `stop-slop-v[NEEDS CONFIRMATION].zip` |
| `lfl-voice-check` | Full fork | Built for this client; SKILL.md references Doc 01 path | `lfl-voice-check-v1.0.zip` |
| `lfl-brightwheel-message-drafter` | Full fork | Built from scratch; references Docs 01 and 07 | `lfl-brightwheel-message-drafter-v1.0.zip` |
| `lfl-inquiry-tour-responder` | Full fork | Built from scratch; references Docs 03 and 07 | `lfl-inquiry-tour-responder-v1.0.zip` |
| `lfl-weekly-newsletter-drafter` | Full fork | Built from scratch; references Docs 01 and 04 | `lfl-weekly-newsletter-drafter-v1.0.zip` |

**Client prefix rule:** Every forked skill carries the `lfl-` prefix. This prevents me from accidentally overwriting a client customization when I push a master library update.

**Reference stripping before delivery:** Before zipping any of the four custom skills, I verify that no SKILL.md or supporting file contains a path that exists only on my system (for example, `/mnt/skills/user/[other-skill]/`, my personal Cloudinary credentials, or my `jbp` CLI). Each skill must run entirely within the context the client has in their Claude account.

---

## 3. Deployment mechanics

[NEEDS CONFIRMATION: Is Rebecca's account on the Pro plan or the Team plan? The operator default is to push Team for any client with more than one user. Little Friends Loft has Rebecca, three lead teachers (Tova, Carla, Dana), aftercare (Yael), and potentially Linda the bookkeeper. If the answer is Team, I deploy at the organization level; the org owner provisions all five skills once and all team members see them in their Shared section. If the answer is Pro (Rebecca only), she uploads each skill individually to her own account. The plan tier also changes update propagation in Section 5 below.]

### Path A: Team plan (recommended)

1. Confirm code execution is enabled at the account level: Settings > Capabilities > Code execution.
2. Confirm the organization owner has enabled the Skills feature at the org level: Organization settings > Skills. This step is required before any user can upload or use skills. Do not skip it; a missing org-level toggle is the most common reason skills do not appear.
3. Navigate to Organization settings > Skills > Upload.
4. Upload each of the five ZIPs in turn. Toggle each on immediately after upload.
5. Confirm that Rebecca and at least one other user see the skills in their Shared section before ending the call.
6. Run a test invocation for at least two skills in the client's Project (see test prompts in Section 4 below).

### Path B: Pro plan (Rebecca only)

1. Confirm code execution is enabled: Settings > Capabilities > Code execution.
2. Confirm Skills is enabled: Settings > Capabilities > Skills.
3. Navigate to Settings > Capabilities > Skills > Upload.
4. Upload each of the five ZIPs. Toggle each on.
5. Run a test invocation for at least two skills in the client's Project.

### Failure checks to run before the call

Two most common failure modes:

- **Code execution not enabled.** The skill uploads but does nothing. Verify this first, before uploading anything.
- **Org-level Skills not enabled (Team plan only).** The upload option will not appear. The org owner must enable it in Organization settings first. I have walked into deployment calls assuming this was done, only to find it was not.

---

## 4. Skill reference sheet

The deliverable for Rebecca is a one-page reference sheet titled "Little Friends Loft: your Claude skills." After the deployment call, I also upload `your-claude-skills.md` to the client's Claude Project knowledge base so Rebecca can retrieve it from inside any conversation.

---

**Little Friends Loft: your Claude skills**
*Prepared 2026-06-09. Updated version lives in your Claude Project knowledge base.*

---

**Skill 1: Stop slop (v[NEEDS CONFIRMATION])**

What it does: Removes AI writing tells from any prose you paste in. Fixes hedging language, hollow openers, and phrases that sound like a corporate announcement.

How to invoke: Paste a draft and say "run stop-slop on this" or "clean up the AI writing patterns in this."

Example: "Run stop-slop on this week's newsletter draft before I paste it into Mailchimp."

Updated: [date of deployment]

---

**Skill 2: LFL voice check (v1.0)**

What it does: Reviews any pasted text against the Little Friends Loft Brand Voice Guide and rewrites the sections that break the rules.

How to invoke: "Voice check this."

Example: "Voice check this Brightwheel message before I send it to the Twos families."

Updated: [date of deployment]

---

**Skill 3: LFL Brightwheel message drafter (v1.0)**

What it does: Drafts a Brightwheel parent message or daily classroom update from a short prompt. Pulls from the FAQ Bank so factual answers to common parent questions are already baked in. Produces a draft for your review; does not send.

How to invoke: "Draft a Brightwheel message" or "Write today's classroom update for [room name]."

Example: "Draft a Brightwheel update for the Threes room. Today they did spring planting and had a visitor from the library."

Updated: [date of deployment]

---

**Skill 4: LFL inquiry and tour responder (v1.0)**

What it does: Drafts a first-reply email to a tour inquiry using the FAQ Bank and Sales Process Map. Covers common questions (availability, age ranges, tuition, daily schedule) and includes a next step pointing the family toward Sign-Up Genius. Produces a draft for Rebecca to review and send.

How to invoke: "Draft an inquiry response" or "Reply to this tour request."

Example: "Draft a response to this email from a family asking about spots for a 2-year-old starting in September."

Updated: [date of deployment]

---

**Skill 5: LFL weekly newsletter drafter (v1.0)**

What it does: Produces a Mailchimp-paste-ready newsletter draft from a one-sentence topic prompt. Draws from the Content Library for program highlights and follows the Brand Voice Guide for tone.

How to invoke: "Draft this week's newsletter" or "Generate a newsletter draft."

Example: "Draft this week's newsletter. Focus on the end-of-year celebration and the summer program registration deadline."

Updated: [date of deployment]

---

### Deployment log entry

The following block goes into `/mnt/skills/user/clients/little-friends-loft/deployment-log.md` after the deployment call. Fill in the bracketed placeholders at that time.

```
[DATE OF DEPLOYMENT CALL]: Initial deployment

- stop-slop v[NEEDS CONFIRMATION] (universal, no customization)
- lfl-voice-check v1.0 (custom; references /projects/little-friends-loft/01-brand-voice-guide.md)
- lfl-brightwheel-message-drafter v1.0 (custom; references Docs 01 and 07)
- lfl-inquiry-tour-responder v1.0 (custom; references Docs 03 and 07)
- lfl-weekly-newsletter-drafter v1.0 (custom; references Docs 01 and 04)

Plan tier: [Pro / Team (fill at deployment)]
Provisioned by: [individual upload / org owner (fill at deployment)]
Test invocations run: [yes / no (confirm on call)]
Skills tested live: [list the two skills tested]
Next review: [DATE + 90 DAYS] (quarterly per I15)

Month-2 skills queued:
- lfl-board-report-builder v1.0 (planned)
- lfl-late-payment-follow-up v1.0 (planned)
```

**Client-tracker entry after deployment:**

```
Skills deployed: 5
Last skill deployment: [DATE OF DEPLOYMENT CALL]
Skills pending: lfl-board-report-builder (month 2), lfl-late-payment-follow-up (month 2)
```

---

## 5. Update propagation

When I update a skill in my master library, updates reach this client through one of two paths depending on plan tier.

**Path 1 (Team plan, org-provisioned):** I rebuild the ZIP from my updated master, re-upload to Organization settings > Skills. All users on the Little Friends Loft team receive the update automatically because shared skills push to all recipients. No action required from Rebecca.

**Path 2 (Pro plan, individual upload):** I rebuild the ZIP, send it to Rebecca with a short note explaining what changed. Rebecca re-uploads and replaces the old version. I track which version she has in the deployment log.

**Client-specific forks (all four `lfl-*` skills):** These diverge from any future master skill I might build in the same category. I maintain them at `/mnt/skills/user/clients/little-friends-loft/` and update them independently. When I update my master voice-check or newsletter skill, I manually review whether the `lfl-` fork needs the same change. I do not merge master changes blindly into a fork.

---

## 6. Maintenance and retirement

The quarterly audit (fully specified in I15) checks each deployed skill for three things: is it still being used, is it still working, and is there a newer version?

For Little Friends Loft, the quarterly check should also ask whether the month-2 skills (`lfl-board-report-builder`, `lfl-late-payment-follow-up`) are ready to deploy, and whether expanding to teacher seats (Tova, Carla, Dana, Yael) under a Team plan makes sense.

If Brightwheel changes its message interface or Mailchimp changes its paste format, the relevant skill will need a patch. I will catch this through the quarterly audit or through a support request from Rebecca when she notices something not working as expected.

**Retirement path:** When I deprecate a skill, I notify Rebecca, ship the replacement, and ask her (or the org owner under a Team plan) to delete the old version from the account. I do not leave broken skills sitting in the account.

---

## Operator runbook

The following steps, in order, are how I produce and stand up this deployment. Steps that require action inside the client's Anthropic account are marked [OPERATOR ACTION].

**Step 1: Review the recurring task list (5 minutes).** I reviewed the automation spec (I11) and the operations profile. Signals for skill candidates: daily Brightwheel messages, weekly newsletter, ongoing inquiries and tour scheduling. Those three tasks, plus the two universals, make the five-skill starter set. The board report and late-payment follow-up are month-two additions (monthly and occasional frequency, respectively).

**Step 2: Map to skill inventory (5 minutes).** Bucket B is empty; Little Friends Loft is a service business with no existing library match. Bucket C requires three new custom builds. Bucket D exclusions confirmed; no internal builder tools go to the client.

**Step 3: Confirm the starter set (5 minutes).** Five skills: stop-slop, lfl-voice-check, lfl-brightwheel-message-drafter, lfl-inquiry-tour-responder, lfl-weekly-newsletter-drafter. Ranked by time-to-first-value: Brightwheel messages (daily use), newsletter (weekly use), inquiry response (ongoing use), voice check and stop-slop (every piece of content). Five is within the three-to-six ceiling.

**Step 4: Package each skill (5-15 minutes per skill).**

- `stop-slop`: copy folder from `/mnt/skills/user/stop-slop/`, zip as `stop-slop-v[version].zip`.
- `lfl-voice-check`: build in `/mnt/skills/user/clients/little-friends-loft/lfl-voice-check/`, set SKILL.md version to 1.0, zip as `lfl-voice-check-v1.0.zip`.
- `lfl-brightwheel-message-drafter`: build in `/mnt/skills/user/clients/little-friends-loft/lfl-brightwheel-message-drafter/`, zip as `lfl-brightwheel-message-drafter-v1.0.zip`.
- `lfl-inquiry-tour-responder`: build in `/mnt/skills/user/clients/little-friends-loft/lfl-inquiry-tour-responder/`, zip as `lfl-inquiry-tour-responder-v1.0.zip`.
- `lfl-weekly-newsletter-drafter`: build in `/mnt/skills/user/clients/little-friends-loft/lfl-weekly-newsletter-drafter/`, zip as `lfl-weekly-newsletter-drafter-v1.0.zip`.

Before zipping any custom skill: verify that no SKILL.md or supporting file contains a reference to my personal file paths, Cloudinary credentials, or the `jbp` CLI. Each skill must be self-contained in the client's Claude context.

**Step 5: Upload to the client's Claude account on a shared call.**

[OPERATOR ACTION: Before uploading anything, confirm code execution is enabled in Rebecca's account: Settings > Capabilities > Code execution.]

[OPERATOR ACTION: If Team plan, confirm the organization owner has enabled Skills at the org level: Organization settings > Skills. If Skills is not enabled at the org level, stop and ask the owner to enable it before proceeding. This cannot be done by a standard user.]

[OPERATOR ACTION: Upload each of the five ZIP files through Organization settings > Skills (Team plan) or Settings > Capabilities > Skills (Pro plan). Toggle each skill on immediately after upload.]

[OPERATOR ACTION: Run a live test invocation with Rebecca on the call. Suggested test prompts: (1) "Draft a Brightwheel update for the Pre-K room. Today Dana's class worked on self-portraits and the spring mural." (2) "Draft a reply to a family asking about openings for a 3-year-old starting in October." If a skill does not trigger, check whether the description field in SKILL.md matches how Rebecca phrases the request; revise and re-upload if needed.]

**Step 6: Build the reference sheet (10 minutes).** Fill in the Canva template from the five skill entries in Section 4 above. Export as PDF titled "Little Friends Loft: your Claude skills."

**Step 7: Deliver the reference sheet and upload to the Project knowledge base.**

[OPERATOR ACTION: Upload `your-claude-skills.md` to the Little Friends Loft Claude Project knowledge base so Rebecca can retrieve it from inside any conversation.]

Email the PDF to Rebecca at the same time.

**Step 8: Log deployment (3 minutes).** Fill in the deployment log block from Section 4 (plan tier, who provisioned, which skills were tested live, date). Save to `/mnt/skills/user/clients/little-friends-loft/deployment-log.md`. Update the client-tracker entry: skills deployed count, last deployment date, skills pending.

---

## Operator must do (cannot be generated)

The following steps require action inside the client's Anthropic account or another system. None of them can be produced as file content.

- [ ] Confirm code execution is enabled in Rebecca's Claude account (Settings > Capabilities > Code execution).
- [ ] If Team plan: confirm the org owner has enabled Skills at the organization level (Organization settings > Skills). This must happen before any upload; the upload option does not appear otherwise.
- [ ] Upload `stop-slop-v[version].zip` and toggle on.
- [ ] Upload `lfl-voice-check-v1.0.zip` and toggle on.
- [ ] Upload `lfl-brightwheel-message-drafter-v1.0.zip` and toggle on.
- [ ] Upload `lfl-inquiry-tour-responder-v1.0.zip` and toggle on.
- [ ] Upload `lfl-weekly-newsletter-drafter-v1.0.zip` and toggle on.
- [ ] If Team plan: confirm all team seat holders see the skills in their Shared section before ending the call.
- [ ] Run a live test invocation for at least two skills with Rebecca watching. Adjust skill descriptions and re-upload if a skill fails to trigger.
- [ ] Upload `your-claude-skills.md` to the Little Friends Loft Claude Project knowledge base.
- [ ] Fill in and save the deployment log entry at `/mnt/skills/user/clients/little-friends-loft/deployment-log.md`.
- [ ] Update the client-tracker entry: skills deployed, versions, deployment date, month-2 queue.

**Open items before any of the above can proceed:**

- [NEEDS CONFIRMATION: Pro or Team plan? The operator default is Team for any client with more than one user. Little Friends Loft has Rebecca, Tova, Carla, Dana, Yael, and potentially Linda. If Team, the org-level Skills enablement step is required and changes both the upload path and update propagation model.]
- [NEEDS CONFIRMATION: Current master version of stop-slop. Required for the ZIP filename and reference sheet entry.]
