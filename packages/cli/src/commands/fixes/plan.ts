import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { clientDir } from '@upriver/core';
import type { AuditFinding, AuditPackage } from '@upriver/core';

interface PhasePlan {
  number: number;
  name: string;
  description: string;
  findings: AuditFinding[];
  filesToTouch: string[];
  estimatedEffort: string;
}

const PHASE_DEFINITIONS: Array<{
  name: string;
  description: string;
  match: (f: AuditFinding) => boolean;
  files: string[];
  effort: (count: number) => string;
}> = [
  {
    name: 'Phase 1 — Quick wins',
    description:
      'P0 findings with light effort. Merge these first — they produce visible lift in hours, not days.',
    match: (f) => f.priority === 'p0' && f.effort === 'light',
    files: [
      'src/pages/*.astro',
      'src/layouts/BaseLayout.astro',
      'src/components/astro/Nav.astro',
      'astro.config.mjs',
    ],
    effort: (n) => (n <= 3 ? '2-4 hours' : n <= 6 ? '4-8 hours' : '1-2 days'),
  },
  {
    name: 'Phase 2 — Copy and conversion',
    description:
      'P0 copy findings. Each finding invokes the copywriting skill against the relevant page(s). Reviewer must validate brand voice before merging.',
    match: (f) =>
      f.priority === 'p0' &&
      ['content', 'sales'].includes(f.dimension) &&
      f.effort !== 'light',
    files: [
      'src/content/pages/*.md',
      'src/pages/*.astro',
      'src/components/astro/Hero.astro',
      'src/components/astro/CTASection.astro',
    ],
    effort: (n) => (n <= 2 ? '1-2 days' : n <= 5 ? '3-5 days' : '1-2 weeks'),
  },
  {
    name: 'Phase 3 — Structural SEO and schema',
    description:
      'Medium/heavy P0 and all P1 findings across SEO, schema, links, design, content, and sales. Deploy behind the preview URL before cutting over.',
    match: (f) =>
      (f.priority === 'p0' && ['seo', 'schema', 'links', 'design'].includes(f.dimension) && f.effort !== 'light') ||
      (f.priority === 'p1' && ['seo', 'schema', 'links', 'design', 'content', 'sales'].includes(f.dimension)),
    files: [
      'src/layouts/BaseLayout.astro',
      'src/components/astro/SchemaOrg.astro',
      'src/pages/*.astro',
      'src/content/pages/*.md',
      'src/styles/global.css',
      'public/robots.txt',
      'astro.config.mjs',
    ],
    effort: (n) => (n <= 4 ? '3-5 days' : n <= 10 ? '1-2 weeks' : '2-3 weeks'),
  },
  {
    name: 'Phase 4 — Content build-out',
    description:
      'Missing pages and heavy content work from the content/sales dimensions. Needs client interview answers before starting.',
    match: (f) =>
      ['content', 'sales'].includes(f.dimension) &&
      f.effort === 'heavy' &&
      f.priority !== 'p0',
    files: [
      'src/content/pages/*.md',
      'src/pages/*.astro',
      'src/content/testimonials/*.json',
      'src/content/faqs/*.json',
    ],
    effort: (n) => (n <= 3 ? '1 week' : n <= 8 ? '2-3 weeks' : '4-6 weeks'),
  },
  {
    name: 'Phase 5 — AEO, local, and authority',
    description:
      'AEO, local, backlinks, and competitors findings (P0 and P1). Long-tail work that compounds over months.',
    match: (f) =>
      ['aeo', 'local', 'backlinks', 'competitors'].includes(f.dimension) &&
      (f.priority === 'p0' || f.priority === 'p1'),
    files: [
      'src/content/faqs/*.json',
      'src/content/pages/*.md',
      'public/robots.txt',
      'src/layouts/BaseLayout.astro',
    ],
    effort: (n) => (n <= 3 ? '1 week' : n <= 8 ? '2-4 weeks' : '6-12 weeks'),
  },
];

