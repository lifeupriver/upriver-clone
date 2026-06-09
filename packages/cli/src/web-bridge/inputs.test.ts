import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditPackage, ClientIntake } from '@upriver/core';
import type { ClientProfile, ProfileField } from '@upriver/schemas';
import { mergeWebInputs } from './inputs.js';

/* ── Test helpers: minimal envelopes / profiles / packages ─────────────────── */

function env<T>(value: T): ProfileField<T> {
  return { value, source: 'transcript', confidence: 'high', verified: true, updatedAt: '2026-06-09T00:00:00.000Z' };
}

function makeProfile(sections: Record<string, unknown>): ClientProfile {
  return {
    _meta: { version: 1, slug: 'lf', createdAt: '2026-06-09T00:00:00.000Z', updatedAt: '2026-06-09T00:00:00.000Z', revision: 1 },
    ...sections,
  } as unknown as ClientProfile;
}

/** A complete-enough AuditPackage; override the fields a test cares about. */
function makePkg(overrides: Partial<AuditPackage> = {}): AuditPackage {
  const base: AuditPackage = {
    meta: {
      clientName: 'Stale Co', clientSlug: 'lf', siteUrl: 'https://stale.example',
      auditDate: '2026-01-01', auditor: 'Upriver', totalPages: 1, totalFindings: 0,
      findingsByPriority: { p0: 0, p1: 0, p2: 0 }, overallScore: 50, scoreByDimension: {},
    },
    brandingProfile: {} as AuditPackage['brandingProfile'],
    designSystem: {
      colors: { primary: '#111', secondary: '#222', accent: '#333', background: '#fff', textPrimary: '#000', textSecondary: '#555' },
      typography: { headingFont: 'Serif', bodyFont: 'Sans', monoFont: 'Mono', scale: {} },
      spacing: { baseUnit: 8, scale: [8, 16], borderRadius: '4px' },
      components: { primaryButton: {}, secondaryButton: {}, inputField: {} },
      logo: '', favicon: '', colorScheme: 'light', personality: [],
    },
    siteStructure: {
      pages: [{ url: 'https://stale.example/', slug: '/', title: 'Home', description: '', wordCount: 1, headings: [], images: [], internalLinks: [], externalLinks: [], ctaButtons: [], schemaTypes: [], hasCanonical: true, statusCode: 200 }],
      navigation: { primary: [], footer: [] },
      missingPages: [],
    },
    contentInventory: {
      testimonials: [], teamMembers: [], faqs: [],
      pricing: [{ item: 'STALE Offer', price: '$0', page: '/' }],
      socialLinks: [], contactInfo: { hours: 'STALE HOURS' }, eventSpaces: [],
    },
    screenshots: { pages: [] },
    findings: [],
    brandVoiceDraft: { tone: 'stale tone', keywords: [], bannedWords: [], sampleHeadlines: [], sampleBodyCopy: [], voiceCharacteristics: [], audienceDescription: '' },
    implementationPlan: { phases: [], quickWins: [], requiresClientInput: [], requiresNewContent: [], requiresAssets: [] },
  };
  return { ...base, ...overrides };
}

const PROFILE_FACTS: Record<string, unknown> = {
  identity: { publicName: env('Little Friends'), hours: env('Mon–Fri 8:00am–5:30pm') },
  offerings: { core: env([{ name: 'Twos class', priceRange: '$1,200/mo' }]) },
  capacity: { metrics: env([{ label: 'licensed capacity', value: 58 }]) },
  voice: { attributes: env([{ attribute: 'warm' }]), vocabularyToUse: env(['nurturing']) },
  seo: { primaryKeywordTargets: env([{ keyword: 'jcc preschool' }]) },
};

const INTAKE: ClientIntake = { version: 1, findingDecisions: {}, pageWants: { '/': 'keep' }, referenceSites: [], scopeTier: null, submittedAt: null, updatedAt: '2026-06-09T00:00:00.000Z' };

/* ── The four cases (Build Spec 10 §B) ─────────────────────────────────────── */

test('package-only: source is audit-package, pkg passes through byte-identical, facts derive from pkg', () => {
  const pkg = makePkg();
  const wi = mergeWebInputs(null, pkg, INTAKE);
  assert.equal(wi.source, 'audit-package');
  assert.equal(wi.pkg, pkg, 'pkg must be the same object (no copy, no mutation) for byte-identical regression');
  assert.deepEqual(wi.pages, pkg.siteStructure.pages);
  assert.deepEqual(wi.offerings, ['STALE Offer'], 'offerings derived from the package when there is no profile');
  assert.equal(wi.intakeDecisions, INTAKE);
});

test('profile-only: source is profile, pkg is synthesized from the profile and carries the facts', () => {
  const wi = mergeWebInputs(makeProfile(PROFILE_FACTS), null, INTAKE);
  assert.equal(wi.source, 'profile');
  assert.equal(wi.facts.publicName, 'Little Friends');
  assert.equal(wi.facts.hours, 'Mon–Fri 8:00am–5:30pm');
  assert.deepEqual(wi.offerings, ['Twos class']);
  assert.ok(wi.pkg.contentInventory.pricing.some((p) => p.item === 'Twos class'), 'offering name in synthesized pricing');
  assert.equal(wi.pkg.meta.clientName, 'Little Friends', 'synthesized meta uses the verified public name');
});

test('merged: profile facts OVERRIDE stale package content; pages stay from the package; input pkg not mutated', () => {
  const pkg = makePkg();
  const wi = mergeWebInputs(makeProfile(PROFILE_FACTS), pkg, INTAKE);
  assert.equal(wi.source, 'merged');

  // Offering name overrides the stale scraped pricing (renders in product-marketing-context).
  assert.ok(wi.pkg.contentInventory.pricing.some((p) => p.item === 'Twos class'), 'profile offering present');
  assert.ok(!wi.pkg.contentInventory.pricing.some((p) => p.item === 'STALE Offer'), 'stale offering replaced');

  // Hours + capacity routed into faqs (rendered to files by seedFaqs) and contactInfo.
  const faqText = JSON.stringify(wi.pkg.contentInventory.faqs);
  assert.match(faqText, /Mon–Fri 8:00am–5:30pm/, 'profile hours surfaced as an FAQ answer');
  assert.match(faqText, /58/, 'profile capacity surfaced as an FAQ answer');
  assert.equal(wi.pkg.contentInventory.contactInfo.hours, 'Mon–Fri 8:00am–5:30pm', 'contactInfo.hours overridden');

  // Pages are scrape artifacts — they stay from the package.
  assert.deepEqual(wi.pkg.siteStructure.pages, pkg.siteStructure.pages);

  // The overlay works on a copy: the caller's package is untouched.
  assert.equal(pkg.contentInventory.contactInfo.hours, 'STALE HOURS', 'input pkg must not be mutated');
  assert.ok(pkg.contentInventory.pricing.some((p) => p.item === 'STALE Offer'), 'input pkg pricing untouched');
});

test('neither: no profile and no package is an error (the website pipeline has nothing to build from)', () => {
  assert.throws(() => mergeWebInputs(null, null, null), /no profile.*no audit-package|neither|nothing/i);
});
