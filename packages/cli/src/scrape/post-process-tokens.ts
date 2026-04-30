/**
 * Post-process Firecrawl-extracted design tokens to fix common platform-default
 * pollution. Firecrawl sometimes returns the platform's default theme (Square
 * Online's #3374FF blue, Square Market font) instead of the actual brand
 * because the platform's chrome dominates the rendered page.
 *
 * Two corrections applied here:
 *
 * 1. Brand color from logo filename. If the logo image filename contains a
 *    color word (e.g. logo-yellow_1659581621.png), trust that over a
 *    platform-default token.
 *
 * 2. Drop known-junk fonts. Square Online ships a "Square Market" font
 *    family that's part of the editor chrome, not a brand choice.
 */

interface DesignTokens {
  colors?: {
    primary?: string;
    accent?: string;
    background?: string;
    textPrimary?: string;
    link?: string;
    [k: string]: string | undefined;
  };
  fonts?: Array<{ family: string; role?: string }>;
  typography?: {
    fontStacks?: { heading?: string[]; body?: string[]; paragraph?: string[] };
    fontFamilies?: { primary?: string; heading?: string };
  };
  images?: { logo?: string | null; logoAlt?: string | null };
  confidence?: { colors?: number; overall?: number };
  __postprocess?: {
    brandColorOverride?: { from: string; to: string; reason: string };
    fontsDropped?: string[];
  };
}

const PLATFORM_DEFAULT_COLORS = new Set<string>([
  '#3374ff', // Square Online default link/cta blue
  '#0070f3', // Vercel demo blue
  '#1976d2', // Material default
]);

const COLOR_WORD_TO_HEX: Array<[RegExp, string]> = [
  [/\byellow\b/i, '#F4C430'],
  [/\bgold\b/i, '#D4A017'],
  [/\borange\b/i, '#E37222'],
  [/\bcoral\b/i, '#E97462'],
  [/\bred\b/i, '#C8262E'],
  [/\bcrimson\b/i, '#A52431'],
  [/\bmaroon\b/i, '#7C2434'],
  [/\bpink\b/i, '#E66A8B'],
  [/\bmagenta\b/i, '#C73978'],
  [/\bpurple\b/i, '#6E4C9F'],
  [/\bviolet\b/i, '#7C5BA1'],
  [/\bnavy\b/i, '#1E3A5F'],
  [/\bblue\b/i, '#2D6FB3'],
  [/\bteal\b/i, '#1F7A77'],
  [/\bcyan\b/i, '#1AA3A8'],
  [/\bmint\b/i, '#7FC8A9'],
  [/\bgreen\b/i, '#3B8E50'],
  [/\bsage\b/i, '#9CAE8E'],
  [/\bolive\b/i, '#6B7A3D'],
  [/\bbrown\b/i, '#7D5A3C'],
  [/\btan\b/i, '#C8A977'],
  [/\bbeige\b/i, '#D9C9A8'],
  [/\bcream\b/i, '#F1E6CE'],
  [/\bblack\b/i, '#1B1B1B'],
  [/\bwhite\b/i, '#FFFFFF'],
  [/\bgrey\b|\bgray\b/i, '#7A7A7A'],
];

// Junk = stack fillers that aren't a real brand intent (e.g. CSS-variable
// names that leaked into Firecrawl's font extraction). DO NOT put proprietary
// fonts here — they need to be preserved so scaffold can map them to a
// close Google Fonts substitute (see FONT_SUBSTITUTES in template-writer.ts).
// Square Market in particular is the Square Online platform default — it's
// a real font that should resolve to its closest free equivalent (Inter).
const JUNK_FONT_FAMILIES = new Set<string>([
  // (kept intentionally small — proprietary fonts are NOT junk)
]);

export function postProcessDesignTokens(input: DesignTokens): DesignTokens {
  const out: DesignTokens = JSON.parse(JSON.stringify(input));
  const notes: NonNullable<DesignTokens['__postprocess']> = {};

  const logoUrl = out.images?.logo ?? '';
  const inferredFromFilename = inferColorFromUrl(logoUrl);
  const currentPrimary = (out.colors?.primary ?? '').toLowerCase();
  const platformDefault = PLATFORM_DEFAULT_COLORS.has(currentPrimary);
  const lowConfidence = (out.confidence?.colors ?? 1) < 0.6;
  if (inferredFromFilename && (platformDefault || lowConfidence || !out.colors?.primary)) {
    out.colors = out.colors ?? {};
    const before = out.colors.primary ?? '(unset)';
    out.colors.primary = inferredFromFilename.hex;
    if (platformDefault || !out.colors.accent) out.colors.accent = inferredFromFilename.hex;
    notes.brandColorOverride = {
      from: before,
      to: inferredFromFilename.hex,
      reason: `logo filename contains "${inferredFromFilename.word}"${
        platformDefault ? ` and prior primary ${before} is a platform default` : ''
      }`,
    };
  }

  if (Array.isArray(out.fonts)) {
    const dropped: string[] = [];
    out.fonts = out.fonts.filter((f) => {
      const isJunk = JUNK_FONT_FAMILIES.has(f.family.toLowerCase().trim());
      if (isJunk) dropped.push(f.family);
      return !isJunk;
    });
    if (dropped.length > 0) notes.fontsDropped = dropped;
  }
  if (out.typography?.fontStacks) {
    for (const role of ['heading', 'body', 'paragraph'] as const) {
      const stack = out.typography.fontStacks[role];
      if (!Array.isArray(stack)) continue;
      out.typography.fontStacks[role] = stack.filter(
        (f) => !JUNK_FONT_FAMILIES.has(f.toLowerCase().trim()),
      );
    }
  }
  if (out.typography?.fontFamilies) {
    for (const role of ['primary', 'heading'] as const) {
      const f = out.typography.fontFamilies[role];
      if (f && JUNK_FONT_FAMILIES.has(f.toLowerCase().trim())) {
        delete out.typography.fontFamilies[role];
      }
    }
  }

  if (notes.brandColorOverride || notes.fontsDropped) out.__postprocess = notes;
  return out;
}

function inferColorFromUrl(url: string): { word: string; hex: string } | null {
  if (!url) return null;
  let filename = url;
  try {
    filename = new URL(url).pathname.split('/').pop() ?? url;
  } catch {
    /* not a full URL */
  }
  for (const [re, hex] of COLOR_WORD_TO_HEX) {
    const m = re.exec(filename);
    if (m) return { word: m[0], hex };
  }
  return null;
}
