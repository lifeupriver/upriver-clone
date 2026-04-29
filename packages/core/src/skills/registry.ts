/**
 * Typed registry of all skills reachable from Upriver agent prompts.
 *
 * Marketing skills are vendored from the `marketingskills-main` source tree and
 * symlinked into `.agents/skills/`. Upriver-internal operational skills live in
 * `.agents/upriver-skills/`. This registry is the single source of truth used
 * by the CLI to validate at startup that every referenced skill resolves to an
 * on-disk file -- catching drift after a `git pull` of marketingskills before
 * the first LLM call burns tokens against a missing path.
 *
 * Roadmap reference: workstream H.3.
 */

/**
 * Workstream identifiers, mirroring `.planning/roadmap/PRODUCT-ROADMAP.md`.
 *
 * - `A` -- branded client audit report
 * - `B` -- client intake portal
 * - `C` -- audit depth + GEO/AEO expansion
 * - `D` -- clone fidelity diff + scoring
 * - `E` -- improvement layer
 * - `F` -- operator GUI
 * - `G` -- efficiency / cache / resume
 * - `H` -- skill catalog & methodology upgrades
 */
export type Workstream = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

/**
 * One row in the skill registry.
 */
export interface SkillEntry {
  /** Reachable skill name; matches the directory under .agents/skills/ or .agents/upriver-skills/. */
  name: string;
  /** Relative path from repo root. */
  path: string;
  /** Short description used by tools and dashboards. */
  description: string;
  /** When this skill should be applied. */
  when: string;
  /** Optional: which workstream introduced or formalized this skill. */
  workstream?: Workstream;
}

/**
 * Marketing skills symlinked under `.agents/skills/`. Each path is a directory
 * containing a `SKILL.md` describing the methodology. The set here mirrors the
 * symlinks present on disk today; expanding the symlink set (workstream H.1)
 * requires adding entries here in the same commit so validation stays in sync.
 */
export const MARKETING_SKILLS: readonly SkillEntry[] = [
  {
    name: 'ai-seo',
    path: '.agents/skills/ai-seo',
    description: 'Apply AI-SEO recommendations across pages -- titles, metas, H1s, internal anchors, and chunk-level structure for generative retrieval.',
    when: 'Improvement-layer SEO and GEO tracks; deep-audit SEO passes; ad-hoc per-page SEO critique.',
    workstream: 'E',
  },
  {
    name: 'copy-editing',
    path: '.agents/skills/copy-editing',
    description: 'Strip weasel words, banned marketing language, hedging, passive voice, and unproven superlatives without changing the section intent.',
    when: 'Clone pass copy hygiene; improvement-layer copy track as a referenced sub-skill.',
    workstream: 'E',
  },
  {
    name: 'copywriting',
    path: '.agents/skills/copywriting',
    description: 'Rewrite hero, services, and about copy to be specific, outcome-anchored, and revenue-framed while preserving section intent.',
    when: 'Improvement-layer copy track; fixes-apply remediation for content findings.',
    workstream: 'E',
  },
  {
    name: 'customer-research',
    path: '.agents/skills/customer-research',
    description: 'Translate interview transcripts and customer language into voice-of-customer copy patterns and objection-handling sequences.',
    when: 'Brand voice guide writing; conversion track as a referenced sub-skill.',
    workstream: 'E',
  },
  {
    name: 'form-cro',
    path: '.agents/skills/form-cro',
    description: 'Reduce friction in form-driven conversion -- field count, label clarity, validation timing, success state.',
    when: 'Conversion track on contact and booking pages; fixes-apply for form-related findings.',
    workstream: 'E',
  },
  {
    name: 'page-cro',
    path: '.agents/skills/page-cro',
    description: 'Critique and edit page-level conversion paths -- CTA hierarchy, social-proof placement, friction in primary action.',
    when: 'Improvement-layer conversion track on high-intent pages; deep-audit conversion-psychology pass.',
    workstream: 'E',
  },
  {
    name: 'schema-markup',
    path: '.agents/skills/schema-markup',
    description: 'Inject and validate JSON-LD structured data: LocalBusiness, Service, FAQPage, Event, Review, Product.',
    when: 'Improvement-layer schema track on all pages; fixes-apply for missing-schema findings.',
    workstream: 'E',
  },
  {
    name: 'seo-audit',
    path: '.agents/skills/seo-audit',
    description: 'Run an SEO audit checklist over a single page or site -- title length, meta description, heading structure, canonicalization, indexability.',
    when: 'Base SEO audit pass; sanity-checking ad-hoc SEO claims.',
    workstream: 'C',
  },
  {
    name: 'site-architecture',
    path: '.agents/skills/site-architecture',
    description: 'Evaluate URL hierarchy, internal-link graph, navigation depth, orphan pages, and pillar/cluster topology.',
    when: 'Deep-audit links and content-strategy passes; rebuild planning before clone.',
    workstream: 'C',
  },
];

/**
 * Upriver-internal operational skills under `.agents/upriver-skills/`. These
 * cover the methodology specific to running Upriver itself -- audit
 * interpretation, interview facilitation, clone fidelity, intake handling, and
 * the improvement layer -- and are not part of the marketingskills bundle.
 */
