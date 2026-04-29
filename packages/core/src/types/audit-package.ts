import type { AuditFinding } from './audit.js';
import type { FirecrawlBrandingProfile } from './firecrawl.js';

export interface AuditPackageMeta {
  clientName: string;
  clientSlug: string;
  siteUrl: string;
  auditDate: string;
  auditor: string;
  totalPages: number;
  totalFindings: number;
  findingsByPriority: { p0: number; p1: number; p2: number };
  overallScore: number;
  scoreByDimension: Record<string, number>;
}

export interface DesignSystemColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  [key: string]: string;
}

export interface DesignSystemTypography {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  scale: Record<string, string>;
}

export interface DesignSystemSpacing {
  baseUnit: number;
  scale: number[];
  borderRadius: string;
}

export interface DesignSystemComponents {
  primaryButton: Record<string, string>;
  secondaryButton: Record<string, string>;
  inputField: Record<string, string>;
}

export interface DesignSystem {
  colors: DesignSystemColors;
  typography: DesignSystemTypography;
  spacing: DesignSystemSpacing;
  components: DesignSystemComponents;
  logo: string;
  favicon: string;
  colorScheme: 'light' | 'dark';
  personality: string[];
}

export interface SitePage {
  url: string;
  slug: string;
  title: string;
  description: string;
  wordCount: number;
  headings: Array<{ level: number; text: string }>;
  images: string[];
  internalLinks: string[];
  externalLinks: string[];
  ctaButtons: Array<{ text: string; href: string; type?: 'primary' | 'secondary' | 'link' }>;
  schemaTypes: string[];
  hasCanonical: boolean;
  statusCode: number;
}

export interface MissingPage {
  pageType: string;
  reason: string;
  priority: 'p0' | 'p1' | 'p2';
}

export interface SiteStructure {
  pages: SitePage[];
  navigation: {
    primary: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>;
    footer: Array<{ label: string; href: string }>;
  };
  missingPages: MissingPage[];
}

export interface ContentInventory {
  testimonials: Array<{ quote: string; attribution: string; page: string }>;
  teamMembers: Array<{ name: string; role: string; page: string }>;
  faqs: Array<{ question: string; answer: string; page: string }>;
  pricing: Array<{ item: string; price: string; page: string }>;
  socialLinks: Array<{ platform: string; url: string }>;
  contactInfo: { phone?: string; email?: string; address?: string; hours?: string };
  eventSpaces: Array<{ name: string; capacity?: string; description: string; page: string }>;
}

export interface ScreenshotEntry {
  url: string;
  slug: string;
  desktop: string | null;
  mobile: string | null;
}

export interface Screenshots {
  pages: ScreenshotEntry[];
}

export interface BrandVoiceDraft {
  tone: string;
  keywords: string[];
  bannedWords: string[];
  sampleHeadlines: string[];
  sampleBodyCopy: string[];
  voiceCharacteristics: string[];
  audienceDescription: string;
}

export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  findings: string[];
  estimatedEffort: string;
  estimatedImpact: string;
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  quickWins: AuditFinding[];
  requiresClientInput: string[];
  requiresNewContent: string[];
  requiresAssets: string[];
}

export interface ImpactMetric {
  key: string;
  value: number;
  display: string;
  label: string;
  rationale: string;
}

export interface ImpactMetrics {
  generatedAt: string;
  metrics: ImpactMetric[];
}

export interface AuditPackage {
  meta: AuditPackageMeta;
  brandingProfile: FirecrawlBrandingProfile;
  designSystem: DesignSystem;
  siteStructure: SiteStructure;
  contentInventory: ContentInventory;
  screenshots: Screenshots;
  findings: AuditFinding[];
  brandVoiceDraft: BrandVoiceDraft;
  implementationPlan: ImplementationPlan;
  impactMetrics?: ImpactMetrics;
}
