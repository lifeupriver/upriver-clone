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
import { renderShow, renderDeliverableDetail, renderConflicts, renderSyncResult, formatIssues } from './render.js';
import type { SyncResult } from './sync.js';

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

const DOC01_READY = {
  'identity.publicName': env('Little Friends'),
  'identity.category': env('Preschool'),
  'customers.primaryCustomer': env({ demographic: 'families' }),
  'positioning.keyDifferentiator': env('Low ratios'),
  'voice.attributes': env([{ attribute: 'Warm' }]),
};
const emptyManifest: Manifest = { version: 1, docs: {} };

test('renderShow: shows slug, revision, fill stats, and a ready deliverable', () => {
  const text = renderShow(buildShowModel(profileWith(DOC01_READY), emptyManifest, []));
  assert.match(text, /littlefriends/);
  assert.match(text, /revision 1/);
  assert.match(text, /identity/);
  assert.match(text, /doc-01/);
});

test('renderShow: groups blocked deliverables by blocker kind (HV bucket lists doc-02)', () => {
  const text = renderShow(buildShowModel(profileWith(DOC01_READY), emptyManifest, []));
  assert.match(text, /unverified HV/i);
  // doc-02 is blocked by HV; it appears in the report
  assert.match(text, /doc-02/);
});

test('renderShow: empty conflict queue renders a none line', () => {
  const text = renderShow(buildShowModel(profileWith(DOC01_READY), emptyManifest, []));
  assert.match(text, /conflict queue \(0\)/i);
});

test('renderShow: a populated conflict queue is numbered from 1', () => {
  const conflicts: ConflictEntry[] = [
    { path: 'pricing.deposit', existing: env('x'), candidate: { value: 'y', source: 'recon' }, queuedAt: NOW },
  ];
  const text = renderShow(buildShowModel(profileWith(DOC01_READY), emptyManifest, conflicts));
  assert.match(text, /1\.\s+pricing\.deposit/);
});

test('renderShow: surfaces generated-but-unapproved docs blocking downstream', () => {
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
  const text = renderShow(buildShowModel(profileWith(DOC01_READY), manifest, []));
  assert.match(text, /unapproved/i);
  assert.match(text, /docs\/doc-01-brand-voice-guide\.md/);
});

test('renderDeliverableDetail: dumps exact required-field paths with state', () => {
  const detail = buildDeliverableDetail(profileWith(DOC01_READY), emptyManifest, 'doc-02');
  const text = renderDeliverableDetail(detail);
  assert.match(text, /doc-02/);
  assert.match(text, /offerings\.core\.\*\.priceRange/);
  assert.match(text, /HV/);
});

test('renderConflicts: empty queue says none; populated queue is numbered with values', () => {
  assert.match(renderConflicts([]), /conflict queue \(0\): none/i);
  const text = renderConflicts([
    { path: 'pricing.deposit', existing: env('x', 'operator', true), candidate: { value: 'y', source: 'recon' }, queuedAt: NOW },
  ]);
  assert.match(text, /1\.\s+pricing\.deposit/);
  assert.match(text, /candidate: "y" \(recon\)/);
});

test('renderSyncResult: shows direction, merge counts, conflict hint, divergence, and doc diff', () => {
  const r: SyncResult = {
    direction: 'pull',
    sourceKind: 'supabase',
    destKind: 'local',
    mode: 'merged',
    applied: 1,
    unchanged: 0,
    conflicts: [{ path: 'pricing.deposit', existing: env('x'), candidate: { value: 'y', source: 'recon' }, queuedAt: NOW }],
    manifest: 'diverged-copied',
    docCount: { source: 3, dest: 2 },
  };
  const text = renderSyncResult('littlefriends', r);
  assert.match(text, /pull littlefriends: supabase → local/);
  assert.match(text, /1 applied/);
  assert.match(text, /conflicts queued: 1/);
  assert.match(text, /DIVERGED/);
  assert.match(text, /supabase 3, local 2/);
});

test('formatIssues: groups zod issues by section with their messages', () => {
  const text = formatIssues([{ path: ['pricing', 'deposit'], message: 'Expected string, received number' }]);
  assert.match(text, /pricing/);
  assert.match(text, /Expected string/);
});
