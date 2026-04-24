import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FirecrawlBrandingProfile } from '@upriver/core';

export interface LoadedPage {
  url: string;
  slug: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
    canonical?: string;
  };
  content?: {
    markdown?: string;
    wordCount?: number;
    headings?: Array<{ level: number; text: string }>;
  };
  links?: { internal?: string[]; external?: string[] };
  images?: string[];
  screenshots?: { desktop?: string | null; mobile?: string | null };
  extracted?: {
    ctaButtons?: Array<{ text: string; href: string; type?: string; location?: string }>;
    contact?: { phone?: string; email?: string; address?: string; hours?: string };
    teamMembers?: Array<{ name: string; role?: string }>;
    testimonials?: Array<{ quote: string; attribution?: string }>;
    faqs?: Array<{ question: string; answer: string }>;
    pricing?: Array<{ item: string; price?: string }>;
    socialLinks?: Array<{ platform: string; url: string }>;
    eventSpaces?: Array<{ name: string; capacity?: string; description?: string }>;
  };
}

export interface LoadedData {
  pages: LoadedPage[];
  designTokens: FirecrawlBrandingProfile | null;
}

export function loadPagesAndTokens(dir: string): LoadedData {
  const pagesDir = join(dir, 'pages');
  const pages: LoadedPage[] = existsSync(pagesDir)
    ? readdirSync(pagesDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as LoadedPage)
        .filter((p) => p.url)
    : [];

  const tokensPath = join(dir, 'design-tokens.json');
  const designTokens = existsSync(tokensPath)
    ? (JSON.parse(readFileSync(tokensPath, 'utf8')) as FirecrawlBrandingProfile)
    : null;

  return { pages, designTokens };
}
