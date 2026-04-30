/**
 * Audit embeds (iframes, forms, third-party scripts) across the live site
 * vs. the cloned site, so we never silently lose a Google Map, a Calendly
 * widget, an inquiry form, or a Mailchimp signup.
 *
 * Inputs:
 *   - clients/<slug>/rawhtml/*.html  — the live page DOM as Firecrawl saw it
 *   - clients/<slug>/repo/dist/client/**.html — the built clone
 *
 * For each page in the live site we extract:
 *   - iframes (src, width, height, recognized provider — Google Maps,
 *     YouTube, Vimeo, Calendly, Tally, Typeform, Mailchimp, etc.)
 *   - forms (action URL, method, every <input>/<select>/<textarea> with
 *     name + type + required + placeholder)
 *   - script-driven embeds (script src patterns we recognize as widgets:
 *     Calendly inline, Mailchimp signup, HubSpot forms, Stripe Buy Button,
 *     etc.) — these need to be ported to Astro components
 *
 * Then we scan the matching cloned page for the same set. If an embed
 * exists on the live page but not on the clone, it's flagged.
 *
 * Output: clients/<slug>/clone-embed-report.json with a finding per missing
 * embed. CLI exits non-zero when issues remain (gates the build).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { AuditPackage, SitePage } from '@upriver/core';

export type EmbedKind = 'iframe' | 'form' | 'script-widget';

export interface IframeEmbed {
  kind: 'iframe';
  src: string;
  provider: string;
  width: number | null;
  height: number | null;
}

export interface FormField {
  tag: 'input' | 'select' | 'textarea' | 'button';
  name?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export interface FormEmbed {
  kind: 'form';
  action: string | null;
  method: string;
  enctype: string | null;
  fieldCount: number;
  fields: FormField[];
  hasSubmit: boolean;
  recognizable: 'inquiry' | 'newsletter' | 'rsvp' | 'donation' | 'unknown';
}

export interface ScriptWidget {
  kind: 'script-widget';
  src: string;
  provider: string;
}

export type EmbedFinding = IframeEmbed | FormEmbed | ScriptWidget;

export interface PageEmbeds {
  page: string;
  iframes: IframeEmbed[];
  forms: FormEmbed[];
  scripts: ScriptWidget[];
}

export interface EmbedAuditReport {
  generatedAt: string;
  livePages: PageEmbeds[];
  clonePages: PageEmbeds[];
  /** One issue per missing-on-clone live embed. */
  missing: Array<{
    page: string;
    livePath: string;
    embed: EmbedFinding;
    suggestion: string;
  }>;
  summary: { liveTotal: number; cloneTotal: number; missingTotal: number };
}

// --- iframe provider classification --------------------------------------

const IFRAME_PROVIDERS: Array<[RegExp, string]> = [
  [/google\.com\/maps|maps\.google\.|generateMap\.php/i, 'google-maps'],
  [/youtube\.com\/embed|youtu\.be/i, 'youtube'],
  [/player\.vimeo\.com/i, 'vimeo'],
  [/calendly\.com/i, 'calendly'],
  [/tally\.so/i, 'tally'],
  [/typeform\.com/i, 'typeform'],
  [/(?:list-manage|mailchimp)\.com/i, 'mailchimp'],
  [/forms\.gle|docs\.google\.com\/forms/i, 'google-forms'],
  [/squarespace-cdn\.com|squarespace\.com\/embed/i, 'squarespace-embed'],
  [/instagram\.com\/p\/|instagram\.com\/embed/i, 'instagram'],
  [/open\.spotify\.com\/embed/i, 'spotify'],
  [/airtable\.com\/embed/i, 'airtable'],
  [/jotform\.com/i, 'jotform'],
  [/eventbrite\.com\/static\/widgets/i, 'eventbrite'],
];

const SCRIPT_WIDGETS: Array<[RegExp, string]> = [
  [/assets\.calendly\.com\/assets\/external\/widget\.js/i, 'calendly-inline'],
  [/list-manage\.com.*?\.js/i, 'mailchimp-signup'],
  [/js\.hsforms\.net/i, 'hubspot-forms'],
  [/buy\.stripe\.com\/.*\.js|js\.stripe\.com\/v3\/buy-button\.js/i, 'stripe-buy'],
  [/widget\.tally\.so/i, 'tally-widget'],
  [/embed\.typeform\.com/i, 'typeform-widget'],
  [/static\.klaviyo\.com\/onsite\/js\/klaviyo\.js/i, 'klaviyo-signup'],
  [/cdn\.shopify\.com\/.*\/buy-button-js/i, 'shopify-buy-button'],
  [/embed\.beehiiv\.com/i, 'beehiiv'],
];

function classifyIframe(src: string): string {
  for (const [re, name] of IFRAME_PROVIDERS) if (re.test(src)) return name;
  return 'unknown';
}

