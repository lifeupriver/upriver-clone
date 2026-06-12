import type { Source } from './envelope.js';

/** AI Operating System docs (01–18) and client-facing provisioning (i01–i09). */
export type DeliverableId =
  | 'doc-01' | 'doc-02' | 'doc-03' | 'doc-04' | 'doc-05' | 'doc-06'
  | 'doc-07' | 'doc-08' | 'doc-09' | 'doc-10' | 'doc-11' | 'doc-12'
  | 'doc-13' | 'doc-14' | 'doc-15' | 'doc-16' | 'doc-17' | 'doc-18'
  // Website tier (Build Spec 10, gap G6) — post-fork web deliverables, generated
  // under the explicit `--web` scope, excluded from `--all`'s default 01–18 set.
  | 'doc-web-prd' | 'design-system'
  // Pitch teasers (Spec 19) — prospect-facing short docs built from recon only,
  // generated one-by-one by `upriver pitch run`; never part of --all/--web.
  | 'doc-pitch-01' | 'doc-pitch-02' | 'doc-pitch-03' | 'doc-pitch-04'
  | 'i01' | 'i02' | 'i03' | 'i04' | 'i05' | 'i06' | 'i07' | 'i08' | 'i09';

export interface DeliverableCoverage {
  id: DeliverableId;
  title: string;
  /** Dot-paths into ClientProfile, field level. May use the array wildcard `*`. */
  requiresFields: string[];
  /** Subset of requiresFields; each must also be matched by HV_FIELDS. */
  requiresHvVerified: string[];
  /** Upstream DAG edges — PRD §3.1 (docs) and §3.4 (i-series), verbatim. */
  requiresDocs: DeliverableId[];
  /** Relative path into specs-reference/. */
  specPath: string;
}

const AOS = 'ai-operating-system';
const INF = 'infrastructure';
const SALES = 'sales-engine';

/**
 * The field-to-deliverable coverage map (PRD §3). `requiresFields` expands the
 * PRD's section-level rows to field level against each spec; DAG edges are
 * transcribed verbatim from §3.1 (docs) and §3.4 (i-series, incl. i07-first and
 * i03-after-i02-and-i04).
 */
