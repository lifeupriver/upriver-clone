import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyProfile } from './client-profile.js';
import { leafPaths } from './coverage.js';
import {
  buildShowModel,
  buildDeliverableDetail,
  generatedIds,
  type Manifest,
} from './show-model.js';
import type { ClientProfile, ProfileField, Source } from './index.js';

const NOW = '2026-06-04T12:00:00.000Z';

function env<T>(value: T | null, source: Source = 'operator', verified = false): ProfileField<T> {
  return { value, source, confidence: null, verified, updatedAt: NOW };
}

/* Build a profile with envelopes placed at the given object-key paths. */
function profileWith(fields: Record<string, ProfileField<unknown>>): ClientProfile {
  const root = createEmptyProfile('lf', NOW) as unknown as Record<string, unknown>;
  root._meta = { version: 1, slug: 'lf', createdAt: NOW, updatedAt: NOW, revision: 3 };
  for (const [path, value] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i] as string;
      if (typeof cur[s] !== 'object' || cur[s] === null) cur[s] = {};
      cur = cur[s] as Record<string, unknown>;
    }
    cur[segs[segs.length - 1] as string] = value;
  }
  return root as unknown as ClientProfile;
}

const emptyManifest: Manifest = { version: 1, docs: {} };

test('leafPaths walks object-key dot-paths and stops at envelopes', () => {
  const p = profileWith({ 'identity.publicName': env('Little Friends'), 'voice.attributes': env(['warm']) });
  const paths = leafPaths(p);
  assert.ok(paths.includes('identity.publicName'));
  assert.ok(paths.includes('voice.attributes'));
  // No array indices, no descent into envelope internals.
  assert.ok(paths.every((x) => !/\.\d+(\.|$)/.test(x) && !x.endsWith('.value')));
});

test('generatedIds returns only approved doc ids', () => {
  const m: Manifest = {
    version: 1,
    docs: {
      'doc-01': { id: 'doc-01', path: 'docs/a.md', generatedAt: NOW, specHash: 'h', profileSliceHash: 's', markers: 0, approved: true },
      'doc-02': { id: 'doc-02', path: 'docs/b.md', generatedAt: NOW, specHash: 'h', profileSliceHash: 's', markers: 0, approved: false },
    },
  };
  assert.deepEqual(generatedIds(m), ['doc-01']);
});

test('buildShowModel groups ready vs blocked and reports revision/fill', () => {
  const p = profileWith({
    'identity.publicName': env('Little Friends'),
    'identity.category': env('Preschool'),
    'customers.primaryCustomer': env('local parents'),
    'positioning.keyDifferentiator': env('play-based'),
    'voice.attributes': env(['warm', 'steady']),
  });
  const model = buildShowModel(p, emptyManifest, []);
  assert.equal(model.revision, 3);
  assert.ok(model.ready.some((r) => r.id === 'doc-01'), 'doc-01 should be ready');
  assert.ok(model.blocked.some((r) => r.id === 'doc-02'), 'doc-02 should be blocked');
  assert.ok(model.fill.some((f) => f.section === 'identity' && f.filled >= 2));
});

test('buildShowModel flags a generated-but-unapproved doc that blocks downstream', () => {
  // doc-04 requires doc-01 + doc-02; doc-01 generated but NOT approved.
  const p = createEmptyProfile('lf', NOW);
  const manifest: Manifest = {
    version: 1,
    docs: {
      'doc-01': { id: 'doc-01', path: 'docs/doc-01.md', generatedAt: NOW, specHash: 'h', profileSliceHash: 's', markers: 0, approved: false },
    },
  };
  const model = buildShowModel(p, manifest, []);
  const u = model.unapprovedBlocking.find((x) => x.id === 'doc-01');
  assert.ok(u, 'doc-01 should appear as unapproved-blocking');
  assert.ok(u!.blocking.includes('doc-04'));
});

test('buildDeliverableDetail marks HV fields and required-doc state', () => {
  const detail = buildDeliverableDetail(createEmptyProfile('lf', NOW), emptyManifest, 'doc-02');
  const priceRange = detail.fields.find((f) => f.path === 'offerings.core.*.priceRange');
  assert.ok(priceRange?.hv, 'priceRange is an HV field');
  assert.equal(priceRange?.filled, false);
  assert.equal(detail.readiness.ready, false);
});
