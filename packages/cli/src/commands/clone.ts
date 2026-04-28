import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'node:fs';
import { BaseCommand } from '../base-command.js';
import type { AuditPackage, ClientConfig, SitePage } from '@upriver/core';
import { loadAuditPackage, resolveScaffoldPaths } from '../scaffold/template-writer.js';
import { verifyClonePage } from '../clone/verify.js';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

export default class Clone extends BaseCommand {
  static override description = 'Run Claude Code headless agent to visually clone the site page by page';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    page: Flags.string({ description: 'Clone a single page by URL or path (e.g. "/" or "/about")' }),
    skip: Flags.string({ description: 'Skip a page by path (repeatable, e.g. --skip / --skip /cart)', multiple: true }),
    'include-junk': Flags.boolean({ description: 'Include system/auth/transactional pages (404, cart, login, etc.) — off by default' }),
    concurrency: Flags.integer({ description: 'Max parallel page agents', default: 3 }),
    'no-pr': Flags.boolean({ description: 'Skip opening draft PRs' }),
    'no-worktree': Flags.boolean({ description: 'Run in the main repo working tree (serial only)' }),
    'dry-run': Flags.boolean({ description: 'Print the agent prompts without running Claude Code' }),
    'no-verify': Flags.boolean({ description: 'Skip the screenshot verification loop' }),
    'verify-iterations': Flags.integer({ description: 'Max iterations of the verification loop', default: 2 }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Clone);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(repoDir)) this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);

    const pkg = loadAuditPackage(clientDir);

    let pages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);

    // Default-skip junk pages (404/cart/auth/sitemap). Override with --include-junk.
    if (!flags['include-junk']) {
      const before = pages.length;
      pages = pages.filter((p) => isCloneWorthy(canonicalPagePath(p), p.url));
      const skipped = before - pages.length;
      if (skipped > 0) this.log(`  Skipped ${skipped} system/auth/transactional page(s) (use --include-junk to clone them).`);
    }

    if (flags.skip && flags.skip.length > 0) {
      const skipSet = new Set(flags.skip.map(normalizePath));
      const before = pages.length;
      pages = pages.filter((p) => !skipSet.has(canonicalPagePath(p)));
      this.log(`  Skipped ${before - pages.length} page(s) via --skip.`);
    }

    if (flags.page) {
      const target = normalizePath(flags.page);
      pages = pages.filter(
        (p) =>
          canonicalPagePath(p) === target ||
          normalizePath(p.slug) === target ||
          normalizePath(p.url) === target,
      );
      if (pages.length === 0) this.error(`No page matched "${flags.page}". Try "/" or "/about".`);
    }

    if (pages.length === 0) this.error('No pages found in audit-package.json siteStructure.pages.');

    this.log(`\nCloning ${pages.length} page(s) for "${slug}" into ${repoDir}`);

    const useWorktrees = !flags['no-worktree'] && !flags['dry-run'] && pages.length > 1;
    if (!flags['dry-run']) ensureGitInitialized(repoDir);

    const concurrency = useWorktrees ? Math.max(1, flags.concurrency) : 1;
    const queue = [...pages];
    const results: PageResult[] = [];

    // Verification only makes sense for single-tree runs (otherwise we'd need
    // a preview server per worktree). Skip if --no-verify, --dry-run, or worktrees.
    const shouldVerify = !flags['no-verify'] && !flags['dry-run'] && !useWorktrees;
    const verifyPort = shouldVerify ? pickVerifyPort(slug) : 0;

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
          verify: shouldVerify,
          verifyPort,
          verifyIterations: flags['verify-iterations'],
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
      const verifyTag = r.verifyStatus ? `  [verify: ${r.verifyStatus}]` : '';
      this.log(`  [${r.ok ? '✓' : '✗'}] ${r.page.slug || '/'} ${r.prUrl ? `→ ${r.prUrl}` : ''}${verifyTag}`);
      if (!r.ok && r.error) this.log(`        ${r.error}`);
    }
  }

  private async clonePage(opts: ClonePageOpts): Promise<PageResult> {
    const { page, slug, clientDir, repoDir, pkg, useWorktree, dryRun, openPr, verify, verifyPort, verifyIterations } = opts;
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

      // Verification loop: screenshot the built page, ask Claude to compare and fix.
      let verifyStatus: string | undefined;
      if (verify && verifyPort > 0) {
        const sourceScreenshot = resolve(clientDir, 'screenshots', 'desktop', `${pageFileSlug(page)}.png`);
        const path = canonicalPagePath(page);
        const pageFile = path === '/' ? 'src/pages/index.astro' : `src/pages${path}.astro`;
        const result = await verifyClonePage({
          page,
          slug,
          clientDir,
          repoDir: workCwd,
          port: verifyPort,
          startPreview: true,
          iterations: verifyIterations,
          pagePath: path,
          sourceScreenshot,
          pageFile,
          log: (m) => this.log(m),
        });
        verifyStatus = `${result.status} after ${result.iterationsRun}/${verifyIterations} iter(s)`;
        // Commit any verification edits as a follow-up.
        try {
          execSync('git add -A', { cwd: workCwd, stdio: 'pipe' });
          execSync(`git commit -m ${shellQuote(`clone(${page.slug || '/'}): verify pass — ${verifyStatus}`)}`, {
            cwd: workCwd,
            stdio: 'pipe',
          });
        } catch {
          // nothing changed during verify
        }
      }

      let prUrl: string | undefined;
      if (openPr) {
        prUrl = await openDraftPr(workCwd, branch, page);
      }

      return { ok: true, page, branch, ...(prUrl ? { prUrl } : {}), ...(verifyStatus ? { verifyStatus } : {}) };
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
  verify: boolean;
  verifyPort: number;
  verifyIterations: number;
}

