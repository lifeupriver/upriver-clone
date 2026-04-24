import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir as clientDirFor, readClientConfig } from '@upriver/core';
import type { AuditPackage } from '@upriver/core';

export default class LaunchChecklist extends BaseCommand {
  static override description =
    'Generate DNS migration, redirect, GSC, and analytics launch checklist';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    out: Flags.string({ description: 'Output path (default: clients/<slug>/launch-checklist.md)' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(LaunchChecklist);
    const { slug } = args;
    const dir = clientDirFor(slug);

    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);

    const pkgPath = join(dir, 'audit-package.json');
    const pkg = existsSync(pkgPath)
      ? (JSON.parse(readFileSync(pkgPath, 'utf8')) as AuditPackage)
      : null;

    const origin = extractOrigin(config.url);
    const hostname = extractHostname(config.url);
    const pages = pkg?.siteStructure.pages ?? [];
    const topPages = pages
      .filter((p) => (p.statusCode ?? 200) < 400)
      .slice(0, 15)
      .map((p) => normalizePath(p.slug || p.url));

    const outPath = flags.out ?? join(dir, 'launch-checklist.md');
    const body = renderChecklist({
      clientName: pkg?.meta.clientName ?? config.name,
      siteUrl: config.url,
      origin,
      hostname,
      topPages,
      totalPages: pages.length,
    });
    writeFileSync(outPath, body, 'utf8');

    this.log(`\nWrote ${outPath}`);
    this.log(`  Pre-launch: DNS plan, redirect map (${topPages.length} paths), GSC property, analytics, sitemap.`);
    this.log(`  Launch day: cutover steps, smoke tests, announcement.`);
    this.log(`  Post-launch: monitoring, 14-day checkpoint.`);
    this.log(`\nThis checklist is human-driven — the CLI does not automate any step.`);
  }
}

