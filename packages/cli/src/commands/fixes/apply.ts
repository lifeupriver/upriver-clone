import { spawn, execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import type { AuditFinding, AuditPackage } from '@upriver/core';
import { loadAuditPackage, resolveScaffoldPaths } from '../../scaffold/template-writer.js';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';
const COPYWRITING_SKILL_PATH = '.agents/skills/copywriting/SKILL.md';

interface FindingRun {
  finding: AuditFinding;
  branch: string;
}

interface FindingResult {
  finding: AuditFinding;
  branch: string;
  ok: boolean;
  prUrl?: string;
  error?: string;
}

export default class FixesApply extends BaseCommand {
  static override description = 'Apply approved audit fixes via headless Claude Code agent';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    parallel: Flags.boolean({
      description: 'Apply independent fixes concurrently via git worktrees',
    }),
    concurrency: Flags.integer({
      description: 'Max parallel fix agents (implies --parallel)',
      default: 3,
    }),
    finding: Flags.string({
      description: 'Apply only a single finding by ID (e.g. seo-003). Repeatable.',
      multiple: true,
    }),
    'no-pr': Flags.boolean({ description: 'Skip opening draft PRs' }),
    'dry-run': Flags.boolean({ description: 'Print the agent prompts without running Claude Code' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FixesApply);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(repoDir)) {
      this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);
    }

    const pkg = loadAuditPackage(clientDir);
    const planPath = join(clientDir, 'fixes-plan.md');
    if (!existsSync(planPath) && !flags['dry-run']) {
      this.error(`fixes-plan.md not found at ${planPath}. Run "upriver fixes plan ${slug}" first.`);
    }
    const planText = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
    const planIds = parsePlanFindingIds(planText);

    let findings = pkg.findings.filter((f) => planIds.has(f.id));
    if (flags.finding && flags.finding.length > 0) {
      const filter = new Set(flags.finding.map((s) => s.toLowerCase()));
      findings = findings.filter((f) => filter.has(f.id.toLowerCase()));
    }
    if (findings.length === 0) {
      this.warn('No findings matched the plan. Nothing to apply.');
      return;
    }

    // Sort by priority so P0s land first
    findings.sort((a, b) => priorityOrder(a) - priorityOrder(b));

    if (!flags['dry-run']) ensureGitInitialized(repoDir);

    const useParallel = (flags.parallel || flags.concurrency > 1) && !flags['dry-run'] && findings.length > 1;
    const concurrency = useParallel ? Math.max(1, flags.concurrency) : 1;

    this.log(`\nApplying ${findings.length} fix(es) for "${slug}" into ${repoDir}`);
    this.log(
      `  Mode: ${useParallel ? `parallel x${concurrency} (git worktrees)` : 'sequential'}`,
    );

    const queue: FindingRun[] = findings.map((f) => ({
      finding: f,
      branch: `fix/${f.id}`,
    }));
    const results: FindingResult[] = [];

    const runWorker = async (): Promise<void> => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const result = await this.applyOne({
          finding: item.finding,
          branch: item.branch,
          slug,
          clientDir,
          repoDir,
          pkg,
          useWorktree: useParallel,
          dryRun: flags['dry-run'] === true,
          openPr: flags['no-pr'] !== true && !flags['dry-run'],
        });
        results.push(result);
      }
    };

    const workers = Array.from({ length: concurrency }, () => runWorker());
    await Promise.all(workers);

    const ok = results.filter((r) => r.ok).length;
    const failed = results.length - ok;
    this.log(`\nFixes complete. ${ok} ok, ${failed} failed.`);
    for (const r of results) {
      const tag = r.ok ? '✓' : '✗';
      this.log(`  [${tag}] ${r.finding.id} — ${r.finding.title}${r.prUrl ? ` → ${r.prUrl}` : ''}`);
      if (!r.ok && r.error) this.log(`        ${r.error}`);
    }
  }

  private async applyOne(opts: {
    finding: AuditFinding;
    branch: string;
    slug: string;
    clientDir: string;
    repoDir: string;
    pkg: AuditPackage;
    useWorktree: boolean;
    dryRun: boolean;
    openPr: boolean;
  }): Promise<FindingResult> {
    const { finding, branch, slug, clientDir, repoDir, pkg, useWorktree, dryRun, openPr } = opts;
    const prompt = buildAgentPrompt({ finding, slug, pkg, clientDir });

    if (dryRun) {
      this.log(`\n--- [dry-run] ${finding.id} branch=${branch} ---`);
      this.log(prompt);
      return { ok: true, finding, branch };
    }

    const workCwd = useWorktree ? createWorktree(repoDir, branch) : repoDir;
    if (!useWorktree) {
      try {
        execSync(`git checkout -B ${branch}`, { cwd: workCwd, stdio: 'pipe' });
      } catch (err) {
        return { ok: false, finding, branch, error: `git checkout failed: ${(err as Error).message}` };
      }
    }

    try {
      this.log(`\n→ ${finding.id}: launching Claude Code (branch ${branch}, cwd ${workCwd})`);
      await runClaudeCode(prompt, workCwd);

      appendChangelogEntry(workCwd, finding);

      try {
        execSync('git add -A', { cwd: workCwd, stdio: 'pipe' });
        const msg = `fix(${finding.dimension}): ${finding.id} — ${finding.title}`.slice(0, 160);
        execSync(`git commit -m ${shellQuote(msg)}`, { cwd: workCwd, stdio: 'pipe' });
      } catch {
        // nothing to commit
      }

      let prUrl: string | undefined;
      if (openPr) prUrl = await openDraftPr(workCwd, branch, finding);

      return { ok: true, finding, branch, ...(prUrl ? { prUrl } : {}) };
    } catch (err) {
      return {
        ok: false,
        finding,
        branch,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (useWorktree) {
        try {
          execSync(`git worktree remove --force ${shellQuote(workCwd)}`, { cwd: repoDir, stdio: 'pipe' });
        } catch {
          // best-effort
        }
      }
    }
  }
}

