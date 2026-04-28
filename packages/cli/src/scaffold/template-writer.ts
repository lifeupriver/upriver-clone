import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuditPackage,
  ContentInventory,
  DesignSystem,
  SitePage,
  SiteStructure,
} from '@upriver/core';
import type { ClientFontFace } from './client-assets.js';

export { copyClientAssets } from './client-assets.js';
export type { ClientAssetsManifest, ClientFontFace, ClientLogo } from './client-assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.turbo']);

export interface ScaffoldPaths {
  clientDir: string;
  repoDir: string;
  templateDir: string;
}

export function resolveScaffoldPaths(slug: string, base = './clients'): ScaffoldPaths {
  const clientDir = resolve(base, slug);
  const repoDir = join(clientDir, 'repo');
  const templateDir = resolveTemplateDir();
  return { clientDir, repoDir, templateDir };
}

function resolveTemplateDir(): string {
  // dist layout: packages/cli/dist/scaffold/template-writer.js → ../../../scaffold-template
  // src layout (ts-node): packages/cli/src/scaffold/template-writer.ts → same relative
  const candidates = [
    resolve(__dirname, '..', '..', '..', 'scaffold-template'),
    resolve(process.cwd(), 'packages', 'scaffold-template'),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, 'package.json'))) return c;
  }
  return candidates[0]!;
}

export function copyTemplate(templateDir: string, repoDir: string): void {
  if (!existsSync(templateDir)) {
    throw new Error(`Scaffold template not found at ${templateDir}`);
  }
  mkdirSync(repoDir, { recursive: true });
  copyRecursive(templateDir, repoDir);
}

function copyRecursive(src: string, dest: string): void {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      cpSync(srcPath, destPath);
    }
  }
}

export function applyDesignTokens(
  repoDir: string,
  designSystem: DesignSystem,
  rawTokens: Record<string, unknown> | null,
  clientFonts: ClientFontFace[] = [],
): void {
  const cssPath = join(repoDir, 'src', 'styles', 'global.css');
  const css = renderGlobalCss(designSystem, rawTokens, clientFonts);
  writeFileSync(cssPath, css, 'utf8');
}

// Map commercial / proprietary fonts to free Google Fonts substitutes that are
// visually similar. The clone agent gets a font-family declaration with the
// substitute name + an @import that actually loads the font, so headings and
// body don't fall back to system-ui.
//
// Match is case-insensitive substring on the font's name. Add entries as new
// fonts appear in client design tokens.
interface FontMapping {
  google: string; // Google Fonts family name
  weights: string; // url querystring fragment after wght@
  italics?: string; // optional ital@0,1;wght@... fragment
}

const FONT_SUBSTITUTES: Array<[string, FontMapping]> = [
  ['brandon grotesque', { google: 'Mulish', weights: '300;400;500;700;800', italics: 'ital,wght@0,300..800;1,300..800' }],
  ['freight sans', { google: 'Source Sans 3', weights: '300;400;500;600;700' }],
  ['gastromond', { google: 'Crimson Pro', weights: '400;500;600', italics: 'ital,wght@0,400..600;1,400..600' }],
  ['futura pt', { google: 'Jost', weights: '300;400;500;600;700' }],
  ['futura', { google: 'Jost', weights: '300;400;500;600;700' }],
  ['bebas neue', { google: 'Bebas Neue', weights: '400' }],
  ['halis', { google: 'Mulish', weights: '300;400;500;600;700' }],
  ['playfair', { google: 'Playfair Display', weights: '400;500;600;700', italics: 'ital,wght@0,400..700;1,400..700' }],
  ['proxima nova', { google: 'Mulish', weights: '300;400;500;600;700;800' }],
  ['avenir', { google: 'Nunito Sans', weights: '300;400;600;700' }],
  ['inter', { google: 'Inter', weights: '300;400;500;600;700' }],
  ['montserrat', { google: 'Montserrat', weights: '300;400;500;600;700' }],
  ['lato', { google: 'Lato', weights: '300;400;700' }],
  ['poppins', { google: 'Poppins', weights: '300;400;500;600;700' }],
];

