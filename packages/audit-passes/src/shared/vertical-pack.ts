// Vertical-aware copy + heuristics. Audit passes pull strings, page
// expectations, and directory lists from a `VerticalPack` keyed by the
// `vertical` field on `client-config.yaml`. When that field is missing or
// `generic`, passes fall back to small-business defaults that don't bake
// in any single industry's vocabulary.

export type Vertical =
  | 'wedding-venue'
  | 'preschool'
  | 'restaurant'
  | 'professional-services'
  | 'generic';

export interface ExpectedPage {
  pattern: RegExp;
  label: string;
  priority: 'p0' | 'p1' | 'p2';
}

export interface DirectoryCitation {
  pattern: RegExp;
  label: string;
}

export interface ExpectedTopic {
  /** Pattern matched against full-site markdown to detect coverage. */
  pattern: RegExp;
  /** Human-readable label used in audit findings. */
  label: string;
}

/**
 * Shared options accepted by every audit pass `run()`. Individual passes
 * can ignore fields they don't use; the orchestrator passes the same opts
 * object to all of them.
 */
export interface PassOptions {
  /** Business vertical for copy and heuristic specialization. */
  vertical?: Vertical | string;
  /** Override for `<clientDir>/repo` when looking up scaffolded files. */
  cloneRepoDir?: string;
}

export interface VerticalPack {
  /** Human-readable descriptor — e.g. "wedding venue", "preschool". */
  noun: string;
  /** Buyer / audience noun — e.g. "couples", "parents", "diners". */
  buyer: string;
  /** Pages a serious site in this vertical typically has. */
  expectedPages: ExpectedPage[];
  /** Industry-specific directory profiles to look for in external links. */
  directories: DirectoryCitation[];
  /** Topics an AI assistant typically gets asked about this vertical. */
  expectedTopics: ExpectedTopic[];
  /** Example natural-language question buyers commonly ask. */
  exampleBuyerQuestion: string;
  /** Sample search query a typical buyer would type. */
  searchQueryExample: string;
  /** Phrasing template for the "ranking phrase" suggestion. */
  rankingPhraseTemplate: string;
  /** Why social proof matters for this vertical (one sentence). */
  socialProofWhy: string;
  /** Why FAQs matter for this vertical (one sentence). */
  faqWhy: string;
  /** Why mobile UX matters for this vertical (one sentence). */
  mobileWhy: string;
  /**
   * Concrete vertical-specific recommendation snippet for the
   * "replace banned marketing language" finding. Authored copy that lets
   * wedding-venue audits keep their wedding-flavored examples while
   * non-venue audits get generic prose.
   */
  bannedWordExample: string;
  /**
   * Concrete vertical-specific entity-disambiguation example for the geo
   * pass (e.g. `Audrey's — wedding venue in Sebastopol, CA`).
   */
  entityDisambiguationExample: string;
}

const wedding: VerticalPack = {
  noun: 'wedding venue',
  buyer: 'couples',
  expectedPages: [
    { pattern: /venue|space|barn|loft|outdoor|garden|pavilion/i, label: 'Dedicated venue space pages', priority: 'p1' },
    { pattern: /pricing|packages|rates|investment/i, label: 'Pricing or packages page', priority: 'p0' },
    { pattern: /gallery|portfolio|photos|real.wedding/i, label: 'Photo gallery or real weddings', priority: 'p1' },
    { pattern: /faq|questions|what.to.expect/i, label: 'FAQ page', priority: 'p1' },
    { pattern: /contact|inquir|reach.us/i, label: 'Contact or inquiry page', priority: 'p0' },
    { pattern: /about|our.story|team/i, label: 'About page', priority: 'p1' },
    { pattern: /catering|food|beverage|bar/i, label: 'Catering or food & beverage page', priority: 'p1' },
    { pattern: /vendor|preferred.partner/i, label: 'Preferred vendors list', priority: 'p2' },
    { pattern: /accommodation|lodging|stay|hotel|cabin/i, label: 'Accommodations page', priority: 'p2' },
    { pattern: /local|area|direction|travel/i, label: 'Local area or directions page', priority: 'p2' },
  ],
  directories: [
    { pattern: /weddingwire\.com/i, label: 'WeddingWire' },
    { pattern: /theknot\.com/i, label: 'The Knot' },
    { pattern: /zola\.com/i, label: 'Zola' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /capacity|how many|guest.*count|maximum/i, label: 'Guest capacity / maximum attendees' },
    { pattern: /pricing|cost|how much|rate|package|investment/i, label: 'Pricing and packages' },
    { pattern: /catering|food|beverage|bar|alcohol|corkage/i, label: 'Catering policy (in-house vs. external)' },
    { pattern: /outdoor|indoor|weather|rain|backup/i, label: 'Indoor/outdoor options and weather backup plan' },
    { pattern: /parking|accomodation|hotel|stay|overnight/i, label: 'Parking and accommodation options' },
    { pattern: /vendor|caterer|planner|photographer|dj|preferred/i, label: 'Vendor policies (preferred list vs. open)' },
    { pattern: /deposit|payment|cancel|refund|policy/i, label: 'Deposit, payment, and cancellation policy' },
    { pattern: /available|booking|date|calendar|hold/i, label: 'Availability and date hold process' },
    { pattern: /ceremony|reception|rehearsal|cocktail/i, label: 'Ceremony, reception, and cocktail hour options' },
    { pattern: /decor|decoration|candle|flower|setup|breakdown/i, label: 'Decoration policies and setup/breakdown time' },
    { pattern: /accessible|wheelchair|ada|mobility/i, label: 'Accessibility accommodations' },
    { pattern: /rehearsal.*dinner|day.before/i, label: 'Rehearsal dinner availability' },
  ],
  exampleBuyerQuestion: 'does this venue allow outside catering?',
  searchQueryExample: 'wedding venues near me',
  rankingPhraseTemplate: 'wedding venue in {city}, {state}',
  socialProofWhy:
    'Wedding venue decisions are high-stakes and emotional — buyers need significant social proof before converting.',
  faqWhy:
    'Couples have dozens of questions before they tour — unanswered questions become objections.',
  mobileWhy:
    'Over 60% of wedding-venue traffic comes from mobile. A broken mobile experience directly costs inquiries.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "stunning views," write "floor-to-ceiling windows overlooking the Catskill Mountains."',
  entityDisambiguationExample:
    'Pair the business name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Audrey\'s — wedding venue in Sebastopol, CA").',
};