function parsePlanFindingIds(text: string): Set<string> {
  const ids = new Set<string>();
  const pattern = /\b([a-z]+-\d{3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m[1]) ids.add(m[1].toLowerCase());
  }
  return ids;
}

function priorityOrder(f: AuditFinding): number {
  if (f.priority === 'p0') return 0;
  if (f.priority === 'p1') return 1;
  return 2;
}

function buildAgentPrompt(args: {
  finding: AuditFinding;
  slug: string;
  pkg: AuditPackage;
  clientDir: string;
}): string {
  const { finding, slug, pkg, clientDir } = args;
  const isCopyFix =
    finding.priority === 'p0' && ['content', 'sales'].includes(finding.dimension);
  const affectedList =
    finding.affected_pages && finding.affected_pages.length > 0
      ? finding.affected_pages.map((u) => `- ${u}`).join('\n')
      : finding.page
        ? `- ${finding.page}`
        : '- (all relevant pages — read audit-package.json siteStructure.pages)';

  const skillBlock = isCopyFix
    ? `This is a P0 copy finding. Before editing any copy, read and apply the copywriting skill:

1. \`./${COPYWRITING_SKILL_PATH}\` — copywriting methodology and framework.
2. \`./.agents/product-marketing-context.md\` — brand voice and audience (the skill auto-loads this).

When writing replacement copy, defer to brand voice rules in \`product-marketing-context.md\`. Every new headline and block must pass the skill's conversion checklist: specific over vague, active voice, customer language, one idea per section.`
    : `Read \`./CLAUDE.md\` and \`./.agents/product-marketing-context.md\` before editing. For any copy changes, keep voice and tone consistent with those files.`;

  return `You are applying a single audit fix to the Astro 6 hybrid site at \`./\` for ${pkg.meta.clientName}.

## Finding
- ID: ${finding.id}
- Dimension: ${finding.dimension}
- Priority: ${finding.priority.toUpperCase()}
- Effort: ${finding.effort}
- Title: ${finding.title}

### Description
${finding.description}

### Why it matters
${finding.why_it_matters}

### Recommendation
${finding.recommendation}

### Affected pages
${affectedList}

## Required reading
${skillBlock}

## Source files for context
- Audit package: \`${resolve(clientDir, 'audit-package.json')}\`
- Scraped page JSON: \`${resolve(clientDir, 'pages')}/\`
- Screenshots: \`${resolve(clientDir, 'screenshots', 'desktop')}/\`

## Task

1. Scope your changes to exactly this finding. Do not refactor unrelated files or fix other findings in the same PR.
2. Read only the files needed to make the change. If the finding references affected pages, start there.
3. Make the change. Use existing design tokens from \`src/styles/global.css\` (\`brand-*\`, \`ink-*\`, \`font-display\`, \`font-sans\`, \`radius-button\`, \`radius-card\`) — never introduce hardcoded hex colors.
4. Reuse existing components in \`src/components/astro/\` (Hero, CTASection, TestimonialCard, Footer, Nav, ContactForm) before adding new ones.
5. Append an entry to \`CHANGELOG.md\` under \`## [Unreleased]\` describing what you changed and referencing \`${finding.id}\`. The CLI appends a one-line marker after you finish; your bullets go above that.
6. Verify the build: run \`pnpm install --silent\` once if \`node_modules\` is missing, then \`pnpm build\` (or \`pnpm exec astro check\` if the full build fails for environment reasons). The change must compile.

## Constraints
- Do not edit files outside \`src/\`, \`public/\`, \`CHANGELOG.md\`, \`src/content/\`.
- Do not modify \`src/styles/global.css\` unless the finding is a P0 design token issue.
- Do not touch \`src/pages/admin/\`.
- No changes to dependencies or \`astro.config.mjs\` unless the finding explicitly requires it.

When done, print a single line: \`fix(${finding.dimension}): ${finding.id} — <one-sentence summary of the change>\`.
`;
}

