#!/usr/bin/env node
// Local QA: extract PageData from the built dist/client HTML and run audit
// passes against it. Bypasses `upriver qa` which requires a public preview URL.

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  runSeo, runContent, runDesign, runSales, runLinks, runSchema,
  runAeo, runGeo, runTypography, runLocal, runBacklinks, runCompetitors,
} from '../packages/audit-passes/dist/index.js';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/qa-local.mjs <slug>'); process.exit(1); }

const clientsBase = resolve('./clients');
const clientDir = join(clientsBase, slug);
const distDir = join(clientDir, 'repo', 'dist', 'client');
const qaDir = join(clientDir, 'qa');
const qaPagesDir = join(qaDir, 'pages');
const qaAuditDir = join(qaDir, 'audit');

if (!existsSync(distDir)) {
  console.error(`No built site at ${distDir}.`);
  process.exit(1);
}

mkdirSync(qaPagesDir, { recursive: true });
mkdirSync(qaAuditDir, { recursive: true });

function findHtml(dir, base = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      if (entry === '_astro' || entry === 'images') continue;
      out.push(...findHtml(full, rel));
    } else if (entry === 'index.html' || entry.endsWith('.html')) {
      out.push({ path: full, route: rel.replace(/\/?index\.html$/, '/').replace(/\.html$/, '') });
    }
  }
  return out;
}

function extract(html) {
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1] || '';
  const headings = [];
  const headingRe = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = headingRe.exec(html))) {
    const level = parseInt(m[1].slice(1), 10);
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) headings.push({ level, text });
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const internal = [];
  const external = [];
  const linkRe = /<a\s+[^>]*href="([^"]+)"/gi;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    if (href.startsWith('http')) external.push(href);
    else if (href.startsWith('/')) internal.push(href);
  }

  const images = [];
  const imgRe = /<img\s+[^>]*src="([^"]+)"/gi;
  while ((m = imgRe.exec(html))) images.push(m[1]);

  const ctaButtons = [];
  const buttonRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = buttonRe.exec(html))) {
    const href = m[1];
    const inner = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (/Book a Tour|Get in touch|Contact|Send message|Reserve|Learn|See/i.test(inner) && inner.length < 60) {
      ctaButtons.push({ text: inner, href, type: 'primary' });
    }
  }

  const faqs = [];
  const detailsRe = /<details[^>]*>([\s\S]*?)<\/details>/gi;
  while ((m = detailsRe.exec(html))) {
    const block = m[1];
    const q = (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] || '';
    const after = block.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, '');
    const a = after.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const question = q.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (question && a) faqs.push({ question, answer: a });
  }

  const testimonials = [];
  const figRe = /<figure[\s\S]*?<blockquote[^>]*>([\s\S]*?)<\/blockquote>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi;
  while ((m = figRe.exec(html))) {
    const quote = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const attribution = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/^—\s*/, '').trim();
    if (quote) testimonials.push({ quote, attribution });
  }

  const phoneMatch = (html.match(/href="tel:\+?([\d\-]+)"/) || [])[1];
  const phone = phoneMatch ? `(${phoneMatch.slice(2, 5)}) ${phoneMatch.slice(5, 8)}-${phoneMatch.slice(8)}` : '';
  const addressMatch = (html.match(/<address[^>]*>([\s\S]*?)<\/address>/i) || [])[1] || '';
  const address = addressMatch.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return { title, description, canonical, headings, wordCount, text, internal, external, images, ctaButtons, faqs, testimonials, phone, address };
}

const pages = [];
for (const { path, route } of findHtml(distDir)) {
  const html = readFileSync(path, 'utf8');
  const ex = extract(html);
  const slugSafe = route === '/' ? 'home' : route.replace(/[\/]/g, '-').replace(/^-|-$/g, '');

  const rawHtmlDir = join(qaDir, 'rawhtml');
  mkdirSync(rawHtmlDir, { recursive: true });
  const rawHtmlPath = join(rawHtmlDir, `${slugSafe}.html`);
  writeFileSync(rawHtmlPath, html, 'utf8');

  const page = {
    url: `https://littlefriendslearningloft.com${route}`,
    slug: route,
    scraped_at: new Date().toISOString(),
    metadata: {
      title: ex.title,
      description: ex.description,
      statusCode: 200,
      ...(ex.canonical ? { canonical: ex.canonical } : {}),
    },
    content: { markdown: ex.text.slice(0, 30000), wordCount: ex.wordCount, headings: ex.headings },
    links: { internal: ex.internal, external: ex.external },
    images: ex.images,
    screenshots: { desktop: null, mobile: null },
    extracted: {
      ctaButtons: ex.ctaButtons,
      contact: { ...(ex.phone ? { phone: ex.phone } : {}), ...(ex.address ? { address: ex.address } : {}) },
      teamMembers: [],
      testimonials: ex.testimonials,
      faqs: ex.faqs,
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath,
    hasBranding: false,
  };
  writeFileSync(join(qaPagesDir, `${slugSafe}.json`), JSON.stringify(page, null, 2));
  pages.push(slugSafe);
}

console.log(`Extracted ${pages.length} pages from dist/client → qa/pages/`);

const tokenSrc = join(clientDir, 'design-tokens.json');
const tokenDst = join(qaDir, 'design-tokens.json');
if (existsSync(tokenSrc) && !existsSync(tokenDst)) {
  writeFileSync(tokenDst, readFileSync(tokenSrc, 'utf8'));
}

const passes = [
  ['seo', runSeo], ['content', runContent], ['design', runDesign], ['sales', runSales],
  ['links', runLinks], ['schema', runSchema], ['aeo', runAeo], ['geo', runGeo],
  ['typography', runTypography], ['local', runLocal], ['backlinks', runBacklinks],
  ['competitors', runCompetitors],
];

const opts = { vertical: 'preschool' };
const results = [];
for (const [name, fn] of passes) {
  try {
    const r = await fn(slug, qaDir, opts);
    writeFileSync(join(qaAuditDir, `${name}.json`), JSON.stringify(r, null, 2));
    const p0 = r.findings.filter((f) => f.priority === 'p0').length;
    const p1 = r.findings.filter((f) => f.priority === 'p1').length;
    const p2 = r.findings.filter((f) => f.priority === 'p2').length;
    const grade = r.score >= 85 ? 'A' : r.score >= 70 ? 'B' : r.score >= 55 ? 'C' : r.score >= 40 ? 'D' : 'F';
    console.log(`  [${grade}] ${name.padEnd(12)} score=${r.score}/100  p0=${p0} p1=${p1} p2=${p2}`);
    results.push(r);
  } catch (err) {
    console.log(`  [ERR] ${name.padEnd(12)} ${err.message}`);
  }
}

const overall = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
const findings = results.flatMap((r) => r.findings);
const sum = {
  slug, audited_at: new Date().toISOString(),
  source: 'qa-local (post-clone build)',
  overall_score: overall,
  passes_completed: results.length,
  total_findings: findings.length,
  findings_by_priority: {
    p0: findings.filter((f) => f.priority === 'p0').length,
    p1: findings.filter((f) => f.priority === 'p1').length,
    p2: findings.filter((f) => f.priority === 'p2').length,
  },
  scores: Object.fromEntries(results.map((r) => [r.dimension, r.score])),
};
writeFileSync(join(qaAuditDir, 'summary.json'), JSON.stringify(sum, null, 2));
console.log(`\nOverall: ${overall}/100  (was 73/100 pre-clone)`);
console.log(`P0: ${sum.findings_by_priority.p0}  P1: ${sum.findings_by_priority.p1}  P2: ${sum.findings_by_priority.p2}`);
