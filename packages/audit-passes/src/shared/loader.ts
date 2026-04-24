import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface PageData {
  url: string;
  slug: string;
  scraped_at: string;
  metadata: {
    title?: string;
    description?: string;
    statusCode?: number;
    canonical?: string;
    ogImage?: string;
  };
  content: {
    markdown: string;
    wordCount: number;
    headings: Array<{ level: number; text: string }>;
  };
  links: {
    internal: string[];
    external: string[];
  };
  images: string[];
  screenshots: {
    desktop: string | null;
    mobile: string | null;
  };
  extracted: {
    ctaButtons: Array<{ text: string; href: string; type?: string; location?: string }>;
    contact: { phone?: string; email?: string; address?: string; hours?: string };
    teamMembers: Array<{ name: string; role?: string }>;
    testimonials: Array<{ quote: string; attribution?: string; rating?: string }>;
    faqs: Array<{ question: string; answer: string }>;
    pricing: Array<{ item: string; price?: string }>;
    socialLinks: Array<{ platform: string; url: string }>;
    eventSpaces: Array<{ name: string; capacity?: string; description?: string }>;
  };
  rawHtmlPath: string | null;
  hasBranding: boolean;
}

export interface DesignTokens {
  extracted_at: string;
  source_url: string;
  colorScheme?: string;
  colors?: Record<string, string>;
  fonts?: string[];
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  components?: Record<string, unknown>;
  personality?: string[];
}

export function loadPages(clientDir: string): PageData[] {
  const pagesDir = join(clientDir, 'pages');
  if (!existsSync(pagesDir)) return [];
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData)
    .filter((p) => p.url);
}

export function loadDesignTokens(clientDir: string): DesignTokens | null {
  const path = join(clientDir, 'design-tokens.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as DesignTokens;
}

export function loadRawHtml(page: PageData): string {
  if (!page.rawHtmlPath || !existsSync(page.rawHtmlPath)) return '';
  return readFileSync(page.rawHtmlPath, 'utf8');
}