function runClaudeCode(prompt: string, cwd: string): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const args = [
      '--print',
      '--permission-mode',
      'acceptEdits',
      '--allowed-tools',
      'Read,Edit,Write,Bash,Glob,Grep',
    ];
    const child = spawn(CLAUDE_BIN, args, {
      cwd,
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env },
    });

    child.stdin.write(prompt);
    child.stdin.end();

    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`claude exited with code ${code}`));
    });
  });
}

function ensureGitInitialized(repoDir: string): void {
  if (existsSync(join(repoDir, '.git'))) return;
  execSync('git init -b main', { cwd: repoDir, stdio: 'pipe' });
  try {
    execSync('git config user.email "upriver@lifeupriver.com"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "Upriver Bot"', { cwd: repoDir, stdio: 'pipe' });
  } catch {
    // ignore
  }
  execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
  try {
    execSync('git commit -m "Initial scaffold from upriver"', { cwd: repoDir, stdio: 'pipe' });
  } catch {
    // empty
  }
}

function createWorktree(repoDir: string, branch: string): string {
  const dir = join(repoDir, '..', '.worktrees', branch.replace(/[/]/g, '_'));
  execSync(`mkdir -p ${shellQuote(join(repoDir, '..', '.worktrees'))}`, { stdio: 'pipe' });
  execSync(`git worktree add -B ${branch} ${shellQuote(dir)} HEAD`, {
    cwd: repoDir,
    stdio: 'pipe',
  });
  return resolve(dir);
}

function appendChangelogEntry(repoDir: string, finding: AuditFinding): void {
  const path = join(repoDir, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const line = `- ${date} fix(${finding.dimension}): \`${finding.id}\` — ${finding.title}`;
  if (!existsSync(path)) {
    writeFileSync(path, `# Changelog\n\n## [Unreleased]\n${line}\n`, 'utf8');
    return;
  }
  const text = readFileSync(path, 'utf8');
  if (text.includes('## [Unreleased]')) {
    const updated = text.replace(/## \[Unreleased\][^\n]*\n/, (m) => `${m}${line}\n`);
    writeFileSync(path, updated, 'utf8');
  } else {
    appendFileSync(path, `\n## [Unreleased]\n${line}\n`, 'utf8');
  }
}

async function openDraftPr(
  repoDir: string,
  branch: string,
  finding: AuditFinding,
): Promise<string | undefined> {
  try {
    execSync(`git push -u origin ${branch}`, { cwd: repoDir, stdio: 'pipe' });
  } catch {
    return undefined;
  }
  try {
    const title = `fix(${finding.dimension}): ${finding.id} — ${finding.title}`.slice(0, 100);
    const body = `Auto-generated by \`upriver fixes apply\`.

## Finding
- **${finding.id}** (${finding.priority.toUpperCase()}, ${finding.effort} effort, ${finding.dimension})
- ${finding.title}

## Why it matters
${finding.why_it_matters}

## Recommendation
${finding.recommendation}

Review for brand voice and visual fidelity before merging. Run \`upriver qa\` against the preview URL to verify this finding is resolved.`;
    const out = execSync(
      `gh pr create --draft --base main --head ${branch} --title ${shellQuote(title)} --body ${shellQuote(body)}`,
      { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return out.toString('utf8').trim().split(/\s+/).pop();
  } catch {
    return undefined;
  }
}

function shellQuote(s: string): string {
  if (!/[^\w@%+=:,./-]/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
