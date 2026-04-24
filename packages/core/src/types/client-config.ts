export interface GscConfig {
  property: string;
  verified: boolean;
  service_account_added?: string;
}

export interface ClientConfig {
  slug: string;
  name: string;
  url: string;
  platform?: 'squarespace' | 'wordpress' | 'wix' | 'webflow' | 'showit' | 'unknown';
  created_at: string;
  gsc?: GscConfig;
  vercel_preview_url?: string;
  github_repo?: string;
  supabase_project_ref?: string;
}