export default class FixesPlan extends BaseCommand {
  static override description = 'Generate a structured work plan from approved audit findings';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    out: Flags.string({ description: 'Output path (default: clients/<slug>/fixes-plan.md)' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FixesPlan);
    const { slug } = args;
    const dir = clientDir(slug);

    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const pkgPath = join(dir, 'audit-package.json');
    if (!existsSync(pkgPath)) {
      this.error(
        `audit-package.json not found at ${pkgPath}. Run "upriver synthesize ${slug}" first.`,
      );
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as AuditPackage;

    const scopePath = join(dir, 'fixes-plan-scope.md');
    const inScopeIds = readScope(scopePath);
    const allFindings = pkg.findings;

    let selected: AuditFinding[];
    let scopeNote: string;
    if (inScopeIds) {
      selected = allFindings.filter((f) => inScopeIds.has(f.id));
      scopeNote = `Scope document: \`fixes-plan-scope.md\` (${selected.length} of ${allFindings.length} findings signed off).`;
    } else {
      selected = allFindings.filter((f) => f.priority === 'p0' || f.priority === 'p1');
      scopeNote = `No \`fixes-plan-scope.md\` found — defaulting to all P0 + P1 findings (${selected.length} of ${allFindings.length}).`;
      this.warn(scopeNote);
    }

    if (selected.length === 0) {
      this.warn('No findings in scope. Writing an empty plan.');
    }

    const phases = buildPhases(selected);
    const outPath = flags.out ?? join(dir, 'fixes-plan.md');
    writeFileSync(outPath, renderPlan(pkg, scopeNote, phases, selected), 'utf8');

    this.log(`\nWrote ${outPath}`);
    this.log(
      `  ${selected.length} findings across ${phases.filter((p) => p.findings.length > 0).length} phase(s).`,
    );
    for (const p of phases) {
      if (p.findings.length === 0) continue;
      this.log(`  • ${p.name}: ${p.findings.length} finding(s), ${p.estimatedEffort}`);
    }
    this.log(`\nNext: upriver fixes apply ${slug}`);
  }
}

function readScope(path: string): Set<string> | null {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  // If the doc uses section headings, only read the "in scope" section so
  // "## Deferred" items don't land in the plan.
  const sectionMatch = text.match(/##\s+In\s*scope\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  const searchIn = sectionMatch ? sectionMatch[1] ?? text : text;
  const ids = new Set<string>();
  const pattern = /\b([a-z]+-\d{3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(searchIn)) !== null) {
    if (m[1]) ids.add(m[1].toLowerCase());
  }
  return ids;
}

function buildPhases(findings: AuditFinding[]): PhasePlan[] {
  const assigned = new Set<string>();
  const phases: PhasePlan[] = [];
  for (const [i, def] of PHASE_DEFINITIONS.entries()) {
    const matched = findings.filter((f) => def.match(f) && !assigned.has(f.id));
    for (const f of matched) assigned.add(f.id);
    phases.push({
      number: i + 1,
      name: def.name,
      description: def.description,
      findings: matched,
      filesToTouch: def.files,
      estimatedEffort: def.effort(matched.length),
    });
  }
  // Anything not matched lands in a "backlog" phase so nothing is silently dropped
  const leftover = findings.filter((f) => !assigned.has(f.id));
  if (leftover.length > 0) {
    phases.push({
      number: phases.length + 1,
      name: `Phase ${phases.length + 1} — Backlog`,
      description:
        'Findings that did not match an earlier phase. Triage case-by-case before applying.',
      findings: leftover,
      filesToTouch: ['varies'],
      estimatedEffort: leftover.length <= 5 ? '1-2 weeks' : '3-4 weeks',
    });
  }
  return phases;
}

function renderPlan(
  pkg: AuditPackage,
  scopeNote: string,
  phases: PhasePlan[],
  selected: AuditFinding[],
): string {
  const date = new Date().toISOString().slice(0, 10);
  const p0 = selected.filter((f) => f.priority === 'p0').length;
  const p1 = selected.filter((f) => f.priority === 'p1').length;
  const p2 = selected.filter((f) => f.priority === 'p2').length;

  const lines: string[] = [];
  lines.push(`# Fixes plan — ${pkg.meta.clientName}`);
  lines.push('');
  lines.push(`Generated: ${date}`);
  lines.push(`Overall audit score: ${pkg.meta.overallScore}/100`);
  lines.push(`In-scope findings: ${selected.length} (P0 ${p0} / P1 ${p1} / P2 ${p2})`);
  lines.push('');
  lines.push(scopeNote);
  lines.push('');
  lines.push('## How to read this');
  lines.push('');
  lines.push(
    '- Each phase is a set of findings meant to ship together as draft PRs. Phases can overlap in time, but merge order should follow the numbering.',
  );
  lines.push(
    '- `upriver fixes apply <slug>` opens one PR per finding. Use `--parallel` to run independent findings in git worktrees.',
  );
  lines.push(
    '- P0 copy findings (content/sales dimensions) are routed through the copywriting skill at `.agents/skills/copywriting/SKILL.md`.',
  );
  lines.push('');

  for (const phase of phases) {
    if (phase.findings.length === 0) continue;
    lines.push(`## ${phase.name}`);
    lines.push('');
    lines.push(phase.description);
    lines.push('');
    lines.push(`**Findings (${phase.findings.length}):** ${phase.findings.map((f) => f.id).join(', ')}`);
    lines.push('');
    lines.push(`**Estimated effort:** ${phase.estimatedEffort}`);
    lines.push('');
    lines.push('**Files likely touched:**');
    for (const f of phase.filesToTouch) lines.push(`- \`${f}\``);
    lines.push('');
    lines.push('**Findings detail:**');
    lines.push('');
    lines.push('| ID | Priority | Effort | Dimension | Title |');
    lines.push('|----|----------|--------|-----------|-------|');
    for (const f of phase.findings) {
      lines.push(
        `| ${f.id} | ${f.priority.toUpperCase()} | ${f.effort} | ${f.dimension} | ${escapePipes(f.title)} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Scope document');
  lines.push('');
  lines.push(
    'To change what is in scope, edit `fixes-plan-scope.md` (finding IDs one per line or as a checklist) and re-run `upriver fixes plan <slug>`. Absence of the scope doc defaults to all P0 + P1 findings.',
  );
  lines.push('');
  lines.push('## Next steps');
  lines.push('');
  lines.push('1. Review this plan with the client before running `upriver fixes apply`.');
  lines.push('2. `upriver fixes apply <slug>` — sequential PRs.');
  lines.push('3. `upriver fixes apply <slug> --parallel` — concurrent PRs via git worktrees.');
  lines.push(
    '4. Deploy preview to Vercel, then `upriver qa <slug> --preview-url <url>` to verify each finding is resolved.',
  );
  lines.push('');
  return lines.join('\n');
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}
