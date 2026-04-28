/// <reference lib="dom" />
import { chromium, firefox, webkit, type Browser, type BrowserType } from 'playwright';
import type { AuditPassResult, AuditFinding, FindingPriority } from '@upriver/core';
import { loadPages } from '@upriver/audit-passes';
import { pickSamplePages } from '../sample.js';

interface RunOpts {
  log: (msg: string) => void;
}

interface BrowserResult {
  name: string;
  loaded: boolean;
  loadTimeMs: number;
  consoleErrors: string[];
  pageErrors: string[];
  bodyHeight: number;
  failedRequests: string[];
  error?: string;
}

interface DeviceResult {
  device: string;
  loaded: boolean;
  bodyHeight: number;
  hasHorizontalScroll: boolean;
  error?: string;
}

const BROWSERS: Array<{ name: string; type: BrowserType }> = [
  { name: 'chromium', type: chromium },
  { name: 'firefox', type: firefox },
  { name: 'webkit', type: webkit },
];

const DEVICES = [
  { name: 'iphone-14', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
  { name: 'galaxy-s23', viewport: { width: 360, height: 780 }, userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36' },
  { name: 'ipad-mini', viewport: { width: 768, height: 1024 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
];

let seq = 0;

export async function runCrossBrowser(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const sample = pickSamplePages(pages, 1);
  if (sample.length === 0) {
    return empty('No pages available for cross-browser audit.');
  }

  const target = sample[0]!;
  opts.log(`    cross-browser on ${target.url}`);

  const browserResults: BrowserResult[] = [];
  for (const b of BROWSERS) {
    opts.log(`      ${b.name}…`);
    browserResults.push(await testBrowser(b, target.url));
  }

  const deviceResults: DeviceResult[] = [];
  for (const d of DEVICES) {
    opts.log(`      device:${d.name}…`);
    deviceResults.push(await testDevice(d, target.url));
  }

  const findings: AuditFinding[] = [];

  for (const r of browserResults) {
    if (!r.loaded) {
      findings.push(finding('p0', 'heavy', `Page failed to load in ${r.name}`,
        `${r.name}: ${r.error ?? 'page did not finish loading'}.`,
        `Reproduce locally with Playwright (\`npx playwright test --browser=${r.name}\`) or open in the actual browser. Common causes: missing polyfills, browser-specific CSS, vendor-prefix issues.`,
        target.url, r.error));
      continue;
    }
    if (r.pageErrors.length > 0) {
      findings.push(finding('p0', 'medium', `${r.pageErrors.length} uncaught page errors in ${r.name}`,
        `${r.name} threw ${r.pageErrors.length} uncaught JavaScript errors during page load.`,
        'Reproduce in DevTools, identify the failing module, and add a polyfill or alternative implementation.',
        target.url, r.pageErrors.slice(0, 2).join(' | ')));
    }
    if (r.consoleErrors.length > 0) {
      findings.push(finding('p1', 'medium', `${r.consoleErrors.length} console errors in ${r.name}`,
        `${r.name} logged ${r.consoleErrors.length} console errors during page load.`,
        'Open the page in this browser, reproduce errors via DevTools, and fix or remove the offending code.',
        target.url, r.consoleErrors.slice(0, 2).join(' | ')));
    }
    if (r.failedRequests.length > 0) {
      findings.push(finding('p1', 'light', `${r.failedRequests.length} requests failed in ${r.name}`,
        `${r.failedRequests.length} network requests failed in ${r.name} (others may have succeeded).`,
        'Verify these resources are reachable and CORS-allowed.',
        target.url, r.failedRequests.slice(0, 3).join(' | ')));
    }
  }

  // Body-height divergence
  const heights = browserResults.filter((r) => r.loaded).map((r) => r.bodyHeight);
  if (heights.length >= 2) {
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    if (max - min > Math.max(50, min * 0.1)) {
      findings.push(finding('p1', 'medium', 'Page height differs significantly across browsers',
        `Body heights: ${browserResults.filter((r) => r.loaded).map((r) => `${r.name}=${r.bodyHeight}px`).join(', ')}. >10% divergence suggests rendering differences.`,
        'Open the page in each browser side-by-side. Common causes: vendor-prefix gaps, flexbox/grid bugs, font-fallback differences.',
        target.url));
    }
  }

  for (const d of deviceResults) {
    if (!d.loaded) {
      findings.push(finding('p0', 'heavy', `Page failed to load on ${d.device}`,
        `${d.device}: ${d.error ?? 'failed'}.`,
        'Test on the actual device or in BrowserStack to reproduce, then fix mobile-specific issues.',
        target.url, d.error));
      continue;
    }
    if (d.hasHorizontalScroll) {
      findings.push(finding('p0', 'medium', `Horizontal scroll on ${d.device}`,
        `${d.device} (viewport ${d.bodyHeight}px tall) scrolls horizontally — content overflows the viewport width.`,
        'Audit for fixed-width elements, large images without max-width:100%, and tables. Apply overflow-x:hidden to body only as a last resort.',
        target.url));
    }
  }

  const score = scoreFrom(findings);
  return {
    dimension: 'cross-browser',
    score,
    summary: `Cross-browser audit on ${target.url}. Browsers: ${browserResults.map((r) => `${r.name}=${r.loaded ? 'ok' : 'fail'}`).join(', ')}. Devices: ${deviceResults.map((d) => `${d.device}=${d.loaded ? 'ok' : 'fail'}`).join(', ')}. ${findings.length} issues.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}

async function testBrowser(b: { name: string; type: BrowserType }, url: string): Promise<BrowserResult> {
  let browser: Browser | null = null;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  try {
    browser = await b.type.launch({ headless: true, args: b.name === 'chromium' ? ['--no-sandbox', '--disable-gpu'] : [] });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()}: ${r.failure()?.errorText ?? 'unknown'}`));

    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    const loadTimeMs = Date.now() - start;
    const bodyHeight = await page.evaluate(() => document.body?.scrollHeight ?? 0);
    return { name: b.name, loaded: true, loadTimeMs, consoleErrors, pageErrors, bodyHeight, failedRequests };
  } catch (err) {
    return { name: b.name, loaded: false, loadTimeMs: 0, consoleErrors, pageErrors, bodyHeight: 0, failedRequests, error: String(err).slice(0, 200) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function testDevice(d: { name: string; viewport: { width: number; height: number }; userAgent: string }, url: string): Promise<DeviceResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const ctx = await browser.newContext({ viewport: d.viewport, userAgent: d.userAgent, isMobile: d.name !== 'ipad-mini', hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    const result = await page.evaluate(() => ({
      bodyHeight: document.body?.scrollHeight ?? 0,
      hasHorizontalScroll: (document.documentElement.scrollWidth ?? 0) > (window.innerWidth ?? 0) + 1,
    }));
    return { device: d.name, loaded: true, ...result };
  } catch (err) {
    return { device: d.name, loaded: false, bodyHeight: 0, hasHorizontalScroll: false, error: String(err).slice(0, 200) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function finding(priority: FindingPriority, effort: 'light' | 'medium' | 'heavy', title: string, description: string, recommendation: string, page: string, evidence?: string): AuditFinding {
  return {
    id: `cross-browser-${String(++seq).padStart(3, '0')}`,
    dimension: 'cross-browser',
    priority,
    effort,
    title,
    description,
    why_it_matters: 'Real visitors use Safari, Firefox, mobile Chrome, and a long tail of devices. Issues in any of these silently lose conversions.',
    recommendation,
    page,
    ...(evidence ? { evidence } : {}),
  };
}

function empty(summary: string): AuditPassResult {
  return { dimension: 'cross-browser', score: 0, summary, findings: [], completed_at: new Date().toISOString() };
}

function scoreFrom(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const d = findings.reduce((s, f) => s + (f.priority === 'p0' ? 15 : f.priority === 'p1' ? 6 : 2), 0);
  return Math.max(0, Math.min(100, 100 - d));
}
