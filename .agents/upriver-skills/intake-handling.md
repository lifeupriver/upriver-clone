---
name: intake-handling
description: Use when reviewing the client intake submission at `/clients/<slug>/intake`, or when wiring `intake.json` into the fixes plan or clone agent prompt. Covers reading findingDecisions, parsing pageWants, validating referenceSites, and locking the scope so it becomes the irreversible signal that engagement is committed.
metadata:
  version: 1.0.0
---

# Handling client intake

The intake is the asynchronous handoff between the audit (which Upriver produces) and the rebuild (which the client commits to). It captures, in writing, which findings the client wants fixed, what they wish each page did better, which sites they want us to look at, and what scope tier they are buying. Without a locked intake, the rebuild is a guessing game; with one, every downstream agent prompt has the client's intent baked in.

The intake schema lives in `packages/core/src/types/intake.ts`. The form is rendered by `IntakeForm.tsx` inside the audit report's `next-steps.astro` route. Submissions land in `clients/<slug>/intake.json`. The operator views and locks the submission at `clients/<slug>/intake` in the dashboard.

## When to apply this

- Reviewing the client's intake submission before kicking off the rebuild.
- Wiring `intake.json` into `fixes plan`, `clone`, or `improve` agent prompts.
- Triaging a finding the client marked `discuss` and deciding what to bring to the call.
- Translating a `pageWants` free-text answer into a clone-agent or improvement-layer instruction.
- Validating reference sites the client uploaded.
- Locking the scope and firing the ops handoff.

## What the intake captures

`ClientIntake` has four meaningful fields plus metadata:

- **`findingDecisions: Record<findingId, 'fix' | 'skip' | 'discuss'>`.** Every audit finding the client saw on `findings.astro` gets a tri-state decision. Defaults are not allowed -- the client must mark each one. A finding without a decision is a UX bug; the form blocks submission until every finding is marked.
- **`pageWants: Record<pageSlug, string>`.** Per-page free text, answering "what do you wish this page did better?" Optional per page. Lengths range from one sentence ("hero feels too corporate") to a paragraph. Verbatim, not summarized.
- **`referenceSites: string[]`.** URLs the client uploaded as "I want my site to feel like this." Zero to ten allowed; more than three are usually noise.
- **`scopeTier: 'polish' | 'rebuild' | 'rebuild-and-content'`.** A single radio: which package the client is buying. Drives downstream pipeline budget (polish runs only `fixes apply`; rebuild runs `clone`; rebuild-and-content adds `improve --apply-content-plan`).

Plus metadata: `version`, `submittedAt`, `updatedAt`. The version is pinned so future schema changes can read old submissions; submission timestamps drive the irreversible lock.

## Decision rules

- **`fix` is in scope by default.** Every `fix` finding goes into `fixes-plan-scope.md` automatically when the operator runs `upriver fixes plan`. No further triage needed; the client said yes, it ships.
- **`discuss` flags need a 15-minute call before commit.** A `discuss` is the client saying "I am not sure about this one." That is a signal, not an objection. Schedule a 15-minute call before the project kicks off, walk the finding once, then update the decision to `fix` or `skip` and re-lock the intake. Do not silently move `discuss` items into scope -- the client did not ask for that.
- **`skip` items file to `## Skipped` in the fixes-plan-scope doc.** They are not deleted from the audit (the audit is the source of truth for what was found), but they are quarantined so the rebuild agents do not act on them. The skipped section is a defensive record: when the client later says "why did you not fix the canonical issue?" the answer is "you marked it skip on April 28; here is the screenshot."
- **A finding the client never saw is not in scope.** This includes findings the audit produced but the form did not render (e.g., findings on a page the client did not click into). When the form is rendered server-side, every finding visible at lock time is the universe of decisions; anything added after the lock requires a re-intake.

## Translating pageWants into agent prompts

The free-text `pageWants[slug]` is the most important input to the clone agent and the improvement-layer agents. Verbatim is fine -- the client's words are usually clearer than any paraphrase. The pattern in `clone.ts:buildAgentPrompt` is:

```
The client said about this page: "{pageWants[slug]}"

Treat this as the highest-priority constraint after fidelity. If it conflicts
with the original site's structure, flag the conflict in your output and
propose two alternatives.
```

