/// <reference lib="dom" />
import { chromium, type Request } from 'playwright';
import type { AuditPassResult, AuditFinding, FindingPriority } from '@upriver/core';
import { loadPages } from '@upriver/audit-passes';
import { pickSamplePages } from '../sample.js';

interface RunOpts {
  log: (msg: string) => void;
}

interface PlatformSignal {
  id: string;
  label: string;
  patterns: RegExp[];
  conversionPatterns?: RegExp[];
}

const PLATFORMS: PlatformSignal[] = [
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    patterns: [/googletagmanager\.com\/gtag\/js/, /google-analytics\.com\/g\/collect/, /\.googletagmanager\.com\/g\/collect/],
    conversionPatterns: [/google-analytics\.com\/g\/collect.*(?:conversion|generate_lead|sign_up|purchase)/],
  },
  { id: 'gtm', label: 'Google Tag Manager', patterns: [/googletagmanager\.com\/gtm\.js/] },
  { id: 'meta-pixel', label: 'Meta Pixel', patterns: [/connect\.facebook\.net\/.*\/fbevents\.js/, /facebook\.com\/tr/], conversionPatterns: [/facebook\.com\/tr.*(?:Lead|CompleteRegistration|Purchase)/] },
  { id: 'plausible', label: 'Plausible', patterns: [/plausible\.io\/api\/event/, /plausible\.io\/js\/script\.js/] },
  { id: 'umami', label: 'Umami', patterns: [/umami\.is\/api\//, /umami\.js/] },
  { id: 'fathom', label: 'Fathom', patterns: [/cdn\.usefathom\.com\//] },
  { id: 'hotjar', label: 'Hotjar', patterns: [/static\.hotjar\.com\//, /script\.hotjar\.com\//] },
  { id: 'segment', label: 'Segment', patterns: [/cdn\.segment\.com\/analytics\.js/, /api\.segment\.io\/v1\/p/] },
];

let seq = 0;

export async function runAnalyticsTracking(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const sample = pickSamplePages(pages, 1);
  if (sample.length === 0) {
    return empty('No pages available for analytics tracking audit.');
  }

  const target = sample[0]!;
  opts.log(`    analytics tracking on ${target.url}`);

  const findings: AuditFinding[] = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const requests: string[] = [];
    const consoleErrors: string[] = [];
    page.on('request', (r: Request) => {
      requests.push(r.url());
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 45_000 });

    const detected: Set<string> = new Set();
    const conversionFires: Set<string> = new Set();
    for (const platform of PLATFORMS) {
      if (platform.patterns.some((p) => requests.some((url) => p.test(url)))) {
        detected.add(platform.id);
      }
      if (platform.conversionPatterns?.some((p) => requests.some((url) => p.test(url)))) {
        conversionFires.add(platform.id);
      }
    }

    if (detected.size === 0) {
      findings.push(finding('p0', 'medium', 'No analytics platform detected',
        `Loading ${target.url} produced no requests to common analytics platforms (GA4, GTM, Meta Pixel, Plausible, Umami, Fathom, Hotjar, Segment).`,
        'Install GA4 (or a privacy-friendly alternative like Plausible/Fathom) and a tag manager. Without analytics, conversion lift cannot be measured.',
        target.url,
        `${requests.length} total network requests, none matched analytics patterns`));
    } else {
      opts.log(`      detected: ${[...detected].join(', ')}`);
    }

    if (consoleErrors.length > 0) {
      findings.push(finding('p1', 'medium', `${consoleErrors.length} console errors on page load`,
        `${consoleErrors.length} JavaScript console errors fired during initial load. These often break analytics events, third-party widgets, or interaction handlers.`,
        'Open the page in Chrome DevTools, reproduce the errors, and fix or remove the offending scripts.',
        target.url,
        consoleErrors.slice(0, 3).join(' | ')));
    }

    // Try to fire a conversion: click the first CTA on the page
    const cta = target.extracted.ctaButtons[0];
    if (cta && cta.text) {
      const reqsBefore = requests.length;
      try {
        await page.locator(`text=${cta.text}`).first().click({ timeout: 5000 });
        await page.waitForTimeout(2500);
        const newRequests = requests.slice(reqsBefore);
        const conversionDetected = PLATFORMS.some((p) =>
          p.conversionPatterns?.some((cp) => newRequests.some((url) => cp.test(url))),
        );
        if (detected.size > 0 && !conversionDetected) {
          findings.push(finding('p1', 'medium', 'Primary CTA click did not fire a conversion event',
            `Clicking "${cta.text}" produced ${newRequests.length} new network requests but none matched a conversion event pattern (GA4 conversion, Meta Lead, etc.).`,
            'Wire conversion events to the primary CTAs. In GA4, mark the click event as a conversion in admin. In GTM, trigger a custom event on click and forward to Meta Pixel/Ads.',
            target.url,
            `clicked: "${cta.text}"`));
        }
      } catch {
        // CTA not clickable; skip silently
      }
    }

    // Cookie banner / consent check
    const hasConsent = await page.evaluate(() => {
      const text = document.body?.innerText.toLowerCase() ?? '';
      return /cookie|consent|gdpr|privacy/.test(text) && /accept|agree|allow|ok/.test(text);
    });
    if (detected.size > 0 && !hasConsent) {
      findings.push(finding('p1', 'medium', 'Analytics fires without visible consent banner',
        'Analytics requests were detected on initial load but no cookie/consent banner is visible. This is a GDPR/CCPA risk if any visitors are in regulated regions.',
        'Add a consent banner (cookieconsent, Cookiebot, OneTrust, or similar) and gate analytics behind affirmative opt-in for EU/CA visitors.',
        target.url));
    }

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    opts.log(`      analytics-tracking failed: ${String(err).slice(0, 120)}`);
    return empty(`Playwright failed: ${String(err).slice(0, 200)}`);
  }

  const score = scoreFrom(findings);
  return {
    dimension: 'analytics',
    score,
    summary: `Analytics tracking audit on ${target.url}. ${findings.length} issues.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}

function finding(priority: FindingPriority, effort: 'light' | 'medium' | 'heavy', title: string, description: string, recommendation: string, page: string, evidence?: string): AuditFinding {
  return {
    id: `analytics-${String(++seq).padStart(3, '0')}`,
    dimension: 'analytics',
    priority,
    effort,
    title,
    description,
    why_it_matters: 'Without working analytics and conversion tracking, you cannot measure marketing ROI, optimize the funnel, or attribute leads to channels.',
    recommendation,
    page,
    ...(evidence ? { evidence } : {}),
  };
}

function empty(summary: string): AuditPassResult {
  return { dimension: 'analytics', score: 0, summary, findings: [], completed_at: new Date().toISOString() };
}

function scoreFrom(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const d = findings.reduce((s, f) => s + (f.priority === 'p0' ? 25 : f.priority === 'p1' ? 10 : 3), 0);
  return Math.max(0, Math.min(100, 100 - d));
}