function classifyScript(src: string): string | null {
  for (const [re, name] of SCRIPT_WIDGETS) if (re.test(src)) return name;
  return null;
}

// --- HTML extraction (regex — fast, good enough for embed-shape detection) -

const IFRAME_RE = /<iframe\b([^>]*)>/gi;
const FORM_RE = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
const SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')[^>]*>\s*<\/script>/gi;
const ATTR_RE = /\b([a-zA-Z][\w-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

function attrs(attrStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of attrStr.matchAll(ATTR_RE)) {
    out[m[1]!.toLowerCase()] = (m[3] ?? m[4] ?? '').trim();
  }
  return out;
}

function extractIframes(html: string): IframeEmbed[] {
  const out: IframeEmbed[] = [];
  for (const m of html.matchAll(IFRAME_RE)) {
    const a = attrs(m[1] ?? '');
    const src = a['src'] || '';
    if (!src || src.startsWith('about:')) continue;
    const w = parseInt(a['width'] || '', 10);
    const h = parseInt(a['height'] || '', 10);
    out.push({
      kind: 'iframe',
      src,
      provider: classifyIframe(src),
      width: Number.isFinite(w) ? w : null,
      height: Number.isFinite(h) ? h : null,
    });
  }
  return out;
}

function classifyForm(action: string | null, fields: FormField[]): FormEmbed['recognizable'] {
  const a = (action ?? '').toLowerCase();
  const names = fields.map((f) => (f.name ?? '').toLowerCase()).join(' ');
  const placeholders = fields.map((f) => (f.placeholder ?? '').toLowerCase()).join(' ');
  const allText = names + ' ' + placeholders;
  const hasEmail = fields.some((f) => f.type === 'email') || /\bemail\b/.test(allText);
  const hasAmount = /\bamount|\$/.test(allText);
  const hasMessage = fields.some((f) => f.tag === 'textarea') || /\bmessage\b/.test(allText);
  const hasName = /\bname\b|\bfirst|\blast/.test(allText);
  const hasChild = /\bchild|\btoddler|\binfant|\bprek/.test(allText);
  const hasSchedule = /\bschedule|\bweek|\bday|\bsession|\bdate/.test(allText);

  // Newsletter: just email (1-3 fields).
  if (hasEmail && fields.length <= 3 && !hasMessage && !hasChild && !hasAmount) return 'newsletter';
  if (a.includes('newsletter') || a.includes('subscribe')) return 'newsletter';
  // Donation.
  if (/\bdonate|donation|gift/.test(a) || hasAmount) return 'donation';
  // RSVP.
  if (/\brsvp\b|\battendees?\b/.test(allText) || /\brsvp\b/.test(a)) return 'rsvp';
  // Inquiry / admission / enrollment — explicit action keyword OR presence
  // of "child" / "schedule" or a healthy contact-form shape (name + email +
  // message). Square Online's `/app/cms/api/v1/schemas/<uuid>` endpoint is
  // anonymous, so we lean on field shape.
  if (
    /contact|inquiry|inquire|enrol|admission/.test(a) ||
    hasChild ||
    hasSchedule ||
    (hasName && hasEmail && (hasMessage || fields.length >= 4))
  ) {
    return 'inquiry';
  }
  return 'unknown';
}

function extractForms(html: string): FormEmbed[] {
  const out: FormEmbed[] = [];
  for (const m of html.matchAll(FORM_RE)) {
    const a = attrs(m[1] ?? '');
    const inner = m[2] ?? '';
    const fields: FormField[] = [];
    for (const im of inner.matchAll(/<(input|select|textarea|button)\b([^>]*)/gi)) {
      const tag = im[1]!.toLowerCase() as FormField['tag'];
      const ia = attrs(im[2] ?? '');
      // Skip Square Online's hidden chrome inputs.
      if (ia['type'] === 'hidden' && /__|csrf|token|nonce/i.test(ia['name'] ?? '')) continue;
      const f: FormField = { tag };
      if (ia['name']) f.name = ia['name'];
      if (ia['type']) f.type = ia['type'];
      if ('required' in ia || ia['required'] === '' || ia['required'] === 'required') f.required = true;
      if (ia['placeholder']) f.placeholder = ia['placeholder'];
      fields.push(f);
    }
    const action = a['action'] || null;
    const hasSubmit = fields.some(
      (f) => f.tag === 'button' && (f.type === 'submit' || f.type === undefined),
    ) || /<button[^>]*type=["']?submit/i.test(inner);
    out.push({
      kind: 'form',
      action,
      method: (a['method'] || 'GET').toUpperCase(),
      enctype: a['enctype'] || null,
      fieldCount: fields.length,
      fields,
      hasSubmit,
      recognizable: classifyForm(action, fields),
    });
  }
  return out;
}

function extractScriptWidgets(html: string): ScriptWidget[] {
  const out: ScriptWidget[] = [];
  for (const m of html.matchAll(SCRIPT_RE)) {
    const src = (m[2] ?? m[3] ?? '').trim();
    if (!src) continue;
    const provider = classifyScript(src);
    if (!provider) continue;
    out.push({ kind: 'script-widget', src, provider });
  }
  return out;
}

export function extractEmbeds(html: string): { iframes: IframeEmbed[]; forms: FormEmbed[]; scripts: ScriptWidget[] } {
  return { iframes: extractIframes(html), forms: extractForms(html), scripts: extractScriptWidgets(html) };
}

// --- Page slug helpers ----------------------------------------------------

export function pageFileSlug(p: SitePage): string {
  if (p.slug === 'home' || p.slug === '/' || p.slug === '') return 'home';
  return p.slug.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

function expectedDistPath(distRoot: string, p: SitePage): string {
  let path = p.slug || '/';
  try {
    if (/^https?:/i.test(path)) path = new URL(p.url).pathname || '/';
  } catch {
    /* ignore */
  }
  if (p.slug === 'home' || path === '/' || path === '') return join(distRoot, 'index.html');
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/+$/, '');
  return join(distRoot, path.slice(1), 'index.html');
}

// --- Audit ----------------------------------------------------------------

export function auditEmbeds(
  rawHtmlDir: string,
  distRoot: string,
  pkg: AuditPackage,
): EmbedAuditReport {
  const livePages: PageEmbeds[] = [];
  const clonePages: PageEmbeds[] = [];
  const missing: EmbedAuditReport['missing'] = [];

  // Skip Square Online editor-chrome paths and crawler artifacts. These
  // aren't brand pages and their embeds are platform UI.
  const SKIP_PATH = /^\/(s\/|product\/?|cart|checkout|sitemap|support|account|login)/i;
  const livePageList = pkg.siteStructure.pages.filter((p) => {
    if (p.statusCode >= 400) return false;
    let path = '/';
    try {
      path = new URL(p.url).pathname || '/';
    } catch {
      path = p.slug.startsWith('/') ? p.slug : '/' + p.slug;
    }
    return !SKIP_PATH.test(path);
  });

  for (const p of livePageList) {
    const slug = pageFileSlug(p);
    const rawPath = join(rawHtmlDir, `${slug}.html`);
    if (!existsSync(rawPath)) continue;
    const liveHtml = readFileSync(rawPath, 'utf8');
    const liveEmbeds = extractEmbeds(liveHtml);
    // Many sites (Square Online, Wix, page builders) render iframes via JS
    // post-load, so they're absent from rawhtml. Merge in iframes captured
    // by Playwright in clients/<slug>/ux-profile/<page>.json.
    const uxPath = join(rawHtmlDir, '..', 'ux-profile', `${slug}.json`);
    if (existsSync(uxPath)) {
      try {
        const ux = JSON.parse(readFileSync(uxPath, 'utf8')) as Record<
          string,
          { iframes?: Array<{ src: string; width?: number; height?: number }> }
        >;
        const desktop = ux['desktop'] ?? Object.values(ux)[0];
        if (desktop?.iframes) {
          for (const i of desktop.iframes) {
            // De-dupe with any iframe rawhtml already captured.
            if (liveEmbeds.iframes.some((e) => e.src === i.src)) continue;
            liveEmbeds.iframes.push({
              kind: 'iframe',
              src: i.src,
              provider: classifyIframe(i.src),
              width: i.width ?? null,
              height: i.height ?? null,
            });
          }
        }
      } catch {
        /* ignore malformed ux-profile */
      }
    }
    livePages.push({ page: slug, ...liveEmbeds });

    const clonePath = expectedDistPath(distRoot, p);
    const cloneEmbeds = existsSync(clonePath)
      ? extractEmbeds(readFileSync(clonePath, 'utf8'))
      : { iframes: [], forms: [], scripts: [] };
    clonePages.push({ page: slug, ...cloneEmbeds });

    const livePath = (() => {
      try {
        return new URL(p.url).pathname;
      } catch {
        return p.slug;
      }
    })();

    // Iframe matches: provider type counts.
    const liveProviders = liveEmbeds.iframes
      .map((i) => i.provider)
      .filter((p) => p !== 'unknown' && p !== 'squarespace-embed');
    const cloneProviders = cloneEmbeds.iframes.map((i) => i.provider);
    for (const lp of liveProviders) {
      if (!cloneProviders.includes(lp)) {
        const live = liveEmbeds.iframes.find((i) => i.provider === lp)!;
        missing.push({
          page: slug,
          livePath,
          embed: live,
          suggestion: suggestionForIframe(lp, live.src),
        });
      }
    }

    // Form coverage: only flag MEANINGFUL forms (inquiry/donation/newsletter/rsvp).
    // Square Online injects search, cart-add, and pagination forms with empty
    // action and ≤2 fields — those are platform chrome, not brand forms.
    for (const lf of liveEmbeds.forms) {
      if (lf.fieldCount === 0) continue;
      if (lf.recognizable === 'unknown') continue;
      // Empty-action mini-forms (≤2 fields) are almost certainly chrome.
      if ((!lf.action || lf.action === '') && lf.fieldCount <= 2) continue;
      const has = cloneEmbeds.forms.find(
        (cf) => cf.recognizable === lf.recognizable && cf.fieldCount >= Math.min(lf.fieldCount - 1, 2),
      );
      if (!has) {
        missing.push({
          page: slug,
          livePath,
          embed: lf,
          suggestion: suggestionForForm(lf),
        });
      }
    }

    // Script widgets — every recognized script must exist on the clone or
    // be replaced with an equivalent Astro component.
    for (const ls of liveEmbeds.scripts) {
      const has = cloneEmbeds.scripts.find((cs) => cs.provider === ls.provider) ||
        // Recognize Calendly inline → Astro Calendly iframe replacement
        (ls.provider === 'calendly-inline' && cloneEmbeds.iframes.some((i) => i.provider === 'calendly'));
      if (!has) {
        missing.push({
          page: slug,
          livePath,
          embed: ls,
          suggestion: suggestionForScript(ls),
        });
      }
    }
  }

  const liveTotal = livePages.reduce(
    (a, p) => a + p.iframes.length + p.forms.filter((f) => f.fieldCount > 0).length + p.scripts.length,
    0,
  );
  const cloneTotal = clonePages.reduce(
    (a, p) => a + p.iframes.length + p.forms.filter((f) => f.fieldCount > 0).length + p.scripts.length,
    0,
  );

  return {
    generatedAt: new Date().toISOString(),
    livePages,
    clonePages,
    missing,
    summary: { liveTotal, cloneTotal, missingTotal: missing.length },
  };
}

function suggestionForIframe(provider: string, src: string): string {
  switch (provider) {
    case 'google-maps':
      return 'Embed a Google Maps iframe in the matching section. Prefer the address-query form so no API key is needed: `https://www.google.com/maps?q=<address>&output=embed`.';
    case 'youtube':
      return `Embed a YouTube iframe: \`<iframe src="${src}" loading="lazy" allowfullscreen></iframe>\`.`;
    case 'vimeo':
      return `Embed a Vimeo iframe with \`loading="lazy"\` and \`allowfullscreen\`.`;
    case 'calendly':
      return 'Embed a Calendly iframe at the same scheduling URL — no Calendly widget script needed.';
    case 'instagram':
      return 'Use the Instagram blockquote embed (or pull the Astro IG-feed component if available). Avoid relying on Instagram\'s widget script alone.';
    case 'tally':
    case 'typeform':
    case 'jotform':
    case 'google-forms':
      return `Embed the ${provider} iframe at the same form URL. Reproducing a third-party form natively in Astro is acceptable when the fields are simple.`;
    default:
      return 'Reproduce this iframe in the cloned page or, if simple, recreate it as Astro markup.';
  }
}

function suggestionForForm(f: FormEmbed): string {
  const action =
    f.recognizable === 'newsletter'
      ? '/api/newsletter'
      : f.recognizable === 'donation'
      ? '/api/donate'
      : '/api/inquiry';
  const fieldList = f.fields
    .filter((x) => x.tag !== 'button')
    .map((x) => `${x.name ?? '(unnamed)'}:${x.type ?? x.tag}${x.required ? '*' : ''}`)
    .join(', ');
  return `Recreate as a native Astro form posting to \`${action}\`. Required fields: ${fieldList || '(see live page)'}.`;
}

function suggestionForScript(s: ScriptWidget): string {
  switch (s.provider) {
    case 'mailchimp-signup':
      return 'Replace with a native newsletter <form action="/api/newsletter"> matching the Mailchimp field names so the existing Mailchimp list still works.';
    case 'hubspot-forms':
      return 'Replace with a native inquiry form posting to /api/inquiry, or embed the HubSpot iframe form at portalId/formId.';
    case 'calendly-inline':
      return 'Replace with a Calendly iframe at the same /<user>/<event-type> URL.';
    case 'klaviyo-signup':
      return 'Replace with a native newsletter form, or embed the Klaviyo iframe.';
    default:
      return `Provider "${s.provider}" needs a native Astro replacement or inlined widget.`;
  }
}

/**
 * Walk a directory tree returning every .html file path (relative). Used by
 * the CLI to scan the dist for unreferenced clone-only embeds (informational).
 */
export function listHtml(root: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.html')) out.push(relative(root, full));
    }
  };
  walk(root);
  return out;
}
