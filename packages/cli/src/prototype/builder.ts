// F04 prototype builder. Copies the template, fills placeholders with
// per-client values, and writes per-client data.ts. Pure-ish — does file IO
// but no spawning or network.

import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import type { AuditPackage } from '@upriver/core';

export interface DesignTokens {
  colors?: Record<string, string> | undefined;
  fonts?: string[] | undefined;
  [k: string]: unknown;
}

export interface ServiceItem { name: string; description: string }
export interface TeamMember { name: string; role: string }
export interface ContactInfo {
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
}
export interface ClientContent {
  brandName: string;
  tagline: string;
  heroImage: string | null;
  about: string;
  services: ServiceItem[];
  team: TeamMember[];
  contact: ContactInfo;
  galleryImages: string[];
}

export interface BuildInputs {
  slug: string;
  clientName: string;
  vertical: string | undefined;
  audit: AuditPackage | null;
  designTokens: DesignTokens | null;
  /** Authentic image URLs from F01 inventory; used to filter galleryImages. */
  authenticImageUrls: string[];
  /** Heuristic fallback when F01 hasn't run: every scraped image. */
  fallbackImageUrls: string[];
  /** Hero image candidate. Falls back to first authentic image, then first fallback image. */
  heroOverride: string | null;
  /** Operator-readable industry-friendly label for the third tab. */
  servicesLabel: string;
  templateDir: string;
  outputDir: string;
}

