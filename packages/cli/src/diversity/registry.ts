// Site-diversity matrix registry (Spec 18 §1). The committable
// `config/site-registry.json` declares the matrix as typed slots — gap
// platforms ship with `url: null, permission: "pending"` and are filled by a
// config edit, never a code change. Matrix sites are owned/permissioned
// ONLY: a pending site is never runnable, even with a URL filled in.

import { readFileSync } from 'node:fs';

export const SITE_REGISTRY_VERSION = 1 as const;

export interface SiteRegistryEntry {
  id: string;
  /** e.g. 'astro-fixture' | 'wordpress' | 'wix-or-webflow' | 'shopify-or-spa' */
  platform: string;
  /** null = slot not yet filled. */
  url: string | null;
  maxPages: number;
  clonePages: string[];
  vertical: string | null;
  permission: 'owned' | 'permissioned' | 'pending';
  notes: string;
  /** Optional per-site override of defaultBudgetUsd. */
  budgetUsd?: number;
}

export interface SiteRegistry {
  v: typeof SITE_REGISTRY_VERSION;
  defaultBudgetUsd: number;
  sites: SiteRegistryEntry[];
}

/** A runnable site, with the budget fallback already resolved. */
export interface RunnableSite extends SiteRegistryEntry {
  url: string;
  budgetUsd: number;
}

export function parseSiteRegistry(raw: string): SiteRegistry {
  const reg = JSON.parse(raw) as SiteRegistry;
  if (reg.v !== SITE_REGISTRY_VERSION) {
    throw new Error(
      `Unsupported site-registry version ${JSON.stringify(reg.v)} (expected ${SITE_REGISTRY_VERSION})`,
    );
  }
  if (!Array.isArray(reg.sites) || typeof reg.defaultBudgetUsd !== 'number') {
    throw new Error('site registry must have numeric defaultBudgetUsd and a sites array');
  }
  const seen = new Set<string>();
  for (const site of reg.sites) {
    if (!site.id || seen.has(site.id)) {
      throw new Error(`site registry has a missing or duplicate id: ${JSON.stringify(site.id)}`);
    }
    seen.add(site.id);
    if (site.url !== null) {
      let parsed: URL;
      try {
        parsed = new URL(site.url);
      } catch {
        throw new Error(`site "${site.id}" has a malformed url: ${JSON.stringify(site.url)}`);
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error(`site "${site.id}" url must be http(s): ${site.url}`);
      }
    }
    if (!['owned', 'permissioned', 'pending'].includes(site.permission)) {
      throw new Error(`site "${site.id}" has unknown permission ${JSON.stringify(site.permission)}`);
    }
  }
  return reg;
}

export function loadSiteRegistry(path: string): SiteRegistry {
  return parseSiteRegistry(readFileSync(path, 'utf-8'));
}

/**
 * Sites the matrix may actually hit: URL filled AND permission settled.
 * Pending slots are skipped (and listed by the harness so the gap stays
 * visible) — never scraped.
 */
export function runnableSites(reg: SiteRegistry): RunnableSite[] {
  return reg.sites
    .filter((s): s is SiteRegistryEntry & { url: string } => s.url !== null && s.permission !== 'pending')
    .map((s) => ({ ...s, budgetUsd: s.budgetUsd ?? reg.defaultBudgetUsd }));
}
