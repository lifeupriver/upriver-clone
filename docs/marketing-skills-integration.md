# Marketing skills integration

The Upriver CLI orchestrates a fixed workflow; the nine installed [marketingskills](https://github.com/lifeupriver/marketingskills) provide the domain methodologies that make each step high-quality. This doc is the map between the two: which command triggers which skill, what the skill contributes, what Upriver layers on top, and how to keep skills current.

## Introduction

Upriver is opinionated about _workflow_ (discover → scrape → audit → synthesize → brief → interview → scaffold → clone → fix → QA → launch) but deliberately _not_ opinionated about methodology. The methodology lives in skills. This keeps the CLI small, the skills reusable outside Upriver, and the engagement playbook upgradeable without touching Upriver code.

Every command that does judgment-driven work reads a skill. Every audit pass cites the skill that shaped its rules. Where the skill covers 90% of what Upriver needs, Upriver ships as-is; where a skill needs situational framing (client context, an Upriver-specific convention), the extension lives here — not in the skill — so upstream updates apply cleanly.

Two rules govern this setup:

1. **Skills are read-only.** Do not edit files under `.agents/skills/*` — they are symlinks into `marketingskills-main/` and will be overwritten by `git pull`. Upriver-specific operational knowledge goes in `.agents/upriver-skills/` instead.
2. **Extensions are documented here, not in the skill.** If Upriver needs the copywriting skill to defer to a client's `product-marketing-context.md`, that expectation is declared in this document and wired into the agent prompt that invokes the skill. The skill itself stays vanilla.

## Skill × command matrix

| Skill | Primary command | Secondary commands | Upriver extensions |
|-------|-----------------|--------------------|--------------------|
| `seo-audit` | `upriver audit` (seo pass) | `upriver qa` | Findings are structured to Upriver's P0/P1/P2 + light/medium/heavy model and scored via `scoreFromFindings`. |
| `copywriting` | `upriver clone`, `upriver fixes apply` (P0 copy findings) | `upriver synthesize` (voice draft) | Skill reads `.agents/product-marketing-context.md` auto-loaded per client. Clone pass invokes the skill once per page. |
| `copy-editing` | `upriver clone` | `upriver fixes apply` | Clone agent leaves inline `{/* copy-edit: <category> — ... */}` markers when it chooses not to fix a pattern; reviewer triages before merge. |
| `page-cro` | `upriver audit` (sales pass, design pass) | `upriver fixes apply` | CRO findings emit as audit findings with dimension `sales` or `design`. |
| `form-cro` | `upriver audit` (sales pass) | `upriver fixes apply` | Contact form UX and conversion findings flow through the sales dimension. |
| `schema-markup` | `upriver audit` (schema pass) | `upriver scaffold` (JSON-LD components) | Scaffold template includes a `SchemaOrg.astro` component that fills from `audit-package.json`. |
| `site-architecture` | `upriver audit` (links pass) | `upriver scaffold`, `upriver fixes apply` | Nav generation in `scaffold` uses the architecture signals from the site-map. |
| `ai-seo` | `upriver audit` (aeo pass) | `upriver fixes apply` | AEO findings map to the `aeo` audit dimension. |
| `customer-research` | `upriver interview-prep`, `upriver process-interview` | `upriver synthesize` (brand voice draft) | Interview guide template and transcript processing defer to the skill's discovery framework. |

## Per-skill detail

### seo-audit

- **Command that invokes it:** `upriver audit` (the SEO pass in `packages/audit-passes/src/seo/index.ts`).
- **Methodology the skill provides:** crawlability → technical foundations → on-page → content quality priority order; canonical/robots/sitemap checks; heading hierarchy; thin content thresholds; analytics detection; HTTPS enforcement.
- **Upriver extensions:**
  - Findings are built via the `finding(dimension, priority, effort, title, description, recommendation, opts)` helper so they normalize into `AuditFinding` objects.
  - Priority mapping: "blocking ranking" issues → P0; "weakens but not blocking" → P1; "cleanup" → P2.
  - Scores computed deterministically (100 - 15×P0 - 7×P1 - 3×P2, floored at 0) so the QA delta is comparable across runs.
  - Analytics detection list is fixed to `gtag(`, `google-analytics`, `googletagmanager`, `plausible.io`, `umami` — add to `ANALYTICS_PATTERNS` if adding a vendor.

### copywriting

- **Command that invokes it:** `upriver clone` (per-page agent prompt), `upriver fixes apply` (only for P0 findings in `content` or `sales` dimensions).
- **Methodology the skill provides:** audience → page purpose → offer → proof → CTA; specific over vague; active voice; customer language over company language; one idea per section; benefits over features.
- **Upriver extensions:**
  - The agent prompt instructs the skill to auto-load `.agents/product-marketing-context.md` — that file is written by `upriver synthesize` from `audit-package.json` + interview transcript. The skill's vanilla behavior already looks for this file, but Upriver guarantees it exists before invoking the skill.
  - Clone and fixes prompts explicitly forbid introducing hardcoded hex colors or editing design tokens so the skill's copy work stays within the design system.
  - Fixes apply prompt passes the finding's `why_it_matters` and `recommendation` verbatim — the skill uses these as the problem statement for its rewrite.

### copy-editing

- **Command that invokes it:** `upriver clone` (after the copywriting pass on each page).
- **Methodology the skill provides:** scan for passive voice, buried value props, weak CTAs, hedging, vague claims, unproven superlatives; rewrite or annotate.
- **Upriver extensions:**
  - Inline marker format `{/* copy-edit: <category> — <one-line note> */}` with a fixed category set: `passive`, `buried-value`, `weak-cta`, `hedging`, `vague`, `unproven`. The clone agent prompt mandates this exact form so reviewers can grep for markers and the build never fails.
  - Markers are a review checkpoint, not a commit requirement. A page with unresolved markers is not mergeable.

### page-cro

- **Commands that invoke it:** `upriver audit` (sales and design passes consult it for conversion-related patterns), `upriver fixes apply` for P0 conversion findings.
- **Methodology the skill provides:** value prop clarity, social proof placement, friction reduction, scroll depth, primary-action hierarchy.
- **Upriver extensions:**
  - CRO findings are emitted through the audit dimensions (sales/design) rather than a dedicated `cro` dimension, so they score alongside other findings in the same area.
  - Fixes applied via `upriver fixes apply` must not edit files outside `src/`, `public/`, `CHANGELOG.md`, `src/content/` — this prevents the skill from recommending infrastructure-level changes the rebuild can't absorb.

### form-cro

- **Commands that invoke it:** `upriver audit` (sales pass) for form UX findings, `upriver fixes apply` for form-related fixes.
- **Methodology the skill provides:** field count, error handling, progressive disclosure, inline validation, success states, trust signals.
- **Upriver extensions:**
  - Contact form on the scaffolded template is a single component (`src/components/astro/ContactForm.astro`) that writes to Supabase (`contact_submissions` table). Form-CRO findings that require structural changes must preserve this Supabase contract.

### schema-markup

- **Commands that invoke it:** `upriver audit` (schema pass) for missing/malformed JSON-LD, `upriver scaffold` for component generation.
- **Methodology the skill provides:** type selection (LocalBusiness, FAQ, Review, Service, Event); required vs. recommended properties; nesting rules; validation via Google's Rich Results Test.
- **Upriver extensions:**
  - The scaffold template ships a `SchemaOrg.astro` component that accepts structured data and renders `<script type="application/ld+json">`. Findings that add schema types add entries to this component, not to page-level inline scripts.
  - Required schema types by vertical are encoded in the audit pass — missing `LocalBusiness` on a service business is always P0; missing `Event` schema is P1 unless the business runs events.

### site-architecture

- **Commands that invoke it:** `upriver audit` (links pass) for IA findings, `upriver scaffold` for nav generation.
- **Methodology the skill provides:** top tasks, primary nav item rules (5-7 items, label clarity, depth), orphan page detection, internal linking patterns.
- **Upriver extensions:**
  - Scaffold's `generateNav` function derives nav from `siteStructure.navigation.primary` if present, otherwise from top pages by URL depth. The skill's "primary nav should be the top 5-7 tasks" heuristic is captured in this fallback behavior.
  - Links pass flags any nav item whose destination returns a non-2xx status (broken nav is P0).

### ai-seo

- **Commands that invoke it:** `upriver audit` (aeo pass).
- **Methodology the skill provides:** direct-answer headlines, question-matched content, citation-friendly copy, LLM-scrape-friendly HTML (no critical content in JS-only renders), FAQ coverage for ambient answer engines.
- **Upriver extensions:**
  - The aeo dimension is always scored lightly on first audit — most client sites score in the 40-60 range here. This is expected. AEO wins compound over months post-launch, not during the rebuild.
  - AEO fixes that require new pages (e.g. a dedicated Q&A page) lane into the content-build-out phase of the fixes plan, not the quick-wins phase.

### customer-research

- **Commands that invoke it:** `upriver interview-prep` (builds the interview guide), `upriver process-interview` (extracts structured data from the transcript), `upriver synthesize` (brand voice draft step leans on the skill's ICP framework).
- **Methodology the skill provides:** ICP definition, jobs-to-be-done, voice-of-customer mining from reviews/testimonials/interviews, generative vs. evaluative research distinctions.
- **Upriver extensions:**
  - The interview is fixed at 90 minutes with the agenda documented in the Upriver `interview-facilitation` skill at `.agents/upriver-skills/interview-facilitation.md`. The customer-research skill provides the question types; Upriver provides the time budget and order.
  - Transcript processing feeds back into `brand-voice-guide.md` — the skill's output is translated into voice guide fields (tone, keywords, banned words, sample headlines).

## Keeping skills current

The `marketingskills-main/` directory is a working copy of the upstream [`marketingskills`](https://github.com/lifeupriver/marketingskills) repo. Skills ship as a set; Upriver doesn't pin individual skill versions.

### If installed as a plain clone

```bash
cd marketingskills-main
git pull origin main
cd ..
```

The symlinks in `.agents/skills/` pick up the updates automatically — no re-linking needed.

### If installed as a git submodule

```bash
git submodule update --remote .agents/marketingskills
```

(Upriver ships as a plain clone by default; if you've converted to a submodule, the path will be `.agents/marketingskills` instead of `marketingskills-main`. Update the symlink targets accordingly.)

### After updating

1. Run the skill validator from the marketing-skills repo:
   ```bash
   ./marketingskills-main/validate-skills.sh
   ```
2. Run the Upriver typecheck and a smoke test against a known client (usually `audreys`) to verify nothing in the agent prompts references a skill method that moved or renamed.
3. Skim `marketingskills-main/VERSIONS.md` or the release notes — if a skill introduced a new argument or moved its trigger phrases, update the invoking agent prompt in `packages/cli/src/commands/*.ts` to match.
4. Commit the updated SHA (for submodule) or bump the clone (for plain checkout) so team members pull the same revision.

### Pinning a specific version

If a skill update breaks a prompt and you can't fix it immediately, pin:

- **Plain clone:** `cd marketingskills-main && git checkout <sha>`.
- **Submodule:** `cd .agents/marketingskills && git checkout <sha> && cd - && git add .agents/marketingskills && git commit -m 'pin marketingskills to <sha>'`.

File an issue in the marketingskills repo describing the break so the next release fixes it and you can unpin.

## Adding a new skill to the workflow

When a new marketing skill is released and Upriver wants to adopt it:

1. Symlink it: `ln -s ../../marketingskills-main/skills/<skill-name> .agents/skills/<skill-name>`.
2. Decide which Upriver command invokes it. Edit the corresponding file in `packages/cli/src/commands/` and add a read-this line to the agent prompt.
3. Add a row to the skill × command matrix above and a per-skill detail section.
4. If the skill introduces a new audit dimension, add a pass under `packages/audit-passes/src/<dim>/` and register it in `packages/cli/src/commands/audit.ts`'s `ALL_PASSES`.
5. Bump Upriver's minor version and note the integration in the repo's CHANGELOG.

## Skill conflicts and precedence

If two skills could apply to the same task (e.g. both `copywriting` and `page-cro` have opinions on a hero rewrite), the invoking agent prompt decides. Rule of thumb:

- Structural decisions (what sections exist, what CTAs sit where) → `page-cro` wins.
- Language decisions (what words are on the screen) → `copywriting` wins.
- Post-hoc cleanup → `copy-editing`.

This precedence is documented in the clone and fixes-apply agent prompts — when in doubt, read those prompts, not the skills themselves.