That last sentence is the load-bearing one. Clients sometimes say things that fight the fidelity goal -- e.g., "make the hero feel less corporate" on a page whose original hero is the only good thing about the site. The clone agent must not silently abandon fidelity to chase the want; it must render the conflict to the operator. The pattern: make the change, capture the diff, flag in the PR description, let the operator decide.

For improvement-layer agents, `pageWants` is consulted at track entry. The copy track reads it before rewriting any sentence on that page. The conversion track reads it before moving any CTA. If the want conflicts with the skill's recommendation, the want wins and the skill output records "honored client want over default skill recommendation: {want}."

When a `pageWants` entry is empty, the agent prompt omits the block entirely -- do not paste "the client did not provide guidance" because that wastes tokens and biases the agent toward neutrality.

## Reference site usage

Reference sites are uploaded as URLs. The rule is **browse them once during the design-brief stage; do NOT auto-clone**.

- During design brief generation, an operator (or `upriver design-brief`) reads each reference site's homepage and records what is being referenced -- typography, color treatment, hero structure, copy voice, image style. The output is a one-paragraph note per reference appended to `design-brief.md`.
- The clone agent does not receive reference URLs in its prompt by default. Cloning a reference site is out of scope; the original site is the source of truth for structure and copy. References inform the design tokens and the typography track in the improvement layer, not the clone.
- If the client says "make my homepage look exactly like reference site #2," that is a `pageWants` entry, not a reference. Treat it as a clone-conflict (see above) and surface it for explicit operator decision.

Validate references at submission time: each URL must resolve to a 200, must not be the client's own domain (defeats the purpose), and must not be more than ten in count. Failures are surfaced to the client at form submission, not silently dropped.

## Locking the scope

Locking is **one click, irreversible**. Once locked:

- `intake.json` is marked `locked: true` and the lock timestamp is recorded.
- `fixes-plan-scope.md` is regenerated from `findingDecisions` automatically.
- The operator dashboard surfaces a green "Scope locked" badge.
- The ops handoff fires: a Slack/email notification to the operator that the engagement is now committed.
- The intake form on the live audit report is replaced with a "Thanks, your scope is locked" panel; further edits require operator action.

The lock is the signal that the engagement is real. Before the lock, the audit report is a sales artifact -- a prospect can read, decide, and walk away. After the lock, it is a project kickoff -- contracts assumed signed, scope committed, downstream work scheduled.

If the client needs to change something after locking (a finding decision, a `pageWants` entry, a reference site), the operator manually unlocks via the dashboard, the client edits, and re-locks. Each unlock-edit-relock cycle is logged to `intake.history.json` so there is an audit trail of what changed and when.

Never auto-unlock. Never let the client edit a locked intake. The friction is the feature -- if the client is editing scope after lock, the operator should know about it.

## Failure modes

### The intake submission is malformed

`intake.json` fails JSON parse, or `version` is unknown, or a required field is missing. The dashboard shows an error panel pointing at the file; the operator either fixes it by hand (the file is human-readable) or asks the client to resubmit. The downstream `fixes plan` and `clone` commands refuse to run against a malformed intake; they fail fast with an error pointing at this skill.

### A finding referenced in `findingDecisions` no longer exists in the audit

This happens when the audit was re-run between intake submission and scope lock and a finding was dropped (the underlying issue was fixed in the source site, or the audit pass was tuned). The dashboard's lock action surfaces the orphan: "3 findings in your decisions are no longer in the audit -- review or discard." The operator decides; the client is not bothered with it.

### `pageWants` references a page that does not exist

Same shape as above. Most often it is a typo in the slug. The operator fixes it manually and re-locks.

### The client never submits the intake

The audit report still works as a sales artifact -- the prospect is reading it. After 14 days without submission, the operator follow-up email fires (this is `upriver report nudge <slug>`, in the roadmap). After 30 days, the audit report token can be revoked; the prospect needs to re-engage to get a fresh link.

## What this skill does NOT cover

- **The intake form's UX.** That is `IntakeForm.tsx` and its design choices -- not in scope here.
- **How to write `pageWants` for a client.** Clients write their own; we honor their words, not coach them.
- **The contract / billing handoff after lock.** That is operator workflow outside the CLI.
- **Re-auditing after lock.** Audits are immutable post-lock; if a fresh audit is needed, it is a new engagement with a new slug.
