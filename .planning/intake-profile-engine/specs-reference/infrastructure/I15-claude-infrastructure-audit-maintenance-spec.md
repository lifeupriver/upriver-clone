# Spec I15: Claude Infrastructure Audit and Maintenance Spec

## What This Spec Is

This spec defines the recurring audit and maintenance cadence that keeps the entire Claude infrastructure layer — mine and my clients' — current, correct, and operational. The previous 14 Infrastructure specs describe how to set things up and how to run them day-to-day. This spec describes how to prevent them from rotting. Everything in a Claude setup decays. Skills drift as better ones replace them. MCPs expire. Projects accumulate stale knowledge files. Styles fall out of sync with evolving voice. Memory accumulates entries that no longer reflect current reality. Routines produce output nobody reads. Artifacts that were built around a specific data structure break when that structure changes. Each of these failures is silent. None announces itself. By the time they surface as "why isn't this working?" the drift is usually months deep.

Without this spec, I rely on noticing. With it, I run a structured audit on a defined cadence that surfaces drift before it costs anything. The audit has two halves: one for each client environment I manage, and one for my own Upriver Consulting Project. Both halves use the same underlying dimensions (what to check, what to look for, what to fix) adapted to the context. A proper quarterly audit takes 3-4 hours for my own environment and 30-60 minutes per active client. For the consulting practice at current scale, the whole cadence is manageable. At 10+ clients it becomes a real time commitment and I delegate parts of it to a subcontractor or automation.

This spec is also where I track Anthropic's own product evolution. Anthropic ships meaningful changes to Claude's surface every few weeks. Each change potentially affects the 14 other specs. The audit surfaces drift between what the specs say and what Claude actually does now.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I15 |
| Priority | Critical, build last in the suite because it depends on all other specs existing |
| Total length target | Documented audit cadence with checklists for client and personal environments |
| Time to produce | 2-3 hours initial setup including templated checklists; ongoing audit time is the recurring cost |
| Delivery format | Audit checklists and cadence documented in `my-audit-runbook.md`, per-client audit logs in each client's Project |
| File naming | `my-audit-runbook.md` in the Upriver Consulting Project; per-client audit logs named `[client]-quarterly-audit-YYYY-Qn.md` |
| Prerequisite | I01-I14 all exist (this is the meta-spec over the other 14) |

## When This Document Gets Built

**Triggers:**

- All other Infrastructure specs are drafted or substantially drafted
- I want a defined quarterly rhythm rather than ad-hoc "I should probably check on that" anxiety
- I've noticed drift in at least one area (skill version drift, stale memory, outdated Project knowledge) that would have been caught by an audit

**Blocks:**

- Every other spec in the suite benefits from this existing because the audit is the mechanism that keeps those specs' setups current
- Client retainer commitments ("I'll keep your AI system running smoothly") depend on this audit happening

## Section-by-Section Template

### 1. Audit Cadence

**Weekly (light, ~15 minutes, Monday morning):**

- Read the meta-routine output from I12 (routine health check)
- Glance at client-tracker for anything flagged
- Note any obvious anomalies (client Claude usage spike, failed routine, connector warning)

**Monthly (moderate, ~45 minutes, first Monday of month):**

- Update client-tracker with material changes from the past month
- Re-upload any edited specs to the Upriver Consulting Project per I10
- Spot-check memory entries in my own account (audit for drift per I08)
- Review the routines library for anything producing empty or unread output

**Quarterly (full, ~3-4 hours personal + 30-60 min per active client, first Monday of quarter):**

- Full personal environment audit (Section 3 below)
- Per-client audit (Section 4 below)
- Anthropic product change review (Section 5)
- Spec update pass based on findings

**On material change (as-needed):**

- When Anthropic ships a significant feature or deprecates something
- When I onboard or offboard a client
- When I change my service structure, pricing, or team composition
- When a client's business materially changes (new location, new service, leadership change)

### 2. The Audit Principle

The audit isn't about perfection. It's about catching drift before it compounds. Three rules:

1. **Surface-level review is enough for most things.** Not every spec needs to be re-read every quarter. Most need a "does this still reflect reality? yes/no" check.
2. **Every finding leads to an action or a defer.** "Skill description is stale" leads to either fixing the description or explicitly noting the defer with a date. Nothing stays as an ambiguous "hmm" note.
3. **The audit documents itself.** Every audit produces a dated log file. Six months later I can see what I checked, what I found, what I fixed, what I deferred. This is both a quality tool and a retainer-justification artifact.