const preschool: VerticalPack = {
  noun: 'preschool',
  buyer: 'parents',
  expectedPages: [
    { pattern: /admission|enroll|apply|enrollment/i, label: 'Admissions or enrollment page', priority: 'p0' },
    { pattern: /tuition|pricing|rates|fees|cost/i, label: 'Tuition or pricing page', priority: 'p0' },
    { pattern: /contact|inquir|tour|visit/i, label: 'Contact or tour-booking page', priority: 'p0' },
    { pattern: /about|our.story|philosophy|mission/i, label: 'About / Our Philosophy page', priority: 'p1' },
    { pattern: /faq|questions|parent.resource/i, label: 'FAQ or Parent Resources page', priority: 'p1' },
    { pattern: /curriculum|program|montessori|learning|day/i, label: 'Curriculum / A Day in the Classroom page', priority: 'p1' },
    { pattern: /gallery|photos|classroom|tour/i, label: 'Photo gallery / classroom tour', priority: 'p1' },
    { pattern: /staff|teacher|guide|team|faculty/i, label: 'Teachers / Staff page', priority: 'p1' },
    { pattern: /summer|camp|extended.day|after.care/i, label: 'Summer camp or extended-day page', priority: 'p2' },
    { pattern: /calendar|schedule|hours/i, label: 'School calendar / hours page', priority: 'p2' },
  ],
  directories: [
    { pattern: /care\.com/i, label: 'Care.com' },
    { pattern: /winnie\.com/i, label: 'Winnie' },
    { pattern: /greatschools\.org/i, label: 'GreatSchools' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /age|year.old|toddler|infant|preschool|2\.5|3.year/i, label: 'Age range / classroom groupings' },
    { pattern: /tuition|cost|fee|rate|pricing|price/i, label: 'Tuition and fees' },
    { pattern: /schedule|hour|day|drop.off|pickup|full.day|half.day/i, label: 'Daily schedule, drop-off, pickup' },
    { pattern: /curriculum|montessori|reggio|waldorf|philosophy|approach/i, label: 'Curriculum / educational philosophy' },
    { pattern: /enroll|admission|application|apply|tour/i, label: 'Enrollment / application process' },
    { pattern: /lunch|snack|meal|food|nut.free|allergy/i, label: 'Meals, snacks, and allergy policy' },
    { pattern: /nap|rest|sleep/i, label: 'Nap / rest time policy' },
    { pattern: /bathroom|potty|toilet|diaper/i, label: 'Toileting / diapering policy' },
    { pattern: /summer|camp|extended|after.care|before.care/i, label: 'Summer programming and extended-day options' },
    { pattern: /teacher|guide|staff|certif|train|background.check/i, label: 'Teacher credentials and training' },
    { pattern: /accredit|licens|state.licen/i, label: 'Licensing / accreditation' },
    { pattern: /sick|illness|medication|emergency/i, label: 'Sick policy and emergency procedures' },
  ],
  exampleBuyerQuestion: 'do you take 3-year-olds and what is the daily schedule?',
  searchQueryExample: 'Montessori preschool near me',
  rankingPhraseTemplate: 'preschool in {city}, {state}',
  socialProofWhy:
    'Preschool enrollment is a high-trust decision; parents weigh peer testimonials and verified reviews heavily before booking a tour.',
  faqWhy:
    'Parents have dozens of questions before enrolling — schedule, tuition, what to bring, drop-off — and each unanswered question is an objection.',
  mobileWhy:
    'Most parents researching schools do so on mobile during commutes or after bedtime. A broken mobile experience directly costs tour bookings.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "nurturing environment," describe the actual classroom: "mixed-age classrooms of 12 children with two trained Montessori guides."',
  entityDisambiguationExample:
    'Pair the school name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Little Friends Learning Loft — Montessori preschool in Newburgh, NY").',
};