function resolveFont(
  rawName: string,
  clientFonts: ClientFontFace[] = [],
): { displayName: string; importUrl: string | null; clientProvided: boolean } {
  if (!rawName) return { displayName: 'Inter', importUrl: googleFontsUrl('Inter', '400;500;600;700'), clientProvided: false };

  // Real client-provided fonts win — token-based match. Avoids "Brand" matching
  // "Brandon Grotesque" (substring match would have); resilient to mangled names
  // like Squarespace's "Halis Rmedium" → real "Halis Rounded Medium" via shared
  // distinctive token "halis". Pick the family with the most matching tokens;
  // tie-break to the closer-length match.
  const lowerName = rawName.toLowerCase().trim();
  const lookupTokens = tokenize(lowerName);
  const ranked = clientFonts
    .map((f) => {
      const familyTokens = tokenize(f.family);
      const exactEq = f.family.toLowerCase() === lowerName ? 1 : 0;
      const overlap = familyTokens.filter((t) => lookupTokens.includes(t)).length;
      return { f, exactEq, overlap, lengthDelta: Math.abs(f.family.length - rawName.length) };
    })
    .filter((r) => r.overlap > 0 || r.exactEq === 1)
    .sort((a, b) => {
      if (a.exactEq !== b.exactEq) return b.exactEq - a.exactEq;
      if (a.overlap !== b.overlap) return b.overlap - a.overlap;
      return a.lengthDelta - b.lengthDelta;
    });
  if (ranked.length > 0) {
    return { displayName: ranked[0]!.f.family, importUrl: null, clientProvided: true };
  }

  for (const [pattern, sub] of FONT_SUBSTITUTES) {
    if (lowerName.includes(pattern)) {
      const url = sub.italics
        ? `https://fonts.googleapis.com/css2?family=${sub.google.replace(/ /g, '+')}:${sub.italics}&display=swap`
        : googleFontsUrl(sub.google, sub.weights);
      return { displayName: sub.google, importUrl: url, clientProvided: false };
    }
  }
  // Unknown font — try Google Fonts directly with the original name (may 404, that's fine — falls back to system).
  return {
    displayName: rawName,
    importUrl: googleFontsUrl(rawName, '400;500;600;700'),
    clientProvided: false,
  };
}

function googleFontsUrl(family: string, weights: string): string {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights}&display=swap`;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 _-]+/g, ' ')
    .split(/[\s_-]+/)
    .filter((t) => t.length >= 3);
}

function renderGlobalCss(
  ds: DesignSystem,
  raw: Record<string, unknown> | null,
  clientFonts: ClientFontFace[] = [],
): string {
  const colors = { ...ds.colors };
  // raw firecrawl tokens can carry extras (link, success, warning, error)
  const rawColors =
    raw && typeof raw === 'object' && 'colors' in raw && raw.colors && typeof raw.colors === 'object'
      ? (raw.colors as Record<string, string>)
      : {};
  for (const [k, v] of Object.entries(rawColors)) {
    if (typeof v === 'string' && !(k in colors)) colors[k] = v;
  }

  const brandScale = generateScale(colors.primary || '#2f6bff');
  const inkScale = generateScale(colors.textPrimary || '#0f172a');

  const radiusCard = ds.spacing.borderRadius || '0.75rem';
  const radiusButton = inferButtonRadius(raw) || '0.5rem';

  // Prefer raw fonts[] with role=heading/body (often more accurate than the
  // audit's designSystem.typography, which can pick up CSS-variable names that
  // aren't actually rendered).
  const rawFontByRole = collectFontsByRole(raw);
  const headingName = rawFontByRole.heading ?? ds.typography.headingFont ?? 'Inter';
  const bodyName = rawFontByRole.body ?? ds.typography.bodyFont ?? 'Inter';

  const headingResolved = resolveFont(headingName, clientFonts);
  const bodyResolved = resolveFont(bodyName, clientFonts);
  const headingFont = quoteFont(headingResolved.displayName);
  const bodyFont = quoteFont(bodyResolved.displayName);

  // Dedupe @imports (heading and body might map to same Google family) — only
  // emit when the font is NOT client-provided.
  const importUrls = new Set<string>();
  if (headingResolved.importUrl) importUrls.add(headingResolved.importUrl);
  if (bodyResolved.importUrl) importUrls.add(bodyResolved.importUrl);

  // Pick up additional fonts from raw firecrawl tokens — but skip any that
  // already match a client-provided font (that family is local).
  const extraFonts = collectExtraFonts(raw);
  for (const f of extraFonts) {
    const r = resolveFont(f, clientFonts);
    if (r.importUrl) importUrls.add(r.importUrl);
  }

  const importLines = [...importUrls].map((u) => `@import url('${u}');`).join('\n');

  // Emit @font-face for every client-provided font file.
  const fontFaceLines: string[] = [];
  for (const f of clientFonts) {
    fontFaceLines.push(
      `@font-face {\n` +
        `  font-family: '${f.family}';\n` +
        `  font-style: ${f.style};\n` +
        `  font-weight: ${f.weight};\n` +
        `  font-display: swap;\n` +
        `  src: url('${f.src}') format('${f.format}');\n` +
        `}`,
    );
  }
  const fontFaceBlock = fontFaceLines.join('\n');

  const customColorVars: string[] = [];
  for (const [name, value] of Object.entries(colors)) {
    if (['primary', 'secondary', 'accent', 'background', 'textPrimary', 'textSecondary'].includes(name))
      continue;
    customColorVars.push(`  --color-${cssSafe(name)}: ${value};`);
  }

  return `${importLines}
