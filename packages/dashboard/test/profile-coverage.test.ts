import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { buildShowModel, createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { loadCoverageModel, readProfile, validateLeafValue } from '../src/lib/profile-coverage.js';
import { resolveClientDataSource } from '../src/lib/data-source.js';
import { setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'littlefriends';
const NOW = '2026-06-05T00:00:00.000Z';

describe('validateLeafValue', () => {
  it('accepts a well-shaped keyTeam array and a productionCapacity object', () => {
    assert.equal(validateLeafValue('people.keyTeam', [{ name: 'Jane', role: 'Director' }], NOW).ok, true);
    assert.equal(validateLeafValue('content.productionCapacity', { whoCreates: ['Owner'], hoursPerWeek: '3' }, NOW).ok, true);
  });
  it('rejects a wrong-typed value and a too-deep path', () => {
    assert.equal(validateLeafValue('people.keyTeam', 123, NOW).ok, false);
    assert.equal(validateLeafValue('people.keyTeam', [{ role: 'no name' }], NOW).ok, false); // name required
    assert.equal(validateLeafValue('toolsAndAccess.apiSpend.caps', '10', NOW).ok, false); // depth 3
  });
});

describe('coverage view ShowModel parity (oracle vs the shared builder)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
  });
  afterEach(() => tc.cleanup());

  function env<T>(value: T): ProfileField<T> {
    return { value, source: 'operator', confidence: 'high', verified: false, updatedAt: NOW };
  }
  function seedProfile(): ClientProfile {
    const p = createEmptyProfile(SLUG, NOW) as unknown as Record<string, Record<string, unknown>>;
    p._meta = { version: 1, slug: SLUG, createdAt: NOW, updatedAt: NOW, revision: 2 };
    p['identity'] = { publicName: env('Little Friends'), category: env('Preschool') };
    p['positioning'] = { keyDifferentiator: env('play-based, small ratios') };
    return p as unknown as ClientProfile;
  }

  it('loadCoverageModel returns exactly buildShowModel(profile, manifest, conflicts)', async () => {
    const profile = seedProfile();
    tc.writeFile(SLUG, 'profile.json', `${JSON.stringify(profile, null, 2)}\n`);
    tc.seedClient(SLUG);
    tc.writeFile(SLUG, 'profile.json', `${JSON.stringify(profile, null, 2)}\n`);

    const model = await loadCoverageModel(SLUG);
    assert.ok(model);
    // Oracle: same builder the CLI's `profile show --json` uses. Recompute from
    // the parsed profile + empty manifest/conflicts and require deep equality.
    const parsed = await readProfile(resolveClientDataSource(), SLUG);
    const expected = buildShowModel(parsed!, { version: 1, docs: {} }, []);
    assert.deepEqual(model, expected);

    // And the model has the shape the coverage view renders.
    assert.equal(model!.slug, SLUG);
    assert.equal(model!.revision, 2);
    assert.ok(Array.isArray(model!.ready));
    assert.ok(model!.fill.some((f) => f.section === 'identity'));
  });

  it('returns null when there is no profile', async () => {
    tc.seedClient('no-profile');
    assert.equal(await loadCoverageModel('no-profile'), null);
  });
});
