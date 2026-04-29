---
name: improvement-layer
description: Use when running `upriver improve <slug>`, configuring `skill-matrix.yaml`, or critiquing the second-round improvement pass that runs after the clone. Covers how to apply each track in the bundled matrix (seo, copy, schema, typography, content-strategy, conversion, geo), what counts as "applied" per track, what to leave to the operator, and how to recover when a skill is missing or a track produces no edits.
metadata:
  version: 1.0.0
---

# Upriver improvement-layer methodology

The improvement layer is the second-round pass that runs after `upriver clone` is done and the cloned site verifies. Its purpose is not to fix audit findings (that is `fixes apply`) and not to reach pixel parity with the original (that is `clone-qa`). Its purpose is to make the cloned site **measurably better than the original** along the dimensions our skills library covers.

The layer is orchestrated from `packages/cli/src/commands/improve.ts` and driven by `packages/cli/src/improve/skill-matrix.yaml`. Each entry in the matrix is a "track" that runs one named skill against a target page set and produces a wave of edits.

## When to apply this

- Running `upriver improve <slug>` and reading its output.
- Editing `skill-matrix.yaml` to add, remove, or retarget a track.
- Reviewing a PR opened by the improvement layer and judging whether the changes are "applied" or "drafted but not committed."
- Triaging a failing track (skill missing, agent produced no edits, agent over-edited and broke the page).
- Calibrating the per-track agent prompts when the output drifts.

## The skill matrix

`skill-matrix.yaml` is the single source of truth for which skills run, against which pages, in what order. Tracks run sequentially by default to keep per-page edits coherent (a copy edit followed by a schema edit on the same file should not race). Each track entry has the shape:

```yaml
tracks:
  <track-name>:
    skill: <skill-id-from-registry>
    targets: <page-selector>
    references: [<auxiliary-skill-ids>]   # optional
    output: applied | recommended-only
```

`skill` resolves through the registry in `packages/core/src/skills/registry.ts`. If the entry name does not match a skill there, the run fails fast at startup. `targets` accepts the literal `all-pages`, a comma-separated list of page slugs, or a named selector (`hero`, `services`, `pillar-page-candidates`, `high-intent-pages`) that the matrix loader resolves against the audit package.

The bundled matrix has seven tracks: **seo, copy, schema, typography, content-strategy, conversion, geo**. They run in roughly that order so the foundation (search visibility and copy clarity) is in place before higher-leverage layers (conversion psychology, generative discovery) are applied.

## Per-track expectations

### seo

Skill: `ai-seo`. Targets: `all-pages`. The track audits each page's title, meta description, H1, internal anchor text, image alt text, and on-page keyword cluster, then applies edits in-place. Expect changes to `<title>`, `<meta name="description">`, the page's first H1, image alt attributes, and the body where a keyword cluster is missing. The track does not generate new pages -- that is content-strategy's job. It does not touch schema markup -- that is the schema track's job. If a page already passes the ai-seo skill's checklist, the track records "no changes needed" and moves on.

### copy

Skill: `copywriting`, with `copy-editing` referenced for hygiene. Targets: `hero`, `services`, `about`. The track rewrites weasel copy, hedging, passive voice, banned marketing words, and unproven claims. It preserves the section's intent and any verbatim client-supplied copy (from `intake.pageWants`). It does not touch testimonials, contact info, prices, or anything wrapped in `{/* verbatim */}` blocks. Output is a per-page diff with one paragraph of rationale for any sentence rewritten.

### schema

Skill: `schema-markup`. Targets: `all-pages`. The track injects or upgrades JSON-LD: `LocalBusiness` on the homepage and `/contact`, `Service` on each service page, `FAQPage` where a Q&A section exists, `Event` on event-detail pages, `Review` where testimonials exist with attribution. Existing `<script type="application/ld+json">` blocks are validated and only replaced if they fail. The track never invents data -- if a required field is missing, the schema is omitted and a finding is logged.

### typography

Skill: `impeccable`, with `typography`, `typeset`, and `layout` referenced. Targets: `all-pages`. The track audits modular scale ratio, line-length distribution (target 45-75ch), heading hierarchy stability across pages, font weight coverage, and pairing critique. It edits the design tokens file (`design-tokens.json`) and any per-page Tailwind class overrides. It does not change the font family without operator approval -- font swaps are flagged for review, not applied.

### content-strategy