export const COVERAGE_MAP: readonly DeliverableCoverage[] = [
  {
    id: 'doc-01', title: 'Brand Voice Guide',
    requiresFields: ['identity.publicName', 'identity.category', 'customers.primaryCustomer', 'positioning.keyDifferentiator', 'voice.attributes'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${AOS}/01-brand-voice-guide-spec.md`,
  },
  {
    id: 'doc-02', title: 'Business Facts Reference',
    requiresFields: ['identity.publicName', 'identity.legalName', 'identity.category', 'identity.primaryAddress', 'identity.hours', 'identity.socialHandles', 'people.owners', 'offerings.core', 'offerings.core.*.priceRange', 'offerings.dontDo', 'pricing.shareable', 'pricing.deposit', 'capacity.metrics', 'positioning.keyDifferentiator', 'governance.dataRetention', 'modules.preschool.ocfs.licenseStatus', 'modules.preschool.immunizationPolicy', 'modules.preschool.enrollmentCapacity', 'modules.preschool.trainingMatrix', 'content.reviewPlatforms'],
    requiresHvVerified: ['offerings.core.*.priceRange', 'offerings.dontDo', 'pricing.shareable', 'pricing.deposit', 'capacity.metrics', 'governance.dataRetention', 'modules.preschool.ocfs.licenseStatus', 'modules.preschool.immunizationPolicy', 'modules.preschool.enrollmentCapacity', 'modules.preschool.trainingMatrix'],
    requiresDocs: [],
    specPath: `${AOS}/02-business-facts-reference-spec.md`,
  },
  {
    id: 'doc-03', title: 'Sales Process Map',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'salesProcess.leadSources', 'salesProcess.qualificationCriteria', 'salesProcess.close.definition', 'salesProcess.funnel.revenuePerCustomer', 'toolsAndAccess.crm', 'capacity.bookingLeadTime'],
    requiresHvVerified: ['salesProcess.close.definition', 'salesProcess.funnel.revenuePerCustomer', 'toolsAndAccess.crm', 'capacity.bookingLeadTime'],
    requiresDocs: [],
    specPath: `${AOS}/03-sales-process-map-spec.md`,
  },
  {
    id: 'doc-04', title: 'Content Library',
    requiresFields: ['identity.publicName', 'content.photos.storage', 'content.photos.rights', 'content.videos.rights', 'toolsAndAccess.assetStorage', 'positioning.awards', 'content.testimonials', 'content.reviewPlatforms'],
    requiresHvVerified: ['content.photos.rights', 'content.videos.rights', 'toolsAndAccess.assetStorage'],
    requiresDocs: ['doc-01', 'doc-02'],
    specPath: `${AOS}/04-content-library-spec.md`,
  },
  {
    id: 'doc-05', title: 'Competitor Landscape',
    requiresFields: ['identity.publicName', 'competitors.direct', 'competitors.marketContext', 'customers.primaryCustomer', 'pricing.shareable', 'positioning.keyDifferentiator'],
    requiresHvVerified: ['pricing.shareable'],
    requiresDocs: ['doc-01', 'doc-02'],
    specPath: `${AOS}/05-competitor-landscape-spec.md`,
  },
  {
    id: 'doc-06', title: 'SEO & Keyword Strategy',
    requiresFields: ['identity.publicName', 'seo.baseline', 'seo.primaryKeywordTargets', 'identity.primaryAddress', 'toolsAndAccess.analytics', 'content.written'],
    requiresHvVerified: ['toolsAndAccess.analytics'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-05'],
    specPath: `${AOS}/06-seo-keyword-strategy-spec.md`,
  },
  {
    id: 'doc-07', title: 'FAQ Bank',
    requiresFields: ['identity.publicName', 'offerings.core', 'offerings.dontDo', 'pricing.nonShareable', 'capacity.metrics', 'operationsAutomation.sensitiveTopics', 'operationsAutomation.escalationRouting', 'people.routing.doNotRoute', 'customers.primaryCustomer'],
    requiresHvVerified: ['offerings.dontDo', 'pricing.nonShareable', 'capacity.metrics', 'operationsAutomation.sensitiveTopics', 'operationsAutomation.escalationRouting', 'people.routing.doNotRoute'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-03'],
    specPath: `${AOS}/07-faq-bank-spec.md`,
  },
  {
    id: 'doc-08', title: 'Email Templates',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'salesProcess.conversionEvent', 'salesProcess.followUpCadences', 'toolsAndAccess.scheduling', 'operationsAutomation.responseSlas'],
    requiresHvVerified: ['toolsAndAccess.scheduling'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-03', 'doc-07'],
    specPath: `${AOS}/08-email-templates-spec.md`,
  },
  {
    id: 'doc-09', title: 'Social Media Playbook',
    requiresFields: ['identity.publicName', 'content.productionCapacity', 'content.performingThemes', 'content.videos.rights', 'operationsAutomation.responseSlas', 'toolsAndAccess.socialAccounts'],
    requiresHvVerified: ['content.videos.rights', 'toolsAndAccess.socialAccounts'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-04', 'doc-05', 'doc-06'],
    specPath: `${AOS}/09-social-media-playbook-spec.md`,
  },
  {
    id: 'doc-10', title: 'Website Audit',
    requiresFields: ['identity.publicName', 'seo.technical', 'toolsAndAccess.websiteCms', 'salesProcess.conversionEvent', 'pricing.visibilityPolicy', 'goals.engagementScope', 'goals.budgetConstraints'],
    requiresHvVerified: ['toolsAndAccess.websiteCms', 'pricing.visibilityPolicy', 'goals.budgetConstraints'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06', 'doc-07', 'doc-08', 'doc-09'],
    specPath: `${AOS}/10-website-audit-spec.md`,
  },
  {
    id: 'doc-11', title: 'Automation Spec Package',
    requiresFields: ['identity.publicName', 'operationsAutomation.recurringTasks', 'operationsAutomation.escalationRouting', 'operationsAutomation.spendCap', 'toolsAndAccess.automationPlatform', 'toolsAndAccess.apiSpend.caps', 'salesProcess.leadSources', 'goals.redLines'],
    requiresHvVerified: ['operationsAutomation.escalationRouting', 'operationsAutomation.spendCap', 'toolsAndAccess.automationPlatform', 'toolsAndAccess.apiSpend.caps', 'goals.redLines'],
    requiresDocs: ['doc-02', 'doc-03', 'doc-07', 'doc-08'],
    specPath: `${AOS}/11-automation-spec-package-spec.md`,
  },
  {
    id: 'doc-12', title: 'Measurement & KPI Framework',
    requiresFields: ['identity.publicName', 'seo.measurementTargets', 'salesProcess.funnel.revenuePerCustomer', 'toolsAndAccess.analytics', 'goals.budgetConstraints', 'operationsAutomation.spendCap', 'operationsAutomation.monitoring', 'content.reviewPlatforms'],
    requiresHvVerified: ['salesProcess.funnel.revenuePerCustomer', 'toolsAndAccess.analytics', 'goals.budgetConstraints', 'operationsAutomation.spendCap'],
    requiresDocs: ['doc-03', 'doc-06', 'doc-09', 'doc-11'],
    specPath: `${AOS}/12-measurement-kpi-framework-spec.md`,
  },
  {
    id: 'doc-13', title: 'Master Build Sequence',
    requiresFields: ['identity.publicName', 'goals.engagementScope'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${AOS}/13-master-build-sequence-spec.md`,
  },
  {
    id: 'doc-14', title: 'Client Onboarding Kit',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'toolsAndAccess.accessChecklist', 'goals.primaryOutcome'],
    requiresHvVerified: ['toolsAndAccess.accessChecklist'],
    requiresDocs: [],
    specPath: `${AOS}/14-client-onboarding-kit-spec.md`,
  },
  {
    id: 'doc-15', title: 'Retainer Engagement Playbook',
    requiresFields: ['identity.publicName', 'goals.engagementScope', 'operationsAutomation.monitoring'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${AOS}/15-retainer-engagement-playbook-spec.md`,
  },
  {
    id: 'doc-16', title: 'Sales Collateral',
    requiresFields: ['identity.publicName', 'positioning.recommendedStatement', 'pricing.shareable', 'content.testimonials'],
    requiresHvVerified: ['pricing.shareable'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06', 'doc-07'],
    specPath: `${AOS}/16-sales-collateral-spec.md`,
  },
  {
    id: 'doc-17', title: 'Handoff & Offboarding',
    requiresFields: ['identity.publicName', 'governance.offboardingPlan', 'toolsAndAccess.stack'],
    requiresHvVerified: ['governance.offboardingPlan', 'toolsAndAccess.stack'],
    requiresDocs: [],
    specPath: `${AOS}/17-handoff-offboarding-spec.md`,
  },
  {
    id: 'doc-18', title: 'AI Operating System Sales Document',
    requiresFields: ['identity.publicName'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${AOS}/18-ai-operating-system-sales-document.md`,
  },
  // ── Website tier (Build Spec 10, gap G6). Post-fork — HV-gated on the doc-10 §9
  //    scope fork (`goals.engagementScope.websiteScope`): no website deliverable
  //    generates until that money decision is verified. Generated under `--web`.
  {
    id: 'doc-web-prd', title: 'Website Requirements PRD',
    requiresFields: ['identity.publicName', 'offerings.core', 'positioning.keyDifferentiator', 'customers.primaryCustomer', 'seo.primaryKeywordTargets', 'seo.local', 'salesProcess.conversionEvent', 'content.written', 'goals.engagementScope.websiteScope'],
    requiresHvVerified: ['goals.engagementScope.websiteScope'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-06', 'doc-10'],
    specPath: `${AOS}/19-website-prd-spec.md`,
  },
  {
    id: 'design-system', title: 'Design System',
    requiresFields: ['identity.publicName', 'voice.attributes', 'content.visualBrandAssets', 'positioning.keyDifferentiator', 'goals.engagementScope.websiteScope'],
    requiresHvVerified: ['goals.engagementScope.websiteScope'],
    requiresDocs: ['doc-01', 'doc-05', 'doc-10'],
    specPath: `${AOS}/20-design-system-spec.md`,
  },
  {
    id: 'i07', title: 'Account Access & Governance',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'people.billingContact', 'governance.dataResidency', 'governance.offboardingPlan', 'toolsAndAccess.plan.billingOwner', 'goals.budgetConstraints'],
    requiresHvVerified: ['people.billingContact', 'governance.dataResidency', 'governance.offboardingPlan', 'toolsAndAccess.plan.billingOwner', 'goals.budgetConstraints'],
    requiresDocs: [],
    specPath: `${INF}/I07-client-account-access-governance-spec.md`,
  },
  {
    id: 'i01', title: 'Client Claude Project',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'goals.engagementScope'],
    requiresHvVerified: [],
    requiresDocs: ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06', 'doc-07', 'doc-08', 'doc-09', 'doc-10', 'doc-11', 'doc-12', 'doc-13', 'doc-14', 'doc-15', 'doc-16', 'doc-17', 'doc-18', 'i07'],
    specPath: `${INF}/I01-client-claude-project-setup-spec.md`,
  },
  {
    id: 'i02', title: 'Client Skills Deployment',
    requiresFields: ['identity.publicName', 'operationsAutomation.recurringTasks', 'toolsAndAccess.stack', 'people.keyTeam'],
    requiresHvVerified: ['toolsAndAccess.stack'],
    requiresDocs: ['doc-01', 'doc-03', 'doc-04', 'doc-06', 'doc-07', 'doc-11', 'i01'],
    specPath: `${INF}/I02-client-skills-deployment-spec.md`,
  },
  {
    id: 'i04', title: 'Client MCP Server Configuration',
    requiresFields: ['identity.publicName', 'toolsAndAccess.stack', 'toolsAndAccess.apiSpend.caps', 'governance.dataResidency', 'people.keyTeam'],
    requiresHvVerified: ['toolsAndAccess.stack', 'toolsAndAccess.apiSpend.caps', 'governance.dataResidency'],
    requiresDocs: ['doc-11', 'i02'],
    specPath: `${INF}/I04-client-mcp-server-configuration-spec.md`,
  },
  {
    id: 'i03', title: 'Client Routines / Cowork',
    requiresFields: ['identity.publicName', 'operationsAutomation.recurringTasks', 'operationsAutomation.monitoring', 'toolsAndAccess.browserDeviceLandscape', 'people.keyTeam'],
    requiresHvVerified: ['toolsAndAccess.browserDeviceLandscape'],
    requiresDocs: ['doc-02', 'doc-04', 'doc-06', 'doc-07', 'doc-11', 'doc-12', 'i02', 'i04'],
    specPath: `${INF}/I03-client-routines-cowork-spec.md`,
  },
  {
    id: 'i05', title: 'Client Claude in Chrome',
    requiresFields: ['identity.publicName', 'toolsAndAccess.browserDeviceLandscape', 'people.keyTeam'],
    requiresHvVerified: ['toolsAndAccess.browserDeviceLandscape'],
    requiresDocs: ['doc-01', 'doc-02', 'doc-11', 'i01'],
    specPath: `${INF}/I05-client-claude-in-chrome-spec.md`,
  },
  {
    id: 'i06', title: 'Client Claude Code Setup',
    requiresFields: ['identity.publicName', 'people.technicalCollaborator', 'toolsAndAccess.apiSpend.caps'],
    requiresHvVerified: ['toolsAndAccess.apiSpend.caps'],
    requiresDocs: ['i01'],
    specPath: `${INF}/I06-client-claude-code-setup-spec.md`,
  },
  {
    id: 'i08', title: 'Client Custom Styles / Memory / Preferences',
    requiresFields: ['identity.publicName', 'people.keyTeam', 'governance.memoryIncognitoPosture'],
    requiresHvVerified: ['governance.memoryIncognitoPosture'],
    requiresDocs: ['doc-01', 'i01'],
    specPath: `${INF}/I08-client-custom-styles-memory-preferences-spec.md`,
  },
  {
    id: 'i09', title: 'Client Artifacts & Deliverable Templates',
    requiresFields: ['identity.publicName', 'operationsAutomation.recurringTasks', 'toolsAndAccess.assetStorage', 'governance.reviewResponsePolicy'],
    requiresHvVerified: ['toolsAndAccess.assetStorage', 'governance.reviewResponsePolicy'],
    requiresDocs: ['doc-02', 'doc-04', 'doc-06', 'doc-11', 'doc-12', 'i01'],
    specPath: `${INF}/I09-client-artifacts-deliverable-templates-spec.md`,
  },
  // ——— Pitch teasers (Spec 19) ———————————————————————————————————————————
  // Recon-only prospect docs: minimal field requirements (a prospect profile
  // is seeded from recon, not an interview), zero HV gates, zero upstream
  // deps. The audit/homepage context arrives via the engine's pitch-context
  // injection, not the profile slice.
  {
    id: 'doc-pitch-01', title: 'Homepage Before & After',
    requiresFields: ['identity.publicName'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${SALES}/pitch-01-before-after-spec.md`,
  },
  {
    id: 'doc-pitch-02', title: 'Top 3 Quick Wins',
    requiresFields: ['identity.publicName'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${SALES}/pitch-02-quick-wins-spec.md`,
  },
  {
    id: 'doc-pitch-03', title: 'Brand Voice Sample',
    requiresFields: ['identity.publicName'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${SALES}/pitch-03-voice-sample-spec.md`,
  },
  {
    id: 'doc-pitch-04', title: 'Vertical Opportunity Snapshot',
    requiresFields: ['identity.publicName', 'identity.category'],
    requiresHvVerified: [],
    requiresDocs: [],
    specPath: `${SALES}/pitch-04-vertical-snapshot-spec.md`,
  },
];

/** How a must-ask field is best collected (PRD §3.5). */
export interface MustAskEntry {
  path: string;
  askVia: 'session' | 'chatbot' | 'operator';
  expectedSources: Source[];
}

/** Fields no recon source can fill, grouped by where they best come from (§3.5). */
export const MUST_ASK: readonly MustAskEntry[] = [
  // Recorded session — the spine.
  { path: 'voice.attributes', askVia: 'session', expectedSources: ['transcript', 'interview'] },
  { path: 'offerings.dontDo', askVia: 'session', expectedSources: ['transcript'] },
  { path: 'pricing.nonShareable', askVia: 'session', expectedSources: ['transcript', 'operator'] },
  { path: 'capacity.metrics', askVia: 'session', expectedSources: ['transcript'] },
  { path: 'salesProcess.qualificationCriteria', askVia: 'session', expectedSources: ['transcript'] },
  { path: 'salesProcess.close.definition', askVia: 'session', expectedSources: ['transcript', 'operator'] },
  { path: 'goals.redLines', askVia: 'session', expectedSources: ['transcript'] },
  { path: 'goals.primaryOutcome', askVia: 'session', expectedSources: ['transcript', 'interview'] },
  // Chatbot gap-fill — factual, low-friction.
  { path: 'people.keyTeam', askVia: 'chatbot', expectedSources: ['interview', 'recon'] },
  { path: 'toolsAndAccess.stack', askVia: 'chatbot', expectedSources: ['interview', 'operator'] },
  { path: 'operationsAutomation.recurringTasks', askVia: 'chatbot', expectedSources: ['interview'] },
  { path: 'operationsAutomation.escalationRouting', askVia: 'chatbot', expectedSources: ['interview', 'operator'] },
  { path: 'toolsAndAccess.browserDeviceLandscape', askVia: 'chatbot', expectedSources: ['interview'] },
  { path: 'content.productionCapacity', askVia: 'chatbot', expectedSources: ['interview'] },
  { path: 'modules.preschool.enrollmentCapacity', askVia: 'chatbot', expectedSources: ['interview', 'transcript'] },
  // Operator-mediated only — never the chatbot.
  { path: 'toolsAndAccess.apiSpend.caps', askVia: 'operator', expectedSources: ['operator'] },
  { path: 'toolsAndAccess.plan.billingOwner', askVia: 'operator', expectedSources: ['operator'] },
  { path: 'governance.dataResidency', askVia: 'operator', expectedSources: ['operator'] },
];

/** Recon targets and per-source fill expectations (PRD §2.4). Dot-paths resolve against the schema. */
export const SOURCE_EXPECTATIONS: Readonly<Record<Source, readonly string[]>> = {
  recon: ['identity.legalName', 'identity.publicName', 'identity.gbp', 'identity.socialHandles', 'identity.hours', 'pricing.shareable', 'content.reviewPlatforms', 'content.testimonials', 'competitors.direct', 'seo.baseline', 'toolsAndAccess.websiteCms', 'salesProcess.firstTouch'],
  interview: ['voice.attributes', 'voice.vocabularyToUse', 'toolsAndAccess.stack', 'operationsAutomation.recurringTasks', 'content.productionCapacity', 'people.keyTeam', 'governance.dataResidency'],
  transcript: ['voice.attributes', 'voice.bannedVocabulary', 'identity.category', 'identity.socialHandles', 'people.foundingStory', 'offerings.dontDo', 'pricing.nonShareable', 'capacity.metrics', 'salesProcess.close.definition', 'goals.redLines', 'positioning.keyDifferentiator'],
  operator: ['positioning.recommendedStatement', 'seo.primaryKeywordTargets', 'competitors.direct', 'salesProcess.bottlenecks'],
};
