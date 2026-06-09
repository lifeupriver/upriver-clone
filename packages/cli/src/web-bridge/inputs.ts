import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { LocalFsClientDataSource } from '@upriver/core/data';
import { clientDir, type AuditPackage, type ClientIntake } from '@upriver/core';
import { nearestEnvelope, type ClientProfile } from '@upriver/schemas';

import { readProfile } from '../generate/profile-io.js';
import { auditDecisionsToClientIntake, LEGACY_INTAKE_PATH } from '../util/intake-reader.js';
import { loadAuditPackage } from '../scaffold/template-writer.js';

/**
 * The profile→website bridge (Build Spec 10 §B). `resolveWebInputs` is the one
 * seam the website pipeline (`design-brief` → `scaffold` → `clone`) reads its
 * content inputs through: profile-first, audit-package fallback, merged when both
 * exist. It hands back a carrier `pkg` (and `intakeDecisions`) so the commands
 * keep consuming the existing `AuditPackage` shape with a one-line swap — the
 * profile-fact override happens INSIDE here, by overlaying verified profile facts
 * onto a copy of the package. A client with an audit-package and no profile gets
 * the package back untouched (byte-identical to the pre-bridge pipeline).
 *
 * `siteStructure.pages` and screenshots are scrape artifacts, not profile data, so
 * they always come from the audit-package — hence `merged` is the normal source
 * for a full engagement. The point of the bridge: the clone never re-invents facts
 * the spine already verified (capacity, hours, pricing visibility, offerings all
 * flow from the HV-verified profile and override stale scraped copy).
 */
export type WebInputsSource = 'profile' | 'audit-package' | 'merged';

/** A capacity metric in the shape both the profile and the package speak. */
export interface CapacityMetric {
  label: string;
  value?: string | number;
  unit?: string;
}

/** Verified business facts that override stale scraped copy in any rebuild. */
export interface WebFacts {
  publicName?: string;
  hours?: string;
  pricingVisibilityPolicy?: string;
  capacityMetrics: CapacityMetric[];
}

/** Machine-readable brand tokens (the profile's visual brand, or the package's design system). */
export interface WebBrandTokens {
  palette: string[];
  typography: string[];
  logos: string[];
}

export interface WebInputs {
  source: WebInputsSource;
  /**
   * The audit-package the website pipeline consumes — passed through unchanged
   * (audit-package source), synthesized from the profile (profile source), or the
   * package with verified profile facts overlaid (merged source). This is the
   * carrier the three commands read; the resolved fields below are the same facts,
   * exposed for reporting and acceptance.
   */
  pkg: AuditPackage;
  voice: AuditPackage['brandVoiceDraft'];
  facts: WebFacts;
  offerings: string[];
  seoTargets: string[];
  brandTokens: WebBrandTokens;
  pages: AuditPackage['siteStructure']['pages'];
  /** Profile-first audit decisions (the migrated intake), or the legacy intake. */
  intakeDecisions: ClientIntake | null;
}

/* ── Profile extraction (verified facts → the values that override scraped copy) ── */

interface ExtractedProfile {
  publicName?: string;
  website?: string;
  hours?: string;
  pricingVisibilityPolicy?: string;
  offerings: Array<{ name: string; priceRange?: string }>;
  capacityMetrics: CapacityMetric[];
  voice: AuditPackage['brandVoiceDraft'];
  seoTargets: string[];
  brandTokens: WebBrandTokens;
}

function readValue<T>(profile: ClientProfile, path: string): T | undefined {
  const env = nearestEnvelope(profile as unknown as Record<string, unknown>, path);
  const value = env?.value;
  return value === null || value === undefined ? undefined : (value as T);
}