const restaurant: VerticalPack = {
  noun: 'restaurant',
  buyer: 'diners',
  expectedPages: [
    { pattern: /menu|food|drink/i, label: 'Menu page', priority: 'p0' },
    { pattern: /reserv|book.table|opentable|resy/i, label: 'Reservations page', priority: 'p0' },
    { pattern: /hours|location|contact|directions/i, label: 'Hours and location page', priority: 'p0' },
    { pattern: /about|story|chef|our.team/i, label: 'About / Chef page', priority: 'p1' },
    { pattern: /private.event|catering|party/i, label: 'Private events / catering page', priority: 'p1' },
    { pattern: /gallery|photos/i, label: 'Photo gallery', priority: 'p2' },
    { pattern: /press|review|media/i, label: 'Press / reviews page', priority: 'p2' },
  ],
  directories: [
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /opentable\.com/i, label: 'OpenTable' },
    { pattern: /resy\.com/i, label: 'Resy' },
    { pattern: /tripadvisor\.com/i, label: 'TripAdvisor' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
  ],
  expectedTopics: [
    { pattern: /menu|dish|special|chef|cuisine/i, label: 'Menu and chef-driven dishes' },
    { pattern: /reserv|book|table|opentable|resy/i, label: 'Reservation policy / how to book' },
    { pattern: /hour|open|close|monday|tuesday/i, label: 'Hours of operation' },
    { pattern: /address|location|park|valet|street/i, label: 'Address, parking, and directions' },
    { pattern: /private|event|party|catering|buyout/i, label: 'Private events and catering' },
    { pattern: /dietary|gluten|vegan|vegetarian|allerg/i, label: 'Dietary accommodations' },
    { pattern: /dress.code|attire/i, label: 'Dress code' },
    { pattern: /kid|child|family|stroller/i, label: 'Kid-friendliness' },
    { pattern: /gift.card|gratuity|service.charge/i, label: 'Gift cards / gratuity policy' },
  ],
  exampleBuyerQuestion: 'are you open for dinner tonight and do you take walk-ins?',
  searchQueryExample: 'best restaurants near me',
  rankingPhraseTemplate: 'restaurant in {city}, {state}',
  socialProofWhy:
    'Diners check reviews and photos before they pick a restaurant; missing or thin social proof loses the booking to a competitor.',
  faqWhy:
    'Diners want to know hours, dress code, parking, kid-friendliness, and dietary accommodations before they reserve.',
  mobileWhy:
    'Restaurant search is overwhelmingly mobile and last-minute. A slow or broken mobile site loses the table.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "world-class cuisine," name the chef and the dish: "Chef Maria\'s hand-rolled pasta, finished tableside with brown butter and sage."',
  entityDisambiguationExample:
    'Pair the restaurant name with a city/neighborhood in the hero, footer, and `<title>` tag (e.g. "Acme Trattoria — Italian restaurant in Hayes Valley, San Francisco").',
};

