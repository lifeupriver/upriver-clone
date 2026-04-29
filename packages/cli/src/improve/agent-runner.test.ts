import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditPackage, SitePage } from '@upriver/core';

import { buildTrackPrompt, resolveTrackTargets } from './agent-runner.js';
import type { SkillTrack } from './matrix-loader.js';

/**
 * Build a `SitePage` stub with sane defaults so tests can override only the
 * fields they care about.
 */
function stubPage(overrides: Partial<SitePage> & { url: string; slug: string }): SitePage {
  const base: SitePage = {
    url: overrides.url,
    slug: overrides.slug,
    title: `Page ${overrides.slug}`,
    description: '',
    wordCount: 100,
    headings: [],
    images: [],
    internalLinks: [],
    externalLinks: [],
    ctaButtons: [],
    schemaTypes: [],
    hasCanonical: false,
    statusCode: 200,
  };
  return { ...base, ...overrides };
}

/**
 * Minimal `AuditPackage` stub. Only the fields the agent-runner reads need to
 * be populated; the rest are inert defaults.
 */
function stubPackage(pages: SitePage[]): AuditPackage {
  return {
    meta: {
      clientName: 'Acme',
      clientSlug: 'acme',
      siteUrl: 'https://acme.example',
      auditDate: '2026-01-01',
      auditor: 'upriver',
      totalPages: pages.length,
      totalFindings: 0,
      findingsByPriority: { p0: 0, p1: 0, p2: 0 },
      overallScore: 0,
      scoreByDimension: {},
    },
    brandingProfile: {},
    designSystem: {
      colors: {
        primary: '#000',
        secondary: '#111',
        accent: '#222',
        background: '#fff',
        textPrimary: '#000',
        textSecondary: '#333',
      },
      typography: { headingFont: 'Inter', bodyFont: 'Inter', monoFont: 'mono', scale: {} },
      spacing: { baseUnit: 8, scale: [0, 4, 8], borderRadius: '4px' },
      components: { primaryButton: {}, secondaryButton: {}, inputField: {} },
      logo: '',
      favicon: '',
      colorScheme: 'light',
      personality: [],
    },
    siteStructure: { pages, navigation: { primary: [], footer: [] }, missingPages: [] },
    contentInventory: {
      testimonials: [],
      teamMembers: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      contactInfo: {},
      eventSpaces: [],
    },
    screenshots: { pages: [] },
    findings: [],
    brandVoiceDraft: {
      tone: '',
      keywords: [],
      bannedWords: [],
      sampleHeadlines: [],
      sampleBodyCopy: [],
      voiceCharacteristics: [],
      audienceDescription: '',
    },
    implementationPlan: {
      phases: [],
      quickWins: [],
      requiresClientInput: [],
      requiresNewContent: [],
      requiresAssets: [],
    },
  };
}

const COPY_TRACK: SkillTrack = {
  id: 'copy',
  skill: 'copywriting',
  targets: 'home,about',
  description: 'Tighten brand voice on the high-leverage marketing pages.',
  output: 'per-page edits',
};