interface PageResult {
  ok: boolean;
  page: SitePage;
  branch: string;
  prUrl?: string;
  error?: string;
  verifyStatus?: string;
}

function pickVerifyPort(slug: string): number {
  // Prefer the dev_port from client-config so we hit the same server the
  // dashboard's iframe already targets — but offset by 1000 to avoid colliding
  // with a running dev server. (We launch our own astro preview here.)
  try {
    const cfgPath = join('clients', slug, 'client-config.yaml');
    if (!existsSync(cfgPath)) return 5322;
    const cfg = parseYaml(readFileSync(cfgPath, 'utf8')) as ClientConfig;
    return (cfg.dev_port ?? 4322) + 1000;
  } catch {
    return 5322;
  }
}

function buildAgentPrompt(args: {
  page: SitePage;
  slug: string;
  pkg: AuditPackage;
  clientDir: string;
}): string {
  const { page, slug, pkg, clientDir } = args;
  // Canonicalize the page path. Some scrapes record the homepage with slug='home'
  // even though page.url has pathname '/'. Trust the URL pathname when it's root,
  // so we always write to src/pages/index.astro for the homepage.
  const path = canonicalPagePath(page);
  const pageFile = path === '/' ? 'src/pages/index.astro' : `src/pages${path}.astro`;
  const screenshot = resolve(clientDir, 'screenshots', 'desktop', `${slug}.png`);
  const pageScreenshot = resolve(
    clientDir,
    'screenshots',
    'desktop',
    `${pageFileSlug(page)}.png`,
  );
  const markdownFile = resolve(clientDir, 'pages', `${pageFileSlug(page)}.json`);
  const rawHtmlFile = resolve(clientDir, 'rawhtml', `${pageFileSlug(page)}.html`);
  const mobileScreenshot = resolve(clientDir, 'screenshots', 'mobile', `${pageFileSlug(page)}.png`);
  const ctas = page.ctaButtons.map((c) => `- ${c.text} → ${c.href}`).join('\n') || '- (none captured)';
  const headings = page.headings.map((h) => `- h${h.level}: ${h.text}`).join('\n') || '- (none captured)';
  const localLogos = findLocalLogos(clientDir);
  const clientLogos = findClientLogos(resolve(clientDir, '..', '..', 'clients', slug, 'repo'));
  const localLogosBlock = formatLogosBlock(clientLogos, localLogos);

  return `You are producing a 1:1 visual replica of the page \`${path}\` from ${pkg.meta.clientName}'s live site as an Astro page. Pixel-level fidelity is the goal. **Do not redesign, rewrite, or "improve" anything.** Brand voice and copy rewrites happen in a separate downstream pass — not here.

## Step 1 — open the screenshot first (mandatory)
Use the Read tool on the desktop screenshot. Then write a 5–8 bullet visual description as the FIRST thing you do — sections in order, type sizes, colors used, image-to-text relationships, anything distinctive. This is non-negotiable: if you skip it, the output will look generic.

- Desktop screenshot: \`${pageScreenshot}\` (fallback: \`${screenshot}\`)
- Mobile screenshot: \`${mobileScreenshot}\` — read if you need to confirm responsive behavior.

## Step 2 — read the rawhtml for content, order, and exact wording
- Source DOM: \`${rawHtmlFile}\`
- This is the live render of the source site. Use Grep / Read on it to extract:
  - Every visible heading (h1–h6) and its exact text
  - Every paragraph in body order
  - Every link/CTA with its exact label and href
  - Every \`<img>\` src that's part of the visible page (skip site-builder navigation chrome / popups / scripts / inline styles)
- Skip everything in \`<head>\`, \`<script>\`, \`<style>\`, and runtime classes like \`yui-\`, \`sqs-\`, \`wf-*\`. Treat them as noise.
- Fallback only if rawhtml is missing or unreadable: \`${markdownFile}\` (scraped markdown).

## Step 3 — produce the Astro page
Edit \`${pageFile}\` (create if missing). Match the screenshot's layout — sections in the same order, same hierarchy, same image-to-text relationships, same approximate spacing/sizing.

- **Copy is verbatim.** Headings, body paragraphs, CTAs, link labels — port them exactly as they appear in rawhtml. Do not paraphrase, "tighten," or apply any voice rules. If the live page says "Welcome to Audrey's Farmhouse," your page says "Welcome to Audrey's Farmhouse."
- **Use design tokens** from \`src/styles/global.css\` (\`--color-brand-*\`, \`--color-ink-*\`, \`--color-primary\`, \`--color-accent\`, \`--font-display\`, \`--font-sans\`, \`--radius-card\`, \`--radius-button\`). Translate the screenshot's visible colors / type / spacing to these tokens. Do NOT use hardcoded hex values.
- **Write inline markup directly.** Do NOT wrap content in the template's stock components (\`Hero\`, \`CTASection\`, \`TestimonialCard\`, etc.) unless one happens to structurally match the source — usually it won't. New page-specific components are fine for repeating sections; otherwise inline is preferred.
- **Forms:** if the source has any form (newsletter signup, contact / inquiry, RSVP, etc.), recreate it in Astro — do NOT just embed an external link or skip it. Extract every \`<input>\`, \`<select>\`, \`<textarea>\`, and \`<button type="submit">\` from rawhtml, preserving \`name\`, \`type\`, \`required\`, \`placeholder\`, and any visible labels. Wire the form's \`action\` to a same-origin endpoint:
  - Newsletter / subscribe forms → \`/api/newsletter\`
  - Inquiry / contact / RSVP forms → \`/api/inquiry\`
  Set \`method="POST"\` and \`enctype="application/x-www-form-urlencoded"\` (or \`multipart/form-data\` if there's a file input). Reuse \`src/components/astro/ContactForm.astro\` if its structure matches the source — otherwise inline. Add a hidden honeypot field (\`<input type="text" name="_hp" class="hidden" tabindex="-1" autocomplete="off">\`) to deter bots. Show a success/error region (\`<div data-form-status>\`) for the API response. Do NOT auto-create the API route handler — the scaffold provides the endpoints; just wire the form's \`action\` to them.

- **Carousels:** if the source has a multi-image hero, slideshow, or gallery (look for indicators like multiple slides, prev/next chrome, dot navigation, "Slide 1 of N" text in rawhtml, or visible carousel UI in the screenshot), use the \`Carousel\` component at \`src/components/astro/Carousel.astro\`:
  \`\`\`astro
  ---
  import Carousel from '../components/astro/Carousel.astro';
  const slides = [
    { src: 'https://cdn.example.com/1.jpg', alt: 'description' },
    { src: 'https://cdn.example.com/2.jpg', alt: 'description' },
  ];
  ---
  <Carousel slides={slides} autoplayMs={6000} className="h-screen min-h-[480px]" />
  \`\`\`
  Pull every slide image from the rawhtml in source order. Static-rendering only the first slide loses fidelity.
- **Images**: prefer local files at \`/images/<filename>\` (already copied to \`public/images/\` by scaffold) over remote CDN URLs. Especially for logos — see "Local logos available" below. For non-logo content imagery, the CDN URLs from rawhtml are fine.

### Local logos available (prefer these over CDN URLs)
${localLogosBlock}
- **Responsive**: use Tailwind utility classes (\`md:\`, \`lg:\`). Mobile order should match the mobile screenshot.

### Reference — already-extracted facts (rawhtml is source of truth if these conflict)
- Original URL: ${page.url}
- Original title: ${page.title}
- Original meta description: ${page.description}

Headings detected in audit summary:
${headings}

CTAs detected in audit summary:
${ctas}

## Step 4 — verify the build
Run \`pnpm install --silent\` if \`node_modules\` is missing, then \`pnpm build\`. The page must compile. If a Vercel-adapter or other env error blocks \`pnpm build\`, fall back to \`pnpm exec astro check\`.

## Constraints
- Do NOT apply brand voice, copywriting, or copy-editing rules here. This is a structural clone, not a redesign.
- Do NOT add new top-level routes beyond the page you were assigned.
- Do NOT modify \`src/styles/global.css\` — that's owned by \`upriver scaffold\`.
- Do NOT touch \`src/pages/admin/\`.
- Do NOT edit files outside \`src/\` and \`public/\`.
- Keep the change focused on the single page \`${path}\`.

> The CLI writes a CHANGELOG fragment to \`CHANGELOG.d/clone-<slug>.md\` after you finish — you do not need to edit \`CHANGELOG.md\`.

When done, print a one-line summary: \`clone(${path}): <count> sections ported, <count> images, <count> CTAs.\`
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
  // Per-branch fragment file: avoids merge conflicts when parallel worktrees
  // each append to [Unreleased] in CHANGELOG.md. Run `pnpm changelog:assemble`
  // (or merge to main and run it there) to flush fragments into CHANGELOG.md.
  const fragDir = join(repoDir, 'CHANGELOG.d');
  mkdirSync(fragDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const slug = pageSlugForBranch(page);
  const path = canonicalPagePath(page);
  const line = `- ${date} clone: \`${path}\` — ${page.title || 'page'} ported from ${page.url}\n`;
  writeFileSync(join(fragDir, `clone-${slug}.md`), line, 'utf8');
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
  const path = canonicalPagePath(page);
  if (path === '/' || path === '') return 'home';
  return path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

// System/auth/transactional paths that aren't worth cloning by default.
const CLONE_BLOCKLIST = new Set([
  '/404', '/500', '/403',
  '/cart', '/checkout', '/order', '/orders',
  '/login', '/log-in', '/signin', '/sign-in',
  '/signup', '/sign-up', '/register',
  '/logout', '/log-out', '/signout', '/sign-out',
  '/forgetpassword', '/forgot-password', '/reset-password',
  '/sitemap', '/sitemap.xml', '/sitemap-xml',
  '/account', '/profile', '/settings',
]);

function isCloneWorthy(path: string, pageUrl: string): boolean {
  // App/auth subdomains (e.g., https://app.example.com/login) are always external.
  if (pageUrl) {
    try {
      const u = new URL(pageUrl);
      if (/^(app|auth|account|admin|portal|api)\./i.test(u.hostname)) return false;
    } catch {
      /* ignore */
    }
  }
  const lower = path.toLowerCase();
  if (CLONE_BLOCKLIST.has(lower)) return false;
  if (lower.startsWith('/admin/') || lower.startsWith('/api/')) return false;
  // Suffix-based junk like "/the-greenhouses-nav", "/fn-nav".
  if (/-(nav|sitemap|footer)$/.test(lower)) return false;
  return true;
}

function findLocalLogos(clientDir: string): string[] {
  const dir = join(clientDir, 'assets', 'images');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(png|svg|jpg|jpeg|webp)$/i.test(f))
    .filter((f) => /(logo|brand|wordmark|mark)/i.test(f))
    .sort();
}

