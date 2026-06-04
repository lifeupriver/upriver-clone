import type { ReconAdapter } from '../types.js';
import { websiteAdapter } from './website.js';
import { gbpAdapter } from './gbp.js';
import { socialsAdapter } from './socials.js';
import { geoAdapter } from './geo.js';
import { serpAdapter } from './serp.js';

/**
 * The adapters that run under `recon <slug>`, in default order. `secret-shopper`
 * is intentionally absent — it is a separate `recon secret-shopper start|record`
 * scaffold, not part of the gather→extract run (build spec 04 §1).
 */
export const RECON_ADAPTERS: ReconAdapter[] = [
  websiteAdapter,
  gbpAdapter,
  socialsAdapter,
  geoAdapter,
  serpAdapter,
];

export const DEFAULT_ADAPTER_IDS: string[] = RECON_ADAPTERS.map((a) => a.id);

/** Resolve requested adapter ids to adapters, preserving order and flagging unknowns. */
export function selectAdapters(ids: string[]): { adapters: ReconAdapter[]; unknown: string[] } {
  const byId = new Map(RECON_ADAPTERS.map((a) => [a.id, a] as const));
  const adapters: ReconAdapter[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const adapter = byId.get(id as ReconAdapter['id']);
    if (adapter) adapters.push(adapter);
    else unknown.push(id);
  }
  return { adapters, unknown };
}