@import 'tailwindcss';

${fontFaceBlock}

/* Design tokens — generated by \`upriver scaffold\` from clients/<slug>/design-tokens.json.
 * Real client-provided webfonts (above @font-face blocks) take precedence over
 * Google Fonts substitutes (@import lines). See packages/cli/src/scaffold/
 * client-assets.ts and FONT_SUBSTITUTES in template-writer.ts. */
@theme {
  --color-brand-50:  ${brandScale[50]};
  --color-brand-100: ${brandScale[100]};
  --color-brand-200: ${brandScale[200]};
  --color-brand-300: ${brandScale[300]};
  --color-brand-400: ${brandScale[400]};
  --color-brand-500: ${brandScale[500]};
  --color-brand-600: ${brandScale[600]};
  --color-brand-700: ${brandScale[700]};
  --color-brand-800: ${brandScale[800]};
  --color-brand-900: ${brandScale[900]};

  --color-ink-50:  ${inkScale[50]};
  --color-ink-100: ${inkScale[100]};
  --color-ink-200: ${inkScale[200]};
  --color-ink-500: ${inkScale[500]};
  --color-ink-700: ${inkScale[700]};
  --color-ink-900: ${inkScale[900]};

  --color-primary:        ${colors.primary};
  --color-secondary:      ${colors.secondary};
  --color-accent:         ${colors.accent};
  --color-background:     ${colors.background};
  --color-text-primary:   ${colors.textPrimary};
  --color-text-secondary: ${colors.textSecondary};
${customColorVars.join('\n')}

  --font-sans:    ${bodyFont}, ui-sans-serif, system-ui, sans-serif;
  --font-display: ${headingFont}, ui-sans-serif, system-ui, sans-serif;

  --radius-card:   ${radiusCard};
  --radius-button: ${radiusButton};
}