### 3. Personal Environment Audit (Quarterly, 3-4 hours)

The full dimensions to check in my own Upriver Consulting setup.

**3.1 Upriver Consulting Project (I10) — 30 minutes**

- Open the Project in claude.ai
- Confirm custom instructions still reflect current state (especially Block D reference pointers)
- Review knowledge base file list; flag any stale or obsolete files
- Ask 5 test questions (from I10 Section 2); confirm answers are current and correctly-cited
- Re-upload any specs edited locally since last audit
- Confirm "Upriver Voice" Style is still saved and current

**3.2 Personal Skills Library (I11) — 45 minutes**

- Walk `/mnt/skills/user/` root
- Every active skill: check SKILL.md frontmatter is standardized, changelog is current, version reflects last material change
- Every `_dev/` skill: decide promote or delete
- Every `_retired/` skill older than 6 months: delete
- Every `clients/[client-slug]/` fork: compare version against master; note divergence
- Update `skill-library-manifest.md` if any changes
- Re-upload manifest to Upriver Consulting Project

**3.3 Personal Routines (I12) — 30 minutes**

- Open Cowork / Scheduled tasks
- For each active routine: has it produced output every expected run this quarter? If not, investigate
- For each output path in Obsidian: are the files actually being read? If a routine is producing content I haven't consumed, pause or retire it
- Review each routine's prompt against current reality; update if my workflow has changed
- Open claude.ai/code/routines; check Claude Code routines
- Update `my-routines-library.md` and re-upload

**3.4 Personal MCP Stack (I13) — 30 minutes**

- Open Settings > Connectors in claude.ai
- For each Tier 1 connector: last used in past 90 days? If not, remove authorization
- Confirm no credentials visible in any claude_desktop_config.json or ~/.claude.json
- Check rotation dates in 1Password for Tier 2/3 credentials; rotate any due
- Grep my public repos for known token patterns (belt-and-suspenders check for leaks)
- Confirm 1Password service account token rotation date (every 180 days)
- Update `my-mcp-stack.md` and re-upload

**3.5 Obsidian Vault (I14) — 45 minutes**

- Run `jbp vault audit` once it exists; until then, manual walk
- Check `01-inbox/_review/` for stuck notes (>7 days)
- Archive daily notes older than 30 days
- Walk `50-reference/` for orphan notes (no incoming or outgoing links); link or delete
- Confirm no credentials anywhere in the vault (grep for common patterns)
- Check backup health: iCloud sync operational, Time Machine up to date
- Update `my-obsidian-integration.md` if structure has shifted

**3.6 Personal Memory and Preferences (I08 applied to me) — 15 minutes**

- Settings > Capabilities > Memory
- Review stored entries; delete any that reflect old state (old pricing, stale client list, abandoned projects)
- Confirm Profile Preferences still reflect current reality
- Confirm "Upriver Voice" Style examples are still the best-quality samples I have

**3.7 Account and Billing — 10 minutes**

- Confirm plan tier is appropriate (Max for current solo work; Team if subcontractors active)
- Review billing for the quarter; note if usage is spiking unexpectedly
- Confirm payment method current
- For Console API (if using per I06): review usage, confirm spending caps still appropriate

**3.8 Cross-Spec Consistency — 15 minutes**