interface ClientLogoEntry {
  brand: string;
  variants: string[]; // public paths
}

function findClientLogos(repoDir: string): ClientLogoEntry[] {
  const root = join(repoDir, 'public', 'images', 'logos');
  if (!existsSync(root)) return [];
  const out: ClientLogoEntry[] = [];
  for (const brandSlug of readdirSync(root)) {
    const brandDir = join(root, brandSlug);
    try {
      const stat = require('node:fs').statSync(brandDir);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    const variants: string[] = [];
    for (const file of readdirSync(brandDir)) {
      if (!/\.(svg|png|jpg|jpeg|webp)$/i.test(file)) continue;
      variants.push(`/images/logos/${brandSlug}/${file}`);
    }
    if (variants.length > 0) out.push({ brand: brandSlug, variants: variants.sort() });
  }
  return out;
}

function formatLogosBlock(clientLogos: ClientLogoEntry[], legacyLogos: string[]): string {
  const lines: string[] = [];
  if (clientLogos.length > 0) {
    lines.push('Client-provided logos (PREFER THESE — these are the real brand assets):');
    for (const entry of clientLogos) {
      lines.push(`  ${entry.brand}:`);
      for (const v of entry.variants) lines.push(`    - ${v}`);
    }
  }
  if (legacyLogos.length > 0) {
    if (clientLogos.length > 0) lines.push('');
    lines.push('Legacy logos (scraped — use only if no client variant fits):');
    for (const f of legacyLogos) lines.push(`  - /images/${f}`);
  }
  if (lines.length === 0) return '- (none detected — fall back to CDN URLs from rawhtml)';
  return lines.join('\n');
}

function canonicalPagePath(page: SitePage): string {
  // Prefer the URL pathname when it's root (homepage with slug='home' should still
  // be treated as '/'). Otherwise fall back to slug, then url.
  try {
    const urlPath = new URL(page.url).pathname || '/';
    if (urlPath === '/' || urlPath === '') return '/';
  } catch {
    /* fall through to slug */
  }
  const slugLower = (page.slug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (slugLower === 'home' || slugLower === 'index') return '/';
  return normalizePath(page.slug || page.url);
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
