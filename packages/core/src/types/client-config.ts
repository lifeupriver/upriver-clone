export interface GscConfig {
  property: string;
  verified: boolean;
  service_account_added?: string;
}

/**
 * Known business verticals, as a const tuple so the zod enum in
 * `client-config-zod.ts` and the `Vertical` union stay derived from one list.
 * This is the single source of truth — `audit-passes` imports the type from
 * here rather than re-declaring it.
 */
export const VERTICALS = [
  'wedding-venue',
  'preschool',
  'restaurant',
  'professional-services',
  'retail',
  'home-services',
  'medical',
  'fitness',
  'nonprofit',
  'generic',
] as const;

/**
 * Business vertical — used by audit-passes to swap in vertical-specific copy
 * (page expectations, directory citations, "why it matters" framing). When
 * omitted, audit passes use generic small-business copy.
 */
export type Vertical = (typeof VERTICALS)[number];

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

/**
 * Engagement stage (Spec 19). `prospect` marks a dir created by the pitch
 * engine: same layout and confidentiality posture as a client, but filtered
 * out of client-facing lists. Omitted means `client` — every pre-Spec-19
 * config keeps its existing semantics.
 */
export const ENGAGEMENT_STAGES = ['prospect', 'client'] as const;
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];

export interface ClientConfig {
  slug: string;
  name: string;
  url: string;
  stage?: EngagementStage;
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
  /**
   * Primary city the business operates from (e.g. "Austin"). Used by the
   * `local` audit pass to build place-token heuristics instead of guessing
   * locations. Optional and additive: omitted configs behave as before.
   */
  city?: string;
  /**
   * Region, county, metro, or state the business serves (e.g. "Hudson
   * Valley", "Travis County", "TX"). Same locality role as `city`.
   */
  region?: string;
  /**
   * Additional towns/areas the business serves (e.g. ["Round Rock",
   * "Pflugerville"]). Each entry is matched as a place token by the `local`
   * audit pass.
   */
  serviceArea?: string[];
  /**
   * Whether the business serves a physical locality. Set `false` for
   * online-only businesses to skip local-SEO checks entirely; omitted/true
   * keeps the current behavior.
   */
  localBusiness?: boolean;
}
