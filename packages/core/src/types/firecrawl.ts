export interface FirecrawlColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  textPrimary?: string;
  textSecondary?: string;
  link?: string;
  success?: string;
  warning?: string;
  error?: string;
}

export interface FirecrawlTypography {
  fontFamilies?: {
    primary?: string;
    heading?: string;
    code?: string;
  };
  fontSizes?: {
    h1?: string;
    h2?: string;
    h3?: string;
    body?: string;
  };
  fontWeights?: {
    regular?: string;
    medium?: string;
    bold?: string;
  };
  lineHeights?: Record<string, string>;
}

export interface FirecrawlSpacing {
  baseUnit?: string;
  borderRadius?: string;
  padding?: Record<string, string>;
  margins?: Record<string, string>;
}

export interface FirecrawlComponentStyle {
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  border?: string;
  padding?: string;
}

export interface FirecrawlBrandingProfile {
  colorScheme?: 'light' | 'dark';
  logo?: string;
  colors?: FirecrawlColors;
  fonts?: string[];
  typography?: FirecrawlTypography;
  spacing?: FirecrawlSpacing;
  components?: {
    buttonPrimary?: FirecrawlComponentStyle;
    buttonSecondary?: FirecrawlComponentStyle;
    input?: FirecrawlComponentStyle;
  };
  icons?: Record<string, string>;
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
  animations?: Record<string, string>;
  layout?: Record<string, string>;
  personality?: string[];
}

export interface FirecrawlLink {
  text: string;
  href: string;
}

export interface FirecrawlScrapeResult {
  url: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  screenshot?: string;
  links?: FirecrawlLink[];
  images?: string[];
  summary?: string;
  branding?: FirecrawlBrandingProfile;
  json?: Record<string, unknown>;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonical?: string;
    sourceURL?: string; // Firecrawl sets the page URL here in batch/crawl results
    url?: string;
  };
}

export interface FirecrawlMapResult {
  urls: string[];
}

export interface FirecrawlCrawlStatus {
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  total: number;
  completed: number;
  creditsUsed: number;
  data?: FirecrawlScrapeResult[];
}

// Valid formats per Firecrawl v1 API
export type ScrapeFormat =
  | 'markdown'
  | 'html'
  | 'rawHtml'
  | 'screenshot'
  | 'screenshot@fullPage'
  | 'links'
  | 'branding'
  | 'extract'
  | 'json'
  | 'summary'
  | 'changeTracking';

export interface ScrapeOptions {
  formats: ScrapeFormat[];
  onlyMainContent?: boolean;
  screenshot?: {
    fullPage?: boolean;
    quality?: number;
    viewport?: { width: number; height: number };
  };
  jsonOptions?: {
    schema?: Record<string, unknown>;
    prompt?: string;
  };
  actions?: Array<{ type: string; [key: string]: unknown }>;
  waitFor?: number;
  timeout?: number;
}