html {
  font-family: var(--font-sans);
  color: var(--color-ink-900);
  background: var(--color-background, #ffffff);
}

body {
  min-height: 100vh;
}
`;
}

function inferButtonRadius(raw: Record<string, unknown> | null): string | null {
  if (!raw) return null;
  const components = raw['components'] as { buttonPrimary?: { borderRadius?: string } } | undefined;
  return components?.buttonPrimary?.borderRadius ?? null;
}

function collectExtraFonts(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const t = raw['typography'] as
    | { fontFamilies?: Record<string, string>; fonts?: Array<{ family?: string }> }
    | undefined;
  if (t?.fontFamilies) {
    for (const v of Object.values(t.fontFamilies)) if (typeof v === 'string') out.push(v);
  }
  const fonts = raw['fonts'] as Array<{ family?: string }> | undefined;
  if (Array.isArray(fonts)) {
    for (const f of fonts) if (f?.family) out.push(f.family);
  }
  return out;
}

function collectFontsByRole(raw: Record<string, unknown> | null): { heading?: string; body?: string } {
  if (!raw) return {};
  const fonts = raw['fonts'] as Array<{ family?: string; role?: string }> | undefined;
  if (!Array.isArray(fonts)) return {};
  const out: { heading?: string; body?: string } = {};
  for (const f of fonts) {
    if (!f?.family || !f.role) continue;
    const role = f.role.toLowerCase();
    if ((role === 'heading' || role === 'display') && !out.heading) out.heading = f.family;
    if ((role === 'body' || role === 'paragraph' || role === 'primary') && !out.body) out.body = f.family;
  }
  return out;
}

function quoteFont(font: string): string {
  const trimmed = font.trim();
  if (!trimmed) return "'Inter'";
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) return trimmed;
  // bare keywords like serif/sans-serif/system-ui shouldn't be quoted
  if (/^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)$/i.test(trimmed)) {
    return trimmed;
  }
  return `'${trimmed}'`;
}

function cssSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(base: RGB, target: RGB, amount: number): RGB {
  return {
    r: base.r + (target.r - base.r) * amount,
    g: base.g + (target.g - base.g) * amount,
    b: base.b + (target.b - base.b) * amount,
  };
}

function generateScale(baseHex: string): Record<number, string> {
  const base = hexToRgb(baseHex) ?? { r: 47, g: 107, b: 255 };
  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 12, g: 32, b: 88 };
  return {
    50: rgbToHex(mix(base, white, 0.95)),
    100: rgbToHex(mix(base, white, 0.88)),
    200: rgbToHex(mix(base, white, 0.7)),
    300: rgbToHex(mix(base, white, 0.5)),
    400: rgbToHex(mix(base, white, 0.25)),
    500: rgbToHex(base),
    600: rgbToHex(mix(base, black, 0.2)),
    700: rgbToHex(mix(base, black, 0.4)),
    800: rgbToHex(mix(base, black, 0.6)),
    900: rgbToHex(mix(base, black, 0.78)),
  } as Record<number, string>;
}

export function generateNav(
  repoDir: string,
  siteStructure: SiteStructure,
  clientName: string,
): void {
  const items = navigationItems(siteStructure);
  const navPath = join(repoDir, 'src', 'components', 'astro', 'Nav.astro');
  const labelEscaped = jsString(clientName || 'Home');
  const itemsLiteral = items
    .map((i) => `  { href: ${jsString(i.href)}, label: ${jsString(i.label)} },`)
    .join('\n');

  const content = `---
// Generated by \`upriver scaffold\` from siteStructure.navigation.
const navItems: { href: string; label: string }[] = [
${itemsLiteral}
];
---

<header class="border-b border-ink-200 bg-white">
  <div class="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
    <a href="/" class="text-lg font-semibold text-ink-900">${escapeHtml(clientName || 'Home')}</a>
    <nav class="flex items-center gap-6">
      {navItems.map((item) => (
        <a href={item.href} class="text-sm text-ink-700 hover:text-brand-600">
          {item.label}
        </a>
      ))}
      <a
        href="/contact"
        class="text-sm bg-brand-600 text-white px-4 py-2 rounded-button hover:bg-brand-700"
      >
        Contact
      </a>
    </nav>
  </div>
</header>
`;
  writeFileSync(navPath, content, 'utf8');
}

// Auth/transactional/system paths and patterns that should never land in nav.
const NAV_BLOCKLIST = new Set([
  '/404', '/500', '/403',
  '/cart', '/checkout', '/order', '/orders',
  '/login', '/log-in', '/signin', '/sign-in',
  '/signup', '/sign-up', '/register',
  '/logout', '/log-out', '/signout', '/sign-out',
  '/forgetpassword', '/forgot-password', '/reset-password',
  '/account', '/profile', '/settings',
  '/sitemap', '/sitemap.xml', '/sitemap-xml',
  '/robots.txt',
  '/search',
  '/terms', '/terms-of-service', '/privacy', '/privacy-policy',
]);

function isNavWorthy(href: string, pageUrl?: string): boolean {
  // Exclude pages on app/auth subdomains entirely (e.g., https://app.example.com/login)
  if (pageUrl) {
    try {
      const u = new URL(pageUrl);
      if (/^(app|auth|account|admin|portal|api)\./i.test(u.hostname)) return false;
    } catch {
      /* ignore */
    }
  }
  const path = href.toLowerCase();
  if (NAV_BLOCKLIST.has(path)) return false;
  if (path.startsWith('/admin/') || path.startsWith('/api/')) return false;
  // Exclude obvious system/util paths by suffix or fragment-like names
  if (/-(nav|sitemap|footer)$/.test(path)) return false;
  return true;
}

function navigationItems(structure: SiteStructure): Array<{ href: string; label: string }> {
  const primary = structure.navigation?.primary ?? [];
  if (primary.length > 0) {
    return primary
      .map((p) => ({ href: ensureLeadingSlash(p.href), label: p.label }))
      .filter((i) => isNavWorthy(i.href));
  }
  // Fallback: derive from pages, prefer shallow paths, exclude system/auth pages
  const seen = new Set<string>();
  const items: Array<{ href: string; label: string }> = [];
  // Sort by depth (fewer slashes first) so top-level paths win
  const sorted = [...structure.pages].sort((a, b) => {
    const da = (a.slug || '').split('/').filter(Boolean).length;
    const db = (b.slug || '').split('/').filter(Boolean).length;
    return da - db;
  });
  for (const page of sorted) {
    const slug = page.slug || '/';
    const href = ensureLeadingSlash(slug);
    if (seen.has(href)) continue;
    seen.add(href);
    if (href === '/' || isHomeSlug(slug)) {
      if (!seen.has('/')) {
        items.push({ href: '/', label: 'Home' });
        seen.add('/');
      }
      continue;
    }
    if (!isNavWorthy(href, page.url)) continue;
    items.push({ href, label: page.title?.split(' | ')[0]?.split(' - ')[0]?.trim() || labelFromHref(href) });
    if (items.length >= 7) break;
  }
  if (items.length === 0) items.push({ href: '/', label: 'Home' });
  return items;
}

function isHomeSlug(slug: string): boolean {
  const s = slug.toLowerCase().replace(/^\/+|\/+$/g, '');
  return s === '' || s === 'home' || s === 'index';
}

function labelFromHref(href: string): string {
  const seg = href.replace(/^\/+|\/+$/g, '').split('/').pop() ?? 'Home';
  return seg
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Home';
}

function ensureLeadingSlash(href: string): string {
  if (!href) return '/';
  if (/^https?:/i.test(href)) {
    try {
      const u = new URL(href);
      return u.pathname || '/';
    } catch {
      return '/';
    }
  }
  return href.startsWith('/') ? href : `/${href}`;
}

function jsString(s: string): string {
  return JSON.stringify(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PageRecord {
  url: string;
  slug: string;
  metadata?: { title?: string; description?: string };
  content?: { markdown?: string };
}

export function seedPages(repoDir: string, pages: PageRecord[], sitePages: SitePage[]): number {
  const dir = join(repoDir, 'src', 'content', 'pages');
  mkdirSync(dir, { recursive: true });
  const sitePageBySlug = new Map(sitePages.map((p) => [normalizeSlug(p.slug), p]));
  let written = 0;

  for (const page of pages) {
    const slug = normalizeSlug(page.slug || page.url);
    const fileSlug = slug === '/' || slug === '' ? 'index' : slug.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    const sp = sitePageBySlug.get(slug) ?? sitePageBySlug.get(`/${fileSlug}`);
    const title = page.metadata?.title || sp?.title || titleFromSlug(fileSlug);
    const description = page.metadata?.description || sp?.description || '';
    const cta = sp?.ctaButtons?.[0];

    const fm: string[] = [
      `title: ${yamlString(title)}`,
      `description: ${yamlString(description)}`,
    ];
    const headings = sp?.headings ?? [];
    const h1 = headings.find((h) => h.level === 1)?.text;
    if (h1) fm.push(`heroHeadline: ${yamlString(h1)}`);
    if (description && !h1) fm.push(`heroSubhead: ${yamlString(description)}`);
    if (cta?.text) fm.push(`ctaLabel: ${yamlString(cta.text)}`);
    if (cta?.href) fm.push(`ctaHref: ${yamlString(ensureLeadingSlash(cta.href))}`);

    const body = (page.content?.markdown || '').trim() || `# ${title}\n\n${description}`.trim();
    const file = `---\n${fm.join('\n')}\n---\n\n${body}\n`;
    writeFileSync(join(dir, `${fileSlug}.md`), file, 'utf8');
    written += 1;
  }
  return written;
}

