// Operator gap-fill driver for the Little Friends synthetic e2e run.
// Runs `profile set` for each blocking field, SEQUENTIALLY (each write bumps the
// profile revision — concurrent writes would race on profile.json). Values are
// passed via spawn args (no shell) so apostrophes/quotes need no escaping.
// Classification per the advisor's three buckets:
//   recon    — empty because recon was skipped (no FIRECRAWL_API_KEY); a synthetic
//              client has no real web presence. Clearly-synthetic placeholder.
//   deepdive — the corpus deep-dive states these; transcribe the REAL corpus value.
//   five     — one of the corpus's deliberately-unknown five; obviously-synthetic
//              + recorded as a coverage-map finding. (Only trainingMatrix hard-blocks.)
import { spawnSync } from 'node:child_process';

const SLUG = 'littlefriends';
const EVIDENCE = 'operator gap-fill, synthetic e2e';
const BIN = 'packages/cli/bin/run.js';

/** @type {{path:string, hv:boolean, bucket:'recon'|'deepdive'|'five', value:unknown}[]} */
const FILLS = [
  // ---- BUCKET: recon-sourced (recon skipped → clearly-synthetic placeholder) ----
  { path: 'competitors.direct', hv: false, bucket: 'recon', value: [
    { name: 'Goddard School', location: 'Newburgh NY, toward the highway', pricingPosition: 'more expensive, more polished', whereWeWin: 'warm, small, clearly not a factory; meet the director and lead teachers' },
    { name: 'Local church preschools', location: 'Newburgh NY area' },
    { name: 'Montessori (New Paltz)', location: 'New Paltz NY', offering: 'Montessori' },
  ] }, // names are corpus-mentioned; full recon detail not scraped (recon skipped)
  { path: 'competitors.marketContext', hv: false, bucket: 'recon', value: {
    geography: 'Newburgh, NY / Hudson Valley',
    clientPosition: 'the warm, small option vs. the polished Goddard',
    dynamics: '[recon skipped in synthetic e2e — full market context not scraped]',
  } },
  { path: 'seo.primaryKeywordTargets', hv: false, bucket: 'recon', value: [
    { keyword: '[SYNTHETIC — recon/SEO baseline skipped] Newburgh NY preschool', rationale: 'placeholder pending recon' },
  ] },
  { path: 'seo.measurementTargets', hv: false, bucket: 'recon', value: {
    ninetyDay: '[SYNTHETIC — recon skipped; SEO baseline not scraped]',
    twelveMonth: '[SYNTHETIC placeholder — set after a real recon baseline]',
  } },
  { path: 'identity.primaryAddress', hv: false, bucket: 'recon', value: {
    city: 'Newburgh', state: 'NY', country: 'USA',
    line1: '[SYNTHETIC — recon skipped; street address not scraped]',
  } },
  { path: 'content.written', hv: false, bucket: 'recon', value: {
    cadence: '[SYNTHETIC — recon skipped; website written-content inventory not scraped]',
  } },
  { path: 'content.testimonials', hv: false, bucket: 'recon', value: [
    { quote: '[SYNTHETIC — recon skipped; public reviews/testimonials not scraped in synthetic e2e]', theme: 'placeholder' },
  ] },
  { path: 'positioning.awards', hv: false, bucket: 'recon', value: [
    { name: '[SYNTHETIC — none captured; recon skipped]' },
  ] },
  { path: 'positioning.recommendedStatement', hv: false, bucket: 'recon', value:
    '[operator gap-fill, synthetic e2e] Little Friends Learning Loft is the warm, small, JCC-rooted preschool in Newburgh for ages 2–5 — parents meet the director and lead teachers and leave a tour feeling calmer, not sold to. (Recommended positioning statement; operator analysis, confirm with owner.)' },
  { path: 'toolsAndAccess.analytics', hv: true, bucket: 'recon', value: [
    { name: '[SYNTHETIC — recon skipped] GA4/GSC/Ahrefs not yet inventoried', accessStatus: 'unknown — to be provisioned' },
  ] },

  // ---- BUCKET: deep-dive-predicted (transcribe the REAL corpus value) ----
  { path: 'voice.attributes', hv: false, bucket: 'deepdive', value: [
    { attribute: 'Warm', definition: 'A frazzled parent should feel calmer after reading us, not sold to', example: 'I hear you, the first couple weeks can be tender, and that is so normal.' },
    { attribute: 'Honest', definition: 'Plain and kind; never brochure-speak' },
    { attribute: 'Calm', definition: 'Reassuring and unhurried, never over-eager' },
  ] },
  { path: 'pricing.shareable', hv: true, bucket: 'deepdive', value: [
    { item: 'Registration fee', price: '$75', conditions: 'Tuition is intentionally NOT published; shared only after a tour' },
  ] },
  { path: 'pricing.nonShareable', hv: true, bucket: 'deepdive', value: [
    { askedQuestion: 'What is tuition / how much does it cost?', deflectionAnswer: "I'd love to show you the space first — tuition depends on the program and days. Let's get you in for a tour; the number out of context loses families who would have loved us." },
  ] },
  { path: 'people.owners', hv: false, bucket: 'deepdive', value: [
    { name: 'Rebecca', role: 'Director, Little Friends Learning Loft' },
    { name: 'JCC (Jewish Community Center)', role: 'Parent organization — exec director and board sit above the director' },
  ] },
  { path: 'governance.dataRetention', hv: true, bucket: 'deepdive', value:
    '[operator gap-fill, synthetic e2e] Child records (immunizations, paper permission forms in each child’s file) retained per OCFS requirements; permission source-of-truth is paper, working spreadsheet is stale. Formal retention schedule [NEEDS CONFIRMATION] — not stated in the corpus.' },
  { path: 'governance.offboardingPlan', hv: true, bucket: 'deepdive', value: {
    vercelOwner: 'JCC (transfer at handoff)', supabaseOwner: 'JCC', cloudinaryOwner: 'JCC',
    credentialRotation: 'Rotate all credentials to JCC ownership at offboarding. Today every account (Square, Instagram, Google) is held by the director on a sticky note — the account-ownership gap flagged in the corpus.',
  } },
  { path: 'modules.preschool.ocfs.licenseStatus', hv: true, bucket: 'deepdive', value:
    'Licensed by NYS OCFS for ages 2 and up; licensed capacity 58. Operating and enrolled (52). License number and exact renewal date [NEEDS CONFIRMATION] — not in the corpus.' },
  { path: 'modules.preschool.immunizationPolicy', hv: true, bucket: 'deepdive', value:
    'Every child must have current immunizations on file, with religious or medical exemptions documented properly per OCFS.' },
  { path: 'modules.preschool.enrollmentCapacity', hv: true, bucket: 'deepdive', value: [
    { ageGroup: 'Twos (ratio 1:5, Miss Tova)' },
    { ageGroup: 'Threes (ratio 1:7, Miss Carla)' },
    { ageGroup: 'Pre-K / fours (ratio 1:8, Miss Dana)' },
    { ageGroup: 'Total (all rooms)', licensedCapacity: 58, currentEnrollment: 52 },
  ] }, // per-room numeric split not given in corpus — only the 58/52 total is real
  { path: 'content.videos.rights', hv: true, bucket: 'deepdive', value:
    'Almost no video — a few shaky phone clips; no formal video usage rights established. Owner wants a short welcome video. Apply the same paper-permission gate used for photos to any future video.' },
  { path: 'content.performingThemes', hv: false, bucket: 'deepdive', value: [
    'Warm classroom moments (teacher-posted phone photos in the Slack #photos channel)',
    'Small, personal, not-a-factory feel',
    'Community/JCC events: fall open house, holiday programs, monthly story time, spring fundraiser',
  ] },
  { path: 'salesProcess.leadSources', hv: false, bucket: 'deepdive', value: [
    { channel: 'Word of mouth', quality: 'highest' },
    { channel: 'JCC community', quality: 'high' },
    { channel: 'Instagram DM' },
    { channel: 'Email inquiry' },
  ] }, // volumes deliberately not tracked by owner — not invented
  { path: 'salesProcess.qualificationCriteria', hv: false, bucket: 'deepdive', value: [
    'Child age 2–5 (NOT infants — licensed 2 and up; infants are the do-not-promise line)',
    'Seeking Twos / Threes / Pre-K, full-time, part-time days, or aftercare',
    'Willing to tour before discussing tuition',
  ] },
  { path: 'salesProcess.conversionEvent', hv: false, bucket: 'deepdive', value: {
    name: 'In-person tour', format: 'In-person at the school', owner: 'Rebecca (director)',
    location: 'Little Friends Learning Loft, Newburgh NY',
    conversionRate: "[NEEDS CONFIRMATION] not precisely tracked — owner estimates 'more than half' enroll when she actually follows up",
  } }, // conversionRate left as a marker — one of the deliberately-unknown five, surfaced not invented
  { path: 'salesProcess.followUpCadences', hv: false, bucket: 'deepdive', value: [
    { scenario: 'After a tour (the current leak — owner goes quiet ~2 weeks and families enroll elsewhere)', steps: [
      'Same-day warm thank-you in the owner’s voice',
      'Day 2–3: application link + deposit/registration info',
      'Day 7: gentle nudge',
      'Day 14: final warm follow-up before marking the family dormant',
    ] },
  ] }, // cadence is the operator-designed FIX to the corpus-named follow-up leak
  { path: 'salesProcess.funnel.revenuePerCustomer', hv: true, bucket: 'deepdive', value:
    '≈ $1,180/month full-time Pre-K (≈ $14,160/yr) before the JCC 10% discount; Threes slightly less; Twos varies by days. Roughly $12k–$14k/yr per enrolled child depending on program and discounts.' },
  { path: 'capacity.bookingLeadTime', hv: true, bucket: 'deepdive', value: {
    typical: 'Enrollment targets the September school-year start; tours run year-round (busiest winter–spring, slow in summer)',
    minimum: '[NEEDS CONFIRMATION] not stated in the corpus',
  } },
  { path: 'toolsAndAccess.assetStorage', hv: true, bucket: 'deepdive', value: {
    name: 'Slack #photos channel + Instagram archive (informal)', accessStatus: 'director + teachers (Slack); director only (Instagram)',
    credentialHolder: 'Rebecca (director)', apiCapability: 'none formal — to be replaced by managed asset storage with the permission gate',
  } },
  { path: 'toolsAndAccess.accessChecklist', hv: true, bucket: 'deepdive', value: [
    { item: 'Square (point of sale / billing login)', status: 'held by director — ownership to JCC pending' },
    { item: 'Brightwheel (billing + daily reports)', status: 'keep this year; access working' },
    { item: 'Instagram', status: 'director login only — needs JCC ownership' },
    { item: 'Google Workspace / Google account', status: 'via JCC' },
    { item: 'Google Business Profile', status: 'claimed once — verify' },
    { item: 'Mailchimp', status: 'barely used — candidate to retire' },
    { item: 'Gusto (payroll)', status: 'in progress — Linda (bookkeeper) setting up' },
    { item: 'Sign-Up Genius / Google Forms', status: 'retire into the new site' },
  ] },
  { path: 'operationsAutomation.escalationRouting', hv: true, bucket: 'deepdive', value: [
    { type: 'Child wellbeing or an incident', route: 'Human (director) — never automated' },
    { type: 'Anything about money / billing', route: 'Director, or Linda (bookkeeper) if purely billing' },
    { type: 'An upset parent', route: 'Director' },
    { type: 'Hiring', route: 'Director' },
    { type: 'The state (OCFS)', route: 'Director' },
  ] },
  { path: 'operationsAutomation.responseSlas', hv: false, bucket: 'deepdive', value: [
    { channel: 'Inquiry (email / Instagram)', sla: 'Immediate warm auto-reply in the owner’s voice that offers tour times and basic answers, then hands to a human; human follow-up within 1 business day' },
    { channel: 'Brightwheel parent messages', sla: 'Same day during care hours' },
  ] }, // SLA shape operator-designed from the corpus inquiry-handling intent
  { path: 'operationsAutomation.monitoring', hv: false, bucket: 'deepdive', value: {
    cadence: 'Weekly during the summer build; monthly once stable (aligns with the monthly board report)',
    owner: 'Rebecca (director), with UPRIVER on a light retainer through the fall',
  } },

  // ---- greenfield governance/spend fields the corpus does not state (operator-defined, synthetic) ----
  { path: 'operationsAutomation.spendCap', hv: true, bucket: 'deepdive', value:
    '[operator gap-fill, synthetic e2e] Automation spend cap to be set at provisioning; not yet established.' },
  { path: 'toolsAndAccess.automationPlatform', hv: true, bucket: 'deepdive', value: {
    name: 'n8n (planned)', accessStatus: 'to be provisioned', credentialHolder: 'UPRIVER → JCC at handoff',
  } },
  { path: 'toolsAndAccess.apiSpend.caps', hv: true, bucket: 'deepdive', value:
    '[operator gap-fill, synthetic e2e] API/automation spend caps to be set at provisioning; not yet established. Owner flagged unknown/forgotten subscriptions as a worry (not itemized).' },

  // ---- BUCKET: the deliberately-unknown five (only this one hard-blocks) ----
  { path: 'modules.preschool.trainingMatrix', hv: true, bucket: 'five', value: [
    { staffName: '[DELIBERATELY UNKNOWN IN CORPUS — synthetic e2e placeholder]',
      role: 'Owner could not confirm whether staff training is current ("afraid of what I would find")',
      requiredTrainings: [
        { name: '15 hours / 2 years across OCFS topics (MAT, CPR, first aid, EIP topics)',
          status: '[NEEDS CONFIRMATION] currency unknown — owner must verify against the tracking sheet',
          expires: 'rolling dates' },
      ] },
  ] },
];

const results = [];
for (const f of FILLS) {
  const r = spawnSync('node', [BIN, 'profile', 'set', SLUG, f.path, JSON.stringify(f.value), '--evidence', EVIDENCE],
    { encoding: 'utf8' });
  const ok = r.status === 0;
  results.push({ path: f.path, ok, hv: f.hv, bucket: f.bucket });
  if (!ok) {
    console.log(`FAIL ${f.path}`);
    console.log((r.stdout || '').trim());
    console.log((r.stderr || '').trim());
  } else {
    console.log(`ok   ${f.path}${f.hv ? '  [HV]' : ''}  (${f.bucket})`);
  }
}

const fails = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - fails.length}/${results.length} set ok; ${fails.length} failed ===`);
const hvOk = results.filter((r) => r.ok && r.hv).map((r) => r.path);
console.log(`HV paths to verify (${hvOk.length}):`);
console.log(hvOk.join(' '));
