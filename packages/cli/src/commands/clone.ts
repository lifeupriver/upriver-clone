import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import type { AuditPackage, SitePage } from '@upriver/core';
import { loadAuditPackage, resolveScaffoldPaths } from '../scaffold/template-writer.js';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';
const COPYWRITING_SKILL_PATH = '.agents/skills/copywriting/SKILL.md';
const COPY_EDITING_SKILL_PATH = '.agents/skills/copy-editing/SKILL.md';

export default class Clone extends BaseCommand {
  static override description = 'Run Claude Code headless agent to visually clone the site page by page';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    page: Flags.string({ description: 'Clone a single page by URL or path (e.g. "/" or "/about")' }),
    concurrency: Flags.integer({ description: 'Max parallel page agents', default: 3 }),
    'no-pr': Flags.boolean({ description: 'Skip opening draft PRs' }),
    'no-worktree': Flags.boolean({ description: 'Run in the main repo working tree (serial only)' }),
    'dry-run': Flags.boolean({ description: 'Print the agent prompts without running Claude Code' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Clone);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(repoDir)) this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);

    const pkg = loadAuditPackage(clientDir);

    // Verify required skills exist (clone agent prompts reference them)
    const repoCwd = process.cwd();
    const copySkill = join(repoCwd, COPYWRITING_SKILL_PATH);
    const editSkill = join(repoCwd, COPY_EDITING_SKILL_PATH);
    if (!existsSync(copySkill) || !existsSync(editSkill)) {
      this.warn(
        `Required skills not found at ${COPYWRITING_SKILL_PATH} and/or ${COPY_EDITING_SKILL_PATH}. ` +
          'The clone agent will fail without them.',
      );
    }

    let pages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);
    if (flags.page) {
      const target = normalizePath(flags.page);
      pages = pages.filter((p) => normalizePath(p.slug) === target || normalizePath(p.url) === target);
      if (pages.length === 0) this.error(`No page matched "${flags.page}". Try "/" or "/about".`);
    }

    if (pages.length === 0) this.error('No pages found in audit-package.json siteStructure.pages.');

    this.log(`\nCloning ${pages.length} page(s) for "${slug}" into ${repoDir}`);

    const useWorktrees = !flags['no-worktree'] && !flags['dry-run'] && pages.length > 1;
    if (!flags['dry-run']) ensureGitInitialized(repoDir);

    const concurrency = useWorktrees ? Math.max(1, flags.concurrency) : 1;
    const queue = [...pages];
    const results: PageResult[] = [];

    const runWorker = async (): Promise<void> => {
      while (queue.length > 0) {
        const page = queue.shift();
        if (!page) break;
        const result = await this.clonePage({
          page,
          slug,
          clientDir,
          repoDir,
          pkg,
          useWorktree: useWorktrees,
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
    this.log(`\nClone complete. ${ok} ok, ${failed} failed.`);
    for (const r of results) {
      this.log(`  [${r.ok ? '✓' : '✗'}] ${r.page.slug || '/'} ${r.prUrl ? `→ ${r.prUrl}` : ''}`);
      if (!r.ok && r.error) this.log(`        ${r.error}`);
    }
  }

  private async clonePage(opts: ClonePageOpts): Promise<PageResult> {
    const { page, slug, clientDir, repoDir, pkg, useWorktree, dryRun, openPr } = opts;
    const branch = `clone/${pageSlugForBranch(page)}`;
    const prompt = buildAgentPrompt({ page, slug, pkg, clientDir });

    if (dryRun) {
      this.log(`\n--- [dry-run] page=${page.slug || '/'} branch=${branch} ---`);
      this.log(prompt);
      return { ok: true, page, branch };
    }

    const workCwd = useWorktree ? createWorktree(repoDir, branch) : repoDir;
    if (!useWorktree) {
      try {
        execSync(`git checkout -B ${branch}`, { cwd: workCwd, stdio: 'pipe' });
      } catch (err) {
        return { ok: false, page, branch, error: `git checkout failed: ${(err as Error).message}` };
      }
    }

    try {
      this.log(`\n→ ${page.slug || '/'}: launching Claude Code (branch ${branch}, cwd ${workCwd})`);
      await runClaudeCode(prompt, workCwd);

      appendChangelogEntry(workCwd, page);

      try {
        execSync('git add -A', { cwd: workCwd, stdio: 'pipe' });
        execSync(`git commit -m ${shellQuote(`clone(${page.slug || '/'}): visual port + copy pass`)}`, {
          cwd: workCwd,
          stdio: 'pipe',
        });
      } catch {
        // nothing to commit
      }

      let prUrl: string | undefined;
      if (openPr) {
        prUrl = await openDraftPr(workCwd, branch, page);
      }

      return { ok: true, page, branch, ...(prUrl ? { prUrl } : {}) };
    } catch (err) {
      return {
        ok: false,
        page,
        branch,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (useWorktree) {
        try {
          execSync(`git worktree remove --force ${shellQuote(workCwd)}`, { cwd: repoDir, stdio: 'pipe' });
        } catch {
          // best-effort cleanup
        }
      }
    }
  }
}

interface ClonePageOpts {
  page: SitePage;
  slug: string;
  clientDir: string;
  repoDir: string;
  pkg: AuditPackage;
  useWorktree: boolean;
  dryRun: boolean;
  openPr: boolean;
}

interface PageResult {
  ok: boolean;
  page: SitePage;
  branch: string;
  prUrl?: string;
  error?: string;
}

function buildAgentPrompt(args: {
  page: SitePage;
  slug: string;
  pkg: AuditPackage;
  clientDir: string;
}): string {
  const { page, slug, pkg, clientDir } = args;
  const path = normalizePath(page.slug || page.url);
  const pageFile = path === '/' ? 'src/pages/index.astro' : `src/pages${path}.astro`;
  const screenshot = resolve(clientDir, 'screenshots', 'desktop', `${slug}.png`);
  const pageScreenshot = resolve(
    clientDir,
    'screenshots',
    'desktop',
    `${pageFileSlug(page)}.png`,
  );
  const markdownFile = resolve(clientDir, 'pages', `${pageFileSlug(page)}.json`);
  const ctas = page.ctaButtons.map((c) => `- ${c.text} → ${c.href}`).join('\n') || '- (none captured)';
  const headings = page.headings.map((h) => `- h${h.level}: ${h.text}`).join('\n') || '- (none captured)';

  return `You are cloning the page \`${path}\` for ${pkg.meta.clientName} into the existing Astro 6 hybrid site at \`./\`.

## Required reading (read these first, in order)
1. \`./CLAUDE.md\` — repo rules and brand voice constraints.
2. \`./.agents/product-marketing-context.md\` — audience, offer, voice. Both skills below auto-load this.
3. The copywriting skill at \`./.agents/skills/copywriting/SKILL.md\`. Apply its framework when porting copy.
4. The copy-editing skill at \`./.agents/skills/copy-editing/SKILL.md\`. Run its passes after the page is built.

## Source material
- Astro page to edit (create if missing): \`${pageFile}\`
- Firecrawl screenshot of the live page (desktop): \`${pageScreenshot}\` (fallback: \`${screenshot}\`)
- Scraped markdown + extracted JSON: \`${markdownFile}\`
- Original URL: ${page.url}
- Original title: ${page.title}
- Original meta description: ${page.description}

### Headings on the live page
${headings}

### CTAs on the live page
${ctas}

## Tasks (do all of these)

1. **Visual match**: Open the screenshot and study the layout, hierarchy, and spacing. Edit \`${pageFile}\` so the rendered Astro page matches the screenshot's structure using the design tokens already in \`src/styles/global.css\` (\`brand-*\`, \`ink-*\`, \`font-display\`, \`font-sans\`, \`radius-button\`, \`radius-card\`). Do NOT introduce hardcoded hex colors — use the tokens. Reuse existing components in \`src/components/astro/\` (Hero, CTASection, TestimonialCard, Footer, Nav, ContactForm). Add new components only when no existing one fits.

2. **Port copy with the copywriting skill**: Use the markdown from \`${markdownFile}\` as the source. Apply the copywriting skill's principles:
   - Each section advances exactly one argument
   - Specific over vague (numbers, timeframes, concrete examples)
   - Active voice
   - Customer language over company language
   - One idea per section; benefits over features
   The copywriting skill reads \`.agents/product-marketing-context.md\` automatically — defer to brand voice rules there.

3. **Run a copy-editing pass**: After the page is built, run the copy-editing skill across every block of copy you wrote. Where you find passive voice, buried value props, weak CTAs, or hedging language and choose to leave them, mark them inline with an Astro comment in this exact form:
   \`\`\`astro
   {/* copy-edit: <category> — <one-line note> */}
   \`\`\`
   Categories: \`passive\`, \`buried-value\`, \`weak-cta\`, \`hedging\`, \`vague\`, \`unproven\`. Place the comment on the line above the offending element. The build must still succeed.

4. **Append a CHANGELOG.md entry** under \`## [Unreleased]\` describing what you changed on this page (bullet list). The CLI also appends a one-line clone marker after you finish; that's fine — your bullets go above it.

5. **Verify the build**: Run \`pnpm install --silent\` once if \`node_modules\` is missing, then \`pnpm build\` (or \`pnpm exec astro check\` if build fails for environment reasons). The page must compile.

## Constraints
- Do not edit files outside \`src/\`, \`public/\`, \`CHANGELOG.md\`, and \`src/content/\`.
- Do not add new top-level routes beyond the page you were assigned.
- Do not modify \`src/styles/global.css\` — that's owned by \`upriver scaffold\`.
- Do not touch \`src/pages/admin/\`.
- Keep the change focused on the single page \`${path}\`.

When done, print a one-line summary: \`clone(${path}): <count> sections, <count> copy-edit comments\`.
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
  // Local committer identity so commits work even when the user has no global git config
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
  // Make sure the parent exists
  execSync(`mkdir -p ${shellQuote(join(repoDir, '..', '.worktrees'))}`, { stdio: 'pipe' });
  // -B to reset branch if it already exists
  execSync(`git worktree add -B ${branch} ${shellQuote(dir)} HEAD`, {
    cwd: repoDir,
    stdio: 'pipe',
  });
  return resolve(dir);
}

function appendChangelogEntry(repoDir: string, page: SitePage): void {
  const path = join(repoDir, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const line = `- ${date} clone: \`${normalizePath(page.slug || page.url)}\` — ${page.title || 'page'} ported from ${page.url}`;
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

async function openDraftPr(repoDir: string, branch: string, page: SitePage): Promise<string | undefined> {
  // Push the branch
  try {
    execSync(`git push -u origin ${branch}`, { cwd: repoDir, stdio: 'pipe' });
  } catch (err) {
    return undefined;
  }
  // Try gh CLI; fall back silently
  try {
    const title = `clone: ${normalizePath(page.slug || page.url)} — ${page.title || 'page'}`.slice(0, 100);
    const body = `Auto-generated by \`upriver clone\`.\n\n- Source URL: ${page.url}\n- Branch: \`${branch}\`\n\nReview the inline \`{/* copy-edit: ... */}\` comments before merging.`;
    const out = execSync(
      `gh pr create --draft --base main --head ${branch} --title ${shellQuote(title)} --body ${shellQuote(body)}`,
      { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return out.toString('utf8').trim().split(/\s+/).pop();
  } catch {
    return undefined;
  }
}

function pageSlugForBranch(page: SitePage): string {
  const path = normalizePath(page.slug || page.url);
  if (path === '/' || path === '') return 'home';
  return path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

function pageFileSlug(page: SitePage): string {
  const path = normalizePath(page.slug || page.url);
  if (path === '/' || path === '') return 'index';
  return path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase();
}

function normalizePath(p: string): string {
  if (!p) return '/';
  if (/^https?:/i.test(p)) {
    try {
      return new URL(p).pathname || '/';
    } catch {
      return '/';
    }
  }
  if (p === 'index') return '/';
  return p.startsWith('/') ? p : `/${p}`;
}

function shellQuote(s: string): string {
  if (!/[^\w@%+=:,./-]/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