export function seedTestimonials(repoDir: string, inv: ContentInventory): number {
  const dir = join(repoDir, 'src', 'content', 'testimonials');
  mkdirSync(dir, { recursive: true });
  let written = 0;
  for (const [i, t] of inv.testimonials.entries()) {
    const author = t.attribution?.split(',')[0]?.trim() || `Customer ${i + 1}`;
    const role = t.attribution?.split(',').slice(1).join(',').trim();
    const data: Record<string, unknown> = {
      quote: t.quote,
      author,
    };
    if (role) data.role = role;
    writeFileSync(join(dir, `${slugifyName(author)}-${i + 1}.json`), JSON.stringify(data, null, 2), 'utf8');
    written += 1;
  }
  return written;
}

export function seedFaqs(repoDir: string, inv: ContentInventory): number {
  const dir = join(repoDir, 'src', 'content', 'faqs');
  mkdirSync(dir, { recursive: true });
  let written = 0;
  for (const [i, f] of inv.faqs.entries()) {
    const data = { question: f.question, answer: f.answer, order: i + 1 };
    writeFileSync(join(dir, `${slugifyName(f.question).slice(0, 40)}-${i + 1}.json`), JSON.stringify(data, null, 2), 'utf8');
    written += 1;
  }
  return written;
}