function renderChecklist(args: {
  clientName: string;
  siteUrl: string;
  origin: string;
  hostname: string;
  topPages: string[];
  totalPages: number;
}): string {
  const { clientName, siteUrl, origin, hostname, topPages, totalPages } = args;
  const date = new Date().toISOString().slice(0, 10);

  const redirectRows = topPages.length > 0
    ? topPages.map((p) => `| \`${p}\` | \`${p}\` | 301 | _pending_ |`).join('\n')
    : `| \`/\` | \`/\` | 301 | _pending_ |`;

  return `# Launch checklist — ${clientName}

Generated: ${date}
Source site: ${siteUrl}
Apex hostname: \`${hostname}\`

This checklist is **human-driven**. Upriver does not automate any step below. Tick items as you complete them. Assume one operator runs through this in a single sitting on cutover day; pre-launch items can be staged over the preceding days.

---

## Pre-launch (T-7 to T-1 days)

### DNS plan
- [ ] Confirm current DNS registrar for \`${hostname}\` and verify access to the account.
- [ ] Capture current DNS state: A / AAAA / CNAME / MX / TXT / NS records into \`dns-baseline.txt\` in this client folder.
- [ ] Lower TTL on A / CNAME for apex and \`www\` to 300s at least 24h before cutover.
- [ ] Add Vercel project under the production domain and verify ownership TXT record.
- [ ] Decide apex vs. \`www\`: which is canonical? (Recommended: apex redirects to \`www\`, or vice versa — pick one and stick with it.)
- [ ] Document the planned target records (A record to Vercel IP \`76.76.21.21\` or CNAME to \`cname.vercel-dns.com.\`) in a migration note.
- [ ] Confirm MX records will not be touched during the DNS change.

### Redirect map
Every URL that currently ranks, appears in backlinks, or is linked from external content must resolve on the new site or return a 301 to the right destination. ${totalPages} pages captured during audit; top paths below.

| Old path | New path | Code | Verified |
|----------|----------|------|----------|
${redirectRows}

- [ ] Fill in the \`New path\` column for every row. Any path that doesn't have a 1:1 successor gets a redirect to the closest topical match (never the homepage unless no match exists).
- [ ] Pull the full URL list from \`clients/<slug>/site-map.json\` if the top 15 is not enough.
- [ ] Pull top-linked external pages from Google Search Console → Links report and ensure each is in the redirect map.
- [ ] Implement redirects in \`astro.config.mjs\` (Astro redirects config) or \`vercel.json\`.

### Search Console
- [ ] Create a new Google Search Console property for \`${hostname}\` (Domain property preferred — covers all subdomains).
- [ ] Verify ownership via DNS TXT record (do this before DNS cutover so verification persists).
- [ ] If Domain property isn't possible, create URL-prefix properties for \`${origin}\` and \`https://www.${hostname}\`.
- [ ] Grant access to client + Upriver consultant accounts.
- [ ] Note: the legacy Search Console property keeps reporting for the old site until Google stops crawling it — do not delete it.

### Analytics
- [ ] Confirm which analytics tool will be used (GA4, Plausible, Umami). Recommended default: Plausible for simplicity, GA4 if the client already has an account.
- [ ] Install the snippet in \`src/layouts/BaseLayout.astro\` with the production property ID (not the staging one).
- [ ] If GA4: create a data stream, link to Search Console, set up conversions for key events (form submit, phone click, email click).
- [ ] If Plausible: add the domain, share the dashboard link with the client.
- [ ] Verify pageviews fire in the tool's real-time view by loading the preview with the production domain spoofed via \`/etc/hosts\`.

### Sitemap and robots
- [ ] Build runs \`@astrojs/sitemap\` — confirm \`dist/sitemap-index.xml\` exists after \`pnpm build\`.
- [ ] \`public/robots.txt\` references the production sitemap URL, not the preview URL.
- [ ] robots.txt does not contain \`Disallow: /\` left over from staging.

### Preview sign-off
- [ ] Final \`upriver qa <slug> --preview-url <url>\` run is clean (no in-scope items still open, no new issues introduced).
- [ ] Client approves the preview URL in writing (email thread in \`clients/<slug>/docs/\`).
- [ ] Changelog updated — \`[Unreleased]\` section renamed to \`[1.0.0] — <launch date>\` in \`CHANGELOG.md\`.

---

## Launch day (T-0)

### Cutover (do in order)
- [ ] Deploy the main branch to Vercel production from the merged main HEAD.
- [ ] Update DNS at the registrar:
  - A record for apex → Vercel
  - CNAME for \`www\` → \`cname.vercel-dns.com.\` (or reversed, depending on your canonical choice)
- [ ] Wait for propagation (typically 5-30 min with TTL=300). Verify with \`dig ${hostname}\` from a couple of networks.
- [ ] Confirm TLS certificate is issued by Vercel and the site loads over HTTPS without warnings.
- [ ] Run the redirect smoke test: curl every row in the redirect map and confirm 301 status and correct \`Location\` header.
- [ ] Submit the new sitemap in Search Console: Indexing → Sitemaps → \`${origin}/sitemap-index.xml\`.
- [ ] Request indexing for the homepage and the top 5 pages via the URL Inspection tool.

### Smoke test (human run-through)
- [ ] Load homepage on desktop, mobile, and tablet viewports. Check hero, nav, footer.
- [ ] Submit the contact form with a test entry. Confirm the submission hits Supabase and the client receives notification.
- [ ] Click every nav link and footer link. Confirm no 404s.
- [ ] Click phone number (mobile) and email link. Confirm they deep-link correctly.
- [ ] Test the site in an incognito window from a cold cache.

### Announcement
- [ ] Notify client that the site is live. Share: production URL, analytics dashboard, Search Console property, redirect map.
- [ ] Update Google Business Profile website field if it changed.
- [ ] Update social profile bios (Instagram, Facebook, LinkedIn) to the production URL.
- [ ] Update email signature templates for the client team.

---

## Post-launch monitoring

### T+1 day
- [ ] Check analytics for traffic dip/spike — compare to prior week.
- [ ] Search Console → Coverage: confirm no sudden spike in errors.
- [ ] \`site:${hostname}\` in Google: how many pages are indexed? (Should climb steadily over 7-14 days.)

### T+7 days
- [ ] Re-run \`upriver qa <slug> --preview-url ${origin}\` against production and diff against the preview report.
- [ ] Search Console → Performance: compare clicks/impressions to the prior week on the old site (from the legacy property).
- [ ] Check Core Web Vitals via PageSpeed Insights for the top 3 pages.

### T+14 days
- [ ] Confirm old URLs are 301'd to new URLs (random spot check of 10 from the redirect map).
- [ ] Raise TTL back to 3600s or 14400s on the apex and \`www\` records now that the move is stable.
- [ ] Schedule a 30-day review with the client to walk through analytics and any remaining open P1/P2 findings from the audit.

---

## Rollback plan

If the launch fails (site down, redirects broken, major regression):

1. Revert DNS records to the pre-launch state captured in \`dns-baseline.txt\`.
2. Because TTL was lowered to 300s, propagation back to the old site completes in under 15 minutes.
3. File a postmortem in \`clients/<slug>/docs/postmortem-<date>.md\` before re-attempting cutover.

---

_This checklist is deliberately manual. Every step is reversible up to the DNS change; beyond that, rollback is a controlled process, not an automated one._
`;
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
  return p.startsWith('/') ? p : `/${p}`;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? url;
  }
}

function extractOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}