function extractProfile(profile: ClientProfile): ExtractedProfile {
  const offeringsRaw = readValue<Array<{ name: string; priceRange?: string }>>(profile, 'offerings.core') ?? [];
  const capacityRaw = readValue<CapacityMetric[]>(profile, 'capacity.metrics') ?? [];
  const attrs = readValue<Array<{ attribute: string }>>(profile, 'voice.attributes') ?? [];
  const vocab = readValue<string[]>(profile, 'voice.vocabularyToUse') ?? [];
  const bannedGroups = readValue<Array<{ terms?: string[] }>>(profile, 'voice.bannedVocabulary') ?? [];
  const operatingModes = readValue<{ marketing?: string }>(profile, 'voice.operatingModes');
  const keywordTargets = readValue<Array<{ keyword: string }>>(profile, 'seo.primaryKeywordTargets') ?? [];
  const visualBrand = readValue<{ palette?: string[]; typography?: string[]; logos?: string[] }>(profile, 'content.visualBrandAssets');

  const voice: AuditPackage['brandVoiceDraft'] = {
    tone: operatingModes?.marketing ?? '',
    keywords: vocab,
    bannedWords: bannedGroups.flatMap((g) => g.terms ?? []),
    sampleHeadlines: [],
    sampleBodyCopy: [],
    voiceCharacteristics: attrs.map((a) => a.attribute).filter(Boolean),
    audienceDescription: readValue<{ demographic?: string }>(profile, 'customers.primaryCustomer')?.demographic ?? '',
  };

  const ex: ExtractedProfile = {
    offerings: offeringsRaw.filter((o) => o && o.name),
    capacityMetrics: capacityRaw.filter((m) => m && m.label),
    voice,
    seoTargets: keywordTargets.map((k) => k.keyword).filter(Boolean),
    brandTokens: {
      palette: visualBrand?.palette ?? [],
      typography: visualBrand?.typography ?? [],
      logos: visualBrand?.logos ?? [],
    },
  };
  const publicName = readValue<string>(profile, 'identity.publicName');
  if (publicName) ex.publicName = publicName;
  const website = readValue<string>(profile, 'identity.website');
  if (website) ex.website = website;
  const hours = readValue<string>(profile, 'identity.hours');
  if (hours) ex.hours = hours;
  const pricingVisibility = readValue<string>(profile, 'pricing.visibilityPolicy');
  if (pricingVisibility) ex.pricingVisibilityPolicy = pricingVisibility;
  return ex;
}

/* ── Overlay / synthesis ──────────────────────────────────────────────────── */

/** Hours + capacity surfaced as FAQ entries so they render to files via `seedFaqs`. */
function factFaqs(ex: ExtractedProfile): AuditPackage['contentInventory']['faqs'] {
  const faqs: AuditPackage['contentInventory']['faqs'] = [];
  if (ex.hours) faqs.push({ question: 'What are your hours?', answer: ex.hours, page: '/' });
  if (ex.capacityMetrics.length) {
    const answer = ex.capacityMetrics
      .map((m) => `${m.label}: ${m.value ?? ''}${m.unit ? ` ${m.unit}` : ''}`.trim())
      .join('; ');
    faqs.push({ question: 'What is your capacity?', answer, page: '/' });
  }
  return faqs;
}

/** Prefer the profile's voice fields when non-empty; otherwise keep the package's. */
function mergeVoice(base: AuditPackage['brandVoiceDraft'], pv: AuditPackage['brandVoiceDraft']): AuditPackage['brandVoiceDraft'] {
  return {
    tone: pv.tone || base.tone,
    keywords: pv.keywords.length ? pv.keywords : base.keywords,
    bannedWords: pv.bannedWords.length ? pv.bannedWords : base.bannedWords,
    sampleHeadlines: base.sampleHeadlines,
    sampleBodyCopy: base.sampleBodyCopy,
    voiceCharacteristics: pv.voiceCharacteristics.length ? pv.voiceCharacteristics : base.voiceCharacteristics,
    audienceDescription: pv.audienceDescription || base.audienceDescription,
  };
}

/** Apply the verified profile facts to a `contentInventory`, in place (on a copy). */
function applyFactsToInventory(inv: AuditPackage['contentInventory'], ex: ExtractedProfile): void {
  if (ex.offerings.length) {
    inv.pricing = ex.offerings.map((o) => ({ item: o.name, price: o.priceRange ?? '', page: '/' }));
  }
  if (ex.hours) inv.contactInfo = { ...inv.contactInfo, hours: ex.hours };
  if (ex.capacityMetrics.length) {
    inv.eventSpaces = ex.capacityMetrics.map((m) => {
      const space: AuditPackage['contentInventory']['eventSpaces'][number] = { name: m.label, description: '', page: '/' };
      if (m.value !== undefined) space.capacity = String(m.value);
      return space;
    });
  }
  inv.faqs = [...factFaqs(ex), ...inv.faqs];
}