export function seedTeam(repoDir: string, inv: ContentInventory): number {
  const dir = join(repoDir, 'src', 'content', 'team');
  mkdirSync(dir, { recursive: true });
  let written = 0;
  for (const [i, m] of inv.teamMembers.entries()) {
    const data = { name: m.name, role: m.role, order: i + 1 };
    writeFileSync(join(dir, `${slugifyName(m.name)}-${i + 1}.json`), JSON.stringify(data, null, 2), 'utf8');
    written += 1;
  }
  return written;
}

export function copyImages(clientDir: string, repoDir: string): number {
  const src = join(clientDir, 'assets', 'images');
  if (!existsSync(src)) return 0;
  const dest = join(repoDir, 'public', 'images');
  mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of walk(src)) {
    const rel = relative(src, entry);
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    cpSync(entry, out);
    count += 1;
  }
  return count;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile()) yield p;
  }
}

export function writeChangelog(repoDir: string, pkg: AuditPackage): void {
  const path = join(repoDir, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const content = `# Changelog

All notable changes to this site are tracked here. The \`upriver clone\` and \`upriver fixes apply\` commands append entries automatically; humans add entries for manual edits.

## [Unreleased]

## [0.1.0] — ${date}

### Added
- Initial scaffold from \`upriver scaffold ${pkg.meta.clientSlug}\`.
- Astro 6 hybrid template seeded with ${pkg.meta.totalPages} pages from the audit.
- Design tokens applied from \`design-tokens.json\` (overall audit score: ${pkg.meta.overallScore}/100).
- Content collections seeded: testimonials, FAQs, team.
- Navigation generated from discovered site map.
`;
  writeFileSync(path, content, 'utf8');
}

export function ensureProductMarketingContext(
  repoDir: string,
  pkg: AuditPackage,
  builder: (pkg: AuditPackage) => string,
): void {
  const dir = join(repoDir, '.agents');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'product-marketing-context.md');
  if (!existsSync(path)) writeFileSync(path, builder(pkg), 'utf8');
}

export function ensureClaudeMd(
  repoDir: string,
  pkg: AuditPackage,
  builder: (pkg: AuditPackage) => string,
): void {
  const path = join(repoDir, 'CLAUDE.md');
  if (!existsSync(path)) writeFileSync(path, builder(pkg), 'utf8');
}

export function loadAuditPackage(clientDir: string): AuditPackage {
  const path = join(clientDir, 'audit-package.json');
  if (!existsSync(path)) {
    throw new Error(`audit-package.json not found at ${path}. Run "upriver synthesize" first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as AuditPackage;
}

export function loadDesignTokens(clientDir: string): Record<string, unknown> | null {
  const path = join(clientDir, 'design-tokens.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

export function loadPageRecords(clientDir: string): PageRecord[] {
  const dir = join(clientDir, 'pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as PageRecord)
    .filter((p) => p && p.url);
}

function normalizeSlug(slug: string): string {
  if (!slug) return '/';
  if (/^https?:/i.test(slug)) {
    try {
      const u = new URL(slug);
      return u.pathname || '/';
    } catch {
      return '/';
    }
  }
  if (slug === 'index' || slug === '') return '/';
  return slug.startsWith('/') ? slug : `/${slug}`;
}

function titleFromSlug(slug: string): string {
  if (!slug || slug === 'index' || slug === '/') return 'Home';
  return slug
    .replace(/^\/+|\/+$/g, '')
    .split(/[/_-]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function slugifyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

function yamlString(s: string): string {
  const safe = s.replace(/'/g, "''").replace(/\r?\n/g, ' ');
  return `'${safe}'`;
}
