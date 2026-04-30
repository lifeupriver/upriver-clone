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
}