/** Overlay verified profile facts onto a DEEP COPY of the package (never mutate the caller's). */
function overlayProfileOntoPkg(pkg: AuditPackage, ex: ExtractedProfile): AuditPackage {
  const next = structuredClone(pkg);
  applyFactsToInventory(next.contentInventory, ex);
  next.brandVoiceDraft = mergeVoice(next.brandVoiceDraft, ex.voice);
  return next;
}

/**
 * The new-design path with no scrape: synthesize a minimal package from the
 * profile. This is NOT a faithful-package generator — just enough shape for the
 * scaffold to run and carry the verified facts. `pages` is empty (no scrape); the
 * web-PRD drives the page set for a profile-only build.
 */
function synthesizePkg(profile: ClientProfile, ex: ExtractedProfile): AuditPackage {
  const slug = profile._meta.slug;
  const name = ex.publicName ?? slug;
  const pkg: AuditPackage = {
    meta: {
      clientName: name, clientSlug: slug, siteUrl: ex.website ?? '',
      auditDate: profile._meta.updatedAt.slice(0, 10), auditor: 'Upriver (profile-only)',
      totalPages: 0, totalFindings: 0, findingsByPriority: { p0: 0, p1: 0, p2: 0 },
      overallScore: 0, scoreByDimension: {},
    },
    brandingProfile: {} as AuditPackage['brandingProfile'],
    designSystem: {
      colors: { primary: '#1d4ed8', secondary: '#0f172a', accent: '#f59e0b', background: '#ffffff', textPrimary: '#0f172a', textSecondary: '#475569' },
      typography: { headingFont: ex.brandTokens.typography[0] ?? 'Georgia, serif', bodyFont: ex.brandTokens.typography[1] ?? 'system-ui, sans-serif', monoFont: 'ui-monospace, monospace', scale: {} },
      spacing: { baseUnit: 8, scale: [8, 16, 24, 32, 48, 64], borderRadius: '8px' },
      components: { primaryButton: {}, secondaryButton: {}, inputField: {} },
      logo: ex.brandTokens.logos[0] ?? '', favicon: '', colorScheme: 'light', personality: ex.voice.voiceCharacteristics,
    },
    siteStructure: { pages: [], navigation: { primary: [], footer: [] }, missingPages: [] },
    contentInventory: { testimonials: [], teamMembers: [], faqs: [], pricing: [], socialLinks: [], contactInfo: {}, eventSpaces: [] },
    screenshots: { pages: [] },
    findings: [],
    brandVoiceDraft: ex.voice,
    implementationPlan: { phases: [], quickWins: [], requiresClientInput: [], requiresNewContent: [], requiresAssets: [] },
  };
  applyFactsToInventory(pkg.contentInventory, ex);
  return pkg;
}

/* ── Resolved-field views ───────────────────────────────────────────────────── */

function factsFromExtract(ex: ExtractedProfile): WebFacts {
  const facts: WebFacts = { capacityMetrics: ex.capacityMetrics };
  if (ex.publicName) facts.publicName = ex.publicName;
  if (ex.hours) facts.hours = ex.hours;
  if (ex.pricingVisibilityPolicy) facts.pricingVisibilityPolicy = ex.pricingVisibilityPolicy;
  return facts;
}

function factsFromPkg(pkg: AuditPackage): WebFacts {
  const facts: WebFacts = {
    publicName: pkg.meta.clientName,
    capacityMetrics: pkg.contentInventory.eventSpaces.map((e) => {
      const m: CapacityMetric = { label: e.name };
      if (e.capacity !== undefined) m.value = e.capacity;
      return m;
    }),
  };
  if (pkg.contentInventory.contactInfo.hours) facts.hours = pkg.contentInventory.contactInfo.hours;
  return facts;
}

function tokensFromPkg(pkg: AuditPackage): WebBrandTokens {
  return {
    palette: Object.values(pkg.designSystem.colors).filter((v): v is string => typeof v === 'string'),
    typography: [pkg.designSystem.typography.headingFont, pkg.designSystem.typography.bodyFont].filter(Boolean),
    logos: pkg.designSystem.logo ? [pkg.designSystem.logo] : [],
  };
}

