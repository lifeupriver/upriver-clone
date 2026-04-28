import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

// Detect and import assets the client has handed over (fonts, logos) from
// `clients/<slug>/assets/from client/`. Used at scaffold time to wire real
// brand assets into the Astro repo so the clone agent can reference them by
// stable local paths and global.css can @font-face the actual webfonts.

const FROM_CLIENT_DIR = 'from client'; // exact folder name as used by humans

export interface ClientFontFace {
  family: string; // CSS font-family value, e.g. "Brandon Grotesque"
  weight: number; // 100-900
  style: 'normal' | 'italic';
  src: string; // Path served from public/, e.g. "/fonts/brandon-grotesque/medium.woff2"
  format: 'woff2' | 'woff' | 'ttf' | 'otf';
}

export interface ClientLogo {
  brand: string; // human label, e.g. "Friends & Neighbors"
  brandSlug: string; // url-safe, e.g. "friends-and-neighbors"
  src: string; // public path, e.g. "/images/logos/friends-and-neighbors/horizontal-cream.png"
  variant: string; // descriptive variant slug, e.g. "horizontal-cream"
  ext: string; // svg | png | jpg
}

export interface ClientAssetsManifest {
  fonts: ClientFontFace[];
  logos: ClientLogo[];
}

export function copyClientAssets(clientDir: string, repoDir: string): ClientAssetsManifest {
  const root = join(clientDir, 'assets', FROM_CLIENT_DIR);
  if (!existsSync(root)) return { fonts: [], logos: [] };

  const fonts = copyClientFonts(join(root, 'Fonts'), repoDir);
  const logos = copyClientLogos(join(root, 'Logos'), repoDir);
  return { fonts, logos };
}

function copyClientFonts(fontsRoot: string, repoDir: string): ClientFontFace[] {
  if (!existsSync(fontsRoot)) return [];
  const out: ClientFontFace[] = [];
  for (const entry of safeReaddir(fontsRoot)) {
    const familyDir = join(fontsRoot, entry);
    if (!isDir(familyDir)) continue;
    const family = parseFamilyName(entry);
    const familySlug = slugify(family);
    for (const file of safeReaddir(familyDir)) {
      const ext = extname(file).slice(1).toLowerCase();
      if (!['woff2', 'woff', 'ttf', 'otf'].includes(ext)) continue;
      const { weight, style } = parseWeightStyle(file);
      const destDir = join(repoDir, 'public', 'fonts', familySlug);
      mkdirSync(destDir, { recursive: true });
      const destFile = `${weightLabel(weight)}${style === 'italic' ? '-italic' : ''}.${ext}`;
      cpSync(join(familyDir, file), join(destDir, destFile));
      out.push({
        family,
        weight,
        style,
        src: `/fonts/${familySlug}/${destFile}`,
        format: ext as ClientFontFace['format'],
      });
    }
  }
  return out;
}

function copyClientLogos(logosRoot: string, repoDir: string): ClientLogo[] {
  if (!existsSync(logosRoot)) return [];
  const out: ClientLogo[] = [];
  for (const brandEntry of safeReaddir(logosRoot)) {
    const brandDir = join(logosRoot, brandEntry);
    if (!isDir(brandDir)) continue;
    const brand = brandEntry;
    const brandSlug = slugify(brand);
    const destDir = join(repoDir, 'public', 'images', 'logos', brandSlug);
    mkdirSync(destDir, { recursive: true });
    for (const file of safeReaddir(brandDir)) {
      const ext = extname(file).slice(1).toLowerCase();
      // Skip Adobe Illustrator and other non-web formats. Keep svg, png, jpg, webp.
      if (!['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) continue;
      const variantSlug = slugify(file.replace(extname(file), ''));
      const destName = `${variantSlug}.${ext}`;
      cpSync(join(brandDir, file), join(destDir, destName));
      out.push({
        brand,
        brandSlug,
        src: `/images/logos/${brandSlug}/${destName}`,
        variant: variantSlug,
        ext,
      });
    }
  }
  return out;
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f !== '.DS_Store' && !f.startsWith('._'));
  } catch {
    return [];
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// "Brandon Grotesque -- TRIAL" → "Brandon Grotesque"
function parseFamilyName(folder: string): string {
  return folder
    .replace(/\s*--\s*TRIAL\b.*/i, '')
    .replace(/\s+webfont\b.*/i, '')
    .replace(/\s+web\s*font\b.*/i, '')
    .trim();
}

// Parse weight (100-900) and italic from a filename like
// "HvDTrial_Brandon_Grotesque_medium_italic.woff2" or "HalisR-Medium-webfont.woff2".
function parseWeightStyle(filename: string): { weight: number; style: 'normal' | 'italic' } {
  const lower = filename.toLowerCase();
  const style: 'normal' | 'italic' = /italic|oblique/.test(lower) ? 'italic' : 'normal';
  // Order matters — check more specific markers first.
  if (/extra ?light|ultralight/.test(lower)) return { weight: 200, style };
  if (/semi ?bold|demi ?bold/.test(lower)) return { weight: 600, style };
  if (/extra ?bold|ultra ?bold/.test(lower)) return { weight: 800, style };
  if (/black|heavy/.test(lower)) return { weight: 900, style };
  if (/thin|hairline/.test(lower)) return { weight: 100, style };
  if (/light/.test(lower)) return { weight: 300, style };
  if (/medium/.test(lower)) return { weight: 500, style };
  if (/bold/.test(lower)) return { weight: 700, style };
  if (/regular|normal|book|roman/.test(lower)) return { weight: 400, style };
  return { weight: 400, style };
}

function weightLabel(w: number): string {
  switch (w) {
    case 100: return 'thin';
    case 200: return 'extralight';
    case 300: return 'light';
    case 400: return 'regular';
    case 500: return 'medium';
    case 600: return 'semibold';
    case 700: return 'bold';
    case 800: return 'extrabold';
    case 900: return 'black';
    default:  return String(w);
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
