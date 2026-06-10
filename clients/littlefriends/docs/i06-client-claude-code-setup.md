# Client Claude Code setup
[NEEDS CONFIRMATION: client's display/legal name] (referred to below as "JCC" based on "JCC IT" in the engagement notes)
Prepared by Joshua Brown, Upriver Consulting
Document I06 | 2026-06-09

---

## Part 1: Configuration reference

### 1. Decision tree outcome

**Question 1: Does the client have a developer, ops engineer, or technical lead on their team?**

No. The director is non-technical. Linda handles bookkeeping. There is no in-house technical collaborator. I provide the technical setup during the engagement, with handoff to JCC IT at close.

Decision tree ends here. Claude Code is not provisioned for this client. I use my own Claude Code install for all work in this engagement. The client benefits from Claude Code indirectly, the same way they benefit from any tool I use, but no one on the client side opens a terminal.

**Outcome:** Skip. Not applicable for this engagement.

**Future triggers that would reopen this spec:**
- Client hires a developer, ops engineer, or technically capable admin
- JCC IT requests hands-on Claude Code access for ongoing site maintenance after engagement handoff
- A pipeline built during or after this engagement requires programmatic API calls that fall outside Cowork routines (see Section 5)

Next scheduled review: 2026-09-09 (quarterly per I15)

---

### 2. Who gets access, and at what level

Not applicable for this engagement (no technical user; see decision tree in Section 1).

---

### 3. Install walkthrough

Not applicable for this engagement (no technical user; see decision tree in Section 1).

---

### 4. Repo-level configuration with CLAUDE.md

Not applicable for this engagement (no technical user; see decision tree in Section 1). If a technical user is added in a future phase, I will author a CLAUDE.md at the root of the relevant repo before their first Claude Code session.

---

### 5. API access via Console (separate product)

Not provisioned for this engagement. No current pipeline requirement and no technical user to own a Console account.

Two profile gaps require confirmation if this changes:

[NEEDS CONFIRMATION: monthly API spending cap to set if/when a pipeline requires direct API access. Profile notes caps are "not yet established." The owner has flagged concern about unknown or forgotten subscriptions, so a conservative cap at 3-5x projected usage should be agreed in writing before any key is created.]

If a future automation (for example, a server-side lead-gen pipeline or event-driven processing workload) requires direct API calls, I will return to this section and follow the full Console provisioning workflow: client creates their own Console account at console.anthropic.com, adds a payment method, creates a named API key with a spending cap, and stores the key in a secrets manager. The client's Claude.ai subscription does not cover API usage. These are separate billing products. Pricing as of April 2026 is approximately $1/$5 per million tokens for Haiku 4.5, $3/$15 for Sonnet 4.6, and $5/$25 for Opus 4.6 (input/output); verify current pricing at provisioning time.

---

### 6. MCP servers inside Claude Code

Not applicable for this engagement (no technical user; see decision tree in Section 1).

---

### 7. Skills in Claude Code

Not applicable for this engagement (no technical user; see decision tree in Section 1).

---

### 8. Claude Code reference document

This file is the record for this engagement. It documents the decision tree outcome and the client-tracker entry below. When a future trigger fires, this file will be updated with install date, CLAUDE.md locations, MCP servers, skills, API key names and caps (never values), and rotation schedule.

**Client-tracker entry:**

```
Claude Code: Not provisioned (no technical user)
API access: Not provisioned (no current pipeline requirement; spend caps not yet established)
Revisit triggers:
  - If client hires a developer, ops engineer, or technical admin
  - If JCC IT requests hands-on Claude Code access after engagement handoff
  - If any automation pipeline requires direct API calls outside Cowork routines
Next review: 2026-09-09 (quarterly per I15)
```

---

## Operator runbook

Steps I perform to stand this up, in order.

**Step 1: Walk the decision tree (completed)**
Reviewed the client profile. Question 1: does the client have a developer, ops engineer, or technical lead? No. Director is non-technical; Linda handles bookkeeping; no in-house technical collaborator. Decision tree ends at Question 1. Outcome documented in Section 1 above.

**Step 2: Confirm plan and OS**
Not applicable for this engagement. No install target exists. If a technical user is added in a future phase, I confirm their plan (Pro, Max, or Team) and OS (macOS 13+, Linux, or Windows with WSL2) before booking an install call.

**Step 3: Install call**
Not applicable for this engagement. If triggered in the future, I schedule a 30-minute shared-screen session, run the native installer inside the user's terminal, authenticate against their Anthropic account, and run `claude doctor` to confirm a clean environment.

**Step 4: Create CLAUDE.md**
Not applicable for this engagement. If triggered, I author the five-block file (project description, commands, architecture, conventions, things to avoid) and commit it to the root of the relevant repo before the technical user's first session.

**Step 5: Configure MCPs in Claude Code**
Not applicable for this engagement. If triggered, I mirror relevant MCPs from the client's Claude.ai environment (I04) into their Claude Code install, matching MCPs to where the technical user will actually use them. GitHub, Supabase, and Vercel belong in Claude Code; Gmail and Calendar do not.

**Step 6: Install skills**
Not applicable for this engagement. If triggered, I determine whether audit skills (from I02) should be installed at user scope (`~/.claude/skills/`) or project scope (`.claude/skills/` inside the repo), based on whether the technical user will run audits themselves.

**Step 7: Provision API access**
Not applicable for this engagement. If triggered in the future, see Section 5 for the full provisioning workflow. Confirm the spending cap amount with the client in writing before creating any key. API keys always go into a secrets manager, not into source code or environment files that touch version control.

**Step 8: File the reference document**
[OPERATOR ACTION: upload this file (`i06-client-claude-code-setup.md`) to the client's Claude Project knowledge base so it sits alongside I01 through I05.]

**Step 9: Update client-tracker**
Add the client-tracker entry from Section 8 to the tracker, noting not-applicable fields explicitly so a future team member does not have to re-derive the decision.

---

## Operator must do (cannot be generated)

Because this engagement is a skip, the list is short. Items marked conditional apply only if a future trigger reopens this spec.

**Required now:**
- [ ] [OPERATOR ACTION: upload this file to the client's Claude Project knowledge base inside the client's Anthropic account.]

**Conditional on future triggers only:**
- [ ] [OPERATOR ACTION: if API access is provisioned, create the Console account and add a payment method at console.anthropic.com inside the client's own Anthropic account, not Upriver's.]
- [ ] [OPERATOR ACTION: confirm the agreed spending cap with the client in writing before creating any API key, given the owner's stated concern about untracked subscription costs.]
- [ ] [OPERATOR ACTION: create the API key inside the client's Console account with the agreed spending cap applied at creation time. Copy the key immediately; the Console shows it only once.]
- [ ] [OPERATOR ACTION: if Claude Code is installed for a future technical user, complete the OAuth authentication step in the browser on their machine. This requires their Anthropic credentials and cannot be scripted.]