- Quick scan: do the specs still reference each other correctly? (I10's Block D reference pointers, I12's routine list, I13's MCP list, etc.)
- Any spec that references an external product or tool: is that tool still in use? (If Cloudinary is retired as a tool, I13 and related specs need updating)
- Anthropic product changes from Section 5 reflected in affected specs

### 4. Per-Client Audit (Quarterly, 30-60 minutes each)

For every active client, I run a scoped version of the same audit.

**4.1 Client Project (I01) — 10 minutes**

- Confirm Project exists and is correctly configured
- Confirm custom instructions reflect current client state (any major changes? new services? new team members?)
- Confirm knowledge base has current versions of the 18 AI Operating System docs (or the client's scoped subset)
- Ask 2-3 test questions to confirm retrieval quality

**4.2 Deployed Skills (I02) — 10 minutes**

- Open the client's deployment-log at `clients/[client-slug]/deployment-log.md`
- For each deployed skill: still active in their account? Still invoked recently?
- Any skill I've updated the master version of since deployment? Note for client update conversation
- Retire any client-specific skill no longer used

**4.3 Client Routines (I03) — 10 minutes**

- Check client's routines (or ask their designated person to check) — are scheduled tasks running?
- Output files being reviewed?
- Any routine that needs adjustment based on client's evolving work?

**4.4 Client MCPs (I04) — 5 minutes**

- Confirm connectors are still authorized and functional
- Any MCP the client added themselves? Note it in the audit log
- Any MCP that's been inactive? Recommend disconnection

**4.5 Client Claude in Chrome (I05), Claude Code (I06), Artifacts (I09) — 5 minutes**

- Spot-check each relevant surface
- Chrome shortcuts still working?
- Artifacts still producing correct output? Any breaking changes in underlying data structures?

**4.6 Client Access and Governance (I07) — 10 minutes**

- Confirm seat roster matches current team
- Any team member who's left the client? Revoke access immediately
- Confirm plan tier still appropriate
- Review data retention posture against any new compliance requirements

**4.7 Client Styles, Memory, Artifacts (I08, I09) — 5 minutes**

- Styles still current with brand voice evolution
- Memory audited for any team members who want to prune
- Artifacts still correctly connected to their data sources

**4.8 Client Audit Summary**

Every per-client audit produces a dated log in the client's Project:

```markdown
# [Client] Quarterly Audit — YYYY-Qn

**Date:** [date]
**Duration:** [minutes]
**Auditor:** Joshua Brown

## Dimensions reviewed
[checklist from Section 4]

## Findings
- [Finding 1]
- [Finding 2]

## Actions taken during audit
- [Action 1]

## Actions deferred with date
- [Deferred item, deadline]

## Client communication needed
- [Anything the client needs to decide or approve]

## Next audit
[Date]
```

### 5. Anthropic Product Change Review (Quarterly, 30 minutes)

Anthropic ships meaningful product changes on a roughly monthly cadence. The quarterly audit includes a review of what changed in the past three months and what that means for the specs.

**Sources to check:**

- Anthropic's official blog: anthropic.com/news
- Anthropic docs: docs.claude.com (changelog if present)
- Claude support articles: support.claude.com (updated dates)
- Model deprecation announcements

**What to look for:**

- New features that should be incorporated into specs (new connector types, new artifact capabilities, new skill patterns)
- Deprecated features that specs still reference (SSE transport, older model names, retired capabilities)
- Pricing or plan changes that affect I07's tier decision tree
- Model changes (new model shipped, old model retired)

**Output:**

- Dated log entry in `30-operations/anthropic-changes/` (or equivalent)
- Specific spec update candidates flagged
- If a change is material and affects client setups, schedule client-facing communication

**Tier for action:**

- **Tier 1 (immediate):** Deprecation of a feature I or clients rely on; security-related change; breaking change in data format
- **Tier 2 (during this quarter's spec update pass):** New feature that improves existing workflows; updated defaults
- **Tier 3 (note but defer):** Minor UI changes, cosmetic updates, features I'm not using

### 6. Spec Update Pass

After the audit surfaces findings, I do a deliberate spec update pass rather than editing as I go. Batching the updates:

1. Keeps specs internally consistent (update Block D reference pointers once, not every time I touch a spec)
2. Produces a clean changelog entry per spec
3. Forces a re-read which catches tangential drift

**Process:**

- Open each spec flagged for update in Obsidian drafts (`40-specs-drafts/`)
- Apply changes
- Bump version number in frontmatter (if using semver for specs)
- Note changes in changelog section
- Copy polished version to `/mnt/project/`
- Re-upload to Upriver Consulting Project per I10
- Test that the Project returns the updated content on a test query

### 7. The Audit Runbook

The canonical audit runbook lives at `my-audit-runbook.md` in the Upriver Consulting Project. It covers:

- The cadence from Section 1
- The checklists from Sections 3 and 4
- Standard finding templates
- The client audit log template
- Links to relevant specs for each dimension
- Current quarter's focus areas (what I'm paying extra attention to this quarter)

The runbook is updated alongside specs; if a new spec is added to the suite, the audit checklists gain a corresponding dimension.

### 8. Delegation Path

Currently I run all audits myself. As the practice scales, parts become delegable.

**What I can delegate to Megan (admin subcontractor):**

- Pulling basic usage reports
- Checking that routines produced output (yes/no, not judgment)
- Collecting signals to escalate to me
- Maintaining the audit log files

**What I can delegate to Annmarie or a technical subcontractor:**

- MCP connection health checks
- Skill library standardization passes
- Vault hygiene tasks

**What stays with me:**

- Judgment calls (is this skill still worth having? is this routine producing usable output? does this client need plan tier adjustment?)
- Client communication around audit findings
- Spec update decisions
- Anthropic product change interpretation

**Automation candidates:**

- `jbp audit` command that produces a partial automated report (Section 3.5 and 4.1 are good first targets)
- Scheduled Cowork task that runs on the first of each quarter and produces the initial findings draft for me to review
- Ahrefs / Supabase queries that produce the monthly parts of the audit automatically

## How to Build This Document

**Step 1: Confirm I01-I14 all exist.** The audit has nothing to audit if the specs aren't there.

**Step 2: Draft the runbook (90 minutes).** `my-audit-runbook.md` containing the cadence, checklists, finding templates, and links to specs.

**Step 3: Create the folder structure.** `30-operations/quarterly-audits/` in Obsidian for my personal audit logs; `clients/[client-slug]/quarterly-audits/` template for client logs.

**Step 4: Schedule the audits.** First Monday of each quarter on the calendar; monthly first-of-month reminders; weekly Monday meta-routine already in place per I12.

**Step 5: Upload the runbook to the Upriver Consulting Project.**

**Step 6: Run the first audit as the pilot.** Time it. Adjust the runbook based on what was too long, too short, missing, unnecessary.

**Step 7: Document the pilot audit's findings and actions.** This is the first entry in my audit log history.

## Definition of Done

- [ ] `my-audit-runbook.md` exists, is current, and is in the Upriver Consulting Project
- [ ] Quarterly audits are on my calendar for the next 4 quarters
- [ ] Monthly mini-audit is on my calendar recurring
- [ ] Weekly meta-routine from I12 is running
- [ ] First audit has been completed and logged
- [ ] Audit log folder structure exists in Obsidian
- [ ] For each active client, a per-client audit has been run and logged
- [ ] Spec update pass has been completed for any drift found in pilot audit
- [ ] Delegation plan for future scale is documented

## Common Failure Modes

**Failure 1: Audit bloat.** The runbook grows until a quarterly audit takes 8 hours and I dread it. Mitigation: time-box each dimension. If Section 3.1 runs over 30 minutes, I've either drifted badly and need an action plan, or my checklist is too heavy. Either way, finish the checklist at 30 minutes and return to the underlying issue in the spec update pass.

**Failure 2: Audit avoidance.** Quarterly audit falls on a busy week; I skip it. The miss doesn't hurt immediately, so I skip the next one too. Six months in, drift is severe. Mitigation: audit is on calendar with alerts; if I can't do the full audit on the scheduled day, I do a 30-minute minimum version that just runs the meta-routine summary and notes what's deferred.

**Failure 3: Findings without actions.** I list 15 things that need attention and then don't fix any of them. The audit becomes performative. Mitigation: every finding gets categorized immediately — fix now, fix in spec update pass, defer with date, or ignore. No "we'll see."

**Failure 4: Missing Anthropic product changes.** I don't track Anthropic's changelog, the quarterly audit misses a deprecation, something breaks in a client setup and I look like I wasn't paying attention. Mitigation: weekly calendar reminder to glance at anthropic.com/news; monthly to scan Claude support articles for date stamps.

**Failure 5: Client audits that don't produce client value.** I audit a client's setup, find everything fine, write a log file, and don't communicate anything to the client. From their perspective, their retainer paid for invisible work. Mitigation: every client audit produces a brief summary email to the client with "here's what I checked, here's what's healthy, here's what I'd recommend we adjust." Even when nothing's wrong, the visibility earns the retainer.

**Failure 6: Treating the runbook as frozen.** The runbook stops updating because I'm focused on running audits, not refining them. Six audits in, the runbook is stale. Mitigation: every audit ends with "any runbook updates?" as an explicit step. Improvements to the runbook compound.

**Failure 7: Delegation without clear criteria.** I hand audit tasks to Megan but don't define what "flag to me" looks like. She either escalates everything (wasting my time) or nothing (missing real issues). Mitigation: the delegation section above spells out what requires judgment and what doesn't. Judgment stays with me.

**Failure 8: Audit-induced paralysis on spec changes.** I find something, start "fixing" by editing a spec, two hours later I've rewritten three specs and broken internal references. Mitigation: audit findings go in a list, not into spec edits during the audit itself. The spec update pass (Section 6) is a separate, bounded activity.

**Failure 9: Not timing the audit.** The first audit takes 6 hours; I don't time it; the second audit takes 5 hours; I don't notice it's trending down because the checklist got sharper; I never optimize for sustainable cadence. Mitigation: every audit log records duration per section. Trend tracks whether the runbook is improving.

## Full Worked Example: My First Quarterly Audit (Q2 2026)

**Date planned:** First Monday of July 2026 (2026-07-06)

**Scope:**

- Personal environment: full audit per Section 3
- Per-client audit for Audrey's Farmhouse (only active retained client at this point)
- Anthropic product change review for April-June 2026
- Spec update pass based on findings

**Estimated duration:** 4 hours personal + 1 hour Audrey's + 30 min Anthropic review + 1-2 hours spec update pass = ~6-7 hours total. First audit takes longer because the runbook is new; target for subsequent audits is 4-5 hours total.

**Audit log file:** `~/Obsidian/30-operations/quarterly-audits/2026-Q2-audit.md`

**Pre-audit state I expect to find (as of writing, April 2026):**

- Upriver Consulting Project: solid, but some specs not yet loaded (Content Production suite doesn't exist; I10 through I15 loading in progress)
- Personal Skills Library: 13 active skills, some predating the standardized SKILL.md frontmatter format; standardization pass needed
- Personal Routines: 8 active + 1 Claude Code + 2 paused; all running well per meta-routine output
- Personal MCP Stack: 15 Tier 1 connectors authorized; Function Health flagged for possible removal; Supabase token rotation due in ~90 days
- Obsidian Vault: `_review` has ~12 pending notes; some personal/journal content mixing awkwardly with business content in the vault
- Memory: not yet audited this cycle
- Audrey's Farmhouse: deployment per I01 complete; 5 skills deployed; 5 Cowork routines running; 6 connectors authorized; first quarterly audit of their environment has not yet occurred

**Expected findings (educated guess for planning):**

- Skill frontmatter standardization: ~4-5 older skills need updated frontmatter (v1.0 never migrated to the current standard)
- Memory drift: a handful of entries from February/March that reference stale client conversations or experimental ideas that went nowhere
- Function Health: confirm decision to keep in stack or remove
- Audrey's client-tracker entry: may need updating based on Q2 activity
- Anthropic product changes: Q2 likely includes at least one feature ship that affects some spec; I13's Streamable HTTP transport guidance may need reinforcement as SSE deprecates further

**Post-audit actions I anticipate:**

- 4-5 skills updated with standardized frontmatter and re-uploaded manifest
- Memory audit pruning ~5-10 entries
- Spec update pass: likely 2-3 specs with minor edits
- Audrey's audit log file created; email to Audrey's owner summarizing findings and recommendations
- Runbook refined based on pilot experience
- Next audit date confirmed on calendar: first Monday October 2026

**Delegation status:** Solo. No audit delegation until Megan is on a sustained admin retainer, which is Q3+ at earliest.

**Open items for future audits:**

- As Content Production suite gets drafted, C01-C14 specs become part of the audit scope
- As additional clients come online, per-client audits become a bigger time commitment; at 5+ active clients, consider quarterly audits of 2-3 clients per cycle rather than all in one sprint
- `jbp audit` CLI command build targeted for Q3/Q4 2026 to automate Section 3 partially
- Once the Content Production suite is loaded into the Upriver Consulting Project, the knowledge base size approaches or exceeds Claude's documented limits; audit should confirm RAG is still retrieving well at that scale

That's I15 complete. The 15-spec Claude Infrastructure suite is now fully drafted.

Ready to produce the I00 index document summarizing all 15 specs when you say continue, or to make any revisions to specs if you've found things on review.