const professionalServices: VerticalPack = {
  noun: 'professional services firm',
  buyer: 'prospective clients',
  expectedPages: [
    { pattern: /service|practice.area|what.we.do/i, label: 'Services / practice areas page', priority: 'p0' },
    { pattern: /contact|consult|inquir|book.a/i, label: 'Contact or consultation booking', priority: 'p0' },
    { pattern: /about|our.team|attorney|partner|staff/i, label: 'About / Team page', priority: 'p0' },
    { pattern: /case.stud|client.work|portfolio|results/i, label: 'Case studies or portfolio', priority: 'p1' },
    { pattern: /pricing|fees|rates|engagement/i, label: 'Pricing or fee structure page', priority: 'p1' },
    { pattern: /faq|questions|process/i, label: 'FAQ or Process page', priority: 'p1' },
    { pattern: /testimonial|review|client.story/i, label: 'Testimonials / client stories', priority: 'p1' },
  ],
  directories: [
    { pattern: /linkedin\.com/i, label: 'LinkedIn' },
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /clutch\.co/i, label: 'Clutch' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /service|practice|expertise|specialt/i, label: 'Services and areas of expertise' },
    { pattern: /pricing|fee|rate|engagement|retainer|hourly/i, label: 'Pricing and engagement model' },
    { pattern: /process|how.it.works|method|approach/i, label: 'Engagement process / methodology' },
    { pattern: /case.stud|client.work|example|portfolio|result/i, label: 'Past work or case studies' },
    { pattern: /testimonial|review|client.story/i, label: 'Client testimonials' },
    { pattern: /team|partner|principal|founder|attorney|consultant/i, label: 'Who you work with' },
    { pattern: /credentia|certif|license|bar.admit/i, label: 'Credentials and certifications' },
    { pattern: /location|office|remote|virtual/i, label: 'Office locations or remote/virtual delivery' },
  ],
  exampleBuyerQuestion: 'what does this firm specialize in and how much do they charge?',
  searchQueryExample: 'best [service] in [city]',
  rankingPhraseTemplate: '[service type] in {city}, {state}',
  socialProofWhy:
    'Services buyers compare 3–5 firms before reaching out; testimonials and case studies are the deciding factor.',
  faqWhy:
    'Prospects need process, scope, and pricing clarity before they book a discovery call. FAQ pages reduce friction at exactly that step.',
  mobileWhy:
    'Many services prospects research from a phone before they ever open a laptop. Mobile UX is a first-impression filter.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Instead of "world-class team," list credentials and tenure: "five attorneys with 80+ combined years of M&A experience."',
  entityDisambiguationExample:
    'Pair the firm name with a city/region in the hero, footer, and `<title>` tag (e.g. "Acme Law — corporate counsel in Austin, TX").',
};

const generic: VerticalPack = {
  noun: 'small business',
  buyer: 'prospective customers',
  expectedPages: [
    { pattern: /pricing|packages|rates|fees|cost/i, label: 'Pricing or packages page', priority: 'p0' },
    { pattern: /contact|inquir|reach.us|book/i, label: 'Contact or inquiry page', priority: 'p0' },
    { pattern: /about|our.story|team|staff/i, label: 'About page', priority: 'p1' },
    { pattern: /faq|questions/i, label: 'FAQ page', priority: 'p1' },
    { pattern: /service|product|offer/i, label: 'Services or products page', priority: 'p1' },
    { pattern: /gallery|portfolio|photos|case.stud/i, label: 'Gallery or portfolio page', priority: 'p2' },
    { pattern: /testimonial|review/i, label: 'Testimonials or reviews page', priority: 'p2' },
  ],
  directories: [
    { pattern: /yelp\.com/i, label: 'Yelp' },
    { pattern: /facebook\.com/i, label: 'Facebook' },
    { pattern: /instagram\.com/i, label: 'Instagram' },
    { pattern: /google.*business|maps\.google/i, label: 'Google Business Profile' },
  ],
  expectedTopics: [
    { pattern: /service|product|offer|what.we.do/i, label: 'Services or products offered' },
    { pattern: /pricing|cost|rate|fee|package/i, label: 'Pricing or cost information' },
    { pattern: /contact|phone|email|location|address|hour/i, label: 'Contact info, hours, and location' },
    { pattern: /testimonial|review|client/i, label: 'Customer testimonials or reviews' },
    { pattern: /faq|question|how.do|can.i/i, label: 'Common questions / FAQ' },
    { pattern: /about|story|founded|since/i, label: 'About / company story' },
  ],
  exampleBuyerQuestion: 'do you offer [my specific need] and how much does it cost?',
  searchQueryExample: '[your service] near me',
  rankingPhraseTemplate: '[your service] in {city}, {state}',
  socialProofWhy:
    'Customers check reviews and testimonials before they buy. Missing or thin social proof shifts the decision toward a competitor.',
  faqWhy:
    'Customers have predictable questions before they reach out. Answering them on-page reduces friction and converts more inquiries.',
  mobileWhy:
    'Most local-business traffic is mobile. A broken mobile experience directly costs inquiries.',
  bannedWordExample:
    'Replace banned words with specific, evidence-based language. Name the actual feature, person, or number rather than using a generic superlative.',
  entityDisambiguationExample:
    'Pair the business name with a city/region in the homepage hero, footer address block, and `<title>` tag (e.g. "Acme — [business type] in [City], [State]").',
};

const PACKS: Record<Vertical, VerticalPack> = {
  'wedding-venue': wedding,
  preschool,
  restaurant,
  'professional-services': professionalServices,
  generic,
};

/**
 * Resolve the copy / heuristic pack for a vertical. Falls back to the
 * `generic` pack when the vertical is unset or unrecognized.
 */
export function getVerticalPack(vertical?: Vertical | string): VerticalPack {
  if (!vertical) return PACKS.generic;
  if (vertical in PACKS) return PACKS[vertical as Vertical];
  return PACKS.generic;
}
