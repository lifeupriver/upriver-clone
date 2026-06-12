/**
 * Engagement pricing for the client portal's next-steps page.
 *
 * Tiers are per-client configurable via an optional `pricing:` list in
 * `clients/<slug>/client-config.yaml` (see `PricingTier` in @upriver/core).
 * When the config omits `pricing` — every client created before this field
 * existed — the portal renders `DEFAULT_PRICING_TIERS`, which are exactly the
 * values that used to be hard-coded in next-steps.astro, so existing clients
 * render identically.
 */
import type { ClientConfig, PricingTier } from '@upriver/core';

/** The previous hard-coded next-steps tiers, kept verbatim as the fallback. */
export const DEFAULT_PRICING_TIERS: readonly PricingTier[] = [
  {
    name: 'Polish',
    price: '$2,800',
    scope: '2-week project',
    description:
      'Fix every critical finding in this audit on your existing platform — no replatform, no design changes. For sites that mostly work but have a handful of issues blocking conversions or search visibility.',
  },
  {
    name: 'Rebuild',
    price: '$9,500',
    scope: '4–6 week build',
    description:
      'Start fresh on a fast, modern stack with every P0 and P1 finding resolved as we build. The new site scores measurably higher on technical and SEO audits the day it ships.',
  },
  {
    name: 'Rebuild + content',
    price: '$18,500',
    scope: '6–8 week engagement',
    description:
      'Everything in Rebuild plus a copy rewrite informed by your brand voice and a programmatic-SEO layer that publishes pillar content alongside the new site. For venues and service businesses that want to compete on search.',
  },
];

function isValidTier(value: unknown): value is PricingTier {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t['name'] === 'string' &&
    t['name'].length > 0 &&
    typeof t['price'] === 'string' &&
    t['price'].length > 0 &&
    typeof t['scope'] === 'string' &&
    typeof t['description'] === 'string'
  );
}

/**
 * Resolve the tiers to render for a client.
 *
 * The dashboard's `readClientConfig` parses YAML without zod validation, so
 * `config.pricing` is treated as untrusted: it is used only when it is a
 * non-empty array whose every entry is a well-formed tier. Anything else
 * (absent, empty, or malformed) falls back to the defaults wholesale — a
 * half-broken pricing list should never reach a client-facing page.
 */
export function resolvePricingTiers(config: ClientConfig | null | undefined): PricingTier[] {
  const pricing: unknown = config?.pricing;
  if (Array.isArray(pricing) && pricing.length > 0 && pricing.every(isValidTier)) {
    return pricing;
  }
  return [...DEFAULT_PRICING_TIERS];
}
