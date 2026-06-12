export interface GscConfig {
  property: string;
  verified: boolean;
  service_account_added?: string;
}

/**
 * Business vertical — used by audit-passes to swap in vertical-specific copy
 * (page expectations, directory citations, "why it matters" framing). When
 * omitted, audit passes use generic small-business copy.
 */
export type Vertical =
  | 'wedding-venue'
  | 'preschool'
  | 'restaurant'
  | 'professional-services'
  | 'generic';

/**
 * One engagement tier shown on the client portal's next-steps page
 * (`/deliverables/<slug>/next-steps`). Mirrors that page's card layout:
 * name + price headline, a scope eyebrow ("2-week project"), and a prose
 * description.
 */
export interface PricingTier {
  name: string;
  price: string;
  scope: string;
  description: string;
}

export interface ClientConfig {
  slug: string;
  name: string;
  url: string;
  platform?: 'squarespace' | 'wordpress' | 'wix' | 'webflow' | 'showit' | 'unknown';
  vertical?: Vertical;
  created_at: string;
  gsc?: GscConfig;
  vercel_preview_url?: string;
  github_repo?: string;
  supabase_project_ref?: string;
  dev_port?: number;
  /**
   * Per-client engagement pricing for the portal's next-steps page. Optional
   * and additive: when omitted the dashboard renders its built-in default
   * tiers, so existing client configs are unaffected.
   */
  pricing?: PricingTier[];
}