describe('buildTrackPrompt', () => {
  it('embeds the skill body verbatim, the track id, the page list, and matched per-page wants', () => {
    const skillBody = '## SKILL\nWrite tight, specific, customer-language copy.\n';
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home', title: 'Home' }),
      stubPage({ url: 'https://acme.example/about', slug: 'about', title: 'About' }),
      stubPage({ url: 'https://acme.example/blog', slug: 'blog', title: 'Blog' }),
    ]);
    const pageList = resolveTrackTargets(pkg, 'home,about');

    const prompt = buildTrackPrompt({
      track: COPY_TRACK,
      pkg,
      skillBody,
      pageList,
      pageWants: {
        home: 'Make the hero clearer.',
        about: 'Lead with the founder story.',
        blog: 'Should not appear (not in pageList).',
      },
      brandVoiceMd: null,
      designTokensJson: null,
    });

    assert.ok(
      prompt.includes('Write tight, specific, customer-language copy.'),
      'prompt should embed skill body verbatim',
    );
    assert.ok(prompt.includes('improve(copy):'), 'prompt should include final summary line');
    assert.ok(prompt.includes('`/`'), 'prompt should include home path');
    assert.ok(prompt.includes('`/about`'), 'prompt should include about path');
    assert.ok(prompt.includes('Make the hero clearer.'), 'prompt should include matched home wants');
    assert.ok(
      prompt.includes('Lead with the founder story.'),
      'prompt should include matched about wants',
    );
    assert.ok(
      !prompt.includes('Should not appear'),
      'prompt should drop wants for slugs not in pageList',
    );
  });

  it('includes brand voice and design tokens blocks when supplied', () => {
    const pkg = stubPackage([stubPage({ url: 'https://acme.example/', slug: 'home' })]);
    const pageList = resolveTrackTargets(pkg, 'all-pages');
    const prompt = buildTrackPrompt({
      track: COPY_TRACK,
      pkg,
      skillBody: 'body',
      pageList,
      pageWants: {},
      brandVoiceMd: 'TONE: warm, direct.',
      designTokensJson: '{"primary":"#abcdef"}',
    });
    assert.ok(prompt.includes('TONE: warm, direct.'));
    assert.ok(prompt.includes('"primary":"#abcdef"'));
  });
});

describe('resolveTrackTargets', () => {
  it('all-pages filters out 4xx and 5xx pages', () => {
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home' }),
      stubPage({ url: 'https://acme.example/missing', slug: 'missing', statusCode: 404 }),
      stubPage({ url: 'https://acme.example/oops', slug: 'oops', statusCode: 500 }),
      stubPage({ url: 'https://acme.example/about', slug: 'about' }),
    ]);
    const out = resolveTrackTargets(pkg, 'all-pages');
    const slugs = out.map((p) => p.slug);
    assert.deepEqual(slugs.sort(), ['about', 'home']);
  });

  it('pillar-page-candidates returns only pages with wordCount > 600', () => {
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home', wordCount: 200 }),
      stubPage({ url: 'https://acme.example/guide', slug: 'guide', wordCount: 1200 }),
      stubPage({ url: 'https://acme.example/post', slug: 'post', wordCount: 700 }),
      stubPage({ url: 'https://acme.example/short', slug: 'short', wordCount: 600 }),
    ]);
    const out = resolveTrackTargets(pkg, 'pillar-page-candidates');
    const slugs = out.map((p) => p.slug).sort();
    assert.deepEqual(slugs, ['guide', 'post']);
  });

  it('high-intent-pages matches contact/pricing/services/book paths', () => {
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home' }),
      stubPage({ url: 'https://acme.example/contact', slug: 'contact' }),
      stubPage({ url: 'https://acme.example/pricing', slug: 'pricing' }),
      stubPage({ url: 'https://acme.example/services/web', slug: 'services-web' }),
      stubPage({ url: 'https://acme.example/book-a-call', slug: 'book-a-call' }),
      stubPage({ url: 'https://acme.example/about', slug: 'about' }),
    ]);
    const out = resolveTrackTargets(pkg, 'high-intent-pages');
    const slugs = out.map((p) => p.slug).sort();
    assert.deepEqual(slugs, ['book-a-call', 'contact', 'pricing', 'services-web']);
  });

  it('high-intent-pages falls back to homepage when no intent paths match', () => {
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home' }),
      stubPage({ url: 'https://acme.example/about', slug: 'about' }),
      stubPage({ url: 'https://acme.example/team', slug: 'team' }),
    ]);
    const out = resolveTrackTargets(pkg, 'high-intent-pages');
    assert.equal(out.length, 1);
    assert.equal(out[0]?.slug, 'home');
    assert.equal(out[0]?.path, '/');
  });

  it('comma-list matches by slug; unknown slugs are dropped', () => {
    const pkg = stubPackage([
      stubPage({ url: 'https://acme.example/', slug: 'home' }),
      stubPage({ url: 'https://acme.example/about', slug: 'about' }),
      stubPage({ url: 'https://acme.example/services', slug: 'services' }),
    ]);
    const out = resolveTrackTargets(pkg, 'home,about,nope');
    const slugs = out.map((p) => p.slug).sort();
    assert.deepEqual(slugs, ['about', 'home']);
    assert.ok(!slugs.includes('nope'));
  });
});
