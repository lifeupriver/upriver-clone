import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SitePage } from '@upriver/core';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

export interface VerifyOptions {
  page: SitePage;
  slug: string;
  clientDir: string;
  repoDir: string;
  port: number; // Port to screenshot. Either an already-running dev server or a preview we'll start.
  startPreview: boolean; // If true, launch `astro preview` on `port` ourselves.
  iterations: number; // Max iterations after the initial port (typical: 2-3).
  pagePath: string; // The canonical path being cloned, e.g. "/" or "/about".
  sourceScreenshot: string; // Path to the source screenshot (audrey's actual home.png).
  pageFile: string; // The Astro file the agent is editing, e.g. "src/pages/index.astro".
  log: (msg: string) => void;
}

export interface VerifyResult {
  iterationsRun: number;
  status: 'converged' | 'maxed' | 'unreachable' | 'no-chromium' | 'error';
  attempts: string[]; // Paths to the attempt screenshots written.
}

/**
 * Iteratively compare the cloned page against the source screenshot, asking
 * Claude to fix discrepancies on each pass. Stops when Claude reports DONE or
 * iteration cap is reached.
 */
export async function verifyClonePage(opts: VerifyOptions): Promise<VerifyResult> {
  const attemptDir = join(opts.clientDir, 'clone-attempts');
  mkdirSync(attemptDir, { recursive: true });

  // Lazy-import Playwright so users without it can still use --no-verify.
  let chromium: typeof import('playwright').chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch {
    opts.log('  [verify] Playwright not installed. Skipping verification loop.');
    opts.log('  [verify] Install with: pnpm --filter @upriver/cli add playwright && pnpm exec playwright install chromium');
    return { iterationsRun: 0, status: 'no-chromium', attempts: [] };
  }

  let preview: ChildProcess | null = null;
  if (opts.startPreview) {
    opts.log(`  [verify] Starting astro dev on port ${opts.port}...`);
    // Use `astro dev` rather than `astro preview` because `astro preview`
    // is a no-op with the Vercel adapter (which writes to .vercel/output/
    // and expects the Vercel runtime). Dev server works for SSR + HMR
    // makes subsequent iterations cheap (no rebuild needed).
    preview = spawn('pnpm', ['exec', 'astro', 'dev', '--port', String(opts.port), '--host', '127.0.0.1'], {
      cwd: opts.repoDir,
      stdio: 'pipe',
      env: { ...process.env },
    });
    // Drain stdout/stderr so the buffer doesn't fill (would deadlock the child).
    preview.stdout?.on('data', () => {});
    preview.stderr?.on('data', () => {});
  }

  const url = `http://127.0.0.1:${opts.port}${opts.pagePath === '/' ? '/' : opts.pagePath}`;

  // Wait for the server to be reachable. Astro dev cold-start is slower than
  // preview because it compiles on first request — give it 45s.
  const reachable = await waitForUrl(url, 45_000);
  if (!reachable) {
    opts.log(`  [verify] ${url} did not respond within 15s. Skipping verification.`);
    if (preview) preview.kill();
    return { iterationsRun: 0, status: 'unreachable', attempts: [] };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    opts.log(`  [verify] Failed to launch Chromium: ${err instanceof Error ? err.message : String(err)}`);
    opts.log(`  [verify] Run: pnpm exec playwright install chromium`);
    if (preview) preview.kill();
    return { iterationsRun: 0, status: 'no-chromium', attempts: [] };
  }

  const attempts: string[] = [];
  let iter = 0;
  let status: VerifyResult['status'] = 'maxed';

  try {
    for (let i = 1; i <= opts.iterations; i++) {
      const attemptPath = join(attemptDir, `${pageFileSlug(opts.page)}-attempt-${i}.png`);
      opts.log(`  [verify] Iteration ${i}/${opts.iterations}: screenshotting ${url}`);
      const ok = await screenshotUrl(browser, url, attemptPath, opts.log);
      if (!ok) {
        status = 'error';
        break;
      }
      attempts.push(attemptPath);

      const prompt = buildVerifyPrompt({
        sourceScreenshot: opts.sourceScreenshot,
        attemptScreenshot: attemptPath,
        pageFile: opts.pageFile,
        pagePath: opts.pagePath,
        iter: i,
        maxIter: opts.iterations,
      });

      opts.log(`  [verify] Asking Claude to compare and fix...`);
      const verdict = await runClaudeAndCaptureLastLine(prompt, opts.repoDir);
      opts.log(`  [verify] Claude: ${verdict}`);

      // Detect DONE / CONTINUE markers. Strip backticks/quotes/whitespace so
      // the agent's `DONE` (formatted as code) still matches.
      const cleaned = verdict.replace(/[`'"*_~]/g, '').trim();
      const hasContinue = /\bCONTINUE\b/i.test(cleaned);
      const hasDone = /\bDONE\b/i.test(cleaned);
      if (hasDone && !hasContinue) {
        status = 'converged';
        iter = i; // record actual completed iteration count
        break;
      }
      iter = i;

      // Wait for HMR to settle. astro dev rebuilds on save; give it a few
      // seconds before screenshotting again.
      if (i < opts.iterations) {
        opts.log(`  [verify] Waiting for HMR to settle...`);
        await sleep(3500);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    if (preview) preview.kill('SIGTERM');
  }

  return { iterationsRun: iter, status, attempts };
}

function pageFileSlug(page: SitePage): string {
  const slug = (page.slug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!slug || slug === 'home' || slug === 'index') return 'index';
  return slug.replace(/\//g, '-');
}

async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return true;
    } catch {
      /* not ready */
    }
    await sleep(500);
  }
  return false;
}

async function screenshotUrl(
  browser: Awaited<ReturnType<typeof import('playwright').chromium.launch>>,
  url: string,
  outPath: string,
  log: (msg: string) => void,
): Promise<boolean> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Wait briefly for fonts to settle.
    await page.evaluate('document.fonts.ready');
    await page.screenshot({ path: outPath, fullPage: true });
    return true;
  } catch (err) {
    log(`  [verify] Screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    await ctx.close();
  }
}

function buildVerifyPrompt(args: {
  sourceScreenshot: string;
  attemptScreenshot: string;
  pageFile: string;
  pagePath: string;
  iter: number;
  maxIter: number;
}): string {
  return `You are verifying the visual fidelity of a cloned page against its source. Compare two screenshots and fix discrepancies.

## Read both screenshots NOW (mandatory)
1. Source (live site): \`${args.sourceScreenshot}\`
2. Current attempt (your previous build): \`${args.attemptScreenshot}\`

Use the Read tool on each. Then write a 5–10 bullet diff: what's different between the two? Be specific — name the section, what color/font/layout/image is off. Pay special attention to:
- **Fonts** — type face, weight, letter-spacing, line-height. Headings vs body.
- **Colors** — text colors, backgrounds, accent colors, link colors.
- **Logo** — does the source show a wordmark/logotype? Is the attempt using the right image at the right size and position?
- **Layout** — section order, image placement, vertical rhythm, spacing density.
- **Typography hierarchy** — h1 size relative to subhead, body proportions.

## Then fix the page
Edit \`${args.pageFile}\` to close the gap. Use only design tokens from \`src/styles/global.css\` (\`--color-brand-*\`, \`--color-ink-*\`, \`--color-primary\`, \`--color-accent\`, \`--font-display\`, \`--font-sans\`). Do NOT introduce hardcoded hex colors. Prefer local logo files at \`/images/<filename>\` when applicable. Do NOT rewrite copy — keep wording verbatim.

If you used the \`Carousel\` component already at \`src/components/astro/Carousel.astro\` and the source has multi-image hero/gallery, make sure your slides array matches the source's ordering.

## Iteration ${args.iter} of ${args.maxIter}
- After your edits, run \`pnpm build\` to confirm the page still compiles.
- If you believe the attempt is now visually close to the source (within reasonable Astro-vs-Squarespace differences), end your output with: \`DONE\`
- If you made edits that need another verification pass, end your output with: \`CONTINUE\`

Constraints:
- Do not edit files outside \`src/\` and \`public/\`.
- Do not modify \`src/styles/global.css\`.
- Do not touch \`src/pages/admin/\`.
- Keep changes scoped to \`${args.pageFile}\`.

End with one line: \`DONE\` or \`CONTINUE\` followed by a one-sentence reason.`;
}

function runClaudeAndCaptureLastLine(prompt: string, cwd: string): Promise<string> {
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
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env },
    });
    let stdout = '';
    child.stdout.on('data', (d) => {
      const s = d.toString('utf8');
      stdout += s;
      process.stdout.write(s);
    });
    child.stdin.write(prompt);
    child.stdin.end();
    child.on('error', rejectP);
    child.on('exit', (code) => {
      if (code !== 0) rejectP(new Error(`claude exited ${code}`));
      else {
        const lines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
        resolveP((lines[lines.length - 1] ?? '').trim());
      }
    });
  });
}

function runShell(cmd: string, cwd: string): Promise<boolean> {
  return new Promise((resolveP) => {
    const child = spawn(cmd, { cwd, stdio: 'ignore', shell: true });
    child.on('exit', (code) => resolveP(code === 0));
    child.on('error', () => resolveP(false));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
