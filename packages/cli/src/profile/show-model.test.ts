import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyProfile,
  type ClientProfile,
  type ConflictEntry,
  type ProfileField,
  type Source,
} from '@upriver/schemas';
import type { Manifest } from '../generate/manifest.js';
import { buildShowModel, buildDeliverableDetail } from './show-model.js';

const NOW = '2026-06-04T12:00:00.000Z';

function env<T>(value: T | null, source: Source = 'operator', verified = false): ProfileField<T> {
  return { value, source, confidence: null, verified, updatedAt: NOW };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as any;
  p._meta.revision = 1;
  for (const [path, v] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur: any = p;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i] as string;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1] as string] = v;
  }
  return p as ClientProfile;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The five fields doc-01 (Brand Voice Guide) requires — no HV, no upstream docs. */
const DOC01_READY = {
  'identity.publicName': env('Little Friends'),
  'identity.category': env('Preschool'),
  'customers.primaryCustomer': env({ demographic: 'families' }),
  'positioning.keyDifferentiator': env('Low ratios'),
  'voice.attributes': env([{ attribute: 'Warm' }]),
};

const emptyManifest: Manifest = { version: 1, docs: {} };

test('buildShowModel: a deliverable with all requirements met is grouped ready', () => {
  const model = buildShowModel(profileWith(DOC01_READY), emptyManifest, []);
  assert.ok(model.ready.some((r) => r.id === 'doc-01'), 'doc-01 should be ready');
  assert.ok(!model.blocked.some((r) => r.id === 'doc-01'), 'doc-01 should not be blocked');
});

test('buildShowModel: a deliverable with unverified HV gates is grouped blocked', () => {
  const model = buildShowModel(profileWith(DOC01_READY), emptyManifest, []);
  const doc02 = model.blocked.find((r) => r.id === 'doc-02');
  assert.ok(doc02, 'doc-02 should be blocked');
  assert.ok(doc02!.readiness.unverifiedHv.length > 0, 'doc-02 blocked by unverified HV');
});

test('buildShowModel: a generated-but-unapproved doc that blocks downstream is surfaced', () => {
  const manifest: Manifest = {
    version: 1,
    docs: {
      'doc-01': {
        id: 'doc-01',
        path: 'docs/doc-01-brand-voice-guide.md',
        generatedAt: NOW,
        specHash: 'a',
        profileSliceHash: 'b',
        markers: 30,
        approved: false,
      },
    },
  };
  const model = buildShowModel(profileWith(DOC01_READY), manifest, []);
  const entry = model.unapprovedBlocking.find((u) => u.id === 'doc-01');
  assert.ok(entry, 'doc-01 generated-but-unapproved should be flagged');
  assert.ok(entry!.blocking.includes('doc-04'), 'it blocks doc-04 (which requiresDocs doc-01)');
  assert.equal(entry!.path, 'docs/doc-01-brand-voice-guide.md');
});

test('buildShowModel: an approved doc is not flagged as unapproved-blocking', () => {
  const manifest: Manifest = {
    version: 1,
    docs: {
      'doc-01': {
        id: 'doc-01',
        path: 'docs/doc-01-brand-voice-guide.md',
        generatedAt: NOW,
        specHash: 'a',
        profileSliceHash: 'b',
        markers: 0,
        approved: true,
      },
    },
  };
  const model = buildShowModel(profileWith(DOC01_READY), manifest, []);
  assert.ok(!model.unapprovedBlocking.some((u) => u.id === 'doc-01'));
});

test('buildShowModel: fill stats count filled vs total leaves per section', () => {
  const model = buildShowModel(
    profileWith({
      'identity.publicName': env('LF'),
      'identity.legalName': env(null), // present envelope, null value → counts to total, not filled
    }),
    emptyManifest,
    [],
  );
  const identity = model.fill.find((f) => f.section === 'identity');
  assert.deepEqual(identity, { section: 'identity', filled: 1, total: 2 });
});

test('buildShowModel: the conflict queue passes through to the model', () => {
  const conflicts: ConflictEntry[] = [
    { path: 'pricing.deposit', existing: env('x'), candidate: { value: 'y', source: 'recon' }, queuedAt: NOW },
  ];
  const model = buildShowModel(profileWith(DOC01_READY), emptyManifest, conflicts);
  assert.equal(model.conflicts.length, 1);
  assert.equal(model.conflicts[0]?.path, 'pricing.deposit');
});

test('buildDeliverableDetail: lists each required field with filled/hv/verified state', () => {
  const detail = buildDeliverableDetail(profileWith(DOC01_READY), emptyManifest, 'doc-02');
  assert.equal(detail.id, 'doc-02');
  // every requiresFields path appears
  const paths = detail.fields.map((f) => f.path);
  assert.ok(paths.includes('offerings.core.*.priceRange'));
  const price = detail.fields.find((f) => f.path === 'offerings.core.*.priceRange');
  assert.equal(price!.hv, true);
  assert.equal(price!.verified, false);
  // doc-02 has no upstream docs
  assert.equal(detail.requiresDocs.length, 0);
});