export const UPRIVER_SKILLS: readonly SkillEntry[] = [
  {
    name: 'audit-methodology',
    path: '.agents/upriver-skills/audit-methodology.md',
    description: 'Methodology for running and interpreting an Upriver audit: 10 dimensions, P0/P1/P2 priority, light/medium/heavy effort, 0-100 scoring.',
    when: 'Running `upriver audit`; deciding which findings ship in the fixes scope; explaining scores to a client.',
    workstream: 'C',
  },
  {
    name: 'brand-voice-guide-writing',
    path: '.agents/upriver-skills/brand-voice-guide-writing.md',
    description: 'How to draft the brand voice guide artifact from interview output, customer research, and audit copy findings.',
    when: 'Producing `brand-voice-guide.md` after the client interview; recalibrating tone before the clone pass.',
    workstream: 'C',
  },
  {
    name: 'client-brief-writing',
    path: '.agents/upriver-skills/client-brief-writing.md',
    description: 'How to write the design brief and project brief that translate audit findings and intake into rebuild instructions.',
    when: 'Generating `design-brief.md` after audit + intake; updating the brief mid-engagement when scope changes.',
    workstream: 'B',
  },
  {
    name: 'clone-visual-fidelity',
    path: '.agents/upriver-skills/clone-visual-fidelity.md',
    description: 'Qualitative 10-point fidelity checklist for reviewing a cloned page against its original -- what to match, what to deliberately change.',
    when: 'Reviewing a clone PR; calibrating the clone agent prompt; judging whether a perceived mismatch is a bug or an improvement.',
    workstream: 'D',
  },
  {
    name: 'interview-facilitation',
    path: '.agents/upriver-skills/interview-facilitation.md',
    description: 'How to run the 90-minute client interview that produces the transcript feeding `process-interview` and the brand voice guide.',
    when: 'Preparing for and running the client interview; processing the transcript into structured outputs.',
    workstream: 'B',
  },
  {
    name: 'qa-standards',
    path: '.agents/upriver-skills/qa-standards.md',
    description: 'QA standards for the cloned site before client preview -- accessibility, link integrity, mobile parity, build cleanliness.',
    when: 'Running `upriver qa`; gating the cloned site for a client preview link.',
    workstream: 'D',
  },
  {
    name: 'improvement-layer',
    path: '.agents/upriver-skills/improvement-layer.md',
    description: 'Methodology for the workstream-E improvement pipeline: per-track expectations, what "applied" means, operator-only steps, failure modes.',
    when: 'Running `upriver improve`; editing `skill-matrix.yaml`; reviewing per-track PRs from the improvement layer.',
    workstream: 'H',
  },
  {
    name: 'clone-fidelity-scoring',
    path: '.agents/upriver-skills/clone-fidelity-scoring.md',
    description: 'How to compute, read, and threshold the quantitative clone-fidelity score: pixel/copy/layout/token sub-scores and the 80-point shippable bar.',
    when: 'Running `upriver clone-fidelity`; deciding whether the clone ships or needs another pass.',
    workstream: 'H',
  },
  {
    name: 'sales-report-narrative',
    path: '.agents/upriver-skills/sales-report-narrative.md',
    description: 'Voice and structure for the audit report executive narrative: tone rules, hero stats, what to omit, the sub-400-word ceiling.',
    when: 'Drafting or editing the report hero; reviewing generated narrative output from `synthesize`.',
    workstream: 'H',
  },
  {
    name: 'intake-handling',
    path: '.agents/upriver-skills/intake-handling.md',
    description: 'How to read and act on `intake.json`: findingDecisions tri-state, pageWants verbatim handling, reference-site validation, scope locking.',
    when: 'Reviewing a client intake submission; wiring intake into `fixes plan` or `clone` agent prompts.',
    workstream: 'H',
  },
];

/**
 * Flat union of every registered skill. Useful for startup validation that
 * walks the registry once and asserts every `path` resolves on disk.
 */
export const ALL_SKILLS: readonly SkillEntry[] = [
  ...MARKETING_SKILLS,
  ...UPRIVER_SKILLS,
];

/**
 * Look up a skill by name. Throws if the name is not in the registry.
 *
 * @param name - The skill name; must match `SkillEntry.name` exactly.
 * @returns The matching `SkillEntry`.
 * @throws Error when the name is not registered.
 */
export function getSkill(name: string): SkillEntry {
  const found = ALL_SKILLS.find((entry) => entry.name === name);
  if (!found) {
    throw new Error(
      `Unknown skill: '${name}'. Known skills: ${ALL_SKILLS.map((s) => s.name).join(', ')}.`,
    );
  }
  return found;
}

/**
 * Boolean lookup for whether a skill is registered. Cheaper than wrapping
 * `getSkill` in a try/catch and intent-revealing at the call site.
 *
 * @param name - The skill name to check.
 * @returns `true` if the name is registered.
 */
export function hasSkill(name: string): boolean {
  return ALL_SKILLS.some((entry) => entry.name === name);
}