/* ── The merge (pure — the unit-tested core) ───────────────────────────────── */

/**
 * Resolve the website pipeline's content inputs from a profile and/or an
 * audit-package (Build Spec 10 §B). Pure: all I/O is in {@link resolveWebInputs}.
 *
 * - profile only → `profile`: synthesize a minimal package from the profile.
 * - package only → `audit-package`: the package passes through UNCHANGED (the
 *   byte-identical contract for pre-bridge clients).
 * - both → `merged`: verified profile facts overlay a copy of the package; the
 *   scraped pages stay from the package.
 * - neither → throws (the website pipeline has nothing to build from).
 */
export function mergeWebInputs(
  profile: ClientProfile | null,
  pkg: AuditPackage | null,
  intake: ClientIntake | null,
): WebInputs {
  if (!profile && !pkg) {
    throw new Error(
      'resolveWebInputs: no profile.json and no audit-package.json for this client — the website pipeline has nothing to build from. Run `upriver synthesize <slug>` (scrape → audit) or import a profile first.',
    );
  }

  if (!profile && pkg) {
    return {
      source: 'audit-package',
      pkg, // same object — no copy, no mutation (byte-identical regression)
      voice: pkg.brandVoiceDraft,
      facts: factsFromPkg(pkg),
      offerings: pkg.contentInventory.pricing.map((p) => p.item),
      seoTargets: pkg.brandVoiceDraft.keywords ?? [],
      brandTokens: tokensFromPkg(pkg),
      pages: pkg.siteStructure.pages,
      intakeDecisions: intake,
    };
  }

  const ex = extractProfile(profile as ClientProfile);

  if (profile && !pkg) {
    const synth = synthesizePkg(profile, ex);
    return {
      source: 'profile',
      pkg: synth,
      voice: ex.voice,
      facts: factsFromExtract(ex),
      offerings: ex.offerings.map((o) => o.name),
      seoTargets: ex.seoTargets,
      brandTokens: ex.brandTokens,
      pages: synth.siteStructure.pages,
      intakeDecisions: intake,
    };
  }

  const base = pkg as AuditPackage;
  const overlaid = overlayProfileOntoPkg(base, ex);
  return {
    source: 'merged',
    pkg: overlaid,
    voice: overlaid.brandVoiceDraft,
    facts: factsFromExtract(ex),
    offerings: ex.offerings.map((o) => o.name),
    seoTargets: ex.seoTargets.length ? ex.seoTargets : base.brandVoiceDraft.keywords ?? [],
    brandTokens: ex.brandTokens.palette.length || ex.brandTokens.logos.length ? ex.brandTokens : tokensFromPkg(base),
    pages: overlaid.siteStructure.pages,
    intakeDecisions: intake,
  };
}

/* ── I/O wrapper (the seam the commands call) ──────────────────────────────── */

/**
 * Profile-first intake (the migrated `auditDecisions`), else the legacy
 * `intake.json`. Reads through the supplied local data source — the website
 * pipeline is filesystem-based (scaffold/clone write `clients/<slug>/repo`), so
 * this never depends on the supabase default the way `resolveClientDataSource`
 * would. Mirrors {@link readIntake} but pinned to the local tree.
 */
async function resolveIntake(
  ds: LocalFsClientDataSource,
  slug: string,
  profile: ClientProfile | null,
): Promise<ClientIntake | null> {
  const section = profile?.auditDecisions;
  if (section && section.value != null) return auditDecisionsToClientIntake(section);
  const raw = await ds.readClientFileText(slug, LEGACY_INTAKE_PATH);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as ClientIntake;
  } catch {
    return null;
  }
}

/**
 * Resolve the website pipeline's content inputs for `slug`: profile-first,
 * audit-package fallback, merged. The single seam `design-brief`, `scaffold`, and
 * `clone` read their inputs through. Filesystem-based by design (see module doc).
 */
export async function resolveWebInputs(slug: string): Promise<WebInputs> {
  const dir = clientDir(slug);
  const ds = new LocalFsClientDataSource();
  const profile = await readProfile(ds, slug);
  const pkg = existsSync(join(dir, 'audit-package.json')) ? loadAuditPackage(dir) : null;
  const intake = await resolveIntake(ds, slug, profile);
  return mergeWebInputs(profile, pkg, intake);
}
