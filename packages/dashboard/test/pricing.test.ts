import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ClientConfig, PricingTier } from '@upriver/core';

import { readClientConfig } from '../src/lib/fs-reader.js';
import { DEFAULT_PRICING_TIERS, resolvePricingTiers } from '../src/lib/pricing.js';
import { setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'acme-co';

function baseConfig(): ClientConfig {
  return {
    slug: SLUG,
    name: 'Acme Co',
    url: 'https://acme.example',
    created_at: '2026-01-01',
  };
}

const CUSTOM_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '$1,200',
    scope: '1-week sprint',
    description: 'Quick wins only.',
  },
  {
    name: 'Full service',
    price: '$24,000',
    scope: '10-week engagement',
    description: 'Everything, soup to nuts.',
  },
];

describe('resolvePricingTiers — per-client pricing with default fallback', () => {
  it('falls back to the defaults when config is null or has no pricing', () => {
    assert.deepEqual(resolvePricingTiers(null), [...DEFAULT_PRICING_TIERS]);
    assert.deepEqual(resolvePricingTiers(undefined), [...DEFAULT_PRICING_TIERS]);
    assert.deepEqual(resolvePricingTiers(baseConfig()), [...DEFAULT_PRICING_TIERS]);
  });

  it('default tiers are exactly the previously hard-coded next-steps values', () => {
    // Render-identity guard: existing clients (no `pricing:` in config) must
    // keep seeing the same three tiers the page used to hard-code.
    assert.equal(DEFAULT_PRICING_TIERS.length, 3);
    assert.deepEqual(
      DEFAULT_PRICING_TIERS.map(t => [t.name, t.price, t.scope]),
      [
        ['Polish', '$2,800', '2-week project'],
        ['Rebuild', '$9,500', '4–6 week build'],
        ['Rebuild + content', '$18,500', '6–8 week engagement'],
      ],
    );
    for (const tier of DEFAULT_PRICING_TIERS) {
      assert.ok(tier.description.length > 0, `${tier.name} must keep its description`);
    }
  });

  it('returns the per-client tiers when config.pricing is well-formed', () => {
    const config: ClientConfig = { ...baseConfig(), pricing: CUSTOM_TIERS };
    assert.deepEqual(resolvePricingTiers(config), CUSTOM_TIERS);
  });

  it('falls back wholesale when pricing is malformed (YAML is not zod-validated here)', () => {
    const cases: unknown[] = [
      'cheap', // not an array
      [], // empty
      [{ name: 'No price', scope: 'x', description: 'y' }], // missing price
      [{ name: 'Bad price', price: 4200, scope: 'x', description: 'y' }], // wrong type
      [CUSTOM_TIERS[0], { name: '', price: '$1', scope: '', description: '' }], // one bad entry
    ];
    for (const pricing of cases) {
      const config = { ...baseConfig(), pricing } as unknown as ClientConfig;
      assert.deepEqual(
        resolvePricingTiers(config),
        [...DEFAULT_PRICING_TIERS],
        `expected default fallback for pricing=${JSON.stringify(pricing)}`,
      );
    }
  });
});

describe('pricing via client-config.yaml (the next-steps read path)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
  });
  afterEach(() => tc.cleanup());

  it('reads a per-client pricing list from YAML', async () => {
    tc.writeFile(
      SLUG,
      'client-config.yaml',
      [
        `slug: ${SLUG}`,
        'name: Acme Co',
        'url: https://acme.example',
        'created_at: "2026-01-01"',
        'pricing:',
        '  - name: Starter',
        '    price: "$1,200"',
        '    scope: 1-week sprint',
        '    description: Quick wins only.',
        '  - name: Full service',
        '    price: "$24,000"',
        '    scope: 10-week engagement',
        '    description: Everything, soup to nuts.',
        '',
      ].join('\n'),
    );
    const config = await readClientConfig(SLUG);
    assert.ok(config);
    assert.deepEqual(resolvePricingTiers(config), CUSTOM_TIERS);
  });

  it('a config without pricing renders the defaults (existing clients unchanged)', async () => {
    tc.seedClient(SLUG);
    const config = await readClientConfig(SLUG);
    assert.ok(config);
    assert.deepEqual(resolvePricingTiers(config), [...DEFAULT_PRICING_TIERS]);
  });
});