Skill: `content-strategy`. Targets: `pillar-page-candidates` (resolved from the audit's content-strategy-deep pass). The track proposes new pillar pages and supporting clusters, but does not generate the pages by default -- it writes a `content-plan.md` to `clients/<slug>/improvements/` and stops there. To actually scaffold the pages, the operator runs `upriver improve <slug> --apply-content-plan` once they have reviewed the plan. This is deliberate: net-new pages need client copy approval and cannot be auto-merged.

### conversion

Skill: `page-cro`, with `customer-research` and `form-cro` referenced. Targets: `high-intent-pages` (homepage, services, pricing, contact). The track edits CTA copy, button hierarchy, social proof placement, friction in the primary CTA path, and form field count. Edits are inline and structural -- the track may move a testimonial block above the fold, simplify a form to three fields, or replace a vague CTA with an outcome-anchored one. It does not redesign the page or replace the hero structure; that is a clone concern.

### geo

Skill: `ai-seo`, with the `llm-discoverability` reference subset. Targets: `all-pages`. Distinct from the seo track in two ways: (a) it adds chunk-level TL;DR sentences, structured factoids (year founded, service area, prices), and entity-disambiguating language; (b) it generates or updates `llms.txt` and `llms-full.txt` at the site root. The track does not duplicate the seo track's title/meta edits -- those are upstream. It assumes the seo track has already run.

## What "applied" means

A track has "applied" its skill on a page when **all** of the following are true:

- The page's source files in the cloned site are edited in-place (or the design-tokens file is edited, or a new structured-data block is committed -- whatever the track's mandate covers).
- The diff is committed atomically on a per-track branch named `improve/<track>` with a commit message that names the skill and the affected pages.
- A per-page rationale entry is written to `clients/<slug>/improvements/<track>.json` so the report and the dashboard can render before/after.
- `pnpm --filter @upriver/dashboard run build` passes for the cloned site after the edits land.

A track that produces a recommendation document instead of edits (currently only content-strategy by default) marks `output: recommended-only` in the matrix. Operators can promote those to applied edits with the corresponding `--apply-*` flag.

A track that produces neither edits nor a recommendation document is a failure -- see the "Failure modes" section below.

## Operator-only steps

Some work in this pipeline is deliberately not automated:

- **Merging the per-track PRs.** The improvement layer opens PRs against the cloned site's branch but does not auto-merge. The operator reviews each track's diff -- copy rewrites in particular need a human read.
- **Approving font swaps.** Typography flags font-pairing issues but never swaps the family. The operator either approves a swap (and reruns the track) or accepts the existing pairing.
- **Promoting the content-strategy plan.** New pages are not auto-scaffolded. The operator reads `content-plan.md`, optionally edits it, and runs `--apply-content-plan` when ready.
- **Re-auditing after improvements land.** The improvement layer does not call `upriver audit` again. The operator runs a fresh audit on the improved site to produce before/after scores for the client deck.
- **Sending the "we made it better" client update.** The layer produces the data; the operator sends the email.

If the operator wants a one-shot, it is `upriver improve <slug> --auto-merge --apply-content-plan --reaudit`. That should be reserved for trusted clients on small sites; on first runs always step through manually.

## Failure modes

### A skill referenced in the matrix is missing

Startup validation in `improve.ts` reads the matrix, resolves each skill name through `packages/core/src/skills/registry.ts`, and aborts before any LLM call if a name is unknown. The error names the missing skill and points at `.agents/skills/` (the symlink target). Resolution is one of: add the skill to the symlink set in `.agents/skills/`, change the matrix to reference an existing skill, or remove the track entirely.

### A track produces no edits

There are three benign reasons and one bad one. Benign: the page already passes the skill's checklist (record "no changes needed" and continue), the target selector resolved to zero pages (skip with a warning), or the skill is `recommended-only` and produced a recommendation file (record the file path and continue). Bad: the agent ran, claimed it edited files, but the working tree has no diff. In that case the track is failed, the agent transcript is saved to `clients/<slug>/improvements/<track>.transcript.txt`, and the operator must rerun with `--debug` to inspect.

### A track over-edits and breaks the page

Each track ends with a build check on the cloned site. If the build fails, the track's branch is rolled back to the per-track base commit, the diff is saved to `clients/<slug>/improvements/<track>.failed.diff` for inspection, and the track is reported as failed. Other tracks are not blocked -- they continue from the last good state. Resolution: read the failed diff, decide whether the agent's intent was right but the execution wrong (rerun with a tighter prompt) or the intent was wrong (skip the track for this client and file a TODO).

### Two tracks fight over the same line

The layer runs tracks sequentially to avoid this in practice, but a long-running matrix can still hit it -- e.g., the copy track rewrites a CTA, then the conversion track rewrites it again. Treat the conversion track's edit as authoritative (it ran later, with more context) and resolve via the per-track commit history rather than retrying.

### The matrix targets a page that does not exist in the clone

The matrix loader emits a warning, records the target as skipped, and continues. This is normal early in a project (the homepage exists; the services page does not yet). Do not let the layer block on it.

## What this skill does NOT cover

- **How to write a new skill.** That is `skill-creator` territory; this skill assumes the skill already exists in `.agents/skills/`.
- **How to fix audit findings.** That is `fixes plan` / `fixes apply`. The improvement layer is downstream of those and complementary.
- **How to score the result.** Re-running `upriver audit` is the operator's job (see "Operator-only steps"). The layer surfaces what changed, not whether the change moved the score.