export interface BuildResult {
  filesWritten: string[];
  themeColors: ThemeColors;
  content: ClientContent;
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

const FALLBACK_THEME: ThemeColors = {
  primary: '#1f7a4d',
  accent: '#a14a1a',
  background: '#fafaf7',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
};

export function deriveThemeColors(tokens: DesignTokens | null): ThemeColors {
  if (!tokens?.colors) return FALLBACK_THEME;
  const c = tokens.colors;
  // Tokens come in a variety of shapes — Firecrawl branding extractor uses
  // camelCase keys like `primary`, `accent`, `background`, `text`. Try the
  // common keys; fall back to the first colour for any missing slot.
  const values = Object.values(c).filter((v): v is string => typeof v === 'string' && v.length > 0);
  const pick = (preferred: Array<keyof typeof c | string>, fallback: string): string => {
    for (const key of preferred) {
      const v = (c as Record<string, string | undefined>)[String(key)];
      if (v && /^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    }
    return fallback;
  };
  return {
    primary: pick(['primary', 'brand', 'accent'], values[0] ?? FALLBACK_THEME.primary),
    accent: pick(['accent', 'secondary', 'highlight'], values[1] ?? FALLBACK_THEME.accent),
    background: pick(['background', 'bg'], FALLBACK_THEME.background),
    surface: pick(['surface', 'card', 'paper'], FALLBACK_THEME.surface),
    text: pick(['text', 'foreground', 'fg'], FALLBACK_THEME.text),
    muted: pick(['muted', 'subtle', 'neutral'], FALLBACK_THEME.muted),
    border: pick(['border', 'divider', 'rule'], FALLBACK_THEME.border),
  };
}

export function deriveContent(inputs: BuildInputs): ClientContent {
  const audit = inputs.audit;
  const ci = audit?.contentInventory;
  const meta = audit?.meta;

  const tagline = (() => {
    const headlines = audit?.brandVoiceDraft?.sampleHeadlines;
    if (headlines && headlines.length > 0 && headlines[0]) return headlines[0];
    return inputs.vertical ? `Your local ${inputs.vertical.replace(/-/g, ' ')}` : 'Welcome';
  })();

  const team = (ci?.teamMembers ?? []).map((m) => ({ name: m.name, role: m.role ?? '' })).slice(0, 8);
  const services: ServiceItem[] = [];
  for (const ev of ci?.eventSpaces ?? []) {
    services.push({ name: ev.name, description: ev.description ?? '' });
  }
  for (const p of ci?.pricing ?? []) {
    if (!services.find((s) => s.name === p.item)) services.push({ name: p.item, description: '' });
  }

  const about = (() => {
    const body = audit?.brandVoiceDraft?.sampleBodyCopy;
    if (body && body.length > 0 && body[0]) return body[0].slice(0, 600);
    return `${inputs.clientName}, built with Upriver.`;
  })();

  const contact: ContactInfo = {
    phone: ci?.contactInfo?.phone ?? null,
    email: ci?.contactInfo?.email ?? null,
    address: ci?.contactInfo?.address ?? null,
    hours: ci?.contactInfo?.hours ?? null,
  };

  const allowedSet = new Set(inputs.authenticImageUrls);
  const candidateImages = inputs.authenticImageUrls.length > 0
    ? inputs.authenticImageUrls
    : inputs.fallbackImageUrls;
  const galleryImages = candidateImages.filter((u) => isLikelyGalleryImage(u)).slice(0, 6);

  const heroImage = inputs.heroOverride
    ?? candidateImages.find((u) => isLikelyHero(u, allowedSet))
    ?? candidateImages[0]
    ?? null;

  void meta;

  return {
    brandName: inputs.clientName,
    tagline,
    heroImage,
    about,
    services,
    team,
    contact,
    galleryImages,
  };
}

function isLikelyHero(url: string, _allowed: Set<string>): boolean {
  return /hero|cover|main|banner/i.test(url);
}

function isLikelyGalleryImage(url: string): boolean {
  if (/logo|favicon|icon|sprite/i.test(url)) return false;
  if (/\.svg($|\?)/i.test(url)) return false;
  return /\.(jpe?g|png|webp|avif)($|\?)/i.test(url);
}

const VERTICAL_SERVICES_LABEL: Record<string, string> = {
  preschool: 'Programs',
  'wedding-venue': 'Packages',
  restaurant: 'Menu',
  'professional-services': 'Services',
  generic: 'Services',
};

export function servicesLabelFor(vertical: string | undefined): string {
  return VERTICAL_SERVICES_LABEL[vertical ?? 'generic'] ?? 'Services';
}

/**
 * Copy the entire `templateDir` recursively into `outputDir`, performing
 * placeholder substitution on every text-like file. Returns the list of files
 * written, with paths relative to `outputDir`.
 */
export function buildPrototype(inputs: BuildInputs): BuildResult {
  const colors = deriveThemeColors(inputs.designTokens);
  const content = deriveContent(inputs);

  const replacements: Record<string, string> = {
    APP_NAME: inputs.clientName,
    APP_SLUG: inputs.slug,
    BRAND_PRIMARY: colors.primary,
    BRAND_ACCENT: colors.accent,
    BRAND_BACKGROUND: colors.background,
    BRAND_SURFACE: colors.surface,
    BRAND_TEXT: colors.text,
    BRAND_MUTED: colors.muted,
    BRAND_BORDER: colors.border,
    SERVICES_LABEL: inputs.servicesLabel,
  };

  const written: string[] = [];
  copyTreeWithSubst(inputs.templateDir, inputs.outputDir, replacements, written);

  // Inject the structured content payload into data.ts.
  const dataPath = join(inputs.outputDir, 'src', 'data.ts');
  const dataSrc = readFileSync(dataPath, 'utf8');
  const replaced = dataSrc.replace(
    /\/\* CONTENT_PAYLOAD \*\/[\s\S]*?as unknown as ClientContent;/,
    `${JSON.stringify(content, null, 2)} as ClientContent;`,
  );
  writeFileSync(dataPath, replaced, 'utf8');

  return { filesWritten: written, themeColors: colors, content };
}

function copyTreeWithSubst(
  srcDir: string,
  destDir: string,
  replacements: Record<string, string>,
  written: string[],
): void {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    const src = join(srcDir, entry);
    const dest = join(destDir, entry);
    const st = statSync(src);
    if (st.isDirectory()) {
      copyTreeWithSubst(src, dest, replacements, written);
      continue;
    }
    if (isBinary(entry)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      written.push(relative(destDir, dest));
      continue;
    }
    const raw = readFileSync(src, 'utf8');
    const out = applySubst(raw, replacements);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, out, 'utf8');
    written.push(relative(destDir, dest));
  }
}

function applySubst(text: string, replacements: Record<string, string>): string {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
    const v = replacements[key];
    return v ?? m;
  });
}

function isBinary(filename: string): boolean {
  return /\.(png|jpg|jpeg|webp|avif|ico|woff2?|ttf|otf)$/i.test(filename);
}
